// app/components/flow/CustomNode.tsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, Repeat, ArrowRight, CheckCircle, Wallet } from 'lucide-react';

const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

export const CustomNode = ({ id, data }: { id: string, data: any }) => {
  const { updateNodeData } = useReactFlow();

  // State for address validation
  const [addressValue, setAddressValue] = useState(data.recipient || '');
  const [isAddressValid, setIsAddressValid] = useState(false);

  useEffect(() => {
    if (data.recipient) {
      setAddressValue(data.recipient);
      setIsAddressValid(isValidAddress(data.recipient));
    }
  }, [data.recipient]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setAddressValue(addr);
    const isValid = isValidAddress(addr);
    setIsAddressValid(isValid);
    if (isValid) {
      updateNodeData(id, { ...data, recipient: addr });
    } else {
      updateNodeData(id, { ...data, recipient: null });
    }
  };

  const handleChange = (field: string, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  const getTypeStyles = () => {
    switch (data.type) {
      case 'trigger': return 'border-[#52BDFF]/50 hover:border-[#52BDFF] shadow-blue-500/10';
      case 'action': return 'border-[#FF5D73]/50 hover:border-[#FF5D73] shadow-pink-500/10';
      case 'transfer': return 'border-[#41E43E]/50 hover:border-[#41E43E] shadow-green-500/10';
      default: return 'border-stone-700 hover:border-stone-500';
    }
  };

  const getBackgroundStyle = () => {
    switch (data.type) {
      case 'trigger': return { background: 'linear-gradient(90deg, #2B4572 0%, #1B1D1F 100%)' };
      case 'action': return { background: 'linear-gradient(90deg, #69314D 0%, #1B1D1F 100%)' };
      case 'transfer': return { background: 'linear-gradient(90deg, #306357 0%, #1B1D1F 100%)' };
      default: return { background: '#1A1D24' };
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case 'trigger': return <Zap className="w-4 h-4 text-[#52BDFF]" />;
      case 'action': return <Repeat className="w-4 h-4 text-[#FF5D73]" />;
      case 'transfer': return <Wallet className="w-4 h-4 text-[#41E43E]" />;
      default: return null;
    }
  };

  return (
    <div
      className={`px-4 py-4 shadow-2xl rounded-2xl border min-w-[260px] transition-all duration-300 backdrop-blur-sm
        ${getTypeStyles()}
        ${data.active ? 'ring-2 ring-blue-500/40 border-blue-400' : ''}
      `}
      style={getBackgroundStyle()}
    >
      {/* Top Handle (Action and Transfer) */}
      {(data.type === 'action' || data.type === 'transfer') && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-[#2A2B32] !border-2 !border-stone-600 !w-3 !h-3 !-top-1.5 hover:!scale-125 transition-transform"
        />
      )}

      {/* Title Bar */}
      <div className={`flex items-center gap-3 mb-4 border-b border-stone-800/50 pb-3`}>
        <div className={`p-1.5 rounded-lg bg-stone-800/50`}>
          {getIcon()}
        </div>
        <span className="font-bold text-sm text-white tracking-tight">{data.label}</span>
        <div className="ml-auto w-2 h-2 rounded-full bg-stone-700"></div>
      </div>

      {/* Content Area */}
      {data.type === 'trigger' ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 items-center">
            <div className="bg-stone-800/50 px-2 py-1.5 rounded-lg border border-stone-700/50 flex items-center gap-2">
              <span className="text-[10px] text-blue-400 font-bold font-mono">ETH</span>
            </div>
            <select
              className="nodrag text-xs text-white border border-stone-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              onChange={(e) => handleChange('operator', e.target.value)}
              defaultValue={data.operator || ">"}
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
            </select>
            <div className="relative flex-1">
              <span className="absolute left-2 top-1.5 text-stone-500 text-xs">$</span>
              <input
                type="number"
                className="nodrag w-full border border-stone-700 rounded-lg pl-5 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                placeholder="3000"
                defaultValue={data.threshold || ""}
                onChange={(e) => handleChange('threshold', e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : data.type === 'action' ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 items-center justify-between bg-stone-800/30 p-2 rounded-xl border border-stone-800/50">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Swap</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-200 font-mono">ETH</span>
              <ArrowRight className="w-3 h-3 text-stone-600" />
              <span className="text-xs text-stone-200 font-mono">UNI</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <select
              className="nodrag text-xs text-white border border-stone-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 transition-colors w-16"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              value={data.amountType || "percentage"}
              onChange={(e) => handleChange('amountType', e.target.value)}
            >
              <option value="percentage">%</option>
              <option value="absolute">Amt</option>
            </select>
            <input
              type="number"
              className="nodrag flex-1 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              placeholder="Amount"
              value={data.amount || ""}
              onChange={(e) => handleChange('amount', e.target.value)}
            />
          </div>
        </div>
      ) : ( // Transfer Node UI
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter">Recipient Address</label>
            {isAddressValid && <span className="text-[9px] text-green-500 font-bold uppercase">Verified</span>}
          </div>
          <div className="relative">
            <input
              type="text"
              className={`nodrag w-full border rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono placeholder-stone-700 transition-all
                        ${isAddressValid ? 'border-green-500/50 focus:border-green-500' : 'border-stone-700 focus:border-green-500'}
                     `}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              placeholder="0x...Address"
              value={addressValue}
              onChange={handleAddressChange}
            />
            {isAddressValid && (
              <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
            )}
          </div>
          {!isAddressValid && addressValue && (
            <p className="text-[10px] text-red-400 mt-1 font-medium animate-pulse flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-400"></span>
              Invalid checksum or format
            </p>
          )}
        </div>
      )}

      {/* Bottom Handle (Trigger and Action) */}
      {(data.type === 'trigger' || data.type === 'action') && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-[#2A2B32] !border-2 !border-stone-600 !w-3 !h-3 !-bottom-1.5 hover:!scale-125 transition-transform"
        />
      )}
    </div>
  );
};
