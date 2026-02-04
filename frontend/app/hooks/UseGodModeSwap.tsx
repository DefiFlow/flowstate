import { useState, useCallback } from 'react';
import { ethers, Contract, TransactionResponse } from 'ethers';

// ==========================================
// 1. Type Definitions
// ==========================================

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

// Environment variable type check (to prevent undefined)
const ENV = {
  POOL_MANAGER: process.env.NEXT_PUBLIC_POOL_MANAGER as string,
  ROUTER: process.env.NEXT_PUBLIC_ROUTER as string,
  USDC: process.env.NEXT_PUBLIC_SEP_USDC_ADDRESS as string,
  METH: process.env.NEXT_PUBLIC_SEP_METH_ADDRESS as string,
};

// Simple ABI definitions (Human-Readable ABI)
const ROUTER_ABI = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable returns (int256 delta)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

// Uniswap V3 constants for sqrt price limits
const MIN_SQRT_RATIO = BigInt("4295128739");
const MAX_SQRT_RATIO = BigInt("1461446703485210103287273052203988822378723970342");

// ==========================================
// 2. Hook Implementation
// ==========================================

export const useGodModeSwap = (signer: ethers.Signer | null | undefined) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper function: Uniswap requires token addresses to be sorted lexicographically.
   */
  const sortTokens = (tokenA: string, tokenB: string): [string, string] => {
    return tokenA.toLowerCase() < tokenB.toLowerCase() 
      ? [tokenA, tokenB] 
      : [tokenB, tokenA];
  };

  /**
   * Core swap function
   * @param amountIn The input amount (e.g., "10")
   * @param tokenInAddress The input token address
   * @param tokenOutAddress The output token address
   * @param tokenInDecimals The decimals of the input token (defaults to 18)
   */
  const handleSwap = useCallback(async (
    amountIn: string,
    tokenInAddress: string,
    tokenOutAddress: string, // Although it's 1:1 in the mock, we need the counterparty for logic completeness
    tokenInDecimals: number = 18
  ) => {
    // 1. Basic checks
    if (!signer) {
      setError("Wallet not connected");
      return;
    }
    if (!ENV.ROUTER || !ENV.POOL_MANAGER) {
      setError("Environment variables missing");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      console.log("🚀 [GodMode] Starting Swap...");

      // 2. Prepare data: sort tokens and construct PoolKey
      // Note: The GodMode contract hardcodes fee=3000, tickSpacing=60
      const [currency0, currency1] = sortTokens(tokenInAddress, tokenOutAddress);
      
      const poolKey: PoolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: ethers.ZeroAddress
      };

      // 3. Determine swap direction
      // zeroForOne = true  => sell currency0, buy currency1
      // zeroForOne = false => sell currency1, buy currency0
      const zeroForOne = tokenInAddress.toLowerCase() === currency0.toLowerCase();

      // 4. Handle amount precision
      // We use parseUnits with the token's decimals for accuracy.
      const amountWei = ethers.parseUnits(amountIn, tokenInDecimals);

      // 5. Approve if necessary
      // The user must approve the Router to transfer their tokens.
      const tokenContract = new Contract(tokenInAddress, ERC20_ABI, signer);
      const ownerAddress = await signer.getAddress();
      
      console.log(`🔍 Checking allowance for ${tokenInAddress}...`);
      const allowance = await tokenContract.allowance(ownerAddress, ENV.ROUTER);

      if (allowance < amountWei) {
        console.log(`🔓 Allowance is insufficient. Approving ${amountIn} of ${tokenInAddress} for Router...`);
        const txApprove: TransactionResponse = await tokenContract.approve(ENV.ROUTER, amountWei);
        await txApprove.wait();
        console.log("✅ Approve confirmed");
      } else {
        console.log("👍 Allowance is sufficient.");
      }

      // 6. Call Router Swap
      const routerContract = new Contract(ENV.ROUTER, ROUTER_ABI, signer);

      const swapParams: SwapParams = {
        zeroForOne: zeroForOne,
        amountSpecified: amountWei, // A positive number indicates an exact input swap
        // For an exact input swap, the price limit is set to the MIN/MAX price
        // to avoid reverting the transaction when the price crosses a tick boundary.
        // This is a safer alternative to 0, which means no price limit.
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO + BigInt(1) : MAX_SQRT_RATIO - BigInt(1)
      };

      console.log("🌊 Sending Swap Transaction...", { poolKey, swapParams });

      // Call the swap function
      // Pass empty bytes "0x" for the 3rd parameter (hookData)
      const txSwap: TransactionResponse = await routerContract.swap(
        poolKey,
        swapParams,
        "0x"
      );

      console.log(`⏳ Transaction sent: ${txSwap.hash}`);
      setTxHash(txSwap.hash);

      await txSwap.wait();
      console.log("🎉 Swap Confirmed!");

    } catch (err: unknown) {
      console.error("❌ Swap Failed:", err);
      // Handle Ethers error object, extract readable message
      let message = "An unknown error occurred.";
      if (typeof err === 'object' && err !== null) {
        if ('shortMessage' in err) {
          message = (err as { shortMessage: string }).shortMessage;
        } else if ('message' in err) {
          message = (err as { message: string }).message;
        }
      } else if (typeof err === 'string') {
        message = err;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [signer]);

  return { handleSwap, loading, txHash, error };
};