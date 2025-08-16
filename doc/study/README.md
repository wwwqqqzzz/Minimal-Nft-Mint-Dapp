# 开发旅程随记

这里不是教科书，而是我的"踩坑"手账。写下来，只为以后少掉进同一个坑，也帮后来者少走弯路。

## 我都记了些什么？

1. **network-switching-solution.md**  
   网络切换功能从踩坑到顺手的完整过程，解决了钱包网络不匹配的用户体验问题。

2. **frontend-error-fixes.md**  
   前端编译错误修复经验，包括 ESLint 未定义函数、useEffect 依赖管理、组件状态同步等实战记录。

3. **nft-loading-strategies.md**  
   NFT 列表加载与展示的多种策略，从基础显示到兜底加载机制的完整解决方案。

4. **windows-development-tips.md**  
   Windows 环境下开发 React DApp 的注意事项，PowerShell 语法、端口管理、启动脚本等。

## 重点心得速览

### 前端开发经验
- **函数调用检查**: useEffect 中调用的所有函数都必须在组件内定义或正确导入，避免 ESLint 报错
- **状态管理**: 复杂 UI 状态（如 NFT 列表显示/隐藏、分页、加载状态）需要合理的状态设计
- **兜底机制**: 为 IPFS 访问不稳定、tokenURI 获取失败等情况设计降级方案
- **用户体验**: 加载状态、错误提示、占位图等细节决定应用的可用性

### 合约交互经验  
- 写合约前，先想清楚 **Gas** 究竟要花在哪；不然部署那一刻就是钱包在哭。  
- OpenZeppelin 真香，能不自己造轮子就别造。  
- 前端和链交互，一半靠 **ethers.js**，另一半靠耐心。  
- 网络不匹配永远是第一大坑，做切换提示等于给自己省事。

### 开发环境经验
- **Windows PowerShell**: 使用 `$env:PORT=3001; npm --prefix ./frontend start`，避免 `&` 语法坑
- **端口管理**: CRA 会在端口占用时自动分配新端口，注意查看终端输出的实际 URL
- **依赖管理**: 定期使用 `npm ci` 确保依赖版本一致性
- **错误排查**: 浏览器控制台 + ESLint 输出 + React DevTools 三重保障

## 最近重要修复记录

### 2024年12月 - 前端编译错误修复
- **问题**: `connectSilently` 和 `refreshOnChainState` 函数未定义导致 ESLint 报错
- **解决**: 移除未定义函数调用，使用现有的 `checkNetwork`、`getWalletMintInfo`、`estimateGasCost`、`loadMintedNFTs` 函数
- **学习**: useEffect 中的函数调用必须确保函数存在，避免盲目复制代码片段

### 2024年12月 - NFT 列表功能完善
- **新增**: showNFTList 状态控制、分页显示、加载状态、骨架屏组件
- **优化**: 兜底加载机制（tokenURI 失败时使用 ownerOf 枚举）
- **体验**: 占位图、错误处理、空状态提示

### 2024年12月 - 网络与环境一致性修复
- **问题**: 前端配置切到 Mumbai，合约与 NFT 在 Sepolia，导致“我的 NFT 收藏”不显示
- **修复**: 恢复 `frontend/.env` 至 Sepolia 网络与正确合约地址，重启前端
- **经验**: UI 上应显式标注“当前链 vs 目标链”，并默认自动展开“我的 NFT 收藏”减少误解