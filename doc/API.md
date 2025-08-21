# API 文档（草案）

本文档包含两部分：
1) 智能合约接口（Solidity ABI 层）
2) 前端交互接口（关键方法与事件）

> 注意：函数签名与具体入参以编译后的 ABI 为准，本文为结构化说明。

---

## 一、智能合约接口

### 1. MyNFT.sol
- name() -> string
- symbol() -> string
- totalSupply() -> uint256
- mint() -> uint256
- setBaseURI(string newBaseURI) onlyOwner
- tokenURI(uint256 tokenId) -> string
- supportsInterface(bytes4 interfaceId) -> bool
- Events:
  - Transfer(address from, address to, uint256 tokenId)

构造参数：
- name (string)
- symbol (string)
- baseURI (string)

### 2. SelectableNFT.sol（关键）
- maxSupply() -> uint256
- totalSupply() -> uint256
- mint(uint256 templateId) payable / nonpayable 视实现而定
- mintRandom() -> uint256（若实现）
- setBaseURI(string) onlyOwner
- tokenURI(uint256 tokenId) -> string
- enableTemplate(uint256 templateId, bool enabled) onlyOwner
- setTemplate(uint256 templateId, string baseURI, uint256 cap, bool enabled) onlyOwner
- getTemplate(uint256 templateId) -> (baseURI, cap, minted, enabled)
- setWhitelistEnabled(bool enabled) onlyOwner
- setWhitelistRoot(bytes32 merkleRoot) onlyOwner
- isWhitelisted(address account, bytes32[] proof) -> bool
- royaltyInfo(uint256 tokenId, uint256 salePrice) -> (address receiver, uint256 royaltyAmount)
- supportsInterface(bytes4 interfaceId) -> bool
- Events：
  - TemplateUpdated(templateId, baseURI, cap, enabled)
  - Minted(to, tokenId, templateId)

> 实际字段与方法以合约为准，上述为在代码检索中出现的核心能力抽象。

---

## 二、前端交互接口

主要由 React 组件与工具模块组成，以下列出关键方法：

### App.js（原版铸造）
- connectWallet(): 连接 MetaMask
- estimateGasCost(fn, args): 估算交易 Gas
- handleMint(): 发起 mint 交易，更新状态
- loadMyNFTs(): 加载当前账户持有的 NFT

状态字段：
- selectedGasLevel: 'slow' | 'standard' | 'fast'
- txStatus: idle | pending | success | error
- totalSupply: number

### SelectableApp.js（可选模板）
- fetchTemplates(): 读取链上模板列表并在前端进行展示过滤
- selectTemplate(id): 选择模板
- mintSelected(): 使用选定模板铸造
- mintRandom(): 随机铸造（如已实现）

### networks.js
- GAS_LEVELS: { slow: {maxPriorityFeePerGas, maxFeePerGas}, ... }
- CHAIN_CONFIG: 网络链 ID、RPC 与区块浏览器 URL

### 常用工具
- utils/ipfs.ts|js: ipfsToHttp(url)
- utils/tx.ts|js: waitForTx(tx), formatError(e)

---

## 三、事件与前端订阅
- Transfer: 用于刷新“我的 NFT”列表
- TemplateUpdated / Minted: 用于模板变更、铸造结果监听

---

## 四、错误码与提示（建议）
- ERR_NOT_WHITELISTED: 不在白名单
- ERR_MAX_SUPPLY_REACHED: 超过总量
- ERR_TEMPLATE_DISABLED: 模板不可用
- ERR_TX_REJECTED: 用户拒绝交易

> 实际错误需结合合约 `require` 消息与前端映射表。