const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👨‍💻 Deploying contracts with the account:", deployer.address);

  // --------------------------------------------------------
  // 1. Deploy MockUSDC
  // --------------------------------------------------------
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  
  const usdc = await MockUSDC.deploy("Mock USDC", "mUSDC"); 
  
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("💰 MockUSDC deployed to:", usdcAddress);

  // --------------------------------------------------------
  // 2. Deploy MockETH
  // --------------------------------------------------------
  const MockETH = await hre.ethers.getContractFactory("MockETH");
  
  const meth = await MockETH.deploy("Mock ETH", "mETH");
  
  await meth.waitForDeployment();
  const methAddress = await meth.getAddress();
  console.log("💎 MockETH deployed to: ", methAddress);

  // --------------------------------------------------------
  // 🎉 Output
  // --------------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("🎉 Deployment Complete! Copy these to your .env file:");
  console.log("----------------------------------------------------");
  console.log(`NEXT_PUBLIC_ARC_USDC_ADDRESS="${usdcAddress}"`);
  console.log(`NEXT_PUBLIC_ARC_METH_ADDRESS="${methAddress}"`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});