// 直接修复当前合约的 baseURI，使其指向一个可用的 metadata 结构
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
  
  // 使用一个现成的、可访问的 metadata 服务
  // 这是一个专门为测试 NFT 准备的公共 IPFS 网关
  const newBaseURI = 'https://bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs25m343psy4.ipfs.nftstorage.link/';
  
  console.log('当前 tokenURI(0):', await contract.tokenURI(0).catch(()=>'unavailable'));
  
  console.log('正在更新 baseURI 为:', newBaseURI);
  const tx = await contract.setBaseURI(newBaseURI);
  console.log('交易哈希:', tx.hash);
  
  await tx.wait();
  console.log('✅ 交易确认完成！');
  
  console.log('新的 tokenURI(0):', await contract.tokenURI(0));
  console.log('新的 tokenURI(1):', await contract.tokenURI(1));
  
  // 测试新的 metadata URL 是否可访问
  console.log('\n🧪 正在测试 metadata URL 可访问性...');
  try {
    const testUrl = `${newBaseURI}0`;
    console.log('测试 URL:', testUrl);
    
    const fetch = require('node-fetch');
    const response = await fetch(testUrl);
    if(response.ok) {
      const metadata = await response.json();
      console.log('✅ Metadata 可访问！', metadata.name);
    } else {
      console.log('❌ Metadata 访问失败，状态码:', response.status);
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
  }
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});