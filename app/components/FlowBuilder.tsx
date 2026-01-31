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
            toToken: 'BTC',
            amountType: 'percentage',
            amount: ''
        },
      };

      setNodes(nodes.concat(newNode));
    },
    [screenToFlowPosition, setNodes, nodes],
  );

  // --- 核心监控逻辑 (Price Check) ---
  useEffect(() => {
    if (!isRunning || showSuccessModal) return;

    const triggerNode = nodes.find(n => n.data.type === 'trigger');
    if (!triggerNode) return;

    const operator = triggerNode.data.operator as string;
    const threshold = parseFloat(triggerNode.data.threshold as string);

    if (isNaN(threshold)) return;

    let triggered = false;
    // 简单的判断逻辑
    if (operator === '>' && currentPrice > threshold) triggered = true;
    if (operator === '<' && currentPrice < threshold) triggered = true;

    if (triggered) {
        // Prevent infinite loop: if already active, skip update
        if (triggerNode.data.active) return;

        // 视觉反馈：让节点变绿
        setNodes(nodes.map(n => ({...n, data: {...n.data, active: true}})));
        
        // 执行链上交易
        const executeTransaction = async () => {
            try {
                // 获取 Action 节点配置的金额
                const actionNode = nodes.find(n => n.data.type === 'action');
                const amountStr = String(actionNode?.data.amount || "0.0001"); // 默认金额
                
                // Sepolia 网络配置
                const SWAP_ROUTER = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"; // Uniswap V3 Router
                const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
                const WBTC = "0x29f2D40B0605204364af54EC677bD022dA425d03"; // 你的 WBTC 地址
                const SEPOLIA_CHAIN_ID = '0xaa36a7';

                // 切换到 Sepolia
                await (window as any).ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });

                // 1. 准备金额 (ethers v6)
                const amountIn = ethers.parseEther(amountStr);

                // 2. 构建 Uniswap V3 exactInputSingle 参数
                const routerAbi = [
                    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
                ];
                const iface = new ethers.Interface(routerAbi);

                const params = {
                    tokenIn: WETH, // 输入 WETH (Router 会自动将 ETH 包装为 WETH)
                    tokenOut: WBTC,
                    fee: 3000, // 0.3% 手续费池
                    recipient: walletAddress,
                    amountIn: amountIn,
                    amountOutMinimum: 0, // 演示用，暂不设置滑点保护
                    sqrtPriceLimitX96: 0
                };

                const calldata = iface.encodeFunctionData("exactInputSingle", [params]);
                
                const valueHex = "0x" + amountIn.toString(16);

                const tx = await (window as any).ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: walletAddress,
                        to: SWAP_ROUTER,
                        value: valueHex, // 发送 ETH (Router 会自动 wrap 成 WETH)
                        data: calldata
                    }],
                });
                setTxHash(tx as string);
                setShowSuccessModal(true);
            } catch (error) {
                console.error("Transaction failed:", error);
                alert("Transaction rejected or failed.");
            } finally {
                setIsRunning(false);
                setNodes(nodes.map(n => ({...n, data: {...n.data, active: false}})));
            }
        };

        executeTransaction();
    }
  }, [currentPrice, isRunning, nodes, showSuccessModal, setNodes, walletAddress, setShowSuccessModal, setTxHash, setIsRunning]);

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