// node scripts/setup-selectable-templates.js
// 将 .selectable-nft-templates 中的模板信息批量写入 SelectableNFT 合约

const fs = require('fs');
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const dataFile = '.selectable-nft-templates';
  if (!fs.existsSync(dataFile)) {
    throw new Error(`${dataFile} not found. Run scripts/upload-selectable-nfts.js first.`);
  }

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');

  const SelectableNFT = await ethers.getContractFactory('SelectableNFT');
  const contract = SelectableNFT.attach(contractAddress);

  console.log('Setting up templates on contract:', contractAddress);

  for (const t of data.templates) {
    console.log(`Adding template ${t.templateId}:`, t.metadataURI, 'maxSupply=', t.maxSupply);
    const tx = await contract.addTemplate(t.metadataURI, t.maxSupply);
    await tx.wait();
  }

  console.log('✅ All templates added. You can now mintSelected(templateId) or mintRandom().');
}

main().catch((e) => { console.error(e); process.exit(1); });