
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Signer } from "ethers";

describe("AgentExecutor", function () {
    let agentExecutor: any;
    let owner: Signer, user: Signer, recipient: Signer;
    let ownerAddress: string, userAddress: string, recipientAddress: string;

    let uniswapRouterMock: any;
    let daiToken: any;
    let wethToken: any;
    let priceFeedMock: any;

    let ethAmount: any;
    let daiAmountMin: any;
    const description = "Swap ETH for DAI and send to Bob";

    beforeEach(async function () {
        [owner, user, recipient] = await ethers.getSigners();
        ownerAddress = await owner.getAddress();
        userAddress = await user.getAddress();
        recipientAddress = await recipient.getAddress();

        ethAmount = ethers.parseEther("1");
        daiAmountMin = ethers.parseEther("2990");

        // Deploy mock ERC20 tokens (DAI and WETH)
        const erc20MockFactory = await ethers.getContractFactory("ERC20Mock");
        daiToken = await erc20MockFactory.deploy("Mock DAI", "DAI", 18);
        await daiToken.waitForDeployment();
        wethToken = await erc20MockFactory.deploy("Wrapped Ether", "WETH", 18);
        await wethToken.waitForDeployment();

        // Deploy a mock Uniswap Router
        const uniswapRouterMockFactory = await ethers.getContractFactory("UniswapRouterMock");
        uniswapRouterMock = await uniswapRouterMockFactory.deploy();
        await uniswapRouterMock.waitForDeployment();

        // Deploy a mock Chainlink Price Feed
        const priceFeedMockFactory = await ethers.getContractFactory("PriceFeedMock");
        priceFeedMock = await priceFeedMockFactory.deploy(8, 3000 * 10**8); // 8 decimals, initial price 3000
        await priceFeedMock.waitForDeployment();
        
        // Deploy AgentExecutor
        const agentExecutorFactory = await ethers.getContractFactory("AgentExecutor");
        agentExecutor = await agentExecutorFactory.deploy();
        await agentExecutor.waitForDeployment();

        // Mint some DAI for the mock router to simulate liquidity
        await daiToken.mint(await uniswapRouterMock.getAddress(), ethers.parseEther("10000"));
    });

    describe("executeSwapAndTransfer", function () {

        it("should execute swap and transfer when price condition is met (greater than)", async function () {
            const deadline = (await time.latest()) + 60;
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];
            
            await priceFeedMock.setPrice(3100 * 10**8); // Set price > target

            const tx = agentExecutor.connect(user).executeSwapAndTransfer(
                await uniswapRouterMock.getAddress(),
                daiAmountMin,
                path,
                deadline,
                description,
                await priceFeedMock.getAddress(),
                3000 * 10**8, // targetPrice
                true, // isGreaterThan
                recipientAddress,
                { value: ethAmount }
            );

            await expect(tx).to.emit(agentExecutor, "AgentActionExecuted");


            const recipientDaiBalance = await daiToken.balanceOf(recipientAddress);
            // In our mock, 1 ETH = 3000 DAI
            expect(recipientDaiBalance).to.equal(ethers.parseEther("3000"));
        });

        it("should execute swap and transfer when price condition is met (less than)", async function () {
            const deadline = (await time.latest()) + 60;
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];
            
            await priceFeedMock.setPrice(2900 * 10**8); // Set price < target

            const tx = agentExecutor.connect(user).executeSwapAndTransfer(
                await uniswapRouterMock.getAddress(),
                daiAmountMin,
                path,
                deadline,
                description,
                await priceFeedMock.getAddress(),
                3000 * 10**8, // targetPrice
                false, // isGreaterThan
                recipientAddress,
                { value: ethAmount }
            );

            await expect(tx).to.emit(agentExecutor, "AgentActionExecuted");
            const recipientDaiBalance = await daiToken.balanceOf(recipientAddress);
            expect(recipientDaiBalance).to.equal(ethers.parseEther("3000"));
        });

        it("should revert if price condition is not met (greater than)", async function () {
            const deadline = (await time.latest()) + 60;
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];

            await priceFeedMock.setPrice(2900 * 10**8); // Price is lower than target

            await expect(
                agentExecutor.connect(user).executeSwapAndTransfer(
                    await uniswapRouterMock.getAddress(),
                    daiAmountMin,
                    path,
                    deadline,
                    description,
                    await priceFeedMock.getAddress(),
                    3000 * 10**8,
                    true, // isGreaterThan
                    recipientAddress,
                    { value: ethAmount }
                )
            ).to.be.revertedWith("Chainlink: Price too low");
        });

        it("should revert if price condition is not met (less than)", async function () {
            const deadline = (await time.latest()) + 60;
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];

            await priceFeedMock.setPrice(3100 * 10**8); // Price is higher than target

            await expect(
                agentExecutor.connect(user).executeSwapAndTransfer(
                    await uniswapRouterMock.getAddress(),
                    daiAmountMin,
                    path,
                    deadline,
                    description,
                    await priceFeedMock.getAddress(),
                    3000 * 10**8,
                    false, // isGreaterThan
                    recipientAddress,
                    { value: ethAmount }
                )
            ).to.be.revertedWith("Chainlink: Price too high");
        });

        it("should skip price check if priceFeedAddress is address(0)", async function () {
            const deadline = (await time.latest()) + 60;
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];

            const tx = agentExecutor.connect(user).executeSwapAndTransfer(
                await uniswapRouterMock.getAddress(),
                daiAmountMin,
                path,
                deadline,
                description,
                ethers.ZeroAddress, // No price check
                0,
                false,
                recipientAddress,
                { value: ethAmount }
            );

            await expect(tx).to.emit(agentExecutor, "AgentActionExecuted");
            const recipientDaiBalance = await daiToken.balanceOf(recipientAddress);
            expect(recipientDaiBalance).to.equal(ethers.parseEther("3000"));
        });

        it("should revert if deadline is exceeded", async function () {
            const deadline = (await time.latest()) - 60; // Deadline is in the past
            const path = [await wethToken.getAddress(), await daiToken.getAddress()];

            await expect(
                agentExecutor.connect(user).executeSwapAndTransfer(
                    await uniswapRouterMock.getAddress(),
                    daiAmountMin,
                    path,
                    deadline,
                    description,
                    await priceFeedMock.getAddress(),
                    3000 * 10**8,
                    true,
                    recipientAddress,
                    { value: ethAmount }
                )
            ).to.be.revertedWith("UniswapRouterMock: DEADLINE_EXCEEDED");
        });
    });
});
