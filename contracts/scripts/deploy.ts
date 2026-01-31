import { ethers, network, run } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying AgentExecutor...");

  const agentExecutor = await ethers.deployContract("AgentExecutor");

  await agentExecutor.waitForDeployment();
  const address = agentExecutor.target;

  console.log(`AgentExecutor deployed to: ${address}`);

  // 自动更新前端配置：保存 ABI 和合约地址
  const frontendDir = path.join(__dirname, "../../frontend/app/constants");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const contractData = {
    address: address,
    abi: JSON.parse(agentExecutor.interface.formatJson()),
  };

  fs.writeFileSync(path.join(frontendDir, "AgentExecutor.json"), JSON.stringify(contractData, null, 2));
  console.log("Frontend updated: frontend/app/constants/AgentExecutor.json");

  // 如果部署到 Sepolia，自动进行验证
  if (network.name === "sepolia") {
    console.log("Waiting for 6 block confirmations to ensure Etherscan indexing...");
    // 等待 6 个区块确认，防止 Etherscan 找不到字节码
    await agentExecutor.deploymentTransaction()?.wait(6);

    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
    } catch (error: any) {
      console.error("Verification error:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});