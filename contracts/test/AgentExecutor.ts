import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";

// A basic ERC20 interface for interacting with tokens on the forked network
const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

describe("AgentExecutor", function () {
    let agentExecutor: any;
    let user: Signer, recipient: Signer;
    let userAddress: string, recipientAddress: string;

    // Sepolia addresses
    const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

    let uniToken: any;
    let isFork = false;

    before(async function() {
        // This hook checks if the test is running on a forked network where the UNI contract exists.
        // If not, it skips the tests and logs a helpful message.
        try {
            const code = await ethers.provider.getCode(UNI_ADDRESS);
            if (code !== '0x') {
                isFork = true;
            } else {
                console.log("\n    SKIPPING: AgentExecutor tests. Not running on a Sepolia fork or UNI token not found.");
                console.log("    Please ensure your hardhat.config.ts is configured for Sepolia forking.");
                console.log("    e.g., forking: { url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY' }\n");
            }
        } catch (e) {
            isFork = false;
            console.log("\n    SKIPPING: AgentExecutor tests. Could not check for UNI token due to a network issue.");
            console.log("    Please ensure your hardhat.config.ts is configured for Sepolia forking.\n");
        }
    });

    beforeEach(async function () {
        // If not on a fork, skip the individual test setup.
        if (!isFork) {
            this.skip();
        }
        
        [user, recipient] = (await ethers.getSigners()).slice(1);
        userAddress = await user.getAddress();
        recipientAddress = await recipient.getAddress();

        // Deploy AgentExecutor
        const agentExecutorFactory = await ethers.getContractFactory("AgentExecutor");
        agentExecutor = await agentExecutorFactory.deploy();
        await agentExecutor.waitForDeployment();
        
        // Get a contract instance for the UNI token on Sepolia
        uniToken = new ethers.Contract(UNI_ADDRESS, erc20Abi, ethers.provider);
    });

    describe("executeSwapAndTransfer", function () {
        it("should execute a swap from ETH to UNI and transfer to the recipient", async function () {
            const ethAmount = ethers.parseEther("1");
            const amountOutMin = 0; // We don't require a minimum output for this test
            const description = "Swap 1 ETH for UNI for hackathon demo";

            // Check recipient's UNI balance before the transaction
            const balanceBefore = await uniToken.balanceOf(recipientAddress);

            // Execute the transaction from the 'user' account
            const tx = await agentExecutor.connect(user).executeSwapAndTransfer(
                amountOutMin,
                UNI_ADDRESS,
                description,
                recipientAddress,
                { value: ethAmount }
            );
            
            // Wait for the transaction to be mined to ensure state changes are visible
            const receipt = await tx.wait();
            
            // To check the event timestamp, we need to get the block
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const timestamp = block!.timestamp;
            
            // Verify that the event was emitted with the correct arguments
            await expect(tx)
                .to.emit(agentExecutor, "AgentActionExecuted")
                .withArgs(description, timestamp);

            // Check recipient's UNI balance after the transaction
            const balanceAfter = await uniToken.balanceOf(recipientAddress);
            
            // The balance should have increased as a result of the swap
            expect(balanceAfter).to.be.gt(balanceBefore);

            // Optional: log the amount of UNI received for verification
            const uniDecimals = await uniToken.decimals();
            console.log(`      ✓ Recipient received ${ethers.formatUnits(balanceAfter - balanceBefore, uniDecimals)} UNI`);
        });

        it("should revert if no ETH is sent with the transaction", async function () {
            // The Uniswap V3 router should revert transactions with no input amount.
            await expect(
                agentExecutor.connect(user).executeSwapAndTransfer(
                    0,
                    UNI_ADDRESS,
                    "Attempting zero-value swap",
                    recipientAddress,
                    { value: 0 }
                )
            ).to.be.reverted; // The exact revert message comes from the router, so we just check for revert.
        });
    });
});
