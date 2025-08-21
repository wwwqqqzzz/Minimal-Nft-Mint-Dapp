// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract Market is Ownable, ReentrancyGuard, IERC721Receiver {
    using Address for address payable;

    struct Listing {
        address collection;
        uint256 tokenId;
        address seller;
        uint256 price; // in wei
        bool active;
    }

    // listingId starts from 1 for simplicity
    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    // platform fee e.g. 250 = 2.5%
    uint96 public platformFeeBps = 250;
    address public feeRecipient; // default: owner

    event Listed(uint256 indexed listingId, address indexed collection, uint256 indexed tokenId, address seller, uint256 price);
    event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);
    event Cancelled(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, address buyer, uint256 price, uint256 royalty, uint256 fee);

    constructor() {
        feeRecipient = msg.sender; // Ownable 默认 owner 为部署者
    }

    function setPlatformFee(uint96 newFeeBps, address newRecipient) external onlyOwner {
        require(newFeeBps <= 1000, "fee too high"); // max 10%
        platformFeeBps = newFeeBps;
        if (newRecipient != address(0)) feeRecipient = newRecipient;
    }

    function listItem(address collection, uint256 tokenId, uint256 price) external nonReentrant returns (uint256) {
        require(price > 0, "invalid price");
        require(collection != address(0), "invalid collection");
        // must be owner or approved
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "not owner");
        // transfer to escrow (requires approval)
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);

        listingCount += 1;
        listings[listingCount] = Listing({
            collection: collection,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit Listed(listingCount, collection, tokenId, msg.sender, price);
        return listingCount;
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage lst = listings[listingId];
        require(lst.active, "inactive");
        require(lst.seller == msg.sender, "not seller");
        require(newPrice > 0, "invalid price");
        uint256 old = lst.price;
        lst.price = newPrice;
        emit PriceUpdated(listingId, old, newPrice);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage lst = listings[listingId];
        require(lst.active, "inactive");
        require(lst.seller == msg.sender, "not seller");
        lst.active = false;
        IERC721(lst.collection).safeTransferFrom(address(this), lst.seller, lst.tokenId);
        emit Cancelled(listingId);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage lst = listings[listingId];
        require(lst.active, "inactive");
        require(msg.value >= lst.price, "insufficient");

        lst.active = false; // effects
        (uint256 royaltyAmt, address royaltyRecv) = _royalty(lst.collection, lst.tokenId, lst.price);
        uint256 feeAmt = (lst.price * platformFeeBps) / 10000;
        uint256 payToSeller = lst.price - royaltyAmt - feeAmt;

        // payouts
        if (royaltyAmt > 0 && royaltyRecv != address(0)) payable(royaltyRecv).sendValue(royaltyAmt);
        if (feeAmt > 0) payable(feeRecipient).sendValue(feeAmt);
        payable(lst.seller).sendValue(payToSeller);

        // transfer NFT
        IERC721(lst.collection).safeTransferFrom(address(this), msg.sender, lst.tokenId);

        // refund change
        if (msg.value > lst.price) payable(msg.sender).sendValue(msg.value - lst.price);

        emit Sold(listingId, msg.sender, lst.price, royaltyAmt, feeAmt);
    }

    function getListingsInRange(uint256 fromId, uint256 toId)
        external
        view
        returns (Listing[] memory arr)
    {
        require(fromId >= 1 && toId >= fromId && toId <= listingCount, "range");
        uint256 len = toId - fromId + 1;
        arr = new Listing[](len);
        for (uint256 i = 0; i < len; i++) {
            arr[i] = listings[fromId + i];
        }
    }

    function _royalty(address collection, uint256 tokenId, uint256 salePrice) internal view returns (uint256 amount, address receiver) {
        // 2981 check
        try IERC165(collection).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            if (supported) {
                try IERC2981(collection).royaltyInfo(tokenId, salePrice) returns (address r, uint256 a) {
                    return (a, r);
                } catch {}
            }
        } catch {}
        return (0, address(0));
    }

    // allow receiving ERC721 back
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}