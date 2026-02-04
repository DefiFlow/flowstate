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
      <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 pl-1">Components Library</div>

      {/* AI Agent Card */}
      <div
        onClick={() => setShowAIModal(true)}
        style={{ background: 'linear-gradient(90deg, #5F2AFF 0%, #B800D8 100%)' }}
        className="p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all shadow-lg shadow-purple-900/20 group mb-2 border border-transparent hover:border-white hover:scale-[1.02]"
      >
        <div className="bg-white p-2 rounded-lg text-purple-600 shadow-sm relative">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-white">
          <span className="font-bold text-sm">AI Agent</span>
          <span className="text-[10px] text-purple-100 opacity-90">Generate flow from text</span>
        </div>
        <MousePointer2 className="w-4 h-4 text-white ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Action 组件 */}
      <div
        className="p-3 border border-[#2A2B32] rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm hover:border-[#FF5D73] hover:scale-[1.02]"
        style={{ background: 'linear-gradient(90deg, #69314D 0%, #1B1D1F 100%)' }}
        onDragStart={(event) => onDragStart(event, 'action', 'Uniswap Swap')}
        draggable
      >
        <div className="bg-pink-500/20 p-2 rounded-lg text-[#FF5D73] group-hover:bg-[#FF5D73] group-hover:text-white transition-all shadow-sm">
          <Repeat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">Uniswap Action</span>
          <span className="text-[10px] text-stone-400 group-hover:text-pink-100 transition-colors">Executes token swap</span>
        </div>
        <MousePointer2 className="w-4 h-4 text-[#FF5D73] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* ENS Resolver Component */}
      <div
        className="p-3 border border-[#2A2B32] rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm hover:border-[#FFB800] hover:scale-[1.02]"
        style={{ background: 'linear-gradient(90deg, #725A2B 0%, #1B1D1F 100%)' }}
        onDragStart={(event) => onDragStart(event, 'ens', 'ENS Resolver')}
        draggable
      >
        <div className="bg-yellow-500/20 p-2 rounded-lg text-[#FFB800] group-hover:bg-[#FFB800] group-hover:text-white transition-all shadow-sm">
          <Search className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">ENS Resolver</span>
          <span className="text-[10px] text-stone-400 group-hover:text-yellow-100 transition-colors">Resolve ENS names</span>
        </div>
        <MousePointer2 className="w-4 h-4 text-[#FFB800] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Transfer Component */}
      <div
        className="p-3 border border-[#2A2B32] rounded-xl cursor-grab flex items-center gap-3 transition-all select-none active:cursor-grabbing group shadow-sm hover:border-[#41E43E] hover:scale-[1.02]"
        style={{ background: 'linear-gradient(90deg, #306357 0%, #1B1D1F 100%)' }}
        onDragStart={(event) => onDragStart(event, 'transfer', 'Transfer')}
        draggable
      >
        <div className="bg-green-500/20 p-2 rounded-lg text-[#41E43E] group-hover:bg-[#41E43E] group-hover:text-white transition-all shadow-sm">
          <Repeat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white transition-colors">Transfer</span>
          <span className="text-[10px] text-stone-400 group-hover:text-green-100 transition-colors">Transfers assets</span>
        </div>
        <MousePointer2 className="w-4 h-4 text-[#41E43E] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-auto p-4 bg-[#1A1D24] rounded-xl text-xs text-stone-400 border border-[#2A2B32]">
        <p className="font-bold mb-1 flex items-center gap-1 text-stone-200">💡 Pro Tip:</p>
        Drag and drop components to the canvas, then connect them to build logic.
      </div>
    </aside>
  );
};
