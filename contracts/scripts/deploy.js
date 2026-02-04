const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Arc Testnet...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👨‍💻 Deploying contracts with the account:", deployer.address);

  // --------------------------------------------------------
  // Deploy ArcPayroll (Core Logic)
  // --------------------------------------------------------
  const ArcPayroll = await hre.ethers.getContractFactory("ArcPayroll");
  // 如果 Payroll 合约需要绑定支付代币（比如只能发 USDC），这里可能需要传入 usdcAddress
  // 如果它是通用的，留空即可
  const payroll = await ArcPayroll.deploy();
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("📜 ArcPayroll deployed to:", payrollAddress);

  // --------------------------------------------------------
  // 🎉 Output for Copy-Pasting
  // --------------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("🎉 Deployment Complete! Copy these to your .env file:");
  console.log("----------------------------------------------------");
  console.log(`NEXT_PUBLIC_ARC_PAYROLL_ADDRESS="${payrollAddress}"`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});