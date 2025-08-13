const hre = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('\n🚀 正在部署进阶版 MyNFT 合约...');
  
  // 合约参数配置
  const baseURI = process.env.BASE_URI || "ipfs://CHANGE_ME/"; // 注意末尾斜杠
  const [deployer] = await hre.ethers.getSigners();
  const royaltyReceiver = deployer.address; // 版税接收地址（默认为部署者）
  const royaltyFeeNumerator = 250; // 2.5% 版税 (250/10000)
  
  console.log('📋 部署参数:');
  console.log('  名称: MyNFT');
  console.log('  符号: MNFT');
  console.log('  BaseURI:', baseURI);
  console.log('  版税接收者:', royaltyReceiver);
  console.log('  版税比例: 2.5%');
  console.log('  部署地址:', deployer.address);
  
  // 部署合约
  const MyNFT = await hre.ethers.getContractFactory('MyNFT');
  const myNFT = await MyNFT.deploy(
    'MyNFT',
    'MNFT', 
    baseURI,
    royaltyReceiver,
    royaltyFeeNumerator
  );
  
  await myNFT.waitForDeployment();
  console.log('\n✅ 合约部署成功!');
  console.log('📍 合约地址:', myNFT.target);
  
  // 等待几个区块确认后再验证
  console.log('\n⏳ 等待区块确认...');
  await myNFT.deploymentTransaction().wait(5);
  
  // 显示初始状态
  console.log('\n📊 合约初始状态:');
  console.log('  最大铸造数/钱包:', await myNFT.maxMintPerWallet());
  console.log('  白名单启用:', await myNFT.whitelistEnabled());
  console.log('  版税接收者:', await myNFT.royaltyReceiver());
  console.log('  版税比例:', (await myNFT.royaltyFeeNumerator()) / 100 + '%');
  
  console.log('\n🎯 下一步操作:');
  console.log('1. 将以下配置添加到 frontend/.env:');
  console.log(`   REACT_APP_CONTRACT_ADDRESS=${myNFT.target}`);
  console.log('\n2. 复制 ABI 文件:');
  console.log('   npm run copy-abi');
  console.log('\n3. 验证合约:');
  console.log(`   npx hardhat verify --network ${hre.network.name} ${myNFT.target} "MyNFT" "MNFT" "${baseURI}" "${royaltyReceiver}" ${royaltyFeeNumerator}`);
  console.log('\n4. 管理员功能示例:');
  console.log('   - 启用白名单: setWhitelistEnabled(true)');
  console.log('   - 添加白名单: addToWhitelist(address)');
  console.log('   - 调整铸造限制: setMaxMintPerWallet(newLimit)');
  console.log('   - 更新版税: setRoyaltyInfo(receiver, feeNumerator)');
}

main().catch((err) => { 
  console.error('\n❌ 部署失败:', err.message); 
  process.exit(1); 
});