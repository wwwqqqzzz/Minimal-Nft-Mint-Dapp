# 部署这件小事（完整走一遍）

下面是我自己从零到部署成功的一套流程，按这个走，一般不会卡。

## 开始前
- Node.js 16+，npm 8+，Git，浏览器装好 MetaMask
- 准备一个专用测试钱包（别用主钱包）
- 领点 Sepolia 测试 ETH
- 申请服务：Infura/Alchemy（RPC），nft.storage（存储），Etherscan（验证）

## 一次走通

1) 拉代码并装依赖
```bash
git clone <repository-url>
cd nft-mint-starter
npm run install:all
```

2) 配环境
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```
把 `.env` 填上：
```bash
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
NFT_STORAGE_KEY=your_nft_storage_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
BASE_URI=
REACT_APP_CONTRACT_ADDRESS=
```

3) 准备一张图（或你的素材）
```bash
cp your-nft-image.png assets/1.png
# 或改 scripts/upload.js 里路径
```

4) 上传到 IPFS（自动生成元数据）
```bash
npm run upload
```
拿到输出里的 CID，像这样：
```
Stored metadata url: ipfs://bafyreib...abc123/metadata.json
baseURI = "ipfs://bafyreib...abc123/"
```
把 baseURI 写回 `.env`：
```bash
BASE_URI=ipfs://bafyreib...abc123/
```

5) 编译合约
```bash
npm run compile
```

6) 部署到 Sepolia
```bash
npm run deploy:sepolia
```
看到类似输出：
```
Deployed MyNFT to: 0x1234...7890
REACT_APP_CONTRACT_ADDRESS=0x1234...7890
```
复制这串地址。

7) 前端接上合约
```bash
# 写入 frontend/.env
echo REACT_APP_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890 >> frontend/.env

# 同步 ABI
npm run copy-abi
```

8) 合约验证（推荐）
```bash
npx hardhat verify --network sepolia 0x1234567890123456789012345678901234567890 "MyNFT" "MNFT" "ipfs://bafyreib...abc123/"
```
看到 Etherscan 链接就成功了。

9) 跑前端
```bash
npm run start:frontend
```
打开 http://localhost:3000，连钱包，试着 Mint 一下。

## 我会检查的点（快速自测）
- 合约：能在浏览器上看到、验证通过、函数可调
- 前端：能连 MetaMask、地址显示正确、网络检测正常
- 功能：能成功 Mint、交易状态有反馈、totalSupply 会更新、钱包能看到 NFT

## 如果中途出幺蛾子
- 部署报钱不够：给部署账户多领点测试 ETH
- 验证报参数不对：核对构造参数和部署时用的一致
- 前端读不到：检查前端 .env 的地址、ABI 有没有同步、钱包网络是不是 Sepolia

## 成本大概
- Sepolia 上：部署约 200 万 gas，Mint 约 10 万 gas，按 20 gwei 估
- 领测试 ETH：去 Faucet（Infura/Alchemy 等）

## 真要上主网
- 先做：安全审计、Gas 优化、全面测试、私钥备份、监控告警
- 配置示例：
```bash
# .env for mainnet
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_MAINNET_PRIVATE_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```
- 部署命令：
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Checklist（走完打勾）
- [ ] 环境变量都填好了
- [ ] 测试账户余额够用
- [ ] 资源上传到 IPFS
- [ ] 合约编译、部署、验证通过
- [ ] 前端环境更新、ABI 同步
- [ ] 手动 Mint 跑通

——
最后更新：2024年12月（遇到问题看 troubleshooting/）