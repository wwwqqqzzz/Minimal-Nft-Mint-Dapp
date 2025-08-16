// 使用 NEW_BASE_URI 更新合约 baseURI
const { ethers } = require('hardhat');
require('dotenv').config({ path: '.new-baseuri' }); // 读取刚写入的新文件
require('dotenv').config(); // 也读取项目 .env

async function main() {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const newBaseURI = process.env.NEW_BASE_URI;
  if(!contractAddress) throw new Error('REACT_APP_CONTRACT_ADDRESS not set');
  if(!newBaseURI) throw new Error('NEW_BASE_URI not set (.new-baseuri)');

  console.log('合约地址:', contractAddress);
  console.log('将要设置的新 baseURI:', newBaseURI);

  const MyNFT = await ethers.getContractFactory('MyNFT');
  const contract = MyNFT.attach(contractAddress);

  const before = await contract.tokenURI(0).catch(()=>'(unavailable)');
  console.log('更新前 tokenURI(0):', before);

  const tx = await contract.setBaseURI(newBaseURI);
  console.log('发送交易:', tx.hash);
  await tx.wait();
  console.log('✅ baseURI 已更新');

  const after0 = await contract.tokenURI(0).catch(()=>'(unavailable)');
  const after1 = await contract.tokenURI(1).catch(()=>'(unavailable)');
  console.log('更新后 tokenURI(0):', after0);
  console.log('更新后 tokenURI(1):', after1);
}

main().catch((e)=>{ console.error(e); process.exit(1); });