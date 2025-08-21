const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'contracts', 'Market.sol', 'Market.json');
const abiDir = path.join(__dirname, '..', 'frontend', 'src', 'abi');

if(!fs.existsSync(src)){
  console.error('Artifact not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

if(!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

const fullArtifact = JSON.parse(fs.readFileSync(src, 'utf8'));
// 仅暴露需要的最小 ABI
const minimalAbi = {
  abi: fullArtifact.abi.filter(item => {
    if (item.type === 'function') {
      const targets = [
        'listItem', 'updatePrice', 'cancelListing', 'buy', 'getListingsInRange',
        'platformFeeBps', 'feeRecipient', 'listingCount', 'listings'
      ];
      return targets.includes(item.name);
    }
    if (item.type === 'event') {
      return ['Listed','PriceUpdated','Cancelled','Sold'].includes(item.name);
    }
    return false;
  })
};

const out = path.join(abiDir, 'market-min-abi.json');
fs.writeFileSync(out, JSON.stringify(minimalAbi, null, 2));
console.log('Minimal Market ABI created at', out);