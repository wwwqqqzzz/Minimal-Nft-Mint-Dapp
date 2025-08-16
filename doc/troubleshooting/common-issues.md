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

## 2) 模板列表为什么只显示 4 个？
- 当前版本为了演示与稳定性，在前端加入了“显示层过滤”逻辑：仅展示本地 0.json、1.json、2.json、3.json 四个模板。
- 如果同一编号存在多个副本，自动选择 `templateId` 最小的那一份。
- 该策略只影响前端显示，不会改变链上模板状态；后续可切换为读取链上真实可用模板。
- 可配置化建议：
  - 通过 `frontend/.env` 增加开关，如 `REACT_APP_LIMIT_TEMPLATES=true|false`。
  - 或在 UI 中提供“仅显示本地4个”切换按钮，默认开启。

## 3) 脚本报 Too Many Requests / 429
- 现象：使用供应商 RPC（例如 Alchemy）时，批量脚本触发速率限制。
- 解决：
  1) 临时切换公共 RPC：`SEPOLIA_URL=https://rpc.sepolia.org`
  2) 更换为自己的供应商 Key 或提升配额
  3) 在脚本里增加重试与指数退避

## 4) Windows 启动前端/端口占用问题
- PowerShell 设置端口的正确语法：
```powershell
$env:PORT=3003; npm --prefix ./frontend start
```
- 如果 3000 被占用，CRA 会提示使用其他端口（如 3001/3002/3003），以终端显示 URL 为准。
- 若你在根目录跑：`npm --prefix ./frontend start`；或先 `cd frontend` 再 `npm start`。

## 5) MetaMask 没反应 / 弹了错
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

## 6) IPFS 打不开 / 图片 404
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

## 7) ABI 不同步导致前端挂
- 重新跑复制脚本，确保 ABI 更新：`npm run copy-abi`
- 重新跑复制脚本，确保 ABI 更新：`npm run copy-abi`