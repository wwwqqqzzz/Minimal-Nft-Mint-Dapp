// Enable only the HTTP(local) templates so frontend can load them during development
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

  const prefix = 'http://localhost:3000/metadata/';
  const ONLY_FOUR = process.env.ONLY_FOUR === 'true';

  if (ONLY_FOUR){
    console.log('ONLY_FOUR=true -> will keep only one set of 4 templates (0-3.json)');
    const groups = { '0.json': [], '1.json': [], '2.json': [], '3.json': [] };
    for (let i = 0; i < templateCount; i++){
      const info = await contract.getTemplateInfo(i);
      const uri = info.metadataURI;
      if (uri && uri.startsWith(prefix)){
        const m = uri.match(/\/([0-3])\.json$/);
        if (m){
          const key = `${m[1]}.json`;
          groups[key].push({ id: i, isActive: info.isActive });
        } else {
          // 非 0-3.json 的 HTTP 模板，一律禁用
          if (info.isActive){
            console.log(`Disabling extra HTTP template ${i}: ${uri}`);
            const tx = await contract.setTemplateActive(i, false);
            await tx.wait();
          }
        }
      }
    }
    // 选择每组中模板ID最小的一个启用
    const toEnable = new Set();
    for (const key of Object.keys(groups)){
      const arr = groups[key];
      if (arr.length > 0){
        const min = arr.reduce((a, b) => (a.id < b.id ? a : b));
        toEnable.add(min.id);
      }
    }
    let enabled = 0, disabled = 0;
    for (let i = 0; i < templateCount; i++){
      const info = await contract.getTemplateInfo(i);
      const uri = info.metadataURI;
      if (uri && uri.startsWith(prefix)){
        const shouldBeActive = toEnable.has(i);
        if (shouldBeActive && !info.isActive){
          console.log(`Enabling template ${i}: ${uri}`);
          const tx = await contract.setTemplateActive(i, true);
          await tx.wait();
          enabled++;
        } else if (!shouldBeActive && info.isActive){
          console.log(`Disabling template ${i}: ${uri}`);
          const tx = await contract.setTemplateActive(i, false);
          await tx.wait();
          disabled++;
        }
      }
    }
    console.log(`Done. Enabled ${enabled} (kept one set 0-3.json), disabled ${disabled} others.`);
    return;
  }

  // 默认逻辑：启用所有 HTTP 模板
  let enabled = 0, skipped = 0;
  for (let i = 0; i < templateCount; i++){
    const info = await contract.getTemplateInfo(i);
    const uri = info.metadataURI;
    const isActive = info.isActive;
    if (uri.startsWith(prefix)){
      if (!isActive){
        console.log(`Enabling HTTP template ${i}: ${uri}`);
        const tx = await contract.setTemplateActive(i, true);
        await tx.wait();
        enabled++;
      } else {
        console.log(`HTTP template ${i} already active: ${uri}`);
        skipped++;
      }
    }
  }

  console.log(`Done. Enabled ${enabled}, skipped ${skipped}.`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });