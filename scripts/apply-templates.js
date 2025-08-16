// node scripts/apply-templates.js
// 根据 .selectable-nft-templates 与新的 CID，同步并批量写入/覆盖 SelectableNFT 合约模板
const fs = require('fs');
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const dataFile = '.selectable-nft-templates';
  if (!fs.existsSync(dataFile)) {
    throw new Error(`${dataFile} not found.`);
  }

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');

  const SelectableNFT = await ethers.getContractFactory('SelectableNFT');
  const contract = SelectableNFT.attach(contractAddress);

  console.log('Contract:', contractAddress);
  console.log('Current templateCount will be used as append index. If you want to disable old templates, setTemplateActive=false.');

  // 如果你希望“覆盖”旧模板，可在这里自动禁用旧模板（避免冲突）
  if (process.env.DISABLE_OLD_TEMPLATES === 'true') {
    const templateCount = await contract.templateCount();
    for (let i = 0; i < templateCount; i++) {
      console.log(`Disabling old template ${i}...`);
      const tx = await contract.setTemplateActive(i, false);
      await tx.wait();
    }
  }

  for (const t of data.templates) {
    console.log(`Adding template ${t.templateId}:`, t.metadataURI, 'maxSupply=', t.maxSupply);
    const tx = await contract.addTemplate(t.metadataURI, t.maxSupply);
    await tx.wait();
  }

  console.log('✅ Templates applied.');
}

main().catch((e) => { console.error(e); process.exit(1); });