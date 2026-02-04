// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    function initialize(
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (int24 tick) {
        bytes32 id = keccak256(abi.encode(key));
        require(!pools[id].initialized, "PoolAlreadyInitialized");
        pools[id] = Slot0({sqrtPriceX96: sqrtPriceX96, tick: 0, initialized: true});
        return 0;
    }

    function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) {
        require(pools[id].initialized, "Pool Not Found");
        return (pools[id].sqrtPriceX96, pools[id].tick, 0, 0);
    }
}

contract MockRouter {
    address public manager;
    constructor(address _manager) { manager = _manager; }

    function modifyLiquidity(
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external payable {
        if (params.liquidityDelta > 0) {
            // 简单转账演示授权成功
            IERC20(key.currency0).transferFrom(msg.sender, address(this), 100);
            IERC20(key.currency1).transferFrom(msg.sender, address(this), 100);
        }
    }
    
    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external payable returns (int256 delta) {
        address tokenIn = params.zeroForOne ? key.currency0 : key.currency1;
        address tokenOut = params.zeroForOne ? key.currency1 : key.currency0;
        uint256 amount = params.amountSpecified > 0 ? uint256(params.amountSpecified) : 1 ether;
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenOut).transfer(msg.sender, amount); // Router 需要预先充值
        return -int256(amount);
    }
}