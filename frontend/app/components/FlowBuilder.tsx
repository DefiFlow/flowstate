"use client";

import React, { useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node as FlowNode,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MousePointer2 } from 'lucide-react';
import { ethers } from 'ethers';
import { useFlowStore } from '../store/useFlowStore';
import { CustomNode } from './flow/CustomNode';
import { Sidebar } from './flow/Sidebar';
import { Header } from './flow/Header';
import { SuccessModal } from './modals/SuccessModal';
import { AIModal } from './modals/AIModal';

const nodeTypes = { custom: CustomNode };

const isValidAddress = (addr: string): addr is `0x${string}` => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

// ==========================================
// 5. 主逻辑区域 (FlowArea)
// ==========================================
const FlowArea = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    currentPrice,
    isRunning,
    setIsRunning,
    showSuccessModal,
    setShowSuccessModal,
    showAIModal,
    walletAddress,
    setTxHash,
  } = useFlowStore();

  // --- 拖拽放置逻辑 ---
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
            const newNode: FlowNode = {
              id: `${type}-${Date.now()}`,
              type: 'custom',
              position,
              data: {
                  label,
                  type,
                  operator: '>',
                  threshold: '',
                  fromToken: 'ETH',
                  toToken: 'UNI',
                  amountType: 'percentage',
                  amount: ''
              },
            };
      setNodes(nodes.concat(newNode));
    },
    [screenToFlowPosition, setNodes, nodes],
  );

  return (
    <div className="w-full h-screen flex flex-col bg-stone-50 overflow-hidden font-sans">
      <Header />

      {/* 主体 */}
      <div className="flex-1 flex h-full" ref={reactFlowWrapper}>
        <Sidebar />
        
        <div className="flex-1 h-full bg-stone-100/50 relative">
           {nodes.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center text-stone-300 pointer-events-none z-10">
               <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="bg-white p-4 rounded-full shadow-sm">
                      <MousePointer2 className="w-8 h-8 text-stone-400" />
                  </div>
                  <span className="text-sm font-medium text-stone-400">Drag components from the sidebar to start</span>
               </div>
             </div>
           )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="#cbd5e1" gap={24} size={1} />
            <Controls className="bg-white border border-stone-200 shadow-lg rounded-xl overflow-hidden !m-4" />
            <MiniMap 
                className="!border border-stone-200 !rounded-xl !shadow-lg !m-4" 
                maskColor="rgba(255, 255, 255, 0.8)" 
                nodeColor={(n) => n.data.type === 'trigger' ? '#3b82f6' : '#ec4899'} 
            />
          </ReactFlow>
        </div>
      </div>

      {showSuccessModal && <SuccessModal />}
      {showAIModal && <AIModal />}
    </div>
  );
};

// ==========================================
// 6. 导出根组件
// ==========================================
export default function App() {
  return (
    <ReactFlowProvider>
      <FlowArea />
    </ReactFlowProvider>
  );
}