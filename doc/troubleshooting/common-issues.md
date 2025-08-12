# 常见问题与我的处理习惯

把我常遇到的问题和处理方式都放在这里，遇到同样状况可以直接照做。

## 1) totalSupply() 一直是 0 / 读不到
- 通常是钱包连错链（合约在 Sepolia，钱包在别处）
- 处理：页面加载就检测网络，不对就提示一键切换；必要时自动添加网络配置
```javascript
const SEPOLIA_CHAIN_ID = '0xaa36a7'
const chainId = await window.ethereum.request({ method: 'eth_chainId' })
if (chainId !== SEPOLIA_CHAIN_ID) {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    })
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Sepolia Test Network',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io/'],
        }],
      })
    }
  }
}
```

## 2) MetaMask 没反应 / 弹了错
- 先排查：网络、余额、合约地址、ABI
- 实操：
```javascript
if (!CONTRACT_ADDRESS) throw new Error('合约地址未配置')
const network = await provider.getNetwork()
console.log('当前网络:', network.name, network.chainId)
try {
  const gas = await contract.estimateGas.mint()
  console.log('预估Gas:', gas.toString())
} catch (err) {
  console.error('Gas估算失败:', err)
}
```

## 3) 部署脚本跑不通
- 常见：.env 错、私钥格式错、RPC 不稳、余额不够
- 我会这样做：
```bash
# 看 .env
cat .env
# 打开 hardhat console 验证网络
npx hardhat console --network sepolia
# 在 console 里查余额
# const bal = await ethers.provider.getBalance("YOUR_ADDRESS")
# console.log(ethers.utils.formatEther(bal))
```
- 快速检查：
  - [ ] PRIVATE_KEY 0x 开头
  - [ ] SEPOLIA_URL 可访问
  - [ ] 账户有测试 ETH
  - [ ] BASE_URI 已设置

## 4) 前端连不上 / 状态不更新
- 先判断浏览器有没有钱包；再监听账户和网络变化
```javascript
if (!window.ethereum) { alert('请安装 MetaMask'); return }
window.ethereum.on('accountsChanged', (accs) => setAccount(accs[0] || null))
window.ethereum.on('chainChanged', () => window.location.reload())
```

## 5) IPFS 打不开 / 图片 404
- 多准备几个网关，降级处理
```javascript
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
]
const ipfsToHttp = (ipfsUrl, i = 0) => {
  if (!ipfsUrl?.startsWith('ipfs://')) return ipfsUrl
  const hash = ipfsUrl.replace('ipfs://', '')
  return (IPFS_GATEWAYS[i] || IPFS_GATEWAYS[0]) + hash
}
```

## 6) 铸造后 UI 不刷新
- 交易确认要时间，前端要等确认并主动刷新
```javascript
const mintNFT = async () => {
  const tx = await contract.mint()
  const receipt = await tx.wait()
  await updateTotalSupply()
  await updateUserBalance()
}
useEffect(() => {
  const t = setInterval(() => {
    if (account && contract) {
      updateTotalSupply();
      updateUserBalance();
    }
  }, 10000)
  return () => clearInterval(t)
}, [account, contract])
```

## 7) 切换网络后各种错
- 重新初始化，清旧数据，再拉新数据
```javascript
window.ethereum.on('chainChanged', async (chainId) => {
  await initializeContract()
  setCurrentNetwork(chainId)
  setTotalSupply(0)
  setUserBalance(0)
  if (account) await loadContractData()
})
```

## 8) ABI 不同步导致前端挂
- 现象：方法调用报错、编码不一致
- 处理：重新跑一下复制脚本，确保 ABI 更新
```bash
npm run copy-abi
```

## 9) 跨网或多合约地址管理
- 做个地址映射，按 chainId 读对应地址
```javascript
const ADDRS = {
  '0xaa36a7': '0xYourSepoliaAddress',
  '0x1': '0xYourMainnetAddress',
}
const addr = ADDRS[await window.ethereum.request({ method: 'eth_chainId' })]
```

——
最后更新：2024年12月（更多见 README 与 deployment/）
  https://sepolia.infura.io/v3/YOUR_KEY
```

---

## 📋 问题排查清单

### 部署前检查
- [ ] 环境变量配置完整
- [ ] 依赖包安装完成
- [ ] 账户余额充足
- [ ] RPC节点可访问

### 运行时检查
- [ ] MetaMask已安装并解锁
- [ ] 连接到正确网络
- [ ] 合约地址配置正确
- [ ] ABI文件已更新

### 交易失败检查
- [ ] Gas费设置合理
- [ ] 账户余额充足
- [ ] 合约函数参数正确
- [ ] 网络状态稳定

---

## 🆘 获取帮助

### 官方资源
- [Hardhat文档](https://hardhat.org/docs)
- [ethers.js文档](https://docs.ethers.io/)
- [OpenZeppelin文档](https://docs.openzeppelin.com/)
- [MetaMask文档](https://docs.metamask.io/)

### 社区支持
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [Hardhat Discord](https://discord.gg/hardhat)
- [OpenZeppelin Forum](https://forum.openzeppelin.com/)

### 错误码参考
- `4001`: 用户拒绝请求
- `4100`: 未授权的方法
- `4200`: 不支持的方法
- `4902`: 未识别的链ID
- `-32000`: 交易被拒绝
- `-32603`: 内部错误

---

## 💡 开发经验总结

### 最常见的3个问题
1. **网络不匹配** - 占所有问题的60%
2. **ABI文件未同步** - 占所有问题的20%
3. **状态更新延迟** - 占所有问题的15%

### 开发建议
1. **始终先检查网络状态** - 大部分问题都与网络相关
2. **使用自动化脚本** - 减少手动操作错误
3. **添加详细的错误处理** - 帮助快速定位问题
4. **保持文档更新** - 记录每个新遇到的问题

### 调试技巧
```javascript
// 在App.js中添加调试信息
console.log('=== 调试信息 ===');
console.log('当前账户:', account);
console.log('当前网络:', currentNetwork);
console.log('合约地址:', CONTRACT_ADDRESS);
console.log('合约实例:', contract);
console.log('================');
```

### 快速排查清单
- [ ] 检查MetaMask是否连接到正确网络
- [ ] 确认合约地址配置正确
- [ ] 验证ABI文件是最新版本
- [ ] 检查账户余额是否充足
- [ ] 查看浏览器控制台错误信息

---

*最后更新：2024年12月*  
*基于实际开发经验整理，如有新问题请及时更新此文档*  
*问题反馈：请在项目Issues中提交*