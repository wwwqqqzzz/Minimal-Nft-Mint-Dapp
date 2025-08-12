# 技术架构记录

## 整个系统怎么搭起来的

这套NFT铸造应用分成四层，从用户点击到链上确认，数据流转路径清晰：

```
┌─────────────────────────────────────────────────────────────┐
│  前端展示层 - 用户看到的页面                                       │
├─────────────────────────────────────────────────────────────┤
│  React App (跑在 localhost:3000)                            │
│  核心文件: App.js + utils/ipfs.js + MyNFT.json             │
└─────────────────────────────────────────────────────────────┘
                              │
                        ethers.js 负责桥接
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  钱包连接层 - MetaMask 处理用户身份                              │
├─────────────────────────────────────────────────────────────┤
│  负责: 账户授权、网络切换、交易签名、权限控制                      │
└─────────────────────────────────────────────────────────────┘
                              │
                         JSON-RPC 通信
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  区块链执行层 - 真正干活的地方                                    │
├─────────────────────────────────────────────────────────────┤
│  Sepolia 测试网: MyNFT.sol 合约 + 交易处理 + 状态记录           │
└─────────────────────────────────────────────────────────────┘
                              │
                        IPFS 协议存储
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  内容存储层 - NFT 数据的家                                       │
├─────────────────────────────────────────────────────────────┤
│  通过 nft.storage: 图片 + 元数据 + 去中心化寻址                  │
└─────────────────────────────────────────────────────────────┘
```

## 关键模块一览（说人话版）

### 1) 前端（React）
- 做什么：渲染页面、连钱包、发交易、盯状态
- 看哪里：App.js（主要逻辑）、utils/ipfs.js（IPFS工具）、MyNFT.json（ABI）
- 基本状态：
```javascript
const [account, setAccount] = useState(null);           // 当前账户
const [status, setStatus] = useState('');               // 操作提示
const [loading, setLoading] = useState(false);          // 正在忙
const [totalSupply, setTotalSupply] = useState(0);      // 已铸造数量
const [isCorrectNetwork, setIsCorrectNetwork] = useState(false); // 网络是否正确
```

### 2) 合约（Solidity）
- 地址怎么配：前端 .env 里的 REACT_APP_CONTRACT_ADDRESS
- 能力概要：
```solidity
contract MyNFT is ERC721, Ownable {
    function mint() public returns (uint256);        // 铸造
    function totalSupply() public view returns (uint256); // 查询数量
    function setBaseURI(string memory uri) public onlyOwner; // 调整资源前缀
}
```
- 依赖：OpenZeppelin 的 ERC721 + Ownable + Counters

### 3) Web3 连接（ethers.js）
- 初始化：
```javascript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);
```
- 网络检测：
```javascript
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const chainId = await window.ethereum.request({ method: 'eth_chainId' });
```

### 4) 存储（IPFS）
- 元数据长这样：
```json
{
  "name": "My NFT #0",
  "description": "A minimal example NFT",
  "image": "ipfs://QmHash.../image.png",
  "properties": { "example": true }
}
```
- 两种访问：
  - 原生: ipfs://QmHash.../metadata.json
  - 网关: https://ipfs.io/ipfs/QmHash.../metadata.json

## 交互流程（用户视角）

1) 连接钱包：点击连接 → 授权 → 读到账户 → 检测网络 → 更新UI
2) 切换网络：发现不对 → 提示按钮 → 一键切 Sepolia → 状态更新
3) 铸造NFT：点击铸造 → 调用 mint() → 签名发交易 → 等确认 → 数量+1
4) 查数据：页面加载 → 建立 provider → 调 totalSupply() → 展示

## 安全与体验

- 前端：输入校验、XSS防护、别在控制台打印敏感信息
- 合约：权限控制、避免重入、用安全库处理计数
- Web3：参数校验、先检查网络再发起交易、给到清晰授权提示

## 性能与扩展

- 前端：懒加载、缓存必要状态、减少不必要请求
- 合约：尽量省Gas、考虑批量流程、用事件做前端同步
- 存储：合理使用网关、压缩元数据、可接入CDN

- 未来可做：多链支持（抽象配置/地址映射）、批量铸造/白名单/定价、响应式UI/主题/多语言

---

最后更新：2024年12月