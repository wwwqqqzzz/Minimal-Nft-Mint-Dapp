// 快速上传正确的 metadata 文件
const { NFTStorage, File } = require('nft.storage');
require('dotenv').config();

async function main() {
  const key = process.env.NFT_STORAGE_KEY;
  if(!key) throw new Error('NFT_STORAGE_KEY not set in .env');
  const client = new NFTStorage({ token: key });

  console.log('正在创建10个 NFT metadata 文件...');
  
  // 创建多个 metadata 文件（不包含本地图片）
  const metadataFiles = [];
  for (let i = 0; i < 10; i++) {
    const metadata = {
      name: `My NFT #${i}`,
      description: `A minimal example NFT - Token ${i}`,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", // 直接用网络图片
      properties: { 
        example: true,
        tokenId: i
      }
    };
    
    const metadataStr = JSON.stringify(metadata, null, 2);
    metadataFiles.push(new File([metadataStr], `${i}`, { type: 'application/json' }));
  }
  
  // 上传 metadata 文件夹
  console.log('正在上传到 NFT.Storage...');
  const folderCid = await client.storeDirectory(metadataFiles);
  const baseURI = `ipfs://${folderCid}/`;
  
  console.log('✅ 上传成功！');
  console.log('Folder CID:', folderCid);
  console.log('Base URI for contract:', baseURI);
  console.log('\n测试 URL:');
  console.log(`  Token 0: https://nftstorage.link/ipfs/${folderCid}/0`);
  console.log(`  Token 1: https://nftstorage.link/ipfs/${folderCid}/1`);
  
  console.log('\n下一步: 运行以下命令更新合约');
  console.log(`npx hardhat run scripts/update-baseuri-new.js --network sepolia`);
  
  // 写入环境变量文件供后续使用
  require('fs').writeFileSync('.new-baseuri', `NEW_BASE_URI=ipfs://${folderCid}/\nGATEWAY_URL=https://nftstorage.link/ipfs/${folderCid}/`);
}

main().catch((err) => { console.error(err); process.exit(1); });