// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}

contract AgentExecutor {
    event AgentActionExecuted(string description, uint256 timestamp);

    // Sepolia SwapRouter02
    address public constant ROUTER_V3 =
        0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    // Sepolia WETH
    address public constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    function executeSwapAndTransfer(
        uint256 amountOutMin,
        address tokenOut,
        string calldata aiDescription,
        address finalRecipient
    ) external payable {
        // 组装参数 (注意：没有 deadline 字段了)
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: tokenOut,
                fee: 3000, // 注意：如果 LINK 池子没有 0.3% 的费率，这里也可能报错。建议换 UNI 试
                recipient: finalRecipient,
                amountIn: msg.value,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            });

        ISwapRouter(ROUTER_V3).exactInputSingle{value: msg.value}(params);

        emit AgentActionExecuted(aiDescription, block.timestamp);
    }

    receive() external payable {}
}
