const { ethers } = require("hardhat");
const { Token, Percent } = require("@uniswap/sdk-core");
const { Pool, Position, V4PositionManager } = require("@uniswap/v4-sdk");
const JSBI = require("jsbi");

// --- Helper: Uniswap V4 Tick Math ---
function getTickAtSqrtRatio(sqrtPriceX96Str) {
  const sqrtPrice = BigInt(sqrtPriceX96Str);
  const q96 = 2n ** 96n;
  const ratio = Number(sqrtPrice) / Number(q96);
  const price = ratio * ratio;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🚀 Running Infinite Liquidity Script (Ethers v5) with account:", signer.address);

  // --- 1. Configure Addresses (Sepolia) ---
  const POSITION_MANAGER_ADDRESS = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4"; 
  const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
  
  const M_ETH_ADDRESS = "0x5f403fdc672e1D6902eA5C4CB1329cB5698d0c33"; 
  const M_USDC_ADDRESS = "0x8B5c068AF3f6D2eeeE4c0c7575d4D8e52504ac01"; 
  
  const CHAIN_ID = 11155111; 

  // --- 2. Prepare Token Instances ---
  const DECIMALS = 18; 
  const token0 = new Token(CHAIN_ID, M_ETH_ADDRESS, DECIMALS, "mETH");
  const token1 = new Token(CHAIN_ID, M_USDC_ADDRESS, DECIMALS, "mUSDC");

  // --- 3. [Key Step] God Mode: Mint tokens for self ---
  console.log("\n💰 [God Mode] Minting massive tokens to self...");
  
  const tokenAbi = [
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
  ];
  
  const mEthContract = new ethers.Contract(M_ETH_ADDRESS, tokenAbi, signer);
  const mUsdcContract = new ethers.Contract(M_USDC_ADDRESS, tokenAbi, signer);

  // [Ethers v5] Use ethers.utils.parseUnits
  const mintAmountEth = ethers.utils.parseUnits("100000", 18);
  const mintAmountUsdc = ethers.utils.parseUnits("200000000", 18);

  try {
    const tx1 = await mEthContract.mint(signer.address, mintAmountEth);
    await tx1.wait();
    console.log(`   Minted 100,000 mETH`);

    const tx2 = await mUsdcContract.mint(signer.address, mintAmountUsdc);
    await tx2.wait();
    console.log(`   Minted 200,000,000 mUSDC`);
  } catch (e) {
    console.log("   ⚠️ Minting failed (maybe not owner?), proceeding with existing balance...");
  }

  // --- 4. Approve ---
  console.log("\n🔓 Approving Permit2 & PositionManager...");
  const permit2Abi = ["function approve(address token, address spender, uint160 amount, uint48 expiration) external"];
  const permit2Contract = new ethers.Contract(PERMIT2_ADDRESS, permit2Abi, signer);

  // [Ethers v5] Use ethers.constants.MaxUint256
  await (await mEthContract.approve(PERMIT2_ADDRESS, ethers.constants.MaxUint256)).wait();
  await (await mUsdcContract.approve(PERMIT2_ADDRESS, ethers.constants.MaxUint256)).wait();

  // Permit2 -> PositionManager
  const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; 
  const maxAmount160 = "1461501637330902918203684832716283019655932542975"; 
  
  await (await permit2Contract.approve(M_ETH_ADDRESS, POSITION_MANAGER_ADDRESS, maxAmount160, expiration)).wait();
  await (await permit2Contract.approve(M_USDC_ADDRESS, POSITION_MANAGER_ADDRESS, maxAmount160, expiration)).wait();
  console.log("   Approvals done.");

  // --- 5. Build Pool and Position ---
  // Use hardcoded price from script (1 ETH ≈ 2000 USDC)
  const sqrtPriceX96Str = "3543191142285914205922034323214";
  const sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96Str);
  const fee = 3000;
  const tickSpacing = 60;
  const currentTick = getTickAtSqrtRatio(sqrtPriceX96Str);

  const pool = new Pool(
    token0,
    token1,
    fee,
    tickSpacing,
    "0x0000000000000000000000000000000000000000", // No hooks
    sqrtPriceX96,
    0, 
    currentTick
  );

  // --- 6. Set "Infinite" Range (Full Range) ---
  // -887220 to 887220 is a common full range for ticks (multiple of 60)
  const tickLower = -887220; 
  const tickUpper = 887220;

  console.log(`\n🌊 Configuration:`);
  console.log(`   Range: [${tickLower}, ${tickUpper}] (Full Range)`);
  console.log(`   Price: ~2000 mUSDC per mETH`);

  // --- 7. Add Massive Liquidity ---
  // [Ethers v5] Use ethers.utils.parseUnits
  const amount0Desired = ethers.utils.parseUnits("10000", 18); // 10k ETH
  const amount1Desired = ethers.utils.parseUnits("20000000", 18); // 20m USDC

  const position = Position.fromAmounts({
    pool: pool,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amount0: amount0Desired.toString(),
    amount1: amount1Desired.toString(),
    useFullPrecision: true
  });

  console.log(`\n💧 Adding Liquidity:`);
  // [Ethers v5] Use ethers.utils.formatUnits
  console.log(`   mETH:  ${ethers.utils.formatUnits(position.mintAmounts.amount0.toString(), 18)}`);
  console.log(`   mUSDC: ${ethers.utils.formatUnits(position.mintAmounts.amount1.toString(), 18)}`);

  // --- 8. Send Transaction ---
  const mintOptions = {
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 1800,
    slippageTolerance: new Percent(50, 100), // 50%
  };

  const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions);

  const positionManagerABI = ["function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)"];
  const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, positionManagerABI, signer);

  console.log("\n🚀 Sending Mint Transaction...");
  
  try {
    const tx = await positionManager.multicall([calldata], { value: value });
    console.log("   Tx Hash:", tx.hash);
    
    console.log("   Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Infinite Liquidity Added Successfully!");
    console.log("   Now you can swap 5000 USDC with minimal slippage.");
  } catch (e) {
    console.error("❌ Mint failed:", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});