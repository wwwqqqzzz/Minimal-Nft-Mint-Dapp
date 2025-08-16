// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MyNFT is ERC721, ERC721Enumerable, Ownable, IERC2981 {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    string private baseTokenURI;
    
    // 铸造限制：每个钱包最多铸造数量
    uint256 public maxMintPerWallet = 5;
    mapping(address => uint256) public walletMintCount;
    
    // 白名单功能
    bool public whitelistEnabled = false;
    mapping(address => bool) public whitelist;
    
    // 版税功能 (EIP-2981)
    address public royaltyReceiver;
    uint96 public royaltyFeeNumerator; // 以 basis points 为单位，10000 = 100%
    
    // 事件
    event WhitelistEnabled(bool enabled);
    event WhitelistUpdated(address indexed wallet, bool status);
    event MaxMintPerWalletUpdated(uint256 newLimit);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address royaltyReceiver_,
        uint96 royaltyFeeNumerator_
    ) ERC721(name_, symbol_) {
        baseTokenURI = baseURI_;
        royaltyReceiver = royaltyReceiver_;
        royaltyFeeNumerator = royaltyFeeNumerator_; // 例如：250 = 2.5%
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice 铸造 NFT，带限制检查
    function mint() public returns (uint256) {
        // 检查白名单（如果启用）
        if (whitelistEnabled) {
            require(whitelist[msg.sender], "Not in whitelist");
        }
        
        // 检查每钱包铸造限制
        require(walletMintCount[msg.sender] < maxMintPerWallet, "Exceeded max mint per wallet");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        walletMintCount[msg.sender]++;
        
        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    /// @notice 管理员批量铸造（不受限制）
    function mintTo(address to, uint256 quantity) public onlyOwner {
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(to, tokenId);
        }
    }

    // ======== 白名单管理 ========

    /// @notice 启用/禁用白名单模式
    function setWhitelistEnabled(bool enabled) public onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistEnabled(enabled);
    }

    /// @notice 添加地址到白名单
    function addToWhitelist(address wallet) public onlyOwner {
        whitelist[wallet] = true;
        emit WhitelistUpdated(wallet, true);
    }

    /// @notice 批量添加白名单
    function addToWhitelistBatch(address[] calldata wallets) public onlyOwner {
        for (uint256 i = 0; i < wallets.length; i++) {
            whitelist[wallets[i]] = true;
            emit WhitelistUpdated(wallets[i], true);
        }
    }

    /// @notice 从白名单移除地址
    function removeFromWhitelist(address wallet) public onlyOwner {
        whitelist[wallet] = false;
        emit WhitelistUpdated(wallet, false);
    }

    /// @notice 检查地址是否在白名单
    function isWhitelisted(address wallet) public view returns (bool) {
        return whitelist[wallet];
    }

    // ======== 铸造限制管理 ========

    /// @notice 设置每钱包最大铸造数量
    function setMaxMintPerWallet(uint256 newLimit) public onlyOwner {
        maxMintPerWallet = newLimit;
        emit MaxMintPerWalletUpdated(newLimit);
    }

    /// @notice 重置指定钱包的铸造计数（紧急情况）
    function resetWalletMintCount(address wallet) public onlyOwner {
        walletMintCount[wallet] = 0;
    }

    // ======== 版税功能 (EIP-2981) ========

    /// @notice 设置版税信息
    function setRoyaltyInfo(address receiver, uint96 feeNumerator) public onlyOwner {
        require(feeNumerator <= 1000, "Royalty fee too high"); // 最大 10%
        royaltyReceiver = receiver;
        royaltyFeeNumerator = feeNumerator;
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    /// @notice 查询版税信息 (EIP-2981)
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        public 
        view 
        override 
        returns (address receiver, uint256 royaltyAmount) 
    {
        receiver = royaltyReceiver;
        royaltyAmount = (salePrice * royaltyFeeNumerator) / 10000;
    }

    // ======== 其他管理功能 ========

    function setBaseURI(string memory uri) public onlyOwner {
        baseTokenURI = uri;
    }

    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @notice 支持的接口检查
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721Enumerable, IERC165) 
        returns (bool) 
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // ERC721Enumerable 所需 override 方法（OpenZeppelin v4.9 风格）
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    // ======== 查询功能 ========

    /// @notice 获取钱包铸造统计
    function getWalletMintInfo(address wallet) 
        public 
        view 
        returns (uint256 mintedCount, uint256 remainingMints, bool isWhitelistedWallet) 
    {
        mintedCount = walletMintCount[wallet];
        remainingMints = maxMintPerWallet > mintedCount ? maxMintPerWallet - mintedCount : 0;
        isWhitelistedWallet = whitelist[wallet];
    }

    /// @notice 检查钱包是否可以铸造
    function canMint(address wallet) public view returns (bool) {
        // 检查白名单
        if (whitelistEnabled && !whitelist[wallet]) {
            return false;
        }
        // 检查铸造限制
        return walletMintCount[wallet] < maxMintPerWallet;
    }
}