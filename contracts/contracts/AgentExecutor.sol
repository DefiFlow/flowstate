// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IUniswapRouter {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract AgentExecutor {
    event AgentActionExecuted(
        address indexed user,
        string actionType,
        string description,
        uint256 timestamp
    );

    // 核心执行函数
    function executeSwapAndTransfer(
        address routerAddress,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline,
        string calldata aiDescription,
        // --- Chainlink 相关参数 ---
        address priceFeedAddress,
        int256 targetPrice, // 前端传过来处理好精度的价格 (比如 3000 * 10^8)
        bool isGreaterThan, // true = 大于触发(追涨), false = 小于触发(止损)
        // ------------------------
        address finalRecipient // 最终接收代币的人 (Bob)
    ) external payable {
        // 1. Chainlink 价格检查 (On-chain Verification)
        if (priceFeedAddress != address(0)) {
            // 允许传 0 地址跳过检查(方便调试)
            AggregatorV3Interface priceFeed = AggregatorV3Interface(
                priceFeedAddress
            );
            (, int price, , , ) = priceFeed.latestRoundData();

            if (isGreaterThan) {
                require(price >= targetPrice, "Chainlink: Price too low");
            } else {
                require(price <= targetPrice, "Chainlink: Price too high");
            }
        }

        // 2. 调用 Uniswap (资金先进合约)
        // 注意：这里 to 填 address(this)
        uint[] memory amounts = IUniswapRouter(routerAddress)
            .swapExactETHForTokens{value: msg.value}(
            amountOutMin,
            path,
            address(this),
            deadline
        );

        // 3. 转账给最终接收人
        // 获取刚才换到的代币地址 (路径的最后一个)
        address tokenAddress = path[path.length - 1];
        uint256 swappedAmount = amounts[amounts.length - 1];

        require(swappedAmount > 0, "Swap failed: No tokens received");

        // 转给 Bob
        IERC20(tokenAddress).transfer(finalRecipient, swappedAmount);

        // 4. 留下证据 (For The Graph / Etherscan)
        emit AgentActionExecuted(
            msg.sender,
            "SWAP_AND_TRANSFER",
            aiDescription,
            block.timestamp
        );
    }

    receive() external payable {}
}
