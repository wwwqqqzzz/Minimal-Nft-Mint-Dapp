// Disable all existing templates on the SelectableNFT contract
require('dotenv').config();
const { ethers } = require('hardhat');

async function main(){
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');

  const SelectableNFT = await ethers.getContractFactory('SelectableNFT');
  const contract = SelectableNFT.attach(contractAddress);
  console.log('Contract:', contractAddress);

  const templateCount = await contract.templateCount();
  console.log('templateCount:', templateCount.toString());

  for (let i = 0; i < templateCount; i++){
    const info = await contract.getTemplateInfo(i);
    if (info.isActive){
      console.log(`Disabling template ${i} ...`);
      const tx = await contract.setTemplateActive(i, false);
      await tx.wait();
      console.log(`Template ${i} disabled.`);
    } else {
      console.log(`Template ${i} already inactive.`);
    }
  }

  console.log('✅ All templates have been processed.');
}

main().catch((e)=>{ console.error(e); process.exit(1); });