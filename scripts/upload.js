// node scripts/upload.js
const { NFTStorage, File } = require('nft.storage');
const fs = require('fs');
require('dotenv').config();

async function main() {
  const key = process.env.NFT_STORAGE_KEY;
  if(!key) throw new Error('NFT_STORAGE_KEY not set in .env');
  const client = new NFTStorage({ token: key });

  // change this to loop multiple files if you want
  const imagePath = 'assets/1.png';
  if(!fs.existsSync(imagePath)) throw new Error('Put a test image at assets/1.png');
  const image = await fs.promises.readFile(imagePath);

  console.log('Uploading image and metadata to nft.storage...');
  
  // 创建多个 metadata 文件
  const metadataFiles = [];
  for (let i = 0; i < 10; i++) {
    const metadata = {
      name: `My NFT #${i}`,
      description: `A minimal example NFT - Token ${i}`,
      image: new File([image], '1.png', { type: 'image/png' }),
      properties: { 
        example: true,
        tokenId: i
      }
    };
    
    const metadataStr = JSON.stringify(metadata, null, 2);
    metadataFiles.push(new File([metadataStr], `${i}.json`, { type: 'application/json' }));
  }
  
  // 上传 metadata 文件夹
  const folderCid = await client.storeDirectory(metadataFiles);
  const baseURI = `ipfs://${folderCid}/`;
  
  console.log('Stored metadata folder CID:', folderCid);
  console.log('Base URI for contract:', baseURI);
  console.log('\nExample metadata URLs:');
  console.log(`  Token 0: ${baseURI}0.json`);
  console.log(`  Token 1: ${baseURI}1.json`);
  console.log('\nTo use in contract deployment:');
  console.log(`  BASE_URI="${baseURI}"`);
}

main().catch((err) => { console.error(err); process.exit(1); });