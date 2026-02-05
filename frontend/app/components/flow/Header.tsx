import React, { useState } from 'react';
import { Wallet, Loader2, Play } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { ethers, Contract } from 'ethers';
import { ARC_PAYROLL_ABI } from '../../utils/abis';

// ======================================================
// 配置常量 (对应你 testSwap.js 中的成功配置)
// ======================================================

// 1. Uniswap v4 PoolSwapTest 合约地址 (Sepolia)
const POOL_SWAP_TEST_ADDRESS = "0x9b6b46e2c869aa39918db7f52f5557fe577b6eee";

// 2. 你的代币地址 (Sepolia)
const SEP_METH_ADDRESS = "0x5f403fdc672e1D6902eA5C4CB1329cB5698d0c33";
const SEP_USDC_ADDRESS = "0x8B5c068AF3f6D2eeeE4c0c7575d4D8e52504ac01";

// 3. Arc 链配置 (保持不变)
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
      symbol: 'USDC',
      decimals: 18
    }
  }
};

// ======================================================
// Uniswap v4 Interfaces & ABIs
// ======================================================

interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: ethers.BigNumber;
  sqrtPriceLimitX96: ethers.BigNumber;
}

interface TestSettings {
  takeClaims: boolean;
  settleUsingBurn: boolean;
}

