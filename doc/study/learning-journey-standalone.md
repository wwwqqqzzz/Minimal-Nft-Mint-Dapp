# 从零到一：SelectableNFT DApp 独立学习与实战手册（Standalone）

本手册是“单文件可读、可执行”的学习与实战指南，不依赖任何其它文档。按本文从上到下操作，你可以从零在本地跑通并理解一个支持模板选择铸造（SelectableNFT）的最小可用 NFT DApp，并将其用于演示或简历展示。

---

## 1. 你将获得什么
- 一个在测试网（推荐 Sepolia）可用的可选择铸造 NFT DApp：合约 + 前端
- 默认仅展示 4 个标准模板（0-3.json）的前端体验，便于稳定演示
- 从环境搭建、部署、启用模板、启动前端到排障的全流程步骤
- 面向公共 RPC 的稳定性建议与可扩展思路

---

## 2. 环境准备（10 分钟）
- Node.js LTS（建议 v18+）
- Git（用于拉取代码）
- 一个以太坊测试网钱包（MetaMask）与少量 Sepolia 测试 ETH
- 一个可用 RPC（Alchemy/Infura/自建，或公共 RPC）
- 操作系统：Windows / macOS / Linux 均可；下文示例以 Windows PowerShell 为主

克隆与安装依赖：
```
# 克隆仓库（示例）
# git clone <your-repo-url>
# cd Minimal Nft Mint Dapp

# 安装依赖（根目录 + 前端）
npm install
cd frontend && npm install && cd ..
```

---

## 3. 必要配置（一次性）
在项目根目录创建 .env 文件（与 .env.example 同级），示例：
```
# RPC（任选其一或都填写）
MUMBAI_URL=https://polygon-mumbai.g.alchemy.com/v2/your_key_here
SEPOLIA_URL=https://sepolia.infura.io/v3/your_key_here

# 部署用私钥（务必确保安全）
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# 可选：nft.storage 的 API Key（如需上传到 IPFS）
NFT_STORAGE_KEY=your_nft_storage_api_key

# 可选：合约源码验证（Etherscan/Polygonscan）
ETHERSCAN_API_KEY=your_etherscan_or_polygonscan_key

# 下方地址会在部署脚本执行后自动追加/更新
# SELECTABLE_CONTRACT_ADDRESS=0x...
# CONTRACT_ADDRESS=0x...
# REACT_APP_CONTRACT_ADDRESS=0x...
```

在 frontend 目录创建 .env（或编辑 .env.example 为 .env），示例：
```
# 部署合约后填入（也可由根目录 .env 追加进来）
REACT_APP_CONTRACT_ADDRESS=0x...

# 目标网络（sepolia / mumbai / amoy），推荐 sepolia
REACT_APP_NETWORK=sepolia
```
说明：前端代码会优先读取 `REACT_APP_SELECTABLE_CONTRACT_ADDRESS`，否则回退到 `REACT_APP_CONTRACT_ADDRESS`。

---

## 4. 一小时从零跑通
1) 编译合约
```
npx hardhat compile
```

2) 部署 SelectableNFT 合约（会把合约地址自动写入根目录 .env）
```
node scripts/deploy-selectable-nft.js
```
输出包含：部署者地址、交易哈希、合约地址、网络名称以及一条可用于 Etherscan 验证的命令。脚本会把合约地址以如下键名追加到 .env：
- SELECTABLE_CONTRACT_ADDRESS
- CONTRACT_ADDRESS
- REACT_APP_CONTRACT_ADDRESS

3) 同步 ABI 到前端
```
node scripts/copy-selectable-abi.js
```
该脚本会把 `SelectableNFT.json` 复制到前端 `src/abi/SelectableNFT.json`，并生成一个“最小化 ABI”（`src/abi/selectable-min-abi.json`）便于前端接入。

4) 准备模板（两种方式，择一即可）
- 方式 A：本地 HTTP 模板（推荐用于演示）
  - 启动前端前执行：
    ```
    # 仅启用 HTTP 本地模板；支持保持仅 4 个标准模板
    # 需要先完成部署，保证 .env 中已有 CONTRACT_ADDRESS
    $env:ONLY_FOUR='true'   # 可选，true 仅保留 0-3.json 每种一张
    node scripts/enable-http-templates.js
    ```
  - 脚本会在链上把非 0-3.json 的 HTTP 模板禁用，并在 0-3.json 中保留每种“模板 ID 最小”的那一张，方便稳定展示。

- 方式 B：上传到 IPFS（可选）
  - 先准备 `NFT_STORAGE_KEY`，再执行上传脚本（示例名称见 scripts 目录），上传后运行 `setup-selectable-templates.js` 将模板写入合约：
    ```
    node scripts/upload-selectable-nfts.js
    node scripts/setup-selectable-templates.js
    ```

5) 启动前端
```
# Windows PowerShell 指定端口示例
$env:PORT='3002'; npm --prefix './frontend' start
```
成功后，浏览器访问 `http://localhost:3002/`（或控制台提示的实际端口）。

