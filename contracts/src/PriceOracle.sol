// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @author Aditya Chotaliya
 * @notice Chainlink price feeds for STK/USD and RWD/USD.
 *
 * On testnets (Sepolia) we use a mock fallback price since
 * STK/RWD are custom tokens without Chainlink feeds.
 *
 * On mainnet you would replace mockPrice with real Chainlink feeds:
 *   AggregatorV3Interface priceFeed = AggregatorV3Interface(chainlinkFeedAddress);
 *   (, int256 price,,,) = priceFeed.latestRoundData();
 */

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80  roundId,
        int256  answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80  answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract PriceOracle is Ownable {

    // Chainlink feed addresses (mainnet)
    // ETH/USD  Mainnet: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
    // USDC/USD Mainnet: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
    // ETH/USD  Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306

    address public stkFeed;    // Chainlink feed for STK (or address(0) for mock)
    address public rwdFeed;    // Chainlink feed for RWD (or address(0) for mock)
    address public ethUsdFeed; // ETH/USD feed

    // Mock prices for testnet (8 decimals like Chainlink)
    int256 public mockStkPrice = 2_400_000;  // $0.024 (8 decimals)
    int256 public mockRwdPrice = 1_000_000;  // $0.01  (8 decimals)

    uint256 public constant STALE_THRESHOLD = 3600; // 1 hour

    event MockPriceUpdated(string token, int256 price);

    constructor(address _ethUsdFeed, address _owner) Ownable(_owner) {
        ethUsdFeed = _ethUsdFeed;
    }

    // ─────────────────────────────────────────────
    //  Price queries
    // ─────────────────────────────────────────────

    /**
     * @notice Get STK price in USD (8 decimals).
     * Returns mock price if no feed configured.
     */
    function getStkPrice() external view returns (int256 price, uint8 decimals_) {
        if (stkFeed != address(0)) {
            return _getChainlinkPrice(stkFeed);
        }
        return (mockStkPrice, 8);
    }

    /**
     * @notice Get RWD price in USD (8 decimals).
     */
    function getRwdPrice() external view returns (int256 price, uint8 decimals_) {
        if (rwdFeed != address(0)) {
            return _getChainlinkPrice(rwdFeed);
        }
        return (mockRwdPrice, 8);
    }

    /**
     * @notice Get ETH price in USD from Chainlink.
     */
    function getEthPrice() external view returns (int256 price, uint8 decimals_) {
        if (ethUsdFeed != address(0)) {
            return _getChainlinkPrice(ethUsdFeed);
        }
        return (300000_00000000, 8); // $3000 fallback
    }

    /**
     * @notice Convert token amount to USD value.
     * @param _amount Token amount (18 decimals).
     * @param _isStk  true = STK price, false = RWD price.
     */
    function toUSD(uint256 _amount, bool _isStk) external view returns (uint256 usdValue) {
        (int256 price, uint8 dec) = _isStk
            ? this.getStkPrice()
            : this.getRwdPrice();

        // usdValue = amount * price / 10^(18 + feed_decimals - 18)
        // = amount * price / 10^feed_decimals
        usdValue = (_amount * uint256(price)) / (10 ** dec);
    }

    // ─────────────────────────────────────────────
    //  Internal
    // ─────────────────────────────────────────────

    function _getChainlinkPrice(address _feed)
        internal view
        returns (int256 price, uint8 dec)
    {
        AggregatorV3Interface feed = AggregatorV3Interface(_feed);
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= STALE_THRESHOLD, "Stale price");
        dec   = feed.decimals();
        price = answer;
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function setFeeds(address _stkFeed, address _rwdFeed, address _ethFeed)
        external onlyOwner
    {
        stkFeed    = _stkFeed;
        rwdFeed    = _rwdFeed;
        ethUsdFeed = _ethFeed;
    }

    function setMockStkPrice(int256 _price) external onlyOwner {
        require(_price > 0, "Invalid price");
        mockStkPrice = _price;
        emit MockPriceUpdated("STK", _price);
    }

    function setMockRwdPrice(int256 _price) external onlyOwner {
        require(_price > 0, "Invalid price");
        mockRwdPrice = _price;
        emit MockPriceUpdated("RWD", _price);
    }
}
