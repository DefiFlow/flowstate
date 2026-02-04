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
          fromToken: 'USDC',
          toToken: 'UNI',
          amountType: 'percentage',
          amount: '',
          // Initialize ENS node with demo data, Transfer node with memo
          recipients: type === 'ens' ? [{ address: '', amount: 10, input: 'vitalik.eth' }] : [],
          memo: type === 'transfer' ? 'Feb 2026 Salary' : ''
        },
      };
      setNodes(nodes.concat(newNode as any));
    },
    [screenToFlowPosition, setNodes, nodes],
  );

  return (
    <div className="w-full h-screen flex flex-col bg-stone-50 overflow-hidden font-sans">
      <Header />

      {/* 主体 */}
      <div className="flex-1 flex h-full" ref={reactFlowWrapper}>
        <Sidebar />

        <div className="flex-1 h-full bg-[#08090A] relative">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                <div className="bg-[#1A1D24] p-5 rounded-full shadow-2xl border border-[#2A2B32]">
                  <MousePointer2 className="w-10 h-10 text-stone-600" />
                </div>
                <span className="text-sm font-medium text-stone-600">Drag components from the sidebar to start</span>
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
            defaultEdgeOptions={{
              style: { stroke: 'url(#edge-gradient)', strokeWidth: 3 },
              animated: true,
            }}
          >
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00FFD0" />
                  <stop offset="100%" stopColor="#435CFF" />
                </linearGradient>
                <linearGradient id="trigger-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2B4572" />
                  <stop offset="100%" stopColor="#1B1D1F" />
                </linearGradient>
                <linearGradient id="action-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#69314D" />
                  <stop offset="100%" stopColor="#1B1D1F" />
                </linearGradient>
                <linearGradient id="transfer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#306357" />
                  <stop offset="100%" stopColor="#1B1D1F" />
                </linearGradient>
              </defs>
            </svg>
            <Background color="#1A1D24" gap={24} size={1} />
            <Controls className="bg-[#1A1D24] border border-[#2A2B32] shadow-2xl rounded-xl overflow-hidden !m-4" />
            <MiniMap
              className="!rounded-xl !shadow-2xl !m-4 !bg-[#1A1D24] !border-0"
              maskColor="rgba(0, 0, 0, 0)"
              nodeColor={(n) => {
                if (n.data.type === 'ens') return '#FFB800'; // ENS Yellow/Orange
                if (n.data.type === 'action') return '#FF5D73';
                if (n.data.type === 'transfer') return '#41E43E';
                return '#6b7280';
              }}
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