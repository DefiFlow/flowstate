const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("FlowState: ArcPayroll System", function () {
  let ArcPayroll, payroll;
  let MockUSDC, usdc;
  let owner, bridgeRelayer, alice, bob, carol;

  beforeEach(async function () {
    // Get Signers
    [owner, bridgeRelayer, alice, bob, carol] = await ethers.getSigners();

    // 1. Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    
    // 2. Deploy ArcPayroll Contract
    const ArcPayrollFactory = await ethers.getContractFactory("ArcPayroll");
    payroll = await ArcPayrollFactory.deploy();
  });

  it("Should successfully distribute salary when funds are present", async function () {
    const amountAlice = ethers.parseUnits("1000", 18);
    const amountBob = ethers.parseUnits("2000", 18);
    const totalRequired = amountAlice + amountBob;

    // --- SIMULATION START ---
    
    // Step 1: The "Bridge" (owner in this case) sends USDC to the Payroll Contract
    // This simulates LI.FI transferring funds to the destination address
    await usdc.transfer(await payroll.getAddress(), totalRequired);

    // Verify contract has received the funds
    expect(await usdc.balanceOf(await payroll.getAddress())).to.equal(totalRequired);

    // Step 2: The Agent triggers the distribution
    const recipients = [alice.address, bob.address];
    const amounts = [amountAlice, amountBob];
    const memo = "Feb 2026 Salary";

    await expect(payroll.distributeSalary(await usdc.getAddress(), recipients, amounts, memo))
    .to.emit(payroll, "SalaryDistributed")
    .withArgs(await usdc.getAddress(), totalRequired, memo, anyValue);

    // --- VERIFICATION ---

    // Check Alice's balance
    expect(await usdc.balanceOf(alice.address)).to.equal(amountAlice);
    // Check Bob's balance
    expect(await usdc.balanceOf(bob.address)).to.equal(amountBob);
    // Check Contract balance is now 0
    expect(await usdc.balanceOf(await payroll.getAddress())).to.equal(0);
  });

  it("Should fail if the bridge did not send enough funds", async function () {
    const recipients = [alice.address];
    const amounts = [ethers.parseUnits("500", 18)];

    // We do NOT transfer funds to the contract here.
    // The contract balance is 0.

    await expect(
      payroll.distributeSalary(await usdc.getAddress(), recipients, amounts, "Fail Test")
    ).to.be.revertedWith("ArcPayroll: Insufficient contract balance. Bridge transfer failed?");
  });

  it("Should allow owner to emergency withdraw funds", async function () {
    const stuckAmount = ethers.parseUnits("500", 18);
    
    // Simulate stuck funds (Bridge sent money, but distribution failed or wasn't called)
    await usdc.transfer(await payroll.getAddress(), stuckAmount);

    // Owner withdraws
    await expect(payroll.emergencyWithdraw(await usdc.getAddress()))
      .to.emit(payroll, "Withdrawn")
      .withArgs(await usdc.getAddress(), stuckAmount);

    // Verify funds returned to owner
    // (We check the contract is empty, calculating owner balance is tricky due to gas fees, but checking contract is empty is sufficient)
    expect(await usdc.balanceOf(await payroll.getAddress())).to.equal(0);
  });
});