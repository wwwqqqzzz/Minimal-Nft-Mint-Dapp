# 部署指南概览

本节汇总从本地调试到上线的完整路径，配合子文档可快速复现部署流程。

## 文档速览

- `deployment-guide.md` - 详细部署指南（含环境变量、部署与验证命令）
- `vercel-deploy.md` - 使用 Vercel 部署前端
- （参考）`README.md` - 根目录 README 的脚本命令与注意事项
- （参考）`troubleshooting/` - 常见问题排查

## 支持网络

### 测试网络（推荐）
- **Ethereum Sepolia**（推荐）
  - Chain ID: 11155111
  - RPC: https://sepolia.infura.io/v3/YOUR_KEY（如遇限流可用 https://rpc.sepolia.org）
  - 浏览器: https://sepolia.etherscan.io/
  - 水龙头: https://sepoliafaucet.com/

- **Polygon Mumbai**（已弃用/历史保留）
  - Chain ID: 80001
  - RPC: https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
  - 浏览器: https://mumbai.polygonscan.com/

### 主网络（生产环境）
- **Ethereum Mainnet**
  - Chain ID: 1
  - RPC: https://mainnet.infura.io/v3/YOUR_KEY
  - 浏览器: https://etherscan.io/

- **Polygon Mainnet**
  - Chain ID: 137
  - RPC: https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
  - 浏览器: https://polygonscan.com/

## 环境准备

1) **配置 .env**（根目录）
- MUMBAI_URL / SEPOLIA_URL（可临时改为公共 RPC：`https://rpc.sepolia.org`）
- ETHERSCAN_API_KEY（Etherscan/Polygonscan）
- PRIVATE_KEY（0x 开头）

2) **安装依赖**
- `npm ci`（推荐）

3) **准备测试币**
- 获取 Sepolia ETH

## 合约部署与验证

- 编译：`npx hardhat compile`
- 部署到 Sepolia：`npm run deploy:sepolia`
- 部署到 Mumbai（历史）：`npm run deploy:mumbai`
- 验证源码：
  - Sepolia: `npm run verify:sepolia -- <CONTRACT_ADDRESS> "MyNFT" "MNFT" "ipfs://<CID>/"`
  - Mumbai: `npm run verify:mumbai -- <CONTRACT_ADDRESS> "MyNFT" "MNFT" "ipfs://<CID>/"`

脚本参考：
- `scripts/deploy.js`（部署与打印合约状态）
- `scripts/updateBaseURI.js`（更新 BaseURI）
- `scripts/check-wallet-nfts.js`（查询某钱包持有的 NFT 与铸造信息）

## SelectableNFT（可选模板）

- 合约：`contracts/SelectableNFT.sol`
- 常用脚本：
  - `scripts/deploy-selectable-nft.js`（部署 SelectableNFT）
  - `scripts/setup-selectable-templates.js`（批量初始化模板）
  - `scripts/enable-http-templates.js`（仅启用本地 0-3.json 方案）
  - `scripts/disable-all-templates.js`（禁用全部模板）
  - `scripts/upload-selectable-nfts.js`（上传模板 metadata 到 IPFS）

- 注意：脚本依赖 `.env` 的 `SEPOLIA_URL` 与 `PRIVATE_KEY`；如遇 429（Too Many Requests），请：
  1) 暂用公共 RPC：`SEPOLIA_URL=https://rpc.sepolia.org`
  2) 或使用你自己的供应商 Key（Alchemy/Infura/QuickNode 等）

## 前端环境与运行

1) 配置 `frontend/.env`
- `REACT_APP_CONTRACT_ADDRESS`
- `REACT_APP_NETWORK`（sepolia / polygon / baseSepolia）

2) 启动开发服务器（Windows PowerShell）
- 在项目根目录：`npm --prefix ./frontend start`
- 指定端口（示例）：
```powershell
$env:PORT=3003; npm --prefix ./frontend start
```
> 如 3000 被占用，CRA 会提示使用其他端口；请以终端提示为准。

3) 模板显示策略（当前版本）
- 前端内置显示层过滤，默认仅展示本地 0.json、1.json、2.json、3.json 四个模板；如同编号存在多份，选择 `templateId` 最小者。
- 该策略只影响显示，不影响链上模板的真实状态。

## 元数据与 IPFS

- 使用 `scripts/upload.js` / `scripts/quick-upload-metadata.js` 上传图片与元数据到 nft.storage
- 获取文件夹 CID 后，执行 `updateBaseURI.js` 更新合约 BaseURI（建议使用公共网关）
- 前端通过 `ipfsToHttp` 支持多网关降级，提升可访问性

## 常见问题

- 前端读不到数据：检查前端 .env 的网络与合约地址、ABI 是否同步、钱包网络是否正确
- 交易失败：先用 `estimateGasCost` 看预估，必要时切换更高 Gas 档位
- IPFS 访问慢：多试几个网关；或在脚本中 Pin 至 Pinata 并使用公共网关

---

最后更新：2025年08月（Sepolia 推荐；Mumbai 为历史兼容）