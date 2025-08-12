# 网络切换功能：从踩坑到顺手

起因很简单：合约在 Sepolia，用户却连在别的链上，前端就读不到数据，交易也发不出去。比如 totalSupply() 一直是 0、MetaMask 没反应、体验奇差。

## 我怎么做的

### 1) 先识别是不是连错链
```javascript
const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 (hex)

async function checkNetwork() {
  if (!window.ethereum) return;
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID);
  } catch (e) {
    console.error('检测网络失败', e);
  }
}
```

### 2) 一键切到 Sepolia
```javascript
async function switchToSepolia() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await addSepoliaNetwork(); // 钱包里没有就自动加
    }
  }
}
```

### 3) 钱包里没有就帮他加上
```javascript
async function addSepoliaNetwork() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: SEPOLIA_CHAIN_ID,
      chainName: 'Sepolia Test Network',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
      rpcUrls: ['https://sepolia.infura.io/v3/'],
      blockExplorerUrls: ['https://sepolia.etherscan.io/'],
    }],
  });
}
```

### 4) UI 按状态给出正确的引导
```javascript
{!isCorrectNetwork && account && (
  <button onClick={switchToSepolia}>切换到 Sepolia</button>
)}

<button onClick={mint} disabled={loading || !account || !isCorrectNetwork}>
  {loading ? '铸造中...' : '🎨 铸造 NFT'}
</button>
```

## 实际效果
- 页面加载自动检测当前网络
- 发现不对就提示，提供一键切换
- 钱包没有 Sepolia 会自动添加
- 切换完成 UI 会跟着状态同步

## 我学到的点

- 关键接口：eth_chainId / wallet_switchEthereumChain / wallet_addEthereumChain / chainChanged
- 体验上要做：状态驱动、错误友好提示、流程简单
- 错误兜底：切换失败、用户拒绝、网络不存在，都要有备选

## 还能再优化
- 把网络配置抽成常量
- 补全错误处理
- 用 Context/状态库管理全局状态
- 有条件的话上 TypeScript
- 之后可以做多网络支持、状态持久化、切换动画、延迟提示等

——
记录时间：2024年12月（问题已解决）