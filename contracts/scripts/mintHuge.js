const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("😈 Activating God Mode...");
  console.log("📋 Operating Account:", signer.address);

  // --- 1. Configure Addresses (Sepolia) ---
  const M_ETH_ADDRESS = "0x5f403fdc672e1D6902eA5C4CB1329cB5698d0c33"; 
  const M_USDC_ADDRESS = "0x8B5c068AF3f6D2eeeE4c0c7575d4D8e52504ac01"; 

  // --- 2. Prepare Contract Instances ---
  const abi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
  ];

  const mEthContract = new ethers.Contract(M_ETH_ADDRESS, abi, signer);
  const mUsdcContract = new ethers.Contract(M_USDC_ADDRESS, abi, signer);

  // --- 3. Set Amount (1 Billion) ---
  // [Fix]: Ethers v5 requires ethers.utils.parseUnits
  const amountToMint = ethers.utils.parseUnits("1000000000", 18); 

  console.log(`\n💰 Preparing to mint 1 billion mETH and 1 billion mUSDC...`);

  try {
    // --- Mint mETH ---
    console.log("1️⃣ Minting mETH...");
    const tx1 = await mEthContract.mint(signer.address, amountToMint);
    console.log(`   Transaction sent: ${tx1.hash}`);
    await tx1.wait();
    console.log("   ✅ mETH minted successfully!");

    // --- Mint mUSDC ---
    console.log("2️⃣ Minting mUSDC...");
    const tx2 = await mUsdcContract.mint(signer.address, amountToMint);
    console.log(`   Transaction sent: ${tx2.hash}`);
    await tx2.wait();
    console.log("   ✅ mUSDC minted successfully!");

    // --- Verify Balances ---
    const balEth = await mEthContract.balanceOf(signer.address);
    const balUsdc = await mUsdcContract.balanceOf(signer.address);

    console.log("\n🎉 Current Balances:");
    // [Fix]: Ethers v5 requires ethers.utils.formatUnits
    console.log(`   mETH:  ${ethers.utils.formatUnits(balEth, 18)}`);
    console.log(`   mUSDC: ${ethers.utils.formatUnits(balUsdc, 18)}`);

  } catch (error) {
    console.error("\n❌ Minting failed!");
    console.error("Error details:", error.message || error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});