# Vercel 部署指南：从本地到线上

你已在本地跑通了前端，现在要让别人也能访问。Vercel 是最省心的方案。

## 前置要求
- GitHub 仓库已推送（代码要在线上）
- 合约已部署到测试网或主网
- 前端在本地能正常运行

## 一键部署流程

### 1. 准备代码（确保最新）
```bash
# 检查状态
git status

# 提交并推送最新改动
git add .
git commit -m "ready for vercel deployment"
git push
```

### 2. 进入 Vercel 控制台
- 访问 https://vercel.com
- 用 GitHub 账户登录
- 点击 "New Project"

### 3. 导入项目
- 选择 "Import Git Repository"
- 找到你的 NFT 项目仓库
- 点击 "Import"

### 4. 配置构建设置
**重要**：因为前端在 `frontend/` 子目录，需要特殊配置：

```
Framework Preset: Create React App
Root Directory: frontend
Build Command: npm run build
Install Command: npm install  
Output Directory: build
Node.js Version: 18.x (推荐)
```

### 5. 设置环境变量
在 "Environment Variables" 部分添加：

```
REACT_APP_CONTRACT_ADDRESS = 0x你的合约地址
REACT_APP_NETWORK = sepolia
```

**注意**：
- 变量名要准确，区分大小写
- 如果是主网部署，改成 `mainnet`
- 不要添加 `PRIVATE_KEY` 等后端变量（前端用不到且不安全）

### 6. 点击 Deploy
- Vercel 会自动：
  1. 克隆你的仓库
  2. 进入 `frontend/` 目录
  3. 运行 `npm install`
  4. 运行 `npm run build`
  5. 部署到 CDN

- 等待 1-2 分钟，完成后会分配一个域名，如：
  ```
  https://your-project-name.vercel.app
  ```

### 7. 验证部署
打开分配的域名，检查：
- [ ] 页面正常加载
- [ ] "Connect Wallet" 按钮可用
- [ ] 合约地址显示正确
- [ ] 网络切换提示正常
- [ ] 能成功连接 MetaMask 并 Mint

## 自动重新部署

以后每次你 `git push` 到 main 分支，Vercel 会自动重新构建和部署。非常省心。

## 高级配置

### 自定义域名
- 在 Vercel 项目设置 → Domains
- 添加你的域名（需要在域名商处设置 DNS）

### 预览环境
- 每个 Pull Request 都会生成预览链接
- 适合团队协作和测试

### 性能优化
- Vercel 自动启用 CDN 和压缩
- 默认支持 HTTPS
- 支持 Serverless Functions（如果需要后端 API）

## 常见问题

**构建失败？**
- 检查 Root Directory 是否设为 `frontend`
- 确认本地 `npm run build` 能正常执行
- 查看构建日志的具体报错

**环境变量不生效？**
- 确认变量名正确（`REACT_APP_` 前缀必须有）
- 重新部署（改环境变量后需要手动触发）

**页面空白？**
- 检查浏览器控制台报错
- 确认合约地址格式正确
- 验证网络配置

**MetaMask 连不上？**
- 确认部署后的网络设置与合约网络一致
- 检查 `REACT_APP_NETWORK` 变量值

## 生产建议

上主网前：
- 替换为主网合约地址
- 更新 `REACT_APP_NETWORK=mainnet`
- 测试所有功能
- 考虑添加错误监控（如 Sentry）

---

*恭喜！你的 NFT DApp 已经可以被全世界访问了。*