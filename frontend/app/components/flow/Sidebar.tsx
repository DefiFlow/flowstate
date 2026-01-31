// app/components/flow/Sidebar.tsx
import React from 'react';
import { BrainCircuit, Zap, Repeat } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export const Sidebar = () => {
  const setShowAIModal = useFlowStore((state) => state.setShowAIModal);

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col gap-4 z-20 shadow-sm">
      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Components Library</div>
      
      {/* AI Agent Card */}
      <div 
        onClick={() => setShowAIModal(true)}
        className="p-3 border border-purple-200 rounded-lg cursor-pointer flex items-center gap-3 hover:border-purple-500 hover:bg-purple-50 transition-all bg-white group mb-2"
      >
        <div className="bg-purple-100 p-2 rounded-md text-purple-600 group-hover:bg-purple-200 transition-colors">
            <BrainCircuit className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-stone-700">AI Agent</span>
          <span className="text-[10px] text-stone-400">Generate flow from text</span>
        </div>
      </div>
      
      {/* Trigger 组件 */}
      <div 
        className="p-3 border border-stone-200 rounded-lg cursor-grab flex items-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all bg-white select-none active:cursor-grabbing group"
        onDragStart={(event) => onDragStart(event, 'trigger', 'Price Monitor')} 
        draggable
      >
        <div className="bg-blue-100 p-2 rounded-md text-blue-600 group-hover:bg-blue-200 transition-colors">
            <Zap className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-stone-700">Price Trigger</span>
          <span className="text-[10px] text-stone-400">Monitors ETH price</span>
        </div>
      </div>

      {/* Action 组件 */}
      <div 
        className="p-3 border border-stone-200 rounded-lg cursor-grab flex items-center gap-3 hover:border-pink-500 hover:bg-pink-50 transition-all bg-white select-none active:cursor-grabbing group"
        onDragStart={(event) => onDragStart(event, 'action', 'Uniswap Swap')} 
        draggable
      >
        <div className="bg-pink-100 p-2 rounded-md text-pink-600 group-hover:bg-pink-200 transition-colors">
            <Repeat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-stone-700">Uniswap Action</span>
          <span className="text-[10px] text-stone-400">Executes token swap</span>
        </div>
      </div>

      {/* Transfer Component */}
      <div 
        className="p-3 border border-stone-200 rounded-lg cursor-grab flex items-center gap-3 hover:border-green-500 hover:bg-green-50 transition-all bg-white select-none active:cursor-grabbing group"
        onDragStart={(event) => onDragStart(event, 'transfer', 'Transfer')} 
        draggable
      >
        <div className="bg-green-100 p-2 rounded-md text-green-600 group-hover:bg-green-200 transition-colors">
            <Repeat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-stone-700">Transfer</span>
          <span className="text-[10px] text-stone-400">Transfers assets</span>
        </div>
      </div>
      
      <div className="mt-auto p-4 bg-stone-50 rounded-lg text-xs text-stone-500 border border-stone-100">
        <p className="font-bold mb-1 flex items-center gap-1">💡 Pro Tip:</p>
        Drag and drop components to the canvas, then connect them to build logic.
      </div>
    </aside>
  );
};
