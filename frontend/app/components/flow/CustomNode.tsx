// app/components/flow/CustomNode.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, useNodes, useEdges } from '@xyflow/react';
import { Repeat, ArrowRight, CheckCircle, Wallet, Loader2, Search } from 'lucide-react';
import { ethers } from 'ethers';
import { useFlowStore } from '../../store/useFlowStore';
import { useUniswapV4 } from '../../hooks/UseUniswapV4';
import { useDebounce } from 'use-debounce';

const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
const isEnsName = (name: string) => name.endsWith('.eth');

let ensProvider: ethers.providers.JsonRpcProvider | null = null;
const getEnsProvider = () => {
  if (!ensProvider && typeof window !== 'undefined') {
    ensProvider = new ethers.providers.JsonRpcProvider(window.location.origin + "/api/rpc");
  }
  return ensProvider;
};

const RecipientRow = ({
  index,
  recipient,
  onChange
}: {
  index: number;
  recipient: { address: string; amount: string | number; input?: string };
  onChange: (index: number, field: string, value: any) => void;
}) => {
  const [localInput, setLocalInput] = useState(recipient.input || recipient.address || '');
  const [isResolving, setIsResolving] = useState(false);
  const [isValid, setIsValid] = useState(isValidAddress(recipient.address || ''));

  const resolveInput = useCallback((val: string) => {
    if (isEnsName(val)) {
      setIsValid(false);
      setIsResolving(true);
      const provider = getEnsProvider();
      if (provider) {
        provider.resolveName(val).then(addr => {
          if (addr) {
            onChange(index, 'address', addr);
            setIsValid(true);
          } else {
            onChange(index, 'address', '');
            setIsValid(false);
          }
          setIsResolving(false);
        }).catch(() => {
          onChange(index, 'address', '');
          setIsValid(false);
          setIsResolving(false);
        });
      }
    } else if (isValidAddress(val)) {
      onChange(index, 'address', val);
      setIsValid(true);
      setIsResolving(false);
    } else {
      onChange(index, 'address', '');
      setIsValid(false);
      setIsResolving(false);
    }
  }, [index, onChange]);

  // On mount or when input changes from outside (e.g. AI), resolve it.
  useEffect(() => {
    const newInputValue = recipient.input || '';
    if (newInputValue !== localInput) {
      setLocalInput(newInputValue);
    }
    // Resolve if it's an ENS name and doesn't have a valid address yet.
    if (newInputValue && (!recipient.address || !isValidAddress(recipient.address))) {
      resolveInput(newInputValue);
    } else {
      setIsValid(isValidAddress(recipient.address || ''));
    }
  }, [recipient.input, recipient.address, resolveInput, localInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalInput(val);
    onChange(index, 'input', val);
    resolveInput(val);
  };

  return (
    <div className="flex gap-2 items-start group/row animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex-1 relative">
        <input
          type="text"
          className={`nodrag w-full border rounded-lg pl-2 pr-6 py-1.5 text-[10px] text-white bg-white/5 focus:outline-none font-mono transition-all
            ${isValid ? 'border-green-500/30 focus:border-green-500' : 'border-white/10 focus:border-blue-500'}
          `}
          placeholder="ENS or 0x..."
          value={localInput}
          onChange={handleInputChange}
        />
        {isResolving ? (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500 animate-spin" />
        ) : isValid && (
          <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-green-500" />
        )}
      </div>
      <input
        type="number"
        className="nodrag w-14 border border-white/10 rounded-lg px-1.5 py-1.5 text-[10px] text-white bg-white/5 focus:outline-none focus:border-blue-500 font-mono text-center"
        placeholder="Amt"
        value={recipient.amount || ''}
        onChange={(e) => onChange(index, 'amount', e.target.value)}
      />
      <div className="w-6" /> {/* Spacer to maintain alignment */}
    </div>
  );
};

export const CustomNode = ({ id, data }: { id: string, data: any }) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const nodes = useNodes();
  const edges = useEdges();

  // State for on-chain quoting
  const [isQuoting, setIsQuoting] = useState(false);
  // We don't need a signer for quoting, so we pass null.
  const { quoteReverse } = useUniswapV4(null);
  // Debounce input to prevent spamming RPC on every keystroke
  const [debouncedInput] = useDebounce(data.input, 500);

  useEffect(() => {
    if (data.type === 'action') {
      const getQuote = async () => {
        const amount = parseFloat(String(debouncedInput || '0').replace(/[^0-9.]/g, ''));
        if (isNaN(amount) || amount <= 0) {
          updateNodeData(id, { output: '' }); // Clear output if input is invalid
          return;
        }

        setIsQuoting(true);
        try {
          const requiredEth = await quoteReverse(String(amount));
          if (requiredEth) {
            const formatted = `~${parseFloat(requiredEth).toLocaleString('en-US', { maximumFractionDigits: 5 })} mETH`;
            updateNodeData(id, { output: formatted });
          }
        } catch (e) {
          console.error("Quote failed:", e);
          updateNodeData(id, { output: 'Error fetching quote' });
        } finally {
          setIsQuoting(false);
        }
      };

      getQuote();
    }
  }, [debouncedInput, data.type, id, updateNodeData, quoteReverse]);

  const parentEnsNodeRecipient = useMemo(() => {
    if (data.type !== 'transfer') return null;
    const incomingEdge = edges.find(edge => edge.target === id);
    if (!incomingEdge) return null;
    const parentNode = nodes.find(node => node.id === incomingEdge.source);
    if (!parentNode || parentNode.data.type !== 'ens' || !Array.isArray(parentNode.data.recipients) || parentNode.data.recipients.length === 0) {
      return null;
    }
    return parentNode.data.recipients[0];
  }, [id, data.type, nodes, edges]);

  const handleChange = (field: string, value: string) => {
    updateNodeData(id, { [field]: value });
  };

  const recipients = Array.isArray(data.recipients) ? data.recipients : [];

  const updateRecipient = useCallback((index: number, field: string, value: any) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    updateNodeData(id, { recipients: newRecipients });
  }, [id, recipients, updateNodeData]);


  const getTypeStyles = () => {
    switch (data.type) {
      case 'ens': return 'border-[#52BDFF]/50 hover:border-[#52BDFF] shadow-blue-500/10';
      case 'action': return 'border-[#FF5D73]/50 hover:border-[#FF5D73] shadow-pink-500/10';
      case 'transfer': return 'border-[#41E43E]/50 hover:border-[#41E43E] shadow-green-500/10';
      default: return 'border-stone-700 hover:border-stone-500';
    }
  };

  const getBackgroundStyle = () => {
    switch (data.type) {
      case 'ens': return { background: 'linear-gradient(90deg, #2B4572 0%, #1B1D1F 100%)' };
      case 'action': return { background: 'linear-gradient(90deg, #69314D 0%, #1B1D1F 100%)' };
      case 'transfer': return { background: 'linear-gradient(90deg, #306357 0%, #1B1D1F 100%)' };
      default: return { background: '#1A1D24' };
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case 'ens': return <img src="/ens.png" alt="ENS" className="w-5 h-5 object-contain" />;
      case 'action': return <img src="/uniswapV1.png" alt="Uniswap" className="w-5 h-5 object-contain" />;
      case 'transfer': return <img src="/Arc.png" alt="Arc" className="w-5 h-5 object-contain" />;
      default: return null;
    }
  };

  return (
    <div
      className={`px-4 py-4 shadow-2xl rounded-2xl border w-[360px] transition-all duration-300 backdrop-blur-sm
        ${getTypeStyles()}
        ${data.active ? 'ring-2 ring-blue-500/40 border-blue-400' : ''}
      `}
      style={getBackgroundStyle()}
    >
      {/* Top Handle */}
      {(data.type === 'ens' || data.type === 'transfer') && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-[#0090FF] !border-2 !border-[#FFFFFF] !w-3.5 !h-3.5 !-top-1.5 hover:!scale-125 transition-transform"
        />
      )}

      {/* Title Bar */}
      <div className="flex items-center gap-3 mb-4 border-b border-stone-800/50 pb-3">
        <div className="rounded-lg overflow-hidden flex items-center justify-center">
          {getIcon()}
        </div>
        <span className="font-bold text-sm text-white tracking-tight">
          {data.type === 'transfer' ? 'Arc Payroll' : data.type === 'ens' ? 'ENS Resolver' : data.label}
        </span>
        <div className="ml-auto w-2 h-2 rounded-full bg-stone-700"></div>
      </div>

      {/* Content Area */}
      {data.type === 'ens' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter">ENS to Resolve</label>
            </div>

            <div className="flex flex-col gap-2">
              {recipients.map((r: any, i: number) => (
                <RecipientRow
                  key={i}
                  index={i}
                  recipient={r}
                  onChange={updateRecipient}
                />
              ))}
            </div>
          </div>
        </div>
      ) : data.type === 'action' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-tighter">Input (mUSDC)</label>
            <input
              type="text"
              className="nodrag w-full border border-white/10 rounded-lg px-3 py-2 text-xs text-white bg-white/10 focus:outline-none focus:border-pink-500 font-mono"
              placeholder="2000 mUSDC"
              value={data.input || ''}
              onChange={(e) => handleChange('input', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-tighter">Output (mETH)</label>
            <div className="relative">
              <input
                type="text"
                className="nodrag w-full border border-black/20 rounded-lg px-3 py-2 text-xs text-white bg-black/20 focus:outline-none font-mono"
                placeholder="~1.00 mETH (Sepolia)"
                value={isQuoting ? 'Fetching quote...' : data.output || ''}
                readOnly
              />
              {isQuoting && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500 animate-spin" />}
            </div>
          </div>
        </div>
      ) : (
        /* Transfer Node UI */
        <div className="flex flex-col gap-3">
          {parentEnsNodeRecipient ? (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-400">Recipient</span>
                <span className="font-mono text-xs text-white break-all">{parentEnsNodeRecipient.input || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-400">Amount</span>
                <span className="font-mono text-xs text-white">{parentEnsNodeRecipient.amount} USDC</span>
              </div>
              {parentEnsNodeRecipient.address && (
                <div className="flex justify-between items-start pt-2 mt-1 border-t border-white/10">
                  <span className="text-[10px] text-stone-400 mt-0.5">Resolved Address</span>
                  <span className="font-mono text-xs text-green-400 text-right break-all">{parentEnsNodeRecipient.address}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-[10px] text-stone-400 leading-relaxed">
                <span className="text-yellow-400 font-bold">Unlinked:</span> Connect to an ENS Resolver node.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter">Memo</label>
            <input
              type="text"
              className="nodrag w-full border border-white/10 rounded-lg px-3 py-2 text-xs text-white bg-white/10 focus:outline-none focus:border-green-500 font-mono"
              placeholder="e.g., Salary Distribution"
              value={data.memo || ''}
              onChange={(e) => handleChange('memo', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[#0090FF] !border-2 !border-[#FFFFFF] !w-3.5 !h-3.5 !-bottom-1.5 hover:!scale-125 transition-transform"
      />

    </div>
  );
};