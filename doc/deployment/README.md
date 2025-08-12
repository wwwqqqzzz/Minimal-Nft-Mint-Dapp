# 部署指南概览

本节汇总从本地调试到主网上线的完整路径，配合子文档可快速复现部署流程。

## 文档速览

- `deployment-guide.md` - 详细部署指南
- `network-config.md` - 网络配置说明
- `environment-setup.md` - 环境配置指南
- `verification.md` - 合约验证流程
- `maintenance.md` - 运维维护文档

## 支持网络

### 测试网络
- **Ethereum Sepolia**
  - Chain ID: 11155111
  - RPC: https://sepolia.infura.io/v3/YOUR_KEY
  - 浏览器: https://sepolia.etherscan.io/
  - 水龙头: https://sepoliafaucet.com/

- **Polygon Mumbai** (已弃用)
  - Chain ID: 80001
  - RPC: https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
  - 浏览器: https://mumbai.polygonscan.com/

### 主网络 (生产环境)
- **Ethereum Mainnet**
  - Chain ID: 1
  - RPC: https://mainnet.infura.io/v3/YOUR_KEY
  - 浏览器: https://etherscan.io/

- **Polygon Mainnet**
  - Chain ID: 137
  - RPC: https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
  - 浏览器: https://polygonscan.com/

## 流程一览

1. **环境准备**
   - 配置.env文件
   - 安装依赖包
   - 准备测试币

2. **合约部署**
   - 编译合约
   - 部署到测试网
   - 验证合约源码

3. **前端配置**
   - 复制ABI文件
   - 配置合约地址
   - 启动前端服务

4. **测试验证**
   - 功能测试
   - 交互测试
   - 性能测试

## 常见踩坑

- 🔐 **安全**: 不要将私钥提交到代码仓库
- 💰 **Gas费**: 部署前确保钱包有足够的测试币
- 🌐 **网络**: 确保RPC节点稳定可用
- ✅ **验证**: 部署后及时验证合约源码

---

*最后更新：2024年*