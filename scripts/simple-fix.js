// 使用一个最简单的解决方案：设置 baseURI 为空，让前端直接显示默认图片
const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  console.log('合约地址:', contractAddress);
  
  const MyNFT = await ethers.getContractFactory('MyNFT');
  const contract = MyNFT.attach(contractAddress);
  
  // 使用一个简单的 JSON metadata 结构，确保可访问
  const newBaseURI = 'data:application/json;base64,';
  
  // 为了测试，我们先设置一个公开可用的简单 URL
  const simpleBaseURI = 'https://api.jsonserve.com/Uw5CrX/';
  
  console.log('当前 tokenURI(0):', await contract.tokenURI(0));
  
  console.log('设置新的 baseURI:', simpleBaseURI);
  const tx = await contract.setBaseURI(simpleBaseURI);
  console.log('交易哈希:', tx.hash);
  
  await tx.wait();
  console.log('✅ 已更新！');
  
  console.log('新的 tokenURI(0):', await contract.tokenURI(0));
  console.log('新的 tokenURI(1):', await contract.tokenURI(1));
}

main().catch(console.error);