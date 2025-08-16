const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'SelectableNFT.sol', 'SelectableNFT.json');
const abiDir = path.join(__dirname, '..', 'frontend', 'src', 'abi');
const srcDir = path.join(__dirname, '..', 'frontend', 'src');
const destAbi = path.join(abiDir, 'SelectableNFT.json');
const destSrc = path.join(srcDir, 'SelectableNFT.json');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

// 创建 abi 目录并复制（推荐目录结构）
if(!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
fs.copyFileSync(src, destAbi);
console.log('SelectableNFT ABI copied to', destAbi);

// 同时保持原有位置的兼容性
if(!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
fs.copyFileSync(src, destSrc);
console.log('SelectableNFT ABI also copied to', destSrc, '(for compatibility)');

// 生成最小化 ABI
const fullArtifact = JSON.parse(fs.readFileSync(src, 'utf8'));
const minimalAbi = {
  "abi": fullArtifact.abi.filter(item => {
    if (item.type === 'function') {
      const targetFunctions = [
        'totalSupply', 'balanceOf', 'tokenOfOwnerByIndex', 'tokenURI',
        'getAvailableTemplates', 'getTemplateInfo', 'mintSelected', 'mintRandom',
        'selectableMintEnabled', 'getWalletMintInfo'
      ];
      return targetFunctions.includes(item.name);
    }
    return false;
  })
};

const minAbiPath = path.join(abiDir, 'selectable-min-abi.json');
fs.writeFileSync(minAbiPath, JSON.stringify(minimalAbi, null, 2));
console.log('Minimal ABI created at', minAbiPath);