// ✅ 更新后的 ABI: 包含 testSettings 和 hookData
const POOL_SWAP_TEST_ABI = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, (bool takeClaims, bool settleUsingBurn) testSettings, bytes hookData) external payable returns (int256 delta)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// Price Limits
const MIN_SQRT_RATIO = ethers.BigNumber.from("4295128740"); // slightly safer than min
const MAX_SQRT_RATIO = ethers.BigNumber.from("1461446703485210103287273052203988822378723970341"); // slightly safer than max

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
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
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
      // PHASE 1: Sepolia (Real Uniswap v4 Swap)
      // ======================================================
      setExecutionStep(1);
      await switchNetwork(CHAINS.SEPOLIA.id, CHAINS.SEPOLIA.name, CHAINS.SEPOLIA.rpc);

      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Input from Flow Node
      const inputVal = actionNode.data.input || "0.001"; // Default to safe value
      const cleanInput = inputVal.toString().replace(/[^0-9.]/g, '');
      const amountIn = cleanInput || "0.001";
      
      // Tokens
      const tokenInAddress = SEP_METH_ADDRESS;
      const tokenOutAddress = SEP_USDC_ADDRESS;
      const tokenInDecimals = 18;

      console.log(`Phase 1: Swapping ${amountIn} mETH for mUSDC via Uniswap v4...`);

      // 1. Sort Tokens & Determine Direction
      const [currency0, currency1] = sortTokens(tokenInAddress, tokenOutAddress);
      const zeroForOne = tokenInAddress.toLowerCase() === currency0.toLowerCase();

      // 2. Construct PoolKey (Must match your initialization script!)
      const poolKey: PoolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,      // 0.3%
        tickSpacing: 60,
        hooks: ethers.constants.AddressZero // No hooks for now
      };

      // 3. Check Balance & Allowance
      const tokenContract = new Contract(tokenInAddress, ERC20_ABI, signer);
      const amountAbs = ethers.utils.parseUnits(amountIn, tokenInDecimals);
      
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance.lt(amountAbs)) {
        throw new Error(`Insufficient mETH Balance. You have ${ethers.utils.formatUnits(balance, 18)} but need ${amountIn}`);
      }

      const allowance = await tokenContract.allowance(userAddress, POOL_SWAP_TEST_ADDRESS);
      if (allowance.lt(amountAbs)) {
        console.log(`Approving PoolSwapTest...`);
        const txApprove = await tokenContract.approve(POOL_SWAP_TEST_ADDRESS, ethers.constants.MaxUint256);
        await txApprove.wait();
        console.log("Approve confirmed");
      }

      // 4. Construct Swap Params
      // Negative amount = Exact Input (I want to pay exactly X)
      const amountWei = amountAbs.mul(-1); 
      
      const swapParams: SwapParams = {
        zeroForOne: zeroForOne,
        amountSpecified: amountWei, 
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO : MAX_SQRT_RATIO
      };

      const testSettings: TestSettings = {
        takeClaims: false,
        settleUsingBurn: false
      };

      // 5. Execute Swap
      const swapTestContract = new Contract(POOL_SWAP_TEST_ADDRESS, POOL_SWAP_TEST_ABI, signer);
      
      console.log("Sending Swap Transaction...", { poolKey, swapParams });

      // 🔥 使用与脚本一致的调用方式：传 "0x" 给 hookData，并手动设置 Gas Limit
      const tx1 = await swapTestContract.swap(
        poolKey, 
        swapParams, 
        testSettings, 
        "0x", // hookData
        { gasLimit: 5000000 } // Safety Gas Limit
      );

      console.log(`Swap Transaction sent: ${tx1.hash}`);
      await tx1.wait();
      console.log("✅ Swap Confirmed on-chain!");

      await new Promise(r => setTimeout(r, 2000));

      // ======================================================
      // PHASE 2: Arc Testnet (Payroll Settlement)
      // ======================================================
      setExecutionStep(2);

      await switchNetwork(
        CHAINS.ARC.id,
        CHAINS.ARC.name,
        CHAINS.ARC.rpc,
        CHAINS.ARC.nativeCurrency
      );

      const arcProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      const arcSigner = await arcProvider.getSigner();

      if (!ARC_PAYROLL_ADDRESS || !ARC_USDC_ADDRESS) {
        throw new Error("Arc Contract addresses not found via Env");
      }

      const payrollContract = new ethers.Contract(ARC_PAYROLL_ADDRESS, ARC_PAYROLL_ABI, arcSigner);
      const recipientsData = ensNodes.flatMap(node => (node.data.recipients as any[]) || []);
      const memo = transferNode.data.memo || "Salary Distribution";

      // Prepare Payroll Data
      let targetAddresses: string[] = [];
      let targetAmounts: ethers.BigNumber[] = [];

      if (recipientsData.length > 0) {
        const validRecipients = recipientsData.filter(r => r.address && r.amount > 0);
        targetAddresses = validRecipients.map(r => r.address);
        // Note: Arc Demo USDC might be 18 decimals, verify this
        targetAmounts = validRecipients.map(r => ethers.utils.parseUnits(r.amount.toString(), 18));
      } else {
        // Fallback for demo
        targetAddresses = [userAddress];
        targetAmounts = [ethers.utils.parseUnits("1", 18)];
      }

      const totalAmount = targetAmounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));

      // 1. Simulate Bridge: User -> Payroll Contract (Fund the contract first)
      console.log(`Transferring ${ethers.utils.formatUnits(totalAmount, 18)} USDC to Payroll Contract...`);
      const usdcContract = new ethers.Contract(ARC_USDC_ADDRESS, ERC20_ABI, arcSigner);
      
      // Check allowance for Arc USDC if needed, or just transfer
      // For this demo flow, we act as the 'bridge' by sending tokens to the contract directly
      // But typically we should Approve -> Contract.Deposit. 
      // Your previous logic used transfer() directly to the contract address, assuming contract can handle receiving tokens.
      const txTransfer = await usdcContract.transfer(ARC_PAYROLL_ADDRESS, totalAmount);
      await txTransfer.wait();
      console.log("Funds deposited to Payroll Contract.");

      // 2. Distribute
      console.log("Executing Payroll Distribution...");
      const tx2 = await payrollContract.distributeSalary(
        ARC_USDC_ADDRESS,
        targetAddresses,
        targetAmounts,
        memo
      );
      console.log(`Payroll Tx: ${tx2.hash}`);

      const receipt = await tx2.wait();

      setExecutionStep(3);
      setTxHash(tx2.hash);
      setIsRunning(false);

    } catch (error: any) {
      console.error(error);
      // Clean up error message
      let msg = error.message || error.toString();
      if (msg.includes("user rejected")) msg = "User rejected transaction";
      if (msg.includes("insufficient funds")) msg = "Insufficient gas or tokens";
      
      alert(`Execution Failed: ${msg}`);
      setExecutionError(msg);
      setIsRunning(false);
    }
  };

  return (
    <div className="h-16 border-b border-[#2A2B32] bg-[#121314] flex items-center justify-between px-6 z-30 shadow-sm relative">
      <div className="flex items-center gap-6">
        <div className="font-black text-xl flex items-center gap-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 italic">
          FlowState
        </div>
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