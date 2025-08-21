# 开发者文档（草案）

本文面向开发者，介绍项目架构、合约接口、前端模块与部署流程，便于二次开发与维护。

## 1. 技术栈
- 合约：Solidity 0.8.19 + OpenZeppelin（ERC721、ERC2981、Enumerable、URIStorage）
- 开发框架：Hardhat
- 前端：React 18 + Ethers v6
- 脚本：Node.js（部署、上传元数据、模板管理等）

## 2. 目录结构
参考 README 的“项目结构”章节。

## 3. 智能合约
- MyNFT.sol：基础 ERC721 合约，包含 totalSupply、baseURI、基本 mint()
- SelectableNFT.sol：支持模板选择的 ERC721，可启用/禁用模板、EIP-2981 版税、maxSupply、tokenURI 覆盖等

关键点：
- 版税：实现 EIP-2981，前端可读取 royaltyInfo(tokenId, salePrice)
- 白名单：支持开启/关闭白名单、Merkle Root、校验 proof
- 枚举：ERC721Enumerable 提供 tokensOfOwner、totalSupply 等能力

## 4. 前端架构
- src/App.js：原版铸造流程、Gas 档位、交易状态
- src/SelectableApp.js：可选模板铸造流程与模板展示
- src/index.js：应用与主题切换入口
- src/utils/：工具方法（如 gas 估算、IPFS 链接转换、网络配置）
- src/networks.js：网络与 GAS_LEVELS 配置

状态管理：组件内 useState + useEffect；重要状态包括：
- selectedTemplate / selectedGasLevel
- txStatus / isLoading / error
- myNFTs / totalSupply

## 5. 部署与脚本
常用脚本（摘录）：
- scripts/deploy.js：部署 MyNFT
- scripts/deploy-selectable-nft.js：部署 SelectableNFT
- scripts/upload.js / upload-selectable-nfts.js：上传图片与生成 metadata
- scripts/updateBaseURI.js / update-baseuri-new.js：更新合约 baseURI
- scripts/setup-selectable-templates.js / apply-templates.js：批量写入/覆盖模板
- scripts/enable-http-templates.js / disable-all-templates.js：启用/禁用模板
- scripts/health-check.js / check-template-status.js：状态检查
- scripts/copy-selectable-abi.js / copy-abi.js：将 ABI 同步到前端

环境变量：
- PRIVATE_KEY、RPC_URL（如 SEPOLIA_URL）、ETHERSCAN_API_KEY
- 前端：REACT_APP_CONTRACT_ADDRESS（或选择合约地址）

## 6. 开发流程建议
1. 修改合约后运行：`npx hardhat compile && npx hardhat test`
2. 在测试网络部署：`npx hardhat run scripts/deploy-*.js --network sepolia`
3. 同步 ABI 到前端：`node scripts/copy-*.js`
4. 启动前端开发：`npm --prefix ./frontend start`

## 7. 代码规范
- 合约：遵循 Solidity 风格指南，函数可见性显式声明，使用自解释命名
- 前端：函数与状态命名见名知意，错误兜底与 loading 状态必备
- 安全：严禁在代码或日志中暴露私钥、API key；.env 已加入 .gitignore

## 8. 测试建议
- 单元测试：铸造、白名单、上/下架模板、版税、maxSupply 边界
- 前端集成测试：钱包连接、gas 估算、交易状态、主题切换

## 9. 待补充
- 合约方法表（签名、访问控制、事件）
- Template 数据结构与事件说明
- 前端组件通信图与数据流动
- DevOps（CI/CD + 合约验证 + 前端自动构建）

> 本文为草案版，后续将逐步补齐接口细节与示例代码片段。