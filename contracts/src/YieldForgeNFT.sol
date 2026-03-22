// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title YieldForgeNFT
 * @author Aditya Chotaliya
 * @notice Soulbound NFTs that grant staking boost multipliers.
 *
 * Tiers:
 *  - Common   (id 1-1000):  +10% boost
 *  - Rare     (id 1001-500): +20% boost
 *  - Epic     (id 501-100):  +35% boost
 *  - Legendary(id 1-10):    +50% boost
 *
 * Integration: StakingV3 checks if staker holds a YieldForgeNFT
 * and applies the boost to their rewards.
 */
contract YieldForgeNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    enum Rarity { Common, Rare, Epic, Legendary }

    struct NFTInfo {
        Rarity  rarity;
        uint256 boostBps; // basis points: 1000 = 10%
        string  name;
    }

    mapping(uint256 => NFTInfo) public nftInfo;
    mapping(address => uint256[]) public userNFTs;

    uint256 public totalMinted;

    // Max supply per rarity
    uint256 public constant MAX_COMMON    = 1000;
    uint256 public constant MAX_RARE      = 500;
    uint256 public constant MAX_EPIC      = 100;
    uint256 public constant MAX_LEGENDARY = 10;

    uint256 public commonMinted;
    uint256 public rareMinted;
    uint256 public epicMinted;
    uint256 public legendaryMinted;

    // Mint price per rarity (in ETH)
    uint256 public commonPrice    = 0.001 ether;
    uint256 public rarePrice      = 0.005 ether;
    uint256 public epicPrice      = 0.02  ether;
    uint256 public legendaryPrice = 0.1   ether;

    string public baseURI;

    event NFTMinted(address indexed to, uint256 tokenId, Rarity rarity, uint256 boostBps);

    constructor(address _owner) ERC721("YieldForge Boost NFT", "YFNFT") Ownable(_owner) {}

    // ─────────────────────────────────────────────
    //  Mint
    // ─────────────────────────────────────────────

    function mintCommon() external payable {
        require(msg.value >= commonPrice, "Insufficient ETH");
        require(commonMinted < MAX_COMMON, "Common sold out");
        _mintNFT(msg.sender, Rarity.Common, 1000, "Common Forge Badge");
        commonMinted++;
    }

    function mintRare() external payable {
        require(msg.value >= rarePrice, "Insufficient ETH");
        require(rareMinted < MAX_RARE, "Rare sold out");
        _mintNFT(msg.sender, Rarity.Rare, 2000, "Rare Forge Shield");
        rareMinted++;
    }

    function mintEpic() external payable {
        require(msg.value >= epicPrice, "Insufficient ETH");
        require(epicMinted < MAX_EPIC, "Epic sold out");
        _mintNFT(msg.sender, Rarity.Epic, 3500, "Epic Forge Crest");
        epicMinted++;
    }

    // Legendary = owner-only airdrop (can't be bought)
    function mintLegendary(address _to) external onlyOwner {
        require(legendaryMinted < MAX_LEGENDARY, "Legendary sold out");
        _mintNFT(_to, Rarity.Legendary, 5000, "Legendary Forge Crown");
        legendaryMinted++;
    }

    function _mintNFT(address _to, Rarity _rarity, uint256 _boostBps, string memory _name) internal {
        totalMinted++;
        uint256 tokenId = totalMinted;

        nftInfo[tokenId] = NFTInfo({
            rarity:   _rarity,
            boostBps: _boostBps,
            name:     _name
        });

        userNFTs[_to].push(tokenId);
        _safeMint(_to, tokenId);

        emit NFTMinted(_to, tokenId, _rarity, _boostBps);
    }

    // ─────────────────────────────────────────────
    //  Boost calculation
    // ─────────────────────────────────────────────

    /**
     * @notice Get the highest boost BPS a user has from their NFTs.
     * Returns 0 if user holds no NFTs.
     */
    function getBoostBps(address _user) external view returns (uint256 highestBoost) {
        uint256[] memory ids = userNFTs[_user];
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 boost = nftInfo[ids[i]].boostBps;
            if (boost > highestBoost) {
                highestBoost = boost;
            }
        }
    }

    /**
     * @notice Returns true if the user holds at least one YieldForge NFT.
     */
    function hasBoost(address _user) external view returns (bool) {
        return userNFTs[_user].length > 0;
    }

    function getUserNFTs(address _user) external view returns (uint256[] memory) {
        return userNFTs[_user];
    }

    // ─────────────────────────────────────────────
    //  Soulbound — non-transferable
    // ─────────────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("YieldForgeNFT: Soulbound - non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory)
        public pure override(ERC721, IERC721)
    {
        revert("YieldForgeNFT: Soulbound - non-transferable");
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function setBaseURI(string memory _uri) external onlyOwner { baseURI = _uri; }
    function setPrices(uint256 _common, uint256 _rare, uint256 _epic) external onlyOwner {
        commonPrice = _common;
        rarePrice   = _rare;
        epicPrice   = _epic;
    }
    function withdraw() external onlyOwner {
        (bool ok,) = owner().call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    // ─────────────────────────────────────────────
    //  Required overrides
    // ─────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage)
        returns (bool)
    { return super.supportsInterface(interfaceId); }
}
