javascript
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'SelectableNFT.sol', 'SelectableNFT.json');
const abiDir = path.join(__dirname, '..', 'frontend', 'src', 'abi');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

// 仅生成最小化 ABI 到 frontend/src/abi/selectable-min-abi.json
if(!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

const fullArtifact = JSON.parse(fs.readFileSync(src, 'utf8'));
const minimalAbi = {
  abi: fullArtifact.abi.filter(item => {
    if (item.type === 'function') {
      const targetFunctions = [
        // 查询/元数据/可选铸造
        'totalSupply', 'balanceOf', 'tokenOfOwnerByIndex', 'tokenURI',
        'getAvailableTemplates', 'getTemplateInfo', 'mintSelected', 'mintRandom',
        'selectableMintEnabled', 'getWalletMintInfo',
        // 授权相关（上架需要）
        'isApprovedForAll', 'setApprovalForAll', 'approve', 'getApproved'
      ];
      return targetFunctions.includes(item.name);
    }
    return false;
  })
};

const minAbiPath = path.join(abiDir, 'selectable-min-abi.json');
fs.writeFileSync(minAbiPath, JSON.stringify(minimalAbi, null, 2));
console.log('Minimal ABI created at', minAbiPath);