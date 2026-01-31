// app/components/flow/Header.tsx
import React, { useEffect, useState } from 'react';
import { Wallet, Loader2, Play } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { PriceTicker } from './PriceTicker';
import { ethers } from 'ethers';
import AgentExecutorData from '../../constants/AgentExecutor.json';

export const Header = () => {
  const { 
    walletAddress, 
    setWalletAddress, 
    isRunning, 
    setIsRunning,
    nodes,
    edges,
    currentPrice,
    setTxHash,
    setShowSuccessModal
  } = useFlowStore();
  const [isExecuting, setIsExecuting] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleStart = () => {
    if (!walletAddress) {
        alert("⚠️ Please connect your wallet first to execute on-chain transactions.");
        return;
    }

    const triggerNode = nodes.find(n => (n.data as any)?.type === 'trigger');
    const actionNode = nodes.find(n => (n.data as any)?.type === 'action');
    const transferNode = nodes.find(n => (n.data as any)?.type === 'transfer');

    if (!triggerNode || !triggerNode.data || !actionNode || !actionNode.data || !transferNode || !transferNode.data) {
        alert("⚠️ Flow is incomplete. A trigger, action, and transfer node are all required.");
        return;
    }

    const hasConnectionToAction = edges.some(edge => edge.source === triggerNode.id && edge.target === actionNode.id);
    const hasConnectionToTransfer = edges.some(edge => edge.source === actionNode.id && edge.target === transferNode.id);

    if (!hasConnectionToAction || !hasConnectionToTransfer) {
        alert("⚠️ Logic Broken: Please connect the nodes in the correct order: Trigger -> Action -> Transfer.");
        return;
    }

    setIsRunning(true);
  };

  // Agent Execution Logic
  useEffect(() => {
    if (!isRunning || !currentPrice || !walletAddress || isExecuting) return;
    
    const isValidAddress = (addr: string): addr is `0x${string}` => {
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    };

    const executeLogic = async () => {
        const triggerNode = nodes.find(n => (n.data as any)?.type === 'trigger');
        const actionNode = nodes.find(n => (n.data as any)?.type === 'action');
        const transferNode = nodes.find(n => (n.data as any)?.type === 'transfer');
        
        if (!triggerNode || !triggerNode.data || !actionNode || !actionNode.data || !transferNode || !transferNode.data) {
          setIsRunning(false);
          // This alert is likely redundant due to handleStart, but good for safety
          alert("⚠️ Flow is incomplete. A trigger, action, and transfer node are all required.");
          return;
        }

        const threshold = parseFloat((triggerNode.data as any).threshold);
        const operator = (triggerNode.data as any).operator;
        
        let conditionMet = false;
        if (operator === '>' && currentPrice > threshold) conditionMet = true;
        if (operator === '<' && currentPrice < threshold) conditionMet = true;

        if (conditionMet) {
            console.log("⚡ Condition Met! Executing Agent...");
            setIsExecuting(true);
            setIsRunning(false); 

            try {
                const provider = new ethers.BrowserProvider((window as any).ethereum);
                const signer = await provider.getSigner();

                const network = await provider.getNetwork();
                
                const AGENT_EXECUTOR_ADDRESS = AgentExecutorData.address;
                if (!AGENT_EXECUTOR_ADDRESS || !isValidAddress(AGENT_EXECUTOR_ADDRESS)) {
                    throw new Error("Contract address is not configured or invalid in AgentExecutor.json");
                }

                const finalRecipient = (transferNode.data as any).recipient;
                if (!finalRecipient || !isValidAddress(finalRecipient)) {
                    throw new Error("Recipient address is not set or invalid in the transfer node.");
                }
                
                const agentExecutorAbi = AgentExecutorData.abi;
                
                const contract = new ethers.Contract(AGENT_EXECUTOR_ADDRESS, agentExecutorAbi, signer) as any;

                const amountStr = String((actionNode.data as any).amount || "0.0001");
                const amountIn = ethers.parseEther(amountStr);
                
                const description = (actionNode.data as any).description || "Swapping ETH for UNI (Hackathon Demo)";

                // 前端调用逻辑
                const tx = await contract.executeSwapAndTransfer(
                    0, // amountOutMin
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // tokenOut (LINK Address)
                    description,
                    finalRecipient, // 接收人
                    { value: amountIn } // 附带 ETH
                );

                console.log("Transaction sent:", tx.hash);
                setTxHash(tx.hash);
                setShowSuccessModal(true);

            } catch (error: any) {
                console.error("Execution failed:", error);
                alert(`❌ Execution Failed: ${error.message}`);
            } finally {
                setIsExecuting(false);
                setIsRunning(false);
            }
        }
    };

    executeLogic();

  }, [currentPrice, isRunning, nodes, walletAddress, isExecuting, setTxHash, setShowSuccessModal]);
  
  return (
    <div className="h-16 border-b bg-white flex items-center justify-between px-6 z-30 shadow-sm relative">
      <div className="flex items-center gap-6">
          <div className="font-bold text-xl flex items-center gap-2 tracking-tight text-stone-900">
              🤖 DefiFlow <span className="text-[10px] bg-stone-900 text-white px-1.5 py-0.5 rounded font-mono">BETA</span>
          </div>
          <PriceTicker />
      </div>
      
      <div className="flex items-center gap-4">
          <button
              onClick={connectWallet}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all text-sm border
              ${walletAddress ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
          >
              <Wallet className="w-4 h-4" />
              {walletAddress 
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : 'Connect Wallet'}
          </button>
          {(isRunning || isExecuting) && (
              <div className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse bg-blue-50 px-3 py-1 rounded-full">
                  <Loader2 className="animate-spin w-3 h-3"/> Monitoring Active...
              </div>
          )}
          <button 
              onClick={isRunning ? () => setIsRunning(false) : handleStart}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm
              ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-stone-900 hover:bg-black'}`}
          >
              {isRunning ? 'Stop Agent' : 'Start Agent'}
              {!isRunning && <Play className="w-3 h-3 fill-current"/>}
          </button>
      </div>
    </div>
  );
};
