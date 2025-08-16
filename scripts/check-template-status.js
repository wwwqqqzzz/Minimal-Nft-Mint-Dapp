// node scripts/check-template-status.js --network sepolia
// 检查 SelectableNFT 合约中的模板状态和链上数据

require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');

  console.log('🔍 检查合约:', contractAddress);
  
  const SelectableNFT = await ethers.getContractFactory('SelectableNFT');
  const contract = SelectableNFT.attach(contractAddress);

  // 1. 检查模板总数
  const templateCount = await contract.templateCount();
  console.log(`📊 模板总数: ${templateCount}`);

  if (templateCount === 0n) {
    console.log('❌ 合约中没有模板！需要先运行 setup-selectable-templates.js');
    return;
  }

  // 2. 逐个检查模板信息
  console.log('\n📋 模板详情:');
  for (let i = 0; i < Number(templateCount); i++) {
    try {
      const info = await contract.getTemplateInfo(i);
      console.log(`\n模板 ${i}:`);
      console.log(`  metadataURI: ${info.metadataURI}`);
      console.log(`  maxSupply: ${info.maxSupply}`);
      console.log(`  currentSupply: ${info.currentSupply}`);
      console.log(`  isActive: ${info.isActive}`);
    } catch (error) {
      console.log(`❌ 模板 ${i} 读取失败:`, error.message);
    }
  }

  // 3. 检查可用模板
  console.log('\n🎯 可用模板:');
  try {
    const availableTemplates = await contract.getAvailableTemplates();
    console.log(`可用模板数量: ${availableTemplates.length}`);
    console.log(`可用模板ID: [${availableTemplates.join(', ')}]`);
    
    if (availableTemplates.length === 0) {
      console.log('⚠️  没有可用模板！可能原因:');
      console.log('  - 所有模板已售罄 (currentSupply >= maxSupply)');
      console.log('  - 所有模板被禁用 (isActive = false)');
    }
  } catch (error) {
    console.log('❌ 获取可用模板失败:', error.message);
  }

  // 4. 检查合约设置
  console.log('\n⚙️  合约设置:');
  try {
    const selectableMintEnabled = await contract.selectableMintEnabled();
    const maxMintPerWallet = await contract.maxMintPerWallet();
    const whitelistEnabled = await contract.whitelistEnabled();
    const totalSupply = await contract.totalSupply();
    
    console.log(`  selectableMintEnabled: ${selectableMintEnabled}`);
    console.log(`  maxMintPerWallet: ${maxMintPerWallet}`);
    console.log(`  whitelistEnabled: ${whitelistEnabled}`);
    console.log(`  totalSupply: ${totalSupply}`);
  } catch (error) {
    console.log('❌ 读取合约设置失败:', error.message);
  }
}

main().catch((error) => {
  console.error('❌ 检查失败:', error);
  process.exit(1);
});