const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'MyNFT.sol', 'MyNFT.json');
const abiDir = path.join(__dirname, '..', 'frontend', 'src', 'abi');
const srcDir = path.join(__dirname, '..', 'frontend', 'src');
const destAbi = path.join(abiDir, 'MyNFT.json');
const destSrc = path.join(srcDir, 'MyNFT.json');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

// 创建 abi 目录并复制（推荐目录结构）
if(!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
fs.copyFileSync(src, destAbi);
console.log('ABI copied to', destAbi);

// 同时保持原有位置的兼容性
if(!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
fs.copyFileSync(src, destSrc);
console.log('ABI also copied to', destSrc, '(for compatibility)');