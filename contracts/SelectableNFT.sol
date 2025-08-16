// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract SelectableNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, IERC2981 {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // 铸造限制：每个钱包最多铸造数量
    uint256 public maxMintPerWallet = 5;
    mapping(address => uint256) public walletMintCount;
    
    // 白名单功能
    bool public whitelistEnabled = false;
    mapping(address => bool) public whitelist;
    
    // 版税功能 (EIP-2981)
    address public royaltyReceiver;
    uint96 public royaltyFeeNumerator; // 以 basis points 为单位，10000 = 100%
    
    // NFT 模板管理
    struct NFTTemplate {
        string metadataURI;
        uint256 maxSupply;
        uint256 currentSupply;
        bool isActive;
    }
    
    mapping(uint256 => NFTTemplate) public nftTemplates;
    uint256 public templateCount = 0;
    
    // 铸造模式：true=可选择，false=随机
    bool public selectableMintEnabled = true;
    
    // 已使用的 tokenURI（防止重复铸造同一个 URI）
    mapping(string => bool) public usedTokenURIs;
    
    // 事件
    event WhitelistEnabled(bool enabled);
    event WhitelistUpdated(address indexed wallet, bool status);
    event MaxMintPerWalletUpdated(uint256 newLimit);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);
    event TemplateAdded(uint256 indexed templateId, string metadataURI, uint256 maxSupply);
    event TemplateUpdated(uint256 indexed templateId, bool isActive);
    event SelectableMintToggled(bool enabled);
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 indexed templateId, string tokenURI);

    constructor(
        string memory name_,
        string memory symbol_,
        address royaltyReceiver_,
        uint96 royaltyFeeNumerator_
    ) ERC721(name_, symbol_) {
        royaltyReceiver = royaltyReceiver_;
        royaltyFeeNumerator = royaltyFeeNumerator_; // 例如：250 = 2.5%
    }

    // ======== NFT 模板管理 ========
    
    /// @notice 添加 NFT 模板
    function addTemplate(string memory metadataURI, uint256 maxSupply) public onlyOwner {
        nftTemplates[templateCount] = NFTTemplate({
            metadataURI: metadataURI,
            maxSupply: maxSupply,
            currentSupply: 0,
            isActive: true
        });
        emit TemplateAdded(templateCount, metadataURI, maxSupply);
        templateCount++;
    }
    
    /// @notice 批量添加模板
    function addTemplatesBatch(string[] memory metadataURIs, uint256[] memory maxSupplies) public onlyOwner {
        require(metadataURIs.length == maxSupplies.length, "Arrays length mismatch");
        for (uint256 i = 0; i < metadataURIs.length; i++) {
            addTemplate(metadataURIs[i], maxSupplies[i]);
        }
    }
    
    /// @notice 更新模板状态
    function setTemplateActive(uint256 templateId, bool isActive) public onlyOwner {
        require(templateId < templateCount, "Template not exists");
        nftTemplates[templateId].isActive = isActive;
        emit TemplateUpdated(templateId, isActive);
    }
    
    /// @notice 获取可用模板列表
    function getAvailableTemplates() public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // 计算活跃模板数量
        for (uint256 i = 0; i < templateCount; i++) {
            if (nftTemplates[i].isActive && nftTemplates[i].currentSupply < nftTemplates[i].maxSupply) {
                activeCount++;
            }
        }
        
        // 构建结果数组
        uint256[] memory availableTemplates = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < templateCount; i++) {
            if (nftTemplates[i].isActive && nftTemplates[i].currentSupply < nftTemplates[i].maxSupply) {
                availableTemplates[index] = i;
                index++;
            }
        }
        
        return availableTemplates;
    }

    // ======== 铸造功能 ========

    /// @notice 选择性铸造（用户指定模板 ID）
    function mintSelected(uint256 templateId) public returns (uint256) {
        require(selectableMintEnabled, "Selectable mint disabled");
        require(templateId < templateCount, "Template not exists");
        
        NFTTemplate storage template = nftTemplates[templateId];
        require(template.isActive, "Template not active");
        require(template.currentSupply < template.maxSupply, "Template sold out");
        
        return _mintWithChecks(msg.sender, template.metadataURI, templateId);
    }
    
    /// @notice 随机铸造
    function mintRandom() public returns (uint256) {
        uint256[] memory available = getAvailableTemplates();
        require(available.length > 0, "No templates available");
        
        // 简单伪随机选择（生产环境建议使用 Chainlink VRF）
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.difficulty, 
            msg.sender, 
            _tokenIdCounter.current()
        ))) % available.length;
        
        uint256 selectedTemplateId = available[randomIndex];
        NFTTemplate storage template = nftTemplates[selectedTemplateId];
        
        return _mintWithChecks(msg.sender, template.metadataURI, selectedTemplateId);
    }
    
    /// @notice 通用铸造（会根据 selectableMintEnabled 自动选择模式）
    function mint() public returns (uint256) {
        if (selectableMintEnabled) {
            // 如果启用选择模式，默认随机铸造（向后兼容）
            return mintRandom();
        } else {
            return mintRandom();
        }
    }
    
    /// @notice 内部铸造逻辑（包含限制检查）
    function _mintWithChecks(address to, string memory tokenURI_, uint256 templateId) internal returns (uint256) {
        // 检查白名单（如果启用）
        if (whitelistEnabled) {
            require(whitelist[to], "Not in whitelist");
        }
        
        // 检查每钱包铸造限制
        require(walletMintCount[to] < maxMintPerWallet, "Exceeded max mint per wallet");
        
        // 防止重复 URI（可选）
        require(!usedTokenURIs[tokenURI_], "TokenURI already used");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        walletMintCount[to]++;
        
        // 更新模板供应量
        nftTemplates[templateId].currentSupply++;
        
        // 标记 URI 已使用
        usedTokenURIs[tokenURI_] = true;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        
        emit NFTMinted(to, tokenId, templateId, tokenURI_);
        return tokenId;
    }

    /// @notice 管理员铸造（不受限制）
    function mintTo(address to, uint256 templateId) public onlyOwner {
        require(templateId < templateCount, "Template not exists");
        NFTTemplate storage template = nftTemplates[templateId];
        require(template.isActive, "Template not active");
        require(template.currentSupply < template.maxSupply, "Template sold out");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        nftTemplates[templateId].currentSupply++;
        usedTokenURIs[template.metadataURI] = true;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, template.metadataURI);
        
        emit NFTMinted(to, tokenId, templateId, template.metadataURI);
    }

    // ======== 白名单管理 ========

    function setWhitelistEnabled(bool enabled) public onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistEnabled(enabled);
    }

    function addToWhitelist(address wallet) public onlyOwner {
        whitelist[wallet] = true;
        emit WhitelistUpdated(wallet, true);
    }

    function addToWhitelistBatch(address[] calldata wallets) public onlyOwner {
        for (uint256 i = 0; i < wallets.length; i++) {
            whitelist[wallets[i]] = true;
            emit WhitelistUpdated(wallets[i], true);
        }
    }

    function removeFromWhitelist(address wallet) public onlyOwner {
        whitelist[wallet] = false;
        emit WhitelistUpdated(wallet, false);
    }

    function isWhitelisted(address wallet) public view returns (bool) {
        return whitelist[wallet];
    }

    // ======== 铸造限制管理 ========

    function setMaxMintPerWallet(uint256 newLimit) public onlyOwner {
        maxMintPerWallet = newLimit;
        emit MaxMintPerWalletUpdated(newLimit);
    }

    function resetWalletMintCount(address wallet) public onlyOwner {
        walletMintCount[wallet] = 0;
    }

    // ======== 版税功能 (EIP-2981) ========

    function setRoyaltyInfo(address receiver, uint96 feeNumerator) public onlyOwner {
        require(feeNumerator <= 1000, "Royalty fee too high"); // 最大 10%
        royaltyReceiver = receiver;
        royaltyFeeNumerator = feeNumerator;
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        public 
        view 
        override 
        returns (address receiver, uint256 royaltyAmount) 
    {
        receiver = royaltyReceiver;
        royaltyAmount = (salePrice * royaltyFeeNumerator) / 10000;
    }

    // ======== 模式管理 ========

    /// @notice 切换铸造模式
    function setSelectableMintEnabled(bool enabled) public onlyOwner {
        selectableMintEnabled = enabled;
        emit SelectableMintToggled(enabled);
    }

    // ======== 其他管理功能 ========

    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter.current();
    }

    // ======== 查询功能 ========

    function getWalletMintInfo(address wallet) 
        public 
        view 
        returns (uint256 mintedCount, uint256 remainingMints, bool isWhitelistedWallet) 
    {
        mintedCount = walletMintCount[wallet];
        remainingMints = maxMintPerWallet > mintedCount ? maxMintPerWallet - mintedCount : 0;
        isWhitelistedWallet = whitelist[wallet];
    }

    function canMint(address wallet) public view returns (bool) {
        if (whitelistEnabled && !whitelist[wallet]) {
            return false;
        }
        return walletMintCount[wallet] < maxMintPerWallet;
    }
    
    function getTemplateInfo(uint256 templateId) public view returns (
        string memory metadataURI,
        uint256 maxSupply,
        uint256 currentSupply,
        bool isActive
    ) {
        require(templateId < templateCount, "Template not exists");
        NFTTemplate storage template = nftTemplates[templateId];
        return (template.metadataURI, template.maxSupply, template.currentSupply, template.isActive);
    }

    // ======== Override 必需方法 ========

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721Enumerable, ERC721URIStorage, IERC165) 
        returns (bool) 
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}