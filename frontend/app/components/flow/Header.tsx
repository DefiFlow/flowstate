import React, { useState } from 'react';
import { Wallet, Loader2, Play } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { PriceTicker } from './PriceTicker';
import { ethers } from 'ethers';
import { ARC_PAYROLL_ABI } from '../../utils/abis'; // Imported from your abi.ts

// Environment Variables
const ARC_PAYROLL_ADDRESS = process.env.NEXT_PUBLIC_ARC_PAYROLL_ADDRESS;
const ARC_USDC_ADDRESS = process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;

// Chain Configurations
const CHAINS = {
  SEPOLIA: {
    id: '0xaa36a7', // 11155111
    name: 'Sepolia',
    rpc: 'https://rpc.sepolia.org'
  },
  ARC: {
    id: '0x4cef52', // Hex for 5042002
    name: 'Arc Testnet',
    rpc: 'https://rpc.testnet.arc.network',
    nativeCurrency: {
      name: 'USD Coin',
      symbol: 'USDC', // Arc Testnet Gas is USDC
      decimals: 18
    }
  }
};

export const Header = () => {
  const {
    walletAddress,
    setWalletAddress,
    isRunning,
    setIsRunning,
    nodes,
    setTxHash,
    setShowSuccessModal
  } = useFlowStore();

  const [status, setStatus] = useState<string>(''); 

  // --- 1. Wallet Connection ---
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // --- 2. Network Switching Utility ---
  const switchNetwork = async (chainIdHex: string, chainName: string, rpcUrl: string, nativeCurrency?: any) => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: chainName,
              rpcUrls: [rpcUrl],
              nativeCurrency: nativeCurrency || { name: 'ETH', symbol: 'ETH', decimals: 18 }
            }],
          });
        } catch (addError) {
          throw new Error(`Failed to add ${chainName}`);
        }
      } else {
        throw switchError;
      }
    }
  };

  // --- 3. Core Execution Logic ---
  const handleStart = async () => {
    if (!walletAddress) {
      alert("⚠️ Please connect wallet first");
      return;
    }

    // 🔥 Critical: Match node types defined in actions.ts and CustomNode.tsx
    // Uniswap -> type: 'action'
    // Payroll -> type: 'transfer'
    const actionNode = nodes.find(n => n.type === 'action' || n.data?.type === 'action');
    const transferNode = nodes.find(n => n.type === 'transfer' || n.data?.type === 'transfer');

    if (!actionNode || !transferNode) {
      alert("⚠️ Flow incomplete. Please create a flow with Action (Uniswap) and Transfer (Payroll) nodes.");
      return;
    }

    setIsRunning(true);
    setStatus('Initializing Agent...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // ======================================================
      // PHASE 1: Sepolia (Visual Simulation - Swap & Bridge)
      // ======================================================
      setStatus('1/3: Swapping ETH on Sepolia via Uniswap v4...');
      await switchNetwork(CHAINS.SEPOLIA.id, CHAINS.SEPOLIA.name, CHAINS.SEPOLIA.rpc);

      // Extract Input ETH Amount from Action Node
      // The AI generates a string like "0.012", we sanitize it here.
      const inputVal = actionNode.data.input || "0.005";
      const cleanInput = inputVal.toString().replace(/[^0-9.]/g, '');
      const ethAmount = cleanInput || "0.005";
      
      console.log(`Phase 1: Sending ${ethAmount} ETH (Self-Transfer)`);

      // Send dummy transaction (Self-transfer) to simulate Swap interaction
      const tx1 = await signer.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther(ethAmount) 
      });
      
      setStatus('2/3: Bridging assets via LI.FI (Circle CCTP)...');
      await tx1.wait(); 

      // Simulate bridge latency for better UX
      await new Promise(r => setTimeout(r, 2000));

      // ======================================================
      // PHASE 2: Arc Testnet (Real Execution - Payroll Settlement)
      // ======================================================
      setStatus('3/3: Settling Payroll on Arc Testnet...');
      
      // Switch to Arc Testnet
      await switchNetwork(
        CHAINS.ARC.id, 
        CHAINS.ARC.name, 
        CHAINS.ARC.rpc, 
        CHAINS.ARC.nativeCurrency
      );
      
      // Refresh Signer (Required after network switch)
      const arcProvider = new ethers.BrowserProvider((window as any).ethereum);
      const arcSigner = await arcProvider.getSigner();
      
      if (!ARC_PAYROLL_ADDRESS || !ARC_USDC_ADDRESS) {
        throw new Error("Contract addresses not found in .env.local");
      }
      
      // Instantiate the Payroll Contract
      const payrollContract = new ethers.Contract(ARC_PAYROLL_ADDRESS, ARC_PAYROLL_ABI, arcSigner);

      // 🔍 Data Transformation: Extract from Transfer Node recipients array
      // CustomNode.tsx defines recipients as { address: string, amount: number }
      const recipientsData = (transferNode.data.recipients as any[]) || [];
      const memo = transferNode.data.memo || "Salary Distribution";

      let targetAddresses: string[] = [];
      let targetAmounts: bigint[] = [];

      if (recipientsData.length > 0) {
        // Filter out invalid recipients
        const validRecipients = recipientsData.filter(r => r.address && r.amount > 0);
        
        targetAddresses = validRecipients.map(r => r.address);
        // USDC has 6 decimals, so we use parseUnits(x, 6)
        targetAmounts = validRecipients.map(r => ethers.parseUnits(r.amount.toString(), 6));
      }

      // Fallback: If no valid recipients (or for pure demo purposes), use default values
      if (targetAddresses.length === 0) {
        console.warn("No valid recipients found in node, using fallback Demo data.");
        targetAddresses = [walletAddress, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]; // Self + Vitalik
        targetAmounts = [ethers.parseUnits("5", 6), ethers.parseUnits("5", 6)]; // 5 USDC each
      }

      console.log("🚀 Executing Payroll on Arc:", { targetAddresses, targetAmounts, memo });
      
      // Execute Contract Call
      const tx2 = await payrollContract.distributeSalary(
        ARC_USDC_ADDRESS,
        targetAddresses,
        targetAmounts,
        memo
      );

      setStatus('Finalizing Transactions...');
      const receipt = await tx2.wait();

      // Completion
      setTxHash(receipt.hash);
      setIsRunning(false);
      setShowSuccessModal(true);
      setStatus('');

    } catch (error: any) {
      console.error(error);
      alert(`Execution Failed: ${error.message || error}`);
      setIsRunning(false);
      setStatus('');
    }
  };

  // --- UI Rendering ---
  return (
    <div className="h-16 border-b border-[#2A2B32] bg-[#121314] flex items-center justify-between px-6 z-30 shadow-sm relative">
      <div className="flex items-center gap-6">
        <div className="font-black text-xl flex items-center gap-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 italic">
          FlowState
        </div>
        <PriceTicker />
      </div>

      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-blue-300 font-medium animate-pulse bg-blue-900/20 px-4 py-1.5 rounded-full border border-blue-500/20">
            <Loader2 className="animate-spin w-3.5 h-3.5" /> 
            {status}
          </div>
        )}

        <button
          onClick={connectWallet}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all text-sm border
              ${walletAddress 
                ? 'bg-[#1A1D24] text-gray-300 border-[#2A2B32] hover:bg-[#252830]' 
                : 'bg-white text-black border-transparent hover:bg-gray-200'}`}
        >
          <Wallet className="w-4 h-4" />
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : 'Connect Wallet'}
        </button>

        <button
          onClick={!isRunning ? handleStart : undefined}
          disabled={isRunning}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white transition-all shadow-[0_0_20px_rgba(67,92,255,0.3)] hover:shadow-[0_0_30px_rgba(67,92,255,0.5)] active:scale-95 text-sm
              ${isRunning ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'bg-gradient-to-r from-[#00BC99] to-[#435CFF]'}`}
        >
          {isRunning ? 'Processing...' : 'Start Agent'}
          {!isRunning && <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
      </div>
    </div>
  );
};