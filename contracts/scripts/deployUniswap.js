const hre = require("hardhat");
const { ethers } = require("hardhat");

// 🔧 Fill in your previous mUSDC and mETH addresses (to reuse existing tokens)
const TOKEN_A = "0x8B5c068AF3f6D2eeeE4c0c7575d4D8e52504ac01"; 
const TOKEN_B = "0x5f403fdc672e1D6902eA5C4CB1329cB5698d0c33"; 

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🦄 Starting private V4 god-mode deployment script...");
  console.log("👨‍💻 Operator account:", signer.address);

  // 1. Deploy MockPoolManager
  const MockManager = await ethers.getContractFactory("MockPoolManager");
  const manager = await MockManager.deploy();
  await manager.waitForDeployment();
  const managerAddr = await manager.getAddress();
  console.log(`✅ Manager deployed successfully: ${managerAddr}`);

  // 2. Deploy MockRouter
  const MockRouter = await ethers.getContractFactory("MockRouter");
  const router = await MockRouter.deploy(managerAddr);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log(`✅ Router deployed successfully: ${routerAddr}`);

  // 3. Fund the Router with reserves (to make swaps succeed)
  console.log("\n💰 Funding the Router with reserves...");
  const t0 = await ethers.getContractAt("MockUSDC", TOKEN_A);
  const t1 = await ethers.getContractAt("MockUSDC", TOKEN_B);
  
  // The script will fail if your balance is insufficient. Make sure you have enough tokens.
  await (await t0.transfer(routerAddr, ethers.parseEther("100000"))).wait();
  await (await t1.transfer(routerAddr, ethers.parseEther("100000"))).wait();
  console.log("✅ Router is funded.");

  // 4. User approves the Router
  console.log("\n🔓 User approving the Router...");
  await (await t0.approve(routerAddr, ethers.MaxUint256)).wait();
  await (await t1.approve(routerAddr, ethers.MaxUint256)).wait();

  // 5. Initialize the pool
  console.log("\n🌊 Initializing the pool...");
  // Sort tokens
  const isALessThanB = TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase();
  const token0 = isALessThanB ? TOKEN_A : TOKEN_B;
  const token1 = isALessThanB ? TOKEN_B : TOKEN_A;

  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * (2 ** 96))); // 1:1

  const txInit = await manager.initialize(poolKey, sqrtPriceX96, "0x");
  await txInit.wait();
  console.log("✅ Pool initialized successfully!");

  // 6. Add liquidity (Mock)
  console.log("\n💧 Adding liquidity (to trigger Router logic)...");
  const params = {
      tickLower: -60,
      tickUpper: 60,
      liquidityDelta: ethers.parseEther("100"), 
      salt: ethers.ZeroHash
  };

  const txAdd = await router.modifyLiquidity(poolKey, params, "0x");
  await txAdd.wait();
  
  console.log("\n🎉🎉🎉 All done! You now have a fully functional V4 environment!");
  console.log("Update your frontend .env file now:");
  console.log(`NEXT_PUBLIC_POOL_MANAGER="${managerAddr}"`);
  console.log(`NEXT_PUBLIC_ROUTER="${routerAddr}"`);
  console.log(`NEXT_PUBLIC_ARC_USDC_ADDRESS="${TOKEN_A}"`); // Make sure the frontend uses these addresses
  console.log(`NEXT_PUBLIC_ARC_METH_ADDRESS="${TOKEN_B}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});