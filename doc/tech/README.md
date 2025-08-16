# 技术概览

本节汇总了 Minimal NFT Mint DApp 的技术画像——从智能合约的编写到前端交互，再到部署和安全考量，力求为开发与维护提供清晰、专业的参考。

## 目录速览

| 文档 | 内容 |
| --- | --- |
| `architecture.md` | 整体系统架构与数据流 |
| `frontend.md` | 前端工程结构与状态管理（参考根 README"前端 UI 功能与最近改动概览"与 troubleshooting/common-issues.md） |
| `api-reference.md` | 内部脚本 / API 调用规范（参考 scripts 目录） |
| `smart-contracts.md` | 合约接口与实现细节（参考 contracts/MyNFT.sol 与 hardhat config） |
| `security.md` | 常见攻击面与防护策略（参考 troubleshooting/common-issues.md） |

## 技术栈一览

### 区块链侧
- **Solidity 0.8.19** 编写 ERC-721 合约，采用 **OpenZeppelin** 库减少安全风险
- **高级功能**: 每钱包铸造限制 (maxMintPerWallet)、白名单机制 (whitelistEnabled)、EIP-2981 版税支持
- **Hardhat** 负责编译、测试、部署与 Etherscan 验证，脚本化流程保持一致性
- 支持多链部署：**Sepolia**、**Polygon Mumbai**，可平滑迁移至主网

### 前端侧
- 基于 **React 18**，采用 **ethers.js v6** 与 **MetaMask** 衔接链上交互
- **高级 UI 功能**:
  - 白名单状态检查与提示
  - 实时 Gas 费估算（多档位选择）
  - NFT 预览（铸造前展示）
  - 铸造进度条（已铸/总量）
  - 我的 NFT 收藏（兜底加载、分页、骨架屏）
- 样式层保留 **原生 CSS**，便于后续接入任意 UI 框架

### 存储 & 配置
- 元数据与图片统一上链至 **IPFS（nft.storage 网关）**
- 通过 **.env** 管理环境变量，隔离私钥与链上配置
- 支持多 IPFS 网关降级访问

### 开发工具
- Hardhat 一站式覆盖 **compile ➜ test ➜ deploy ➜ verify**
- 完整的脚本工具链：部署、验证、元数据上传、状态检查
- 支持多网络 npm scripts：`deploy:sepolia`、`deploy:mumbai`、`verify:sepolia`、`verify:mumbai`

## 核心能力

### 智能合约功能
- **基础 ERC-721**: 标准 NFT 铸造、转移、查询
- **铸造限制**: 每个钱包最大铸造数量控制
- **白名单系统**: 支持开启/关闭、批量添加/移除、状态查询
- **版税机制**: EIP-2981 标准版税，可配置接收者和比例
- **状态查询**: getWalletMintInfo() 一次性获取用户铸造信息

### 前端交互功能
- **钱包连接**: 自动检测 MetaMask，支持多账户切换
- **网络管理**: 实时检测网络，一键切换到目标链
- **智能铸造**: 
  - 白名单验证（未在名单则阻止铸造）
  - 多档位 Gas 选择（低/中/高速度）
  - 二次确认弹窗（显示 Gas 信息）
- **数据展示**:
  - 实时总供应量和进度条
  - 用户钱包状态（已铸数量、剩余额度、白名单状态）
  - NFT 预览（从合约获取真实元数据）
- **NFT 收藏**: 
  - 显示/隐藏切换
  - 多种加载策略（tokenOfOwnerByIndex + ownerOf 兜底）
  - 分页显示、加载状态、占位图

### 开发体验
- **多链支持**: 配置驱动的网络切换，支持测试网和主网
- **合约验证**: 一键验证源码到 Etherscan/Polygonscan
- **IPFS 托管**: 自动化元数据和图片上传流程
- **调试工具**: 丰富的检查脚本（钱包状态、合约信息、交易详情）

## 项目完整性

### A. 进阶 Solidity & 合约功能扩展 ✅
- ✅ maxMintPerWallet 限制
- ✅ 白名单机制（开关控制、批量管理）
- ✅ EIP-2981 版税支持
- ✅ Sepolia 测试网部署与调试

### B. 前端 DApp 升级 ✅
- ✅ 白名单检查（未在名单用户无法铸造）
- ✅ 铸造进度条（显示已铸数量/总量）
- ✅ Gas 费估算与提示（多档位实时更新）
- ✅ NFT 预览（Mint 前显示图片和元数据）

### C. 多链部署 & Web3 工具熟悉 ✅
- ✅ Polygon Mumbai 测试网部署支持
- ✅ Etherscan/Polygonscan 合约源码验证
- ✅ Pinata/NFT.Storage IPFS 元数据托管
- ✅ 完整的部署和验证脚本

## 技术债务与优化方向

### 已知待改进
- Merkle Tree 白名单（提升大批量名单的 Gas 效率）
- EIP-1559 支持（maxFeePerGas/maxPriorityFeePerGas 档位）
- 批量铸造功能（ERC721A 或自定义批量逻辑）
- 响应式设计和主题切换

### 扩展建议
- 多图轮播 NFT 预览
- 合约权限管理面板
- 实时交易状态跟踪
- 社交分享功能

---

*最后更新时间：2024年12月 - 项目功能完整，覆盖进阶合约功能、高级前端交互、多链部署实践*