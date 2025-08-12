// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    string private baseTokenURI;

    constructor(string memory name_, string memory symbol_, string memory baseURI_) ERC721(name_, symbol_) {
        baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice 简单的公共 mint，铸给调用者
    function mint() public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    function setBaseURI(string memory uri) public onlyOwner {
        baseTokenURI = uri;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
}