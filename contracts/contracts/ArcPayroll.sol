// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcPayroll
 * @dev specialized for the "FlowState" Agentic Workflow.
 * Designed to receive cross-chain funds via LI.FI and batch distribute them.
 */
contract ArcPayroll is Ownable {
    using SafeERC20 for IERC20;

    // Event emitted when salary distribution is successful
    event SalaryDistributed(
        address indexed token,
        uint256 totalAmount,
        string memo,
        uint256 timestamp
    );

    // Event emitted when funds are withdrawn by the owner (emergency)
    event Withdrawn(address indexed token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Distributes ERC20 tokens to multiple recipients.
     * @dev IMPORTANT: Tokens must be transferred to this contract address BEFORE calling this function.
     * This is compatible with LI.FI's "Contract Calls" feature.
     * * @param token The address of the ERC20 token (e.g., USDC).
     * @param recipients Array of employee addresses.
     * @param amounts Array of amounts to distribute to each employee.
     * @param memo A note regarding the payment (e.g., "Feb 2026 Salary").
     */
    function distributeSalary(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata memo
    ) external {
        require(
            recipients.length == amounts.length,
            "ArcPayroll: Array length mismatch"
        );
        require(recipients.length > 0, "ArcPayroll: No recipients provided");

        // 1. Calculate total required amount
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        // 2. Check if the bridge has delivered the funds to this contract
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        require(
            contractBalance >= totalAmount,
            "ArcPayroll: Insufficient contract balance. Bridge transfer failed?"
        );

        // 3. Execute Distribution
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).safeTransfer(recipients[i], amounts[i]);
        }

        // 4. Emit Event for the UI and Judges
        emit SalaryDistributed(token, totalAmount, memo, block.timestamp);
    }

    /**
     * @notice Emergency function to recover stuck tokens.
     * @dev Only the owner (Scalar Labs) can call this.
     * @param token The address of the token to withdraw.
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "ArcPayroll: No funds to withdraw");

        IERC20(token).safeTransfer(msg.sender, balance);
        emit Withdrawn(token, balance);
    }
}
