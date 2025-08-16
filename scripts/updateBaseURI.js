// node scripts/updateBaseURI.js
// 更新合约的 baseURI 到一个可工作的 metadata 结构
const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('REACT_APP_CONTRACT_ADDRESS not set in .env');
  }
  
  console.log('正在连接到合约:', contractAddress);
  
  const MyNFT = await ethers.getContractFactory('MyNFT');
  const contract = MyNFT.attach(contractAddress);
  
  // 使用一个公共的可访问的 IPFS metadata 结构
  // 这是一个临时的解决方案，用于测试
  const newBaseURI = 'https://gateway.pinata.cloud/ipfs/QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6/';
  
  console.log('当前 tokenURI(0):', await contract.tokenURI(0));
  
  console.log('正在更新 baseURI 为:', newBaseURI);
  const tx = await contract.setBaseURI(newBaseURI);
  console.log('交易哈希:', tx.hash);
  
  await tx.wait();
  console.log('交易确认完成！');
  
  console.log('新的 tokenURI(0):', await contract.tokenURI(0));
  console.log('新的 tokenURI(1):', await contract.tokenURI(1));
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});