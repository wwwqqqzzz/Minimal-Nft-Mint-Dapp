# 从零到一：SelectableNFT 最小可用铸造 DApp 学习与实战日志

> 这是一份“学习 + 实战”的过程型文档，记录我如何从零跑通、理解并扩展本项目（Minimal NFT Mint Dapp，含 SelectableNFT 模式）。面向读者：想快速上手的人，以及需要把项目写进简历/作品集的人。

---

## 1. 目标与成果
- 一句话目标：在测试网部署一个支持“前端选择模板铸造”的 NFT DApp，并提供一键化脚本与可复制的文档体系。
- 最终成果：
  - 合约部署在 Sepolia（可校验）
  - 前端可在本地或 Vercel 打开
  - 默认仅显示 4 个标准模板（0-3.json），避免信息噪音
  - 完整的使用、部署、故障排查与架构说明文档

参考文档：
- 使用说明：`/README.md`
- 部署指南：`/doc/deployment/README.md`
- 常见问题：`/doc/troubleshooting/common-issues.md`
- 技术架构：`/doc/tech/architecture.md`

---

## 2. 环境准备（10 分钟）
- Node.js LTS（建议 v18+）
- 一个测试网钱包（MetaMask）和少量 Sepolia 测试 ETH
- 一个可用的 RPC（Alchemy/Infura/自建，或公共 RPC）
- Windows/ macOS/ Linux 均可；Windows 可用 PowerShell 方便设置端口变量

克隆并安装依赖：
```
# 克隆
# git clone <your-repo-url>
# cd Minimal Nft Mint Dapp

# 安装依赖（根目录 + 前端）
npm install
cd frontend && npm install && cd ..
```

---

## 3. 最短路径跑通（~1 小时）
1) 编译与部署合约（SelectableNFT）
```
# 在根目录
npx hardhat compile
node scripts/deploy-selectable-nft.js
```
部署脚本会输出合约地址。建议随后在 Etherscan 进行合约校验，提升可验证性。

2) 同步 ABI 到前端
```
node scripts/copy-selectable-abi.js
```

3) 启动前端（默认端口 3001/3002/3003 中一个）
```
# Windows PowerShell 示例（指定端口）
$env:PORT='3002'; npm --prefix './frontend' start
```

4) 启用本地 HTTP 模板（用于 Demo）
```
# 将前端或本地 metadata 作为 HTTP 源启用，便于统一演示
node scripts/enable-http-templates.js
```
完成后，前端会默认仅展示 4 个模板（0-3.json），每种取最小 ID 的一张，便于“从零到一”的演示与讲解。

---

## 4. 关键概念与目录总览（5 分钟）
- 合约：`/contracts/SelectableNFT.sol`
- 前端入口：`/frontend/src/SelectableApp.js`
- 模板元数据（本地示例）：`/metadata/0.json` ~ `3.json`
- 常用脚本（节选）：
  - `deploy-selectable-nft.js`：部署合约
  - `setup-selectable-templates.js`：批量设置/启用模板
  - `copy-selectable-abi.js`：将 ABI 同步到前端
  - `enable-http-templates.js`：启用本地 HTTP 模板作为展示来源
  - `publish-local-metadata.js` / `upload-selectable-nfts.js`：与 IPFS/nft.storage 相关

---

## 5. 设计取舍：为什么“只显示 4 个模板”
- 目的：降低初次使用者的认知负担，确保页面稳定加载与清晰选项
- 策略：在前端显示层做“去重 + 最小 ID 挑选”，并默认仅展示 `0-3.json` 四个
- 影响范围：仅影响前端展示与选择，不更改链上真实模板集合
- 可演进：将该策略抽象为环境变量开关（例如 `FRONTEND_TEMPLATE_FILTER`），支持 4/全部/自定义集合

---

## 6. 从阅读到改造：我如何理解代码
- 先读文档（README、架构、部署、FAQ），确认端到端流程
- 按“最短路径”把 Demo 跑起来，记录每一步的输入输出（合约地址、ABI、前端端口）
- 进入前端，定位模板加载与过滤逻辑（`SelectableApp.js`）
- 在脚本目录逐个阅读部署/启用/上传相关脚本，梳理可复用的命令
- 验证公共 RPC 限流场景：观察前端与脚本的延迟与重试策略

---

## 7. 常见问题与排查路径（做事先看这节节省很多时间）
- 只显示 4 张模板？→ 这是刻意的显示层过滤，详见 FAQ
- 前端端口被占用？→ Windows 下可通过 PowerShell 指定 `PORT`，或释放端口
- RPC 限流/请求过多？→ 降速、分批、增加重试、使用私有 RPC
- IPFS 访问慢？→ 切换网关、做本地缓存或用 `nft.storage`
- ABI 不同步？→ 重新执行 `copy-selectable-abi.js`

详见：`/doc/troubleshooting/common-issues.md`

---

## 8. 上线与可视化展示（可选）
- Vercel 部署（推荐）：参考 `/doc/deployment/vercel-deploy.md`
- 在 README 顶部补充：在线 Demo 链接、合约地址（Etherscan）、一张首屏截图/说明
- 录一个 60 秒无声演示动图/视频，展示从选择模板到铸造完成

---

## 9. 简历与面试要点（可直接摘录）
- 项目一句话：
  - “SelectableNFT 模式的最小可用 NFT 铸造 DApp，前端支持模板去重与选择铸造，并提供脚本化部署与完备文档。”
- 技术亮点：
  - 前端显示层的模板聚合与最小 ID 选取，默认仅 4 模板，显著降低首屏复杂度
  - 端到端脚本化：部署/启用/ABI 同步/健康检查，缩短上手时间
  - 面向公共 RPC 的容错与幂等思路
  - 文档体系化（使用/部署/FAQ/架构），利于交付与评审
- 可量化描述（按实际填写）：
  - “首次跑通从 X 分钟降到 Y 分钟（-Z%）”
  - “公共 RPC 下铸造成功率达 X%（N 次重试策略）”

---

## 10. 后续演进路线
- 将模板过滤做成环境变量/运行时开关，支持自定义模板集
- 增加 GitHub Actions（CI）：lint、build、合约编译与测试
- 预提交钩子（Husky + lint-staged）统一风格
- 引入索引服务（The Graph/Alchemy API）优化读取
- 补充合约与前端的 E2E 最小测试

---

## 11. 我踩过的坑（Checklist）
- 忘记复制 ABI → 前端报错或读不到合约方法
- 公共 RPC 速率限制 → 偶发失败需重试或更换 RPC
- 端口占用 → 启动前端失败或多实例冲突
- IPFS 网关波动 → 模板加载慢或超时

---

## 12. 结语
把“能跑起来”做成“任何人一小时能跑起来”，把“能演示”做成“任何人十分钟能看明白”。这份学习日志的价值在于把经验沉淀为可复制流程，也更便于你在简历与面试中清晰表达你的设计与权衡。
