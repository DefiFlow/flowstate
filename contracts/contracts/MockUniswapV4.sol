// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Core V4 struct definitions
struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct ModifyLiquidityParams {
    int24 tickLower;
    int24 tickUpper;
    int256 liquidityDelta;
    bytes32 salt;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

contract MockPoolManager {
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
        bool initialized;
    }
    mapping(bytes32 => Slot0) public pools;

    // Mock initialize function
    function initialize(
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (int24 tick) {
        bytes32 id = keccak256(abi.encode(key));

        // If you run the script multiple times, this might fail.
        // To make god-mode smoother, we allow re-initialization (overwrite).
        // require(!pools[id].initialized, "PoolAlreadyInitialized");

        pools[id] = Slot0({
            sqrtPriceX96: sqrtPriceX96,
            tick: 0,
            initialized: true
        });
        return 0;
    }

    // Mock getSlot0 function
    function getSlot0(
        bytes32 id
    )
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint24 protocolFee,
            uint24 lpFee
        )
    {
        // If the pool isn't initialized, returning 0 might cause frontend errors. We'll add a fallback here.
        // Return the real value if initialized, otherwise return a 1:1 price (2^96) to trick the frontend.
        if (pools[id].initialized) {
            return (pools[id].sqrtPriceX96, pools[id].tick, 0, 0);
        } else {
            return (79228162514264337593543950336, 0, 0, 0);
        }
    }
}

contract MockRouter {
    address public manager;

    constructor(address _manager) {
        manager = _manager;
    }

    // Mock adding liquidity
    function modifyLiquidity(
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external payable {
        // If adding liquidity
        if (params.liquidityDelta > 0) {
            // Transfer 10 tokens from the user to this contract to demonstrate a successful "approve + transfer".
            // Prerequisite: The user has already approved the Router.
            uint256 amount = 10 * 10 ** 18;
            IERC20(key.currency0).transferFrom(
                msg.sender,
                address(this),
                amount
            );
            IERC20(key.currency1).transferFrom(
                msg.sender,
                address(this),
                amount
            );
        }
    }

    // Mock Swap (core functionality)
    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external payable returns (int256 delta) {
        // 1. Determine swap direction
        address tokenIn = params.zeroForOne ? key.currency0 : key.currency1;
        address tokenOut = params.zeroForOne ? key.currency1 : key.currency0;

        // 2. Determine amount (handle positive/negative sign)
        // In V4, a positive amountSpecified means a fixed input, while a negative value means a fixed output.
        // For simplicity, we'll use the absolute value as the input amount.
        uint256 amount = params.amountSpecified > 0
            ? uint256(params.amountSpecified)
            : uint256(-params.amountSpecified);

        // 3. Collect funds from the user (Token In)
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);

        // 4. Send funds to the user (Token Out) - assuming a 1:1 exchange rate.
        // Note: The Router must be pre-funded with TokenOut to be able to send it.
        IERC20(tokenOut).transfer(msg.sender, amount);

        return -int256(amount);
    }
}
