
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract PriceFeedMock is AggregatorV3Interface {
    uint8 private _decimals;
    int256 private _price;

    constructor(uint8 decimals_, int256 initialPrice) {
        _decimals = decimals_;
        _price = initialPrice;
    }

    function setPrice(int256 price) public {
        _price = price;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, _price, block.timestamp, block.timestamp, 1);
    }

    function description() external pure override returns (string memory) {
      return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
      return 1;
    }

    function getRoundData(uint80 _roundId) external view override returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
      return (1, _price, block.timestamp, block.timestamp, 1);
    }
}
