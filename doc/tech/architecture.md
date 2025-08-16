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

## SelectableNFT（可选模板）架构与数据流

本模式允许在同一合约下维护多套模板，前端在渲染时获取可用模板并让用户选择后进行铸造。

### 组件与职责
- 合约：contracts/SelectableNFT.sol
  - 暴露模板查询接口（如 getAvailableTemplates、getTemplateInfo）
  - 维护模板可用状态与 metadataURI（IPFS 或 HTTP）
  - 提供带模板参数的铸造入口（如 mint 带 templateId 参数，具体以合约实现为准）
- 前端：frontend/src/SelectableApp.js
  - 初始化合约实例、加载模板、展示选择 UI
  - 处理模板去重/过滤、发起铸造交易、更新状态
- 元数据：metadata/0.json ~ 3.json（示例本地 HTTP 模板）
- 脚本（scripts/）：
  - enable-http-templates.js：启用本地 HTTP 模板
  - disable-all-templates.js：禁用全部模板
  - setup-selectable-templates.js：批量初始化模板
  - upload-selectable-nfts.js：上传模板 metadata 到 IPFS
  - copy-selectable-abi.js：同步 ABI 至前端

### 数据流（加载与铸造）
```
Frontend(SelectableApp) ──> Contract.getAvailableTemplates() ──> [IDs]
                           └─> For Each ID: getTemplateInfo(id) ──> metadataURI
                           └─> fetch(metadataURI) ──> 模板详情
                           └─> 显示层过滤/去重 ──> 渲染模板卡片
用户选择模板 ──> 触发铸造（带模板参数） ──> 钱包签名 ──> 等待确认 ──> 列表/状态刷新
```

### 显示层过滤（当前版本策略）
- 仅展示本地 0.json、1.json、2.json、3.json 四个模板；如同编号存在多份，选择 templateId 最小者。
- 该策略只影响前端显示，不修改链上状态；链上可以存在更多模板。
- 后续可将此策略做成可配置（如 REACT_APP_LIMIT_TEMPLATES）或 UI 开关。

### 环境变量与运行
- 根目录 `.env`：
  - SEPOLIA_URL：建议使用稳定的 RPC；遇到限流可临时 `https://rpc.sepolia.org`
  - PRIVATE_KEY：部署/脚本账户私钥（0x 开头）
- 前端 `.env`：
  - REACT_APP_CONTRACT_ADDRESS：合约地址
  - （可选）REACT_APP_NETWORK、REACT_APP_LIMIT_TEMPLATES
- 开发服务器（Windows PowerShell）：
```powershell
$env:PORT=3003; npm --prefix ./frontend start
```

### 异常与重试建议
- RPC 限流/429：
  - 切换公共 RPC 或更换供应商 Key；对脚本增加指数退避与重试
- IPFS 拉取失败：
  - 使用多网关降级（前端 utils/ipfs.js 已支持）
- 端口占用：
  - CRA 会提示并切换端口（如 3001/3002/3003），以终端地址为准

---

最后更新：2025年08月（新增 SelectableNFT 模式与显示层过滤策略）