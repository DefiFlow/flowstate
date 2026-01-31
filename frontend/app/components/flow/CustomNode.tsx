// app/components/flow/CustomNode.tsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, Repeat, ArrowRight, CheckCircle } from 'lucide-react';

const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

export const CustomNode = ({ id, data }: { id: string, data: any }) => {
  const { updateNodeData } = useReactFlow();

  // State for address validation
  const [addressValue, setAddressValue] = useState(data.recipient || '');
  const [isAddressValid, setIsAddressValid] = useState(false);
  
  useEffect(() => {
    // Initial validation when component mounts or data changes
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
    // Also update the global store, maybe only if valid, or on blur
    if (isValid) {
      updateNodeData(id, { ...data, recipient: addr });
    } else {
      // Clear recipient in store if invalid to prevent execution
      updateNodeData(id, { ...data, recipient: null });
    }
  };

  const handleChange = (field: string, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <div className={`px-4 py-3 shadow-xl rounded-xl border min-w-[240px] transition-all duration-300
        ${data.active ? 'border-green-400 ring-2 ring-green-500/20 bg-stone-800' : 'bg-stone-900 border-stone-700 hover:border-stone-500'}
    `}>
            {/* 顶部 Handle (Action 和 Transfer) */}
            {(data.type === 'action' || data.type === 'transfer') && (
               <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !-top-1.5" />
            )}
            
            {/* 标题栏 */}
            <div className="flex items-center gap-2 mb-3 border-b border-stone-700 pb-2">
              {data.type === 'trigger' ? <Zap className="w-4 h-4 text-yellow-400" /> : <Repeat className="w-4 h-4 text-pink-400" />}
              <span className="font-bold text-sm text-stone-200">{data.label}</span>
            </div>
      
            {/* 内容区域 */}
            {data.type === 'trigger' ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-stone-400 font-mono">ETH</span>
                  <select 
                    className="nodrag bg-stone-800 text-xs text-white border border-stone-600 rounded px-1 py-1.5 focus:outline-none focus:border-blue-500"
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
                          className="nodrag w-full bg-stone-800 border border-stone-600 rounded pl-4 pr-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          placeholder="3000"
                          defaultValue={data.threshold || ""}
                          onChange={(e) => handleChange('threshold', e.target.value)}
                      />
                  </div>
                </div>
              </div>
            ) : data.type === 'action' ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <select 
                    className="nodrag bg-stone-800 text-xs text-white border border-stone-600 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                    value={data.fromToken || "ETH"}
                    onChange={(e) => handleChange('fromToken', e.target.value)}
                  >
                    <option value="ETH">ETH</option>
                  </select>
                  <ArrowRight className="w-3 h-3 text-stone-500" />
                  <select 
                    className="nodrag bg-stone-800 text-xs text-white border border-stone-600 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                    value={data.toToken || "UNI"}
                    onChange={(e) => handleChange('toToken', e.target.value)}
                  >
                    <option value="UNI">UNI</option>
                  </select>
                </div>
                
                <div className="flex gap-2 items-center">
                  <select 
                    className="nodrag bg-stone-800 text-xs text-white border border-stone-600 rounded px-1 py-1 focus:outline-none focus:border-blue-500 w-16"
                    value={data.amountType || "percentage"}
                    onChange={(e) => handleChange('amountType', e.target.value)}
                  >
                    <option value="percentage">%</option>
                    <option value="absolute">Amt</option>
                  </select>
                  <input 
                      type="number"
                      className="nodrag flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="Amount"
                      value={data.amount || ""}
                      onChange={(e) => handleChange('amount', e.target.value)}
                  />
                </div>
              </div>
            ) : ( // Transfer Node UI
            <div className="flex flex-col gap-1">
                <label className="text-xs text-stone-400">Recipient Address</label>
                <div className="relative">
                  <input 
                     type="text"
                     className="nodrag w-full bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 font-mono placeholder-stone-600"
                     placeholder="0x...Address"
                     value={addressValue}
                     onChange={handleAddressChange}
                  />
                  {isAddressValid && (
                    <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {!isAddressValid && addressValue && (
                  <p className="text-xs text-red-400 mt-1">↳ Invalid address format</p>
                )}
           </div>
            )}

      {/* 底部 Handle (Trigger 和 Action) */}
      {(data.type === 'trigger' || data.type === 'action') && (
        <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !-bottom-1.5" />
      )}
    </div>
  );
};