---

## 5. 前端使用说明（选择模板铸造）
- 连接钱包（MetaMask）并确保网络为 `REACT_APP_NETWORK` 指定的网络（默认 sepolia）
- 首屏会显示可用模板网格：
  - 默认只显示四个标准模板（0-3.json），同一模板存在多份时取链上“模板 ID 最小”的那一份
  - 该策略仅影响前端显示，不改变链上真实模板集合
- 选择某个模板并发起铸造（mintSelected）
- 如需随机铸造，可切换为随机模式（mintRandom）
- 可选：选择 Gas 档位（慢速/标准/快速）估算费用

---

## 6. 设计取舍与可扩展
- 为什么只显示 4 个模板：降低首屏决策成本，确保稳定加载，并避免公共 RPC/网关抖动带来的噪音
- 不动链上数据：仅做“显示层过滤”，保持链上集合完整性
- 可扩展：将“仅显示四个模板”的策略做成环境变量或前端设置开关（例如 `FRONTEND_TEMPLATE_FILTER=4`/`all`/`custom`），在演示与生产间自由切换

---

## 7. 常见问题与排查（独立版）
1) 前端只显示 4 张模板？
- 这是刻意的显示层策略。若使用 `enable-http-templates.js` 并设置了 `ONLY_FOUR=true`，链上也会仅保留 0-3.json 每种一个 HTTP 模板处于启用状态。

2) 端口被占用或前端启动多个实例？
- Windows 指定端口启动：`$env:PORT='3002'; npm --prefix './frontend' start`
- 如已存在多个 Dev Server，先结束其它实例或更换端口

3) 公共 RPC 限流导致请求失败？
- 尝试减速、分批操作、增加重试，或改用专用 RPC（如 Alchemy/Infura）
- 部署脚本/模板脚本遇到失败，等待片刻再次执行

4) 前端报 ABI/合约方法不匹配？
- 先 `npx hardhat compile`，再执行 `node scripts/copy-selectable-abi.js`
- 确认前端 `.env` 中的 `REACT_APP_CONTRACT_ADDRESS` 与链上部署地址一致

5) MetaMask 无响应或链切换失败？
- 关闭浏览器扩展重新打开，或在钱包里手动切换到目标网络
- 若网络不存在，按照前端提示添加网络

6) IPFS 加载慢或超时？
- 切换网关、增加本地缓存，或直接在开发阶段使用本地 HTTP 模板

7) Gas 估算失败？
- 适当提高 Gas 档位，或再次尝试；确保当前模板仍“可铸造”

---

## 8. 合约验证与线上演示（可选）
- 合约验证：部署脚本输出了 `hardhat verify` 的完整命令，按提示执行即可完成 Etherscan 验证
- 线上演示：可将前端部署到 Vercel/Netlify（创建项目 → 选择 frontend 目录 → Framework 选择 React → 使用系统默认构建即可）
- 对外展示建议：在首页或 README 顶部放置 Demo 链接、合约地址（Etherscan 链接）与一张首屏截图

---

## 9. 进一步演进方向
- 把“仅显示四个模板”做成前端/脚本双开关（运行时/构建时）
- 增加 CI（GitHub Actions）：前端 lint/build、Hardhat compile/test、ABI 同步检查
- 预提交钩子（Husky + lint-staged）统一代码风格
- 结合 The Graph/Alchemy API 做更快的模板/事件索引
- 覆盖端到端最小测试（部署 → 设置模板 → 前端铸造）

---

## 10. 脚本速查（常用命令一览）
- 部署合约：
```
node scripts/deploy-selectable-nft.js
```
- 同步 ABI：
```
node scripts/copy-selectable-abi.js
```
- 写入模板到合约（需先准备 `.selectable-nft-templates` 数据，通常由上传脚本生成）：
```
node scripts/setup-selectable-templates.js
```
- 仅启用本地 HTTP 模板；可配合 `ONLY_FOUR=true` 仅保留 0-3.json：
```
$env:ONLY_FOUR='true'
node scripts/enable-http-templates.js
```

---

## 11. 目录速览（只读，帮助你定位关键文件）
- contracts/SelectableNFT.sol —— 可选择铸造的核心合约
- scripts/deploy-selectable-nft.js —— 部署合约脚本
- scripts/copy-selectable-abi.js —— 同步 ABI 到前端
- scripts/setup-selectable-templates.js —— 把模板配置写入链上
- scripts/enable-http-templates.js —— 启用本地 HTTP 模板（支持仅保留 4 个）
- frontend/src/SelectableApp.js —— 前端页面与交互逻辑
- metadata/0.json ~ 3.json —— 本地示例模板元数据

---

## 12. 结语
“任何人一小时能跑起来、十分钟能看明白”的体验，是把技术成果变成可传播作品的关键。你可以直接把本手册作为学习与演示用文档附在项目中，对外分享时只需提供仓库地址与在线演示链接即可。祝顺利！
