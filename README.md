# 🎨 Minimal NFT Mint DApp

> 一个功能完整、易于使用的 NFT 铸造去中心化应用程序

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-yellow.svg)](https://hardhat.org/)

## 📖 项目介绍

Minimal NFT Mint DApp 是一个现代化的 NFT 铸造平台，提供两种不同的铸造模式：
- **原版铸造**：传统的顺序 NFT 铸造
- **可选择铸造**：用户可以选择特定模板或随机铸造

## ✨ 核心功能

### 🔗 钱包与网络
- ✅ MetaMask 钱包连接
- ✅ 多网络支持（Sepolia、Mainnet 等）
- ✅ 自动网络检测与切换提示
- ✅ 账户余额与状态显示

### ⚡ 铸造功能
- ✅ **双模式铸造**：原版铸造 + 可选择模板铸造
- ✅ **Gas 优化**：三档 Gas 费用选择（慢速/标准/快速）
- ✅ **智能限制**：每钱包铸造数量限制
- ✅ **白名单系统**：支持预售白名单机制
- ✅ **实时状态**：交易状态实时跟踪与提示
- ✅ **模板管理**：动态模板上架/下架

### 🎯 技术特性
- ✅ **ERC721 标准**：完全兼容的 NFT 合约
- ✅ **版税支持**：EIP-2981 标准版税
- ✅ **元数据灵活性**：支持 IPFS 和 HTTP
- ✅ **安全性**：防重复铸造、溢出保护
- ✅ **可枚举**：支持查询所有 NFT

### 🎨 用户体验
- ✅ **现代化 UI**：响应式设计，支持深/浅色主题
- ✅ **骨架屏**：优雅的加载状态
- ✅ **错误处理**：友好的错误提示与恢复
- ✅ **双语界面**：中英文支持

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn
- Git

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd Minimal-Nft-Mint-Dapp
```

### 2. 安装依赖

```bash
# 安装根目录依赖（Hardhat 等）
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env
cp frontend/.env.example frontend/.env

# 编辑 .env 文件，填入你的配置
# PRIVATE_KEY=你的钱包私钥
# ALCHEMY_API_KEY=你的Alchemy API密钥
# ETHERSCAN_API_KEY=你的Etherscan API密钥
```

### 4. 本地开发

```bash
# 启动 Hardhat 本地网络（可选）
npx hardhat node

# 部署合约到测试网络
npx hardhat run scripts/deploy.js --network sepolia

# 启动前端开发服务器
cd frontend
npm start
```

访问 `http://localhost:3000` 开始使用！

## 📁 项目结构

```
Minimal-Nft-Mint-Dapp/
├── contracts/                 # 智能合约
│   ├── MyNFT.sol             # 原版 NFT 合约
│   └── SelectableNFT.sol     # 可选择模板 NFT 合约
├── scripts/                   # 部署和管理脚本
│   ├── deploy.js             # 合约部署
│   ├── upload.js             # 元数据上传
│   └── setup-selectable-templates.js  # 模板设置
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── App.js            # 原版铸造界面
│   │   ├── SelectableApp.js  # 可选择铸造界面
│   │   ├── index.js          # 应用入口与切换
│   │   └── utils/            # 工具函数
│   └── public/
│       ├── metadata/         # 本地元数据文件
│       └── assets/           # 图片资源
├── doc/                      # 详细文档
│   ├── deployment/           # 部署指南
│   ├── tech/                 # 技术文档
│   └── troubleshooting/      # 故障排除
├── metadata/                 # NFT 元数据模板
└── assets/                   # 原始图片资源
```

## 🔧 开发指南

### 合约开发

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署合约
npx hardhat run scripts/deploy.js --network <network>

# 验证合约
npx hardhat verify --network <network> <contract-address> <constructor-args>
```

### 前端开发

```bash
cd frontend

# 开发模式
npm start

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 常用脚本

```bash
# 上传 NFT 资源到 IPFS
node scripts/upload.js

# 设置可选择模板
node scripts/setup-selectable-templates.js

# 检查合约状态
node scripts/health-check.js

# 更新合约 baseURI
node scripts/updateBaseURI.js
```

## 📖 详细文档

- 📚 [用户使用指南](./doc/USER_GUIDE.md) - 如何使用 DApp 铸造 NFT
- 🔧 [开发者文档](./doc/DEVELOPER.md) - 技术架构与开发指南
- 🚀 [部署指南](./doc/deployment/deployment-guide.md) - 完整部署流程
- ❓ [常见问题](./doc/FAQ.md) - 问题排查与解决方案
- 📋 [API 文档](./doc/API.md) - 合约接口与前端 API

## 🎯 使用方式

### 原版铸造
1. 连接 MetaMask 钱包
2. 确保在正确的网络（Sepolia/Mainnet）
3. 选择 Gas 费用档位
4. 点击"铸造 NFT"按钮
5. 在钱包中确认交易

### 可选择铸造
1. 连接钱包并切换到可选择铸造界面
2. 浏览可用的 NFT 模板
3. 选择心仪的模板或选择随机铸造
4. 设置 Gas 费用并确认交易
5. 查看铸造结果和收藏

## 🛠️ 技术栈

- **前端**: React 18, Ethers.js v6
- **智能合约**: Solidity 0.8.19, OpenZeppelin
- **开发工具**: Hardhat, Waffle
- **元数据存储**: IPFS, NFT.Storage
- **网络**: Ethereum, Sepolia Testnet

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 🆘 支持

如果遇到问题：
1. 查看 [常见问题](./doc/FAQ.md)
2. 查看 [故障排除文档](./doc/troubleshooting/common-issues.md)
3. 在 GitHub Issues 中提交问题

## 🔗 相关链接

- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库
- [Hardhat](https://hardhat.org/) - 以太坊开发环境
- [Ethers.js](https://docs.ethers.io/) - 以太坊库
- [IPFS](https://ipfs.io/) - 分布式存储网络

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！