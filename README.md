# nft-mint-starter — 最小化 NFT Mint DApp

想体验“上传资源 → 部署合约 → 一键 Mint”全流程？Fork 本仓库，改几行 `.env` 就能跑。

核心组件：
- **Solidity + Hardhat**：ERC-721 合约一键编译、部署、验证。
- **nft.storage 脚本**：自动把图片与 metadata 上传到 IPFS。
- **React 前端**：接入 MetaMask，点击即 `mint()`。
- **辅助脚本**：复制 ABI、生成部署命令，省去重复体力活。

> 小而全，方便二次定制，适合工作坊或快速原型。

## 从零到一：怎么把它跑起来

第一步：准备环境。确保已安装 Node.js（建议 18+）。在项目根目录执行依赖安装，然后把 `.env.example` 复制为 `.env` 并按注释填好 RPC、私钥和 `NFT_STORAGE_KEY`。

执行：

```bash
npm install && cd frontend && npm install
```

第二步：准备 NFT 资源。把你的图片放到 `assets/` 目录，运行上传脚本：

```bash
node scripts/upload.js
```

终端会打印一个 `ipfs://...` 的地址（metadata.url）。把它的 CID 根写到 `.env` 里的 `BASE_URI`，记得以 `/` 结尾。

第三步：部署合约。先编译再部署，选择你要用的网络（如 sepolia）：

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

命令行会输出合约地址和一条前端变量提示，把它写进 `frontend/.env`：

```
REACT_APP_CONTRACT_ADDRESS=0x...
```

第四步：连上前端。把 ABI 拷到前端并启动：

```bash
node scripts/copy-abi.js
npm run start:frontend
```

第五步：试着 Mint。打开浏览器 `http://localhost:3000`，用 MetaMask 连接同一个网络，点击 Mint，一次完整的链上交互就完成了。前端会显示交易状态并更新 `totalSupply`。

遇事不慌。常见问题都在 `doc/troubleshooting/`，先按关键字搜；网络不匹配、ABI 未同步、状态未刷新，是最常见的三个坑。

## 仓库结构

```
nft-mint-starter/
├─ .gitignore
├─ .env.example
├─ README.md
├─ package.json
├─ hardhat.config.js
├─ contracts/
│  └─ MyNFT.sol
├─ scripts/
│  ├─ upload.js        # 使用 nft.storage 上传图片 & metadata
│  ├─ deploy.js        # 部署脚本 (reads BASE_URI from .env)
│  └─ copy-abi.js      # 把 artifacts 拷贝到 frontend/src/MyNFT.json
├─ assets/
│  └─ 1.png            # 你自己的示例图片（自行替换）
├─ doc/
│  ├─ study/           # 学习过程记录
│  ├─ tech/            # 技术文档
│  ├─ deployment/      # 部署相关文档
│  └─ troubleshooting/ # 问题排查记录
└─ frontend/
   ├─ package.json
   ├─ public/
   │  └─ index.html
   └─ src/
      ├─ index.js
      ├─ App.js
      ├─ MyNFT.json          # ABI（兼容路径）
      ├─ abi/MyNFT.json      # ABI（推荐路径）
      └─ utils/ipfs.js
```

---

> **重要说明（安全）**：不要把真实 `PRIVATE_KEY` 或 `.env` 推到公开仓库。把部署用的私钥保存在本地 `.env`，并确保 `.gitignore` 忽略它。

---

## 主要文件内容（拷贝粘贴即可）

### `.gitignore`

```text
node_modules
.env
frontend/node_modules
/dist
/build
*.log
.cache
artifacts
cache
typechain
```

---

### `.env.example`

