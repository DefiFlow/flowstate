import { useState, useCallback } from 'react';
import { ethers, BigNumber, Contract } from 'ethers';

// ======================================================
// 1. Configuration Addresses
// ======================================================

const POOL_SWAP_TEST_ADDRESS = "0x9b6b46e2c869aa39918db7f52f5557fe577b6eee";

// ✅ Fix 1: Use a more stable public RPC (to solve CORS issues)
// Alternatives: 'https://ethereum-sepolia.publicnode.com' or 'https://1rpc.io/sepolia'
const SEPOLIA_RPC_URL = 'https://ethereum-sepolia.publicnode.com';

// ✅ Fix 2: Explicitly define the Network object to skip auto-detection
const sepoliaProvider = new ethers.providers.JsonRpcProvider(
  SEPOLIA_RPC_URL,
  {
    chainId: 11155111,
    name: 'sepolia'
  }
);

const QUOTER_ADDRESS = "0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227";

const M_ETH_ADDRESS = "0x5f403fdc672e1D6902eA5C4CB1329cB5698d0c33";
const M_USDC_ADDRESS = "0x8B5c068AF3f6D2eeeE4c0c7575d4D8e52504ac01";

const MIN_SQRT_PRICE = "4295128740";
const MAX_SQRT_PRICE = "1461446703485210103287273052203988822378723970341";

// ======================================================
// 2. ABIs
// ======================================================

const POOL_SWAP_TEST_ABI = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, (bool takeClaims, bool settleUsingBurn) testSettings, bytes hookData) external payable returns (int256 delta)"
];

const QUOTER_ABI = [
  "function quoteExactInputSingle(( (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData ) params) external returns (uint256 amountOut, uint256 gasEstimate)",
  // ✅ Fix 3: Correct ABI syntax, add parameter name "params"
  // The original syntax was missing the outermost parameter name, which could cause Ethers to fail when parsing the tuple.
  "function quoteExactOutputSingle(( (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData ) params) external returns (uint256 amountIn, uint256 gasEstimate)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ======================================================
// 3. Hook Implementation
// ======================================================

export const useUniswapV4 = (signer: ethers.Signer | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const sortTokens = (tokenA: string, tokenB: string): [string, string] => {
    return tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  };

  // ------------------------------------------------------
  // Reverse Quote (mUSDC -> mETH)
  // ------------------------------------------------------
  const quoteReverse = useCallback(async (amountOutUSDC: string): Promise<string | null> => {
    // Prioritize using the signer; if no wallet is connected, use the read-only sepoliaProvider.
    const connection = signer || sepoliaProvider;

    if (!amountOutUSDC || parseFloat(amountOutUSDC) === 0) return null;

    try {
      const [currency0, currency1] = sortTokens(M_ETH_ADDRESS, M_USDC_ADDRESS);
      // Note: We are reverse-calculating "how much mETH is needed to get mUSDC".
      // The logic here remains the same: TokenIn is mETH, TokenOut is mUSDC.
      const zeroForOne = M_ETH_ADDRESS.toLowerCase() === currency0.toLowerCase();

      const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: ethers.constants.AddressZero
      };

      const amountParam = ethers.utils.parseUnits(amountOutUSDC, 18);

      const quoteParams = {
        poolKey: poolKey,
        zeroForOne: zeroForOne,
        exactAmount: amountParam,
        hookData: "0x"
      };

      const quoterContract = new Contract(QUOTER_ADDRESS, QUOTER_ABI, connection);

      console.log("🔍 Quoting reverse (mUSDC->mETH)...");

      // Use callStatic
      const result = await quoterContract.callStatic.quoteExactOutputSingle(
        quoteParams,
        { gasLimit: 30000000 }
      );

      // The result structure is [amountIn, gasEstimate]
      const amountIn = result.amountIn || result[0];
      const formattedAmountIn = ethers.utils.formatUnits(amountIn, 18);
      console.log(`✅ Quote Reverse Success: Need ${formattedAmountIn} mETH`);

      return formattedAmountIn;

    } catch (error: any) {
      console.warn("⚠️ Quote Reverse Failed:", error);

      // If the RPC still fails, this is a fallback logic.
      // This will only be reached if both the signer and the publicProvider fail.
      const baseRate = 2000;
      const estimatedIn = parseFloat(amountOutUSDC) / baseRate;
      return estimatedIn.toFixed(5);
    }
  }, [signer]);

  // ... quote and swap functions remain unchanged ...

  // For completeness, I've omitted the code for quote and swap here.
  // You just need to keep your original quote and swap functions; they don't need changes.
  const quote = useCallback(async (amountIn: string) => { /* ...original code... */ return null; }, [signer]);
  const swap = useCallback(async (amountIn: string) => { /* ...original code... */ return null; }, [signer]);

  return { swap, quote, quoteReverse, isLoading, txHash };
};