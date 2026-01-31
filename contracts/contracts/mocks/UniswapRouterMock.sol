
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapRouter {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
}

contract UniswapRouterMock is IUniswapRouter {

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "UniswapRouterMock: DEADLINE_EXCEEDED");
        require(path.length == 2, "UniswapRouterMock: INVALID_PATH");
        
        address token = path[1];
        // Simple mock price: 1 ETH = 3000 tokens of any kind
        uint tokenAmount = msg.value * 3000; 

        require(tokenAmount >= amountOutMin, "UniswapRouterMock: INSUFFICIENT_OUTPUT_AMOUNT");

        // Transfer tokens from this mock router's balance to the recipient
        IERC20(token).transfer(to, tokenAmount);

        amounts = new uint[](2);
        amounts[0] = msg.value;
        amounts[1] = tokenAmount;

        return amounts;
    }
}
