// app/components/flow/Sidebar.tsx
import React from 'react';
import { BrainCircuit, Repeat, MousePointer2, Search } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export const Sidebar = () => {
  const setShowAIModal = useFlowStore((state) => state.setShowAIModal);

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-[#121314] border-r border-[#2A2B32] p-4 flex flex-col gap-4 z-20 shadow-xl h-full font-sans">
      <div className="text-xs font-bold text-stone-500 uppercase tracking-wider  pl-1">Components Library</div>

      {/* AI Agent Card */}
      <div
        onClick={() => setShowAIModal(true)}
        style={{
          background: 'linear-gradient(90deg, #5F2AFF 0%, #B800D8 100%)',
          backgroundClip: 'padding-box'
        }}
        className="p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all shadow-lg shadow-purple-900/20 group border border-white/5 hover:border-white/40 hover:scale-[1.02]"
      >
        <div className="bg-white/0 p-0 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="/AI.png" alt="AI Agent" className="w-10 h-10 object-contain" />
        </div>
        <div className="flex flex-col text-white">
          <span className="font-bold text-sm">AI Agent</span>
          <span className="text-[10px] text-purple-100 opacity-40">Generate flow from text</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Action Component */}
      <div
        className="p-3 rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm border border-white/5 hover:border-[#FF5D73]/50 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(90deg, #412433 0%, #1B1D1F 100%)',
          backgroundClip: 'padding-box'
        }}
        onDragStart={(event) => onDragStart(event, 'action', 'Uniswap Swap')}
        draggable
      >
        <div className="bg-pink-500/0 p-0 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="/uniswapV1.png" alt="Uniswap" className="w-10 h-10 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">Uniswap Action</span>
          <span className="text-[10px] text-stone-400 group-hover:text-pink-100 transition-colors">Executes token swap</span>
        </div>
      </div>

      {/* ENS Resolver Component */}
      <div
        className="p-3 rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm border border-white/5 hover:border-[#5CADFF]/50 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(90deg, #24344F 0%, #1B1D1F 100%)',
          backgroundClip: 'padding-box'
        }}
        onDragStart={(event) => onDragStart(event, 'ens', 'ENS Resolver')}
        draggable
      >
        <div className="bg-yellow-500/0 p-0 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="/ens.png" alt="Arc" className="w-10 h-10 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">ENS Resolver</span>
          <span className="text-[10px] text-stone-400 group-hover:text-yellow-100 transition-colors">Resolve ENS names</span>
        </div>
      </div>

      {/* Transfer Component */}
      <div
        className="p-3 rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm border border-white/5 hover:border-[#41E43E]/50 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(90deg, #24413B 0%, #1B1D1F 100%)',
          backgroundClip: 'padding-box'
        }}
        onDragStart={(event) => onDragStart(event, 'transfer', 'Transfer')}
        draggable
      >
        <div className="bg-green-500/0 p-0 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="/Arc.png" alt="LLFL" className="w-10 h-10 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">Transfer</span>
          <span className="text-[10px] text-stone-400 group-hover:text-green-100 transition-colors">Transfers assets</span>
        </div>
      </div>

      <div className="mt-auto p-4 bg-[#FFFFFF0D] rounded-xl text-xs text-stone-400 border border-[#2A2B32]">
        <p className="font-bold mb-1 flex items-center gap-1 text-stone-200">💡 Pro Tip:</p>
        Drag and drop components to the canvas, then connect them to build logic.
      </div>
    </aside>
  );
};
