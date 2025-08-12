const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'MyNFT.sol', 'MyNFT.json');
const destDir = path.join(__dirname, '..', 'frontend', 'src');
const dest = path.join(destDir, 'MyNFT.json');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}
if(!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('ABI copied to', dest);