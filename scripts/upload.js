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
  const metadata = await client.store({
    name: 'My NFT #0',
    description: 'A minimal example NFT',
    image: new File([image], '1.png', { type: 'image/png' }),
    properties: { example: true }
  });

  console.log('Stored metadata url:', metadata.url);
  console.log('To use as baseURI for ERC721 constructor, use the CID root, e.g.');
  console.log('  baseURI = "' + metadata.url.replace('ipfs://', 'ipfs://') + '/"');
  console.log('\nNOTE: nft.storage 会保证内容被 pin，metadata.url 是类似 ipfs://bafy.../0');
}

main().catch((err) => { console.error(err); process.exit(1); });