// 基于交易哈希校验是否完成 ERC-721 铸造，并解析 tokenId / 接收地址
// 用法：TX=0x... npx hardhat run scripts/inspect-tx.js --network sepolia

const hre = require('hardhat');
const { ethers } = hre;
require('dotenv').config();

// ethers v6
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

async function main() {
  const txHash = process.env.TX || process.env.TX_HASH || '';
  if (!txHash) {
    throw new Error('请通过环境变量 TX 或 TX_HASH 提供交易哈希，例如: TX=0x... npx hardhat run ...');
  }

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('未在 .env 中找到 REACT_APP_CONTRACT_ADDRESS');

  console.log('网络:', hre.network.name);
  console.log('检查交易:', txHash);
  console.log('合约地址:', contractAddress);

  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.log('找不到交易回执，请确认哈希是否正确，或者交易尚未上链');
    return;
  }

  console.log('区块号:', receipt.blockNumber);
  console.log('状态:', receipt.status === 1 ? 'Success' : 'Failed');

  const iface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  ]);

  const transferLogs = receipt.logs
    .filter(l => l.topics && l.topics[0] === TRANSFER_TOPIC)
    .map(l => {
      const parsed = iface.parseLog(l);
      const from = parsed.args.from;
      const to = parsed.args.to;
      // ethers v6 的 BigInt
      const tokenId = parsed.args.tokenId?.toString?.() || String(parsed.args.tokenId);
      return { address: l.address, from, to, tokenId };
    });

  if (transferLogs.length === 0) {
    console.log('未找到 ERC-721 Transfer 事件，这可能不是一次 NFT 铸造交易。');
    return;
  }

  const ourLogs = transferLogs.filter(l => l.address.toLowerCase() === contractAddress.toLowerCase());
  const logsToShow = ourLogs.length > 0 ? ourLogs : transferLogs;

  for (const log of logsToShow) {
    const from = log.from;
    const to = log.to;
    const tokenId = log.tokenId;
    const isMint = from.toLowerCase() === '0x0000000000000000000000000000000000000000';
    console.log(`Transfer: tokenId=${tokenId} ${isMint ? '(mint)' : ''} from ${from} -> to ${to} (contract ${log.address})`);

    if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
      const MyNFT = await ethers.getContractFactory('MyNFT');
      const contract = MyNFT.attach(contractAddress);
      try {
        const uri = await contract.tokenURI(tokenId);
        console.log(`tokenURI(${tokenId}) = ${uri}`);
      } catch (e) {
        console.log(`读取 tokenURI(${tokenId}) 失败:`, e.message);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });