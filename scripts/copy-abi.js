const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'MyNFT.sol', 'MyNFT.json');
const srcDir = path.join(__dirname, '..', 'frontend', 'src');
const destSrc = path.join(srcDir, 'MyNFT.json');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

// 仅复制到前端 src 根目录（与 App.js 的导入路径保持一致）
if(!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
fs.copyFileSync(src, destSrc);
console.log('ABI copied to', destSrc);