```text
# RPC provider (eg. Alchemy / Infura / QuickNode)
MUMBAI_URL=https://polygon-mumbai.g.alchemy.com/v2/your_key_here
SEPOLIA_URL=https://sepolia.infura.io/v3/your_key_here

# 部署用私钥（注意安全）
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# nft.storage API key
NFT_STORAGE_KEY=your_nft_storage_api_key

# 部署后填：ipfs://<CID>/   （注意末尾要有斜杠）
BASE_URI=ipfs://bafy.../

# 用于合约源码验证（Polygonscan / Etherscan）
ETHERSCAN_API_KEY=your_etherscan_or_polygonscan_key

# 前端使用（部署合约后填入）
REACT_APP_CONTRACT_ADDRESS=0x....
```

---

### `package.json` (root helper scripts)

```json
{
  "name": "nft-mint-starter",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd frontend && npm install",
    "compile": "npx hardhat compile",
    "deploy:mumbai": "npx hardhat run scripts/deploy.js --network mumbai",
    "deploy:sepolia": "npx hardhat run scripts/deploy.js --network sepolia",
    "copy-abi": "node scripts/copy-abi.js",
    "start:frontend": "cd frontend && npm start",
    "upload": "node scripts/upload.js",
    "verify:mumbai": "npx hardhat verify --network mumbai",
    "verify:sepolia": "npx hardhat verify --network sepolia"
  },
  "devDependencies": {
    "@nomiclabs/hardhat-ethers": "^3.0.0",
    "@nomiclabs/hardhat-etherscan": "^3.1.0",
    "ethers": "^6.0.0",
    "hardhat": "^2.18.0",
    "dotenv": "^16.0.0",
    "@openzeppelin/contracts": "^4.9.0",
    "nft.storage": "^5.0.0"
  }
}
```

---

### `hardhat.config.js`

```javascript
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: "0.8.19",
  networks: {
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || ""
    }
  }
};
```

---

### `contracts/MyNFT.sol` (最简 ERC-721，任何人都能 mint 给自己)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    string private baseTokenURI;

    constructor(string memory name_, string memory symbol_, string memory baseURI_) ERC721(name_, symbol_) {
        baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice 简单的公共 mint，铸给调用者
    function mint() public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    function setBaseURI(string memory uri) public onlyOwner {
        baseTokenURI = uri;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
}
```

---

### `scripts/upload.js`（把 assets/ 内的图片上传到 nft.storage，并返回 metadata 的 ipfs:// url）

```javascript
// node scripts/upload.js
const { NFTStorage, File } = require('nft.storage');
const fs = require('fs');
require('dotenv').config();

async function main() {
  const key = process.env.NFT_STORAGE_KEY;
  if(!key) throw new Error('NFT_STORAGE_KEY not set in .env');
  const client = new NFTStorage({ token: key });

  // change this to loop multiple files if you want
  const imagePath = 'assets/1.png';
  if(!fs.existsSync(imagePath)) throw new Error('Put a test image at assets/1.png');
  const image = await fs.promises.readFile(imagePath);

  console.log('Uploading image and metadata to nft.storage...');
  const metadata = await client.store({
    name: 'My NFT #0',
    description: 'A minimal example NFT',
    image: new File([image], '1.png', { type: 'image/png' }),
    properties: { example: true }
  });

  console.log('Stored metadata url:', metadata.url);
  console.log('To use as baseURI for ERC721 constructor, use the CID root, e.g.');
  console.log('  baseURI = "' + metadata.url.replace('ipfs://', 'ipfs://') + '/"');
  console.log('\nNOTE: nft.storage 会保证内容被 pin，metadata.url 是类似 ipfs://bafy.../0');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

---

### `scripts/deploy.js`

```javascript
const hre = require('hardhat');
require('dotenv').config();

async function main() {
  const baseURI = process.env.BASE_URI || "ipfs://CHANGE_ME/"; // 注意末尾斜杠
  console.log('Using baseURI:', baseURI);
  const MyNFT = await hre.ethers.getContractFactory('MyNFT');
  const myNFT = await MyNFT.deploy('MyNFT', 'MNFT', baseURI);
  await myNFT.deployed();
  console.log('Deployed MyNFT to:', myNFT.address);
  
  // 等待几个区块确认后再验证
  console.log('Waiting for block confirmations...');
  await myNFT.deployTransaction.wait(5);
  
  console.log('\nContract deployed successfully!');
  console.log('Add this to your frontend .env:');
  console.log(`REACT_APP_CONTRACT_ADDRESS=${myNFT.address}`);
  console.log('\nTo verify contract, run:');
  console.log(`npx hardhat verify --network ${hre.network.name} ${myNFT.address} "MyNFT" "MNFT" "${baseURI}"`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

---

### `scripts/copy-abi.js` （把编译产物拷贝到 frontend）

```javascript
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'MyNFT.sol', 'MyNFT.json');
const destDir = path.join(__dirname, '..', 'frontend', 'src');
const dest = path.join(destDir, 'MyNFT.json');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}
if(!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('ABI copied to', dest);
```

---

### `frontend/package.json`

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "ethers": "^6.0.0",
    "web-vitals": "^3.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

---

### `frontend/public/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Minimal NFT Mint DApp" />
    <title>MyNFT DApp</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

---

### `frontend/src/index.js`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

---

### `frontend/src/utils/ipfs.js`

```javascript
export function ipfsToHttp(ipfsUrl){
  if(!ipfsUrl) return ipfsUrl;
  if(ipfsUrl.startsWith('ipfs://')){
    return ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return ipfsUrl;
}

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

---

### `frontend/src/App.js` （极简 UI：连接钱包并 mint）

```javascript
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractJson from './MyNFT.json';
import { ipfsToHttp, shortenAddress } from './utils/ipfs';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

function App(){
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);

  useEffect(() => {
    checkIfWalletConnected();
    getTotalSupply();
  }, []);

  async function checkIfWalletConnected() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    }
  }

  async function getTotalSupply() {
    if (!CONTRACT_ADDRESS || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      const supply = await contract.totalSupply();
      setTotalSupply(supply.toString());
    } catch (error) {
      console.error('Error getting total supply:', error);
    }
  }

  async function connect(){
    if(!window.ethereum) return alert('请安装 MetaMask');
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(addr);
      setStatus('钱包连接成功');
    } catch (error) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + error.message);
    }
  }

  async function mint(){
    if (loading) return;
    
    try{
      if(!window.ethereum) return alert('请安装 MetaMask');
      if(!CONTRACT_ADDRESS) return alert('请在 frontend 的 .env 中设置 REACT_APP_CONTRACT_ADDRESS');
      
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);
      
      setStatus('准备发送交易...');
      const tx = await contract.mint();
      setStatus('等待交易确认... ' + tx.hash);
      
      const receipt = await tx.wait();
      setStatus('铸造成功！交易哈希: ' + tx.hash);
      
      // 更新总供应量
      await getTotalSupply();
      
      // 获取区块链浏览器链接
      const networkName = await provider.getNetwork();
      let explorerUrl = '';
      if (networkName.chainId === 80001n) {
        explorerUrl = `https://mumbai.polygonscan.com/tx/${tx.hash}`;
      } else if (networkName.chainId === 11155111n) {
        explorerUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
      }
      
      alert(`铸造成功！\n交易哈希: ${tx.hash}\n${explorerUrl ? `区块链浏览器: ${explorerUrl}` : ''}`);
      
    } catch(e) {
      console.error(e);
      setStatus('铸造失败: ' + (e.message || e));
      alert('铸造失败: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      padding: 40, 
      fontFamily: 'Arial, sans-serif',
      maxWidth: 600,
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: 10 }}>🖼️ MyNFT — Minimal Mint DApp</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>在测试网上铸造你的第一个 NFT</p>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 15, 
          borderRadius: 5, 
          marginBottom: 20 
        }}>
          <p><strong>合约地址:</strong> {CONTRACT_ADDRESS ? shortenAddress(CONTRACT_ADDRESS) : '未设置'}</p>
          <p><strong>已铸造总数:</strong> {totalSupply}</p>
          <p><strong>当前账户:</strong> {account ? shortenAddress(account) : '未连接'}</p>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <button 
            onClick={connect} 
            disabled={loading}
            style={{ 
              padding: '12px 24px',
              marginRight: 10,
              backgroundColor: account ? '#28a745' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {account ? `已连接: ${shortenAddress(account)}` : '连接钱包'}
          </button>
          
          <button 
            onClick={mint} 
            disabled={loading || !account}
            style={{ 
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: (loading || !account) ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {loading ? '铸造中...' : '🎨 铸造 NFT'}
          </button>
        </div>
        
        <div style={{ 
          backgroundColor: '#e9ecef', 
          padding: 15, 
          borderRadius: 5,
          minHeight: 50
        }}>
          <strong>状态:</strong> {status || '准备就绪'}
        </div>
        
        <hr style={{ margin: '20px 0' }} />
        
        <div style={{ fontSize: 14, color: '#666' }}>
          <p>💡 <strong>说明:</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>首次使用请先连接 MetaMask 钱包</li>
            <li>确保钱包切换到正确的测试网络（Mumbai 或 Sepolia）</li>
            <li>每次铸造会消耗少量测试币作为 Gas 费</li>
            <li>铸造的 NFT 会直接发送到你的钱包地址</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
```

---

## 使用步骤（快速指南）

### 1. 项目初始化

```bash
git clone <this-repo> && cd nft-mint-starter
# 或者直接下载并解压
```

### 2. 环境配置

复制 `.env.example` 为 `.env` 并填写以下信息：

- `PRIVATE_KEY`: 部署用的钱包私钥（测试钱包，不要用主钱包）
- `MUMBAI_URL` 或 `SEPOLIA_URL`: RPC 节点地址（从 Alchemy/Infura/QuickNode 获取）
- `NFT_STORAGE_KEY`: 从 [nft.storage](https://nft.storage) 获取的 API 密钥

### 3. 安装依赖

```bash
npm run install:all
# 等同于: npm install && cd frontend && npm install
```

### 4. 准备图片资源

将你的NFT图片放到 `assets/1.png`（或修改 `scripts/upload.js` 中的路径）

### 5. 上传图片到 IPFS

```bash
npm run upload
```

复制输出的 baseURI（格式如 `ipfs://bafy.../`）到 `.env` 中的 `BASE_URI`

### 6. 编译和部署合约

```bash
# 编译合约
npm run compile

# 部署到 Mumbai 测试网
npm run deploy:mumbai

# 或部署到 Sepolia 测试网
npm run deploy:sepolia
```

将部署成功后的合约地址添加到 `frontend/.env`：
```
REACT_APP_CONTRACT_ADDRESS=0x...
```

### 7. 复制ABI到前端

```bash
npm run copy-abi
```

### 8. 启动前端应用

```bash
npm run start:frontend
```

访问 [http://localhost:3000](http://localhost:3000)

### 9. 验证合约（可选）

```bash
# Mumbai
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> "MyNFT" "MNFT" "ipfs://<CID>/"

# Sepolia  
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> "MyNFT" "MNFT" "ipfs://<CID>/"
```

---

## 扩展建议（按优先级排序）

### 1. 基础功能增强

- **限量铸造**: 把 `mint()` 改为 `mint(uint256 quantity)` 支持批量铸造
- **铸造价格**: 添加 `mintPrice` 变量，要求支付 ETH/MATIC
- **最大供应量**: 设置 `maxSupply` 限制总铸造数量
- **白名单功能**: 实现预售/白名单阶段

```solidity
// 示例：限量付费铸造
uint256 public constant MAX_SUPPLY = 1000;
uint256 public mintPrice = 0.01 ether;

function mint(uint256 quantity) public payable {
    require(quantity > 0 && quantity <= 10, "Invalid quantity");
    require(_tokenIdCounter.current() + quantity <= MAX_SUPPLY, "Exceeds max supply");
    require(msg.value >= mintPrice * quantity, "Insufficient payment");
    
    for(uint256 i = 0; i < quantity; i++) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
    }
}
```

### 2. 前端UI优化

- **响应式设计**: 添加移动端适配
- **铸造进度**: 显示已铸造/总数量的进度条
- **NFT预览**: 展示即将铸造的NFT图片
- **交易历史**: 显示用户的铸造记录
- **网络检测**: 自动检测并提示切换到正确网络

### 3. 元数据增强

- **动态元数据**: 支持多种NFT特征和稀有度
- **批量上传**: 修改 `upload.js` 支持批量上传多个NFT
- **随机特征**: 实现随机生成NFT特征的合约逻辑

### 4. 高级功能

- **Merkle Tree白名单**: 使用Merkle证明实现gas高效的白名单
- **荷兰拍卖**: 实现价格随时间递减的拍卖机制
- **质押奖励**: 允许用户质押NFT获得代币奖励
- **二级市场**: 集成OpenSea等NFT市场的交易功能

### 5. 部署和运维

- **多链部署**: 支持更多EVM兼容链（BSC、Avalanche等）
- **Gas优化**: 使用ERC721A或其他gas优化方案
- **监控工具**: 添加合约事件监听和数据分析
- **自动化部署**: 使用GitHub Actions自动化部署流程

---

## 常见问题 FAQ

### Q: MetaMask显示"交易可能失败"？
A: 通常是gas估算问题，可以手动设置更高的gas limit，或者检查合约参数是否正确。

### Q: IPFS图片加载慢怎么办？
A: 可以使用专用的IPFS网关，如 `https://cloudflare-ipfs.com/ipfs/` 替换 `ipfs.io`。

### Q: 如何添加更多网络支持？
A: 在 `hardhat.config.js` 中添加网络配置，并在前端添加对应的区块链浏览器链接。

### Q: 合约验证失败？
A: 确保构造函数参数完全匹配，包括字符串的引号和空格。

### Q: 如何实现盲盒机制？
A: 可以先设置通用的占位图，铸造完成后再reveal真实元数据。

---

## 技术栈

- **智能合约**: Solidity ^0.8.19, OpenZeppelin
- **开发框架**: Hardhat
- **前端**: React 18, ethers.js v6
- **存储**: IPFS (via nft.storage)
- **网络**: Polygon Mumbai, Ethereum Sepolia

---

## 📚 文档说明

项目包含完整的文档体系，位于 `doc/` 目录：

### 📖 学习文档 (`doc/study/`)
- `README.md` - 学习过程记录说明
- `network-switching-solution.md` - 网络切换功能实现学习记录
- 记录开发过程中的学习笔记和经验总结

### 🔧 技术文档 (`doc/tech/`)
- `README.md` - 技术文档说明
- `architecture.md` - 系统架构设计详解
- 包含项目的技术架构和实现细节

### 🚀 部署文档 (`doc/deployment/`)
- `README.md` - 部署文档说明
- `deployment-guide.md` - 详细部署指南
- 涵盖从环境准备到生产部署的完整流程

### 🛠️ 问题排查 (`doc/troubleshooting/`)
- `README.md` - 问题排查说明
- `common-issues.md` - 常见问题及解决方案
- 记录开发和使用过程中的问题及解决方法

> 💡 **建议**: 遇到问题时先查看 `doc/troubleshooting/` 目录，大部分常见问题都有详细的解决方案。

---

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个模板！

## 许可证

MIT License - 你可以自由使用、修改和分发这个代码。

---

**⚠️ 免责声明**: 这是一个教学用途的模板，在生产环境使用前请进行充分的安全审计和测试。

## 前端 UI 功能与最近改动概览

- 钱包与网络
  - 一键连接 MetaMask，实时检测并提示网络是否正确（Sepolia/Mumbai 等）。
  - 提供网络切换能力，避免因链不匹配导致读写失败。
- Gas 估算与设置
  - 支持预估铸造所需 Gas（gasEstimate），并按档位选择（selectedGasLevel）。
- NFT 预览
  - 铸造前显示预览（nftPreview），便于确认。
- 我的 NFT 列表（可折叠展示）
  - 点击“显示/隐藏”切换（showNFTList）。
  - 分页展示（nftsPerPage, currentPage），支持加载状态与空态提示。
  - 使用 Skeleton 骨架屏（components/SkeletonCard.jsx）优化加载体验。
  - 为图片提供占位图（public/og-image.svg），避免因 IPFS 访问不稳出现空白。
- 兜底加载策略（健壮性）
  - 在常规通过 tokenURI 加载失败时，采用 ownerOf 枚举做兜底（fallbackLoadByOwnerOf），尽可能把用户已拥有的 NFT 展示出来。
- 错误与状态提示
  - 完整的错误捕获与操作状态展示，帮助快速定位问题。

提示：如遇 ESLint 关于 useEffect 依赖的警告，请根据实际依赖补充；确保被调用的方法均已在文件内定义或正确导入（详见 doc/troubleshooting/common-issues.md 的“前端编译报错：未定义的函数”）。

## Windows 启动提示（PowerShell）

- 在 frontend 目录内启动（推荐）
```powershell
cd frontend
npm start
```

- 指定前端目录启动（适用于从项目根目录执行）
```powershell
npm --prefix "E:\\xiangmu\\Minimal Nft Mint Dapp\\frontend" start
```

- 固定端口（例如 3001）
```powershell
$env:PORT=3001; npm start
```

- 端口占用时，Create React App 会提示并自动换一个空闲端口，请查看终端输出的实际访问地址。

更多运行/排障细节，见 doc/troubleshooting/common-issues.md。

## 可选模板（SelectableNFT）模式

- 功能概述：一次部署合约，在链上维护多套模板，用户在前端选择其一后进行铸造。适合多风格/多主题的合集共用同一合约。
- 关联组件：
  - 合约：contracts/SelectableNFT.sol
  - 前端：frontend/src/SelectableApp.js
  - 脚本：
    - scripts/enable-http-templates.js（基于 HTTP/本地元数据启用模板）
    - scripts/disable-all-templates.js（禁用全部模板）
    - scripts/setup-selectable-templates.js（批量初始化模板）
    - scripts/upload-selectable-nfts.js（把模板元数据批量上传到 IPFS）
    - scripts/copy-selectable-abi.js（把 SelectableNFT 的 ABI 拷贝到前端）

### 快速开始（Sepolia 测试网）
1) 部署合约
```bash
npx hardhat run scripts/deploy-selectable-nft.js --network sepolia
```
2) 同步 ABI 到前端
```bash
node scripts/copy-selectable-abi.js
```
3) 启动前端（Windows PowerShell 示例）
```powershell
$env:PORT=3003; npm --prefix ./frontend start
```
> 提示：若 3000 端口被占用，开发服务器会询问是否使用其他端口，请以终端输出的实际地址为准。

4) 仅启用本地 HTTP 模板（可选）
```bash
node scripts/enable-http-templates.js
```
- 该脚本依赖 .env 中的 SEPOLIA_URL 与 PRIVATE_KEY。若遇到 429（速率限制），可暂时改用公共 RPC：`SEPOLIA_URL=https://rpc.sepolia.org`，或使用你自己的提供商 Key。

### 展示策略（当前版本）
- 前端在加载模板阶段加入了“显示层过滤”：为了演示与稳定性，默认仅展示本地 0.json、1.json、2.json、3.json 四个模板。
- 若同一编号存在多个副本，会自动选择 templateId 最小的那一份。
- 这是前端层的临时策略，不会改变链上数据；链上仍可存在更多模板。

### 相关提示
- 端口：如遇端口占用，按照 CRA 提示选择新的端口；常见为 3001、3002、3003 等。
- RPC：公共 RPC 稳定性有限，脚本可能因限流失败；建议使用稳定的供应商（Infura/Alchemy/QuickNode 等）或自建节点。