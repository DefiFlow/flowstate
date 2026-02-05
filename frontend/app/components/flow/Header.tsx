import React, { useState } from 'react';
import { Wallet, Loader2, Play } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { PriceTicker } from './PriceTicker';
import { ethers, Contract, TransactionResponse } from 'ethers';
import { ARC_PAYROLL_ABI } from '../../utils/abis'; // Imported from your abi.ts

// Environment Variables
const ARC_PAYROLL_ADDRESS = process.env.NEXT_PUBLIC_ARC_PAYROLL_ADDRESS;
const ARC_USDC_ADDRESS = process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;
const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER;
const SEP_METH_ADDRESS = process.env.NEXT_PUBLIC_SEP_METH_ADDRESS;
const SEP_USDC_ADDRESS = process.env.NEXT_PUBLIC_SEP_USDC_ADDRESS;

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

// ======================================================
// Uniswap v4 Swap Logic (from useGodModeSwap hook)
// ======================================================

// Corresponds to the PoolKey struct in Solidity
interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

// Corresponds to the SwapParams struct in Solidity
interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}

// ABIs for contract interaction
const ROUTER_ABI = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable returns (int256 delta)"
];
const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)" // <--- 补上这一行
];

// Uniswap V3 constants for sqrt price limits
const MIN_SQRT_RATIO = BigInt("4295128739");
const MAX_SQRT_RATIO = BigInt("1461446703485210103287273052203988822378723970342");

/**
 * Helper function: Uniswap requires token addresses to be sorted lexicographically.
 */
const sortTokens = (tokenA: string, tokenB: string): [string, string] => {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
};

// ======================================================
// Header Component
// ======================================================

export const Header = () => {
  const {
    walletAddress,
    setWalletAddress,
    isRunning,
    setIsRunning,
    nodes,
    setTxHash,
    setShowSuccessModal,
    setExecutionStep,
    setExecutionError,
  } = useFlowStore();

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
    const actionNode = nodes.find(n => n.type === 'action' || n.data?.type === 'action');
    const ensNodes = nodes.filter(n => n.type === 'ens' || n.data?.type === 'ens');
    const transferNode = nodes.find(n => n.type === 'transfer' || n.data?.type === 'transfer');

    if (!actionNode || ensNodes.length === 0 || !transferNode) {
      alert("⚠️ Flow incomplete. Please create a flow with Action (Uniswap), ENS, and Transfer (Payroll) nodes.");
      return;
    }

    setIsRunning(true);
    setExecutionError(null);
    setShowSuccessModal(true);
    setExecutionStep(0);

    try {
      // ======================================================
      // PHASE 1: Sepolia (Uniswap v4 God-Mode Swap)
      // ======================================================
      setExecutionStep(1);
      await switchNetwork(CHAINS.SEPOLIA.id, CHAINS.SEPOLIA.name, CHAINS.SEPOLIA.rpc);

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      if (!ROUTER_ADDRESS || !SEP_METH_ADDRESS || !SEP_USDC_ADDRESS) {
        throw new Error("Swap-related environment variables are missing in .env");
      }

      // Extract Input Amount
      const inputVal = actionNode.data.input || "0.005";
      const cleanInput = inputVal.toString().replace(/[^0-9.]/g, '');
      const amountIn = cleanInput || "0.005";
      const tokenInAddress = SEP_METH_ADDRESS;
      const tokenOutAddress = SEP_USDC_ADDRESS;
      const tokenInDecimals = 18;

      console.log(`Phase 1: Swapping ${amountIn} M-ETH for USDC...`);

      const [currency0, currency1] = sortTokens(tokenInAddress, tokenOutAddress);

      const poolKey: PoolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: ethers.ZeroAddress
      };

      const zeroForOne = tokenInAddress.toLowerCase() === currency0.toLowerCase();

      // [修改点 1] 添加负号！
      // Uniswap 中：负数 = Exact Input (精确卖出输入金额)
      // 正数 = Exact Output (精确买入输出金额)
      const amountWei = -ethers.parseUnits(amountIn, tokenInDecimals);

      const tokenContract = new Contract(tokenInAddress, ERC20_ABI, signer);
      const ownerAddress = await signer.getAddress();

      console.log(`Checking allowance for ${tokenInAddress}...`);
      // 注意：检查 allowance 时要用绝对值 (abs)
      const amountAbs = ethers.parseUnits(amountIn, tokenInDecimals);
      const allowance = await tokenContract.allowance(ownerAddress, ROUTER_ADDRESS);

      if (allowance < amountAbs) {
        console.log(`Approving M-ETH...`);
        const txApprove: TransactionResponse = await tokenContract.approve(ROUTER_ADDRESS, amountAbs);
        await txApprove.wait();
        console.log("Approve confirmed");
      }

      const routerContract = new Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

      const swapParams: SwapParams = {
        zeroForOne: zeroForOne,
        amountSpecified: amountWei, // 传入负数
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO + BigInt(1) : MAX_SQRT_RATIO - BigInt(1)
      };

      console.log("Sending Swap Transaction...", { poolKey, swapParams });

      const tx1: TransactionResponse = await routerContract.swap(poolKey, swapParams, "0x");
      console.log(`Swap Transaction sent: ${tx1.hash}`);
      await tx1.wait();
      console.log("Swap Confirmed!");

      await new Promise(r => setTimeout(r, 2000));

      // ======================================================
      // PHASE 2: Arc Testnet (Real Execution - Payroll Settlement)
      // ======================================================
      setExecutionStep(2);

      await switchNetwork(
        CHAINS.ARC.id,
        CHAINS.ARC.name,
        CHAINS.ARC.rpc,
        CHAINS.ARC.nativeCurrency
      );

      const arcProvider = new ethers.BrowserProvider((window as any).ethereum);
      const arcSigner = await arcProvider.getSigner();

      if (!ARC_PAYROLL_ADDRESS || !ARC_USDC_ADDRESS) {
        throw new Error("Contract addresses not found in .env.local");
      }

      const payrollContract = new ethers.Contract(ARC_PAYROLL_ADDRESS, ARC_PAYROLL_ABI, arcSigner);

      const recipientsData = ensNodes.flatMap(node => (node.data.recipients as any[]) || []);
      const memo = transferNode.data.memo || "Salary Distribution";

      let targetAddresses: string[] = [];
      let targetAmounts: bigint[] = [];

      if (recipientsData.length > 0) {
        const validRecipients = recipientsData.filter(r => r.address && r.amount > 0);
        targetAddresses = validRecipients.map(r => r.address);
        targetAmounts = validRecipients.map(r => ethers.parseUnits(r.amount.toString(), 18));
      }

      if (targetAddresses.length === 0) {
        console.warn("Using fallback Demo data.");
        targetAddresses = [walletAddress, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"];
        targetAmounts = [ethers.parseUnits("5", 6), ethers.parseUnits("5", 18)];
      }

      console.log("🚀 Executing Payroll on Arc:", { targetAddresses, targetAmounts, memo });

      // [修改点 2] 自动充值逻辑
      // 解决 "Insufficient contract balance" 问题
      // 模拟 Bridge 行为：先把钱转给合约，然后再由合约分发
      const totalAmount = targetAmounts.reduce((a, b) => a + b, BigInt(0));

      console.log(`Simulating Bridge: Transferring ${ethers.formatUnits(totalAmount, 18)} USDC to Payroll Contract...`);
      const usdcContract = new ethers.Contract(ARC_USDC_ADDRESS, ERC20_ABI, arcSigner);

      // 这一步是将你钱包里的 mUSDC -> 转给 ArcPayroll 合约
      const txTransfer = await usdcContract.transfer(ARC_PAYROLL_ADDRESS, totalAmount);
      await txTransfer.wait();
      console.log("Bridge Simulation Complete: Funds arrived at contract.");

      // Execute Contract Call (Now the contract has funds!)
      const tx2 = await payrollContract.distributeSalary(
        ARC_USDC_ADDRESS,
        targetAddresses,
        targetAmounts,
        memo
      );
      console.log(`Payroll Transaction sent: ${tx2.hash}`)

      const receipt = await tx2.wait();

      setExecutionStep(3);
      setTxHash(receipt.hash);
      setIsRunning(false);

    } catch (error: any) {
      console.error(error);
      alert(`Execution Failed: ${error.message || error}`);
      setExecutionError(error.message || 'An unknown error occurred.');
      setIsRunning(false);
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
        <button
          onClick={connectWallet}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all text-sm border
              ${walletAddress
              ? 'bg-[#1A1D24] text-gray-300 border-[#2A2B32] hover:bg-[#252830]'
              : 'bg-transparent text-white border-white/20 hover:bg-white/5'}`}
        >
          {walletAddress ? (
            <Wallet className="w-4 h-4" />
          ) : (
            <img src="/wallet.png" alt="Wallet" className="w-4 h-4 object-contain" />
          )}
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