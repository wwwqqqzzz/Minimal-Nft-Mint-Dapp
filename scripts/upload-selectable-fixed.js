// node scripts/upload-selectable-fixed.js
// 上传标准化 metadata 文件到 nft.storage，生成 {0,1,2,3}.json 格式
const { NFTStorage, File } = require('nft.storage');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const key = process.env.NFT_STORAGE_KEY;
  if(!key) throw new Error('NFT_STORAGE_KEY not set in .env');
  const client = new NFTStorage({ token: key });

  const assetsDir = 'assets';
  
  // 读取 assets 目录中的所有图片文件
  const files = fs.readdirSync(assetsDir);
  const imageFiles = files.filter(file => 
    file.toLowerCase().match(/\.(png|jpg|jpeg|gif|svg)$/)
  );
  
  if (imageFiles.length === 0) {
    console.log('No image files found, using placeholder metadata...');
    // 如果没有图片文件，使用网络图片作为占位符
    const placeholderMetadata = [];
    for (let i = 0; i < 4; i++) {
      const metadata = {
        name: `Selectable NFT #${i}`,
        description: `A selectable NFT template - ID ${i}`,
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
        attributes: [
          { trait_type: "Template ID", value: i.toString() },
          { trait_type: "Type", value: "Selectable" },
          { trait_type: "Rarity", value: i === 0 ? "Common" : i === 3 ? "Epic" : "Rare" }
        ]
      };
      
      const metadataStr = JSON.stringify(metadata, null, 2);
      placeholderMetadata.push(new File([metadataStr], `${i}.json`, { type: 'application/json' }));
    }
    
    console.log('Uploading placeholder metadata files...');
    const folderCid = await client.storeDirectory(placeholderMetadata);
    
    console.log('✅ Upload completed!');
    console.log('Folder CID:', folderCid);
    console.log('Base URI:', `ipfs://${folderCid}/`);
    
    return { folderCid, templates: 4 };
  }
  
  console.log(`Found ${imageFiles.length} image files:`, imageFiles);
  console.log('Uploading images and generating metadata...');
  
  // 为每张图片创建标准格式的 metadata
  const allMetadataFiles = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const imagePath = path.join(assetsDir, filename);
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageName = path.parse(filename).name;
    
    // 创建 metadata（包含实际图片）
    const metadata = {
      name: getDisplayName(imageName),
      description: getDescription(imageName),
      image: new File([imageBuffer], filename, { type: getMimeType(filename) }),
      attributes: getAttributes(imageName, i),
      properties: {
        templateId: i,
        originalFilename: filename,
        rarity: getRarity(i, imageFiles.length)
      }
    };
    
    const metadataStr = JSON.stringify(metadata, null, 2);
    allMetadataFiles.push(new File([metadataStr], `${i}.json`, { type: 'application/json' }));
  }
  
  // 上传所有 metadata 文件到一个文件夹
  console.log(`Uploading ${allMetadataFiles.length} metadata files...`);
  const folderCid = await client.storeDirectory(allMetadataFiles);
  
  console.log('✅ Upload completed!');
  console.log('Folder CID:', folderCid);
  console.log('Base URI:', `ipfs://${folderCid}/`);
  console.log('Gateway URL:', `https://nftstorage.link/ipfs/${folderCid}/`);
  
  console.log('\n📋 Test URLs:');
  for (let i = 0; i < imageFiles.length; i++) {
    console.log(`Template ${i}: https://nftstorage.link/ipfs/${folderCid}/${i}.json`);
  }
  
  return { folderCid, templates: imageFiles.length };
}

// 根据文件名生成显示名称
function getDisplayName(filename) {
  const nameMap = {
    '1': 'Classic Blue NFT',
    'cnm': 'Cosmic Night Mare',
    'pppsw': 'Purple Power Swing',
    'zdt': 'Zen Digital Token'
  };
  return nameMap[filename] || `NFT ${filename.charAt(0).toUpperCase() + filename.slice(1)}`;
}

// 根据文件名生成描述
function getDescription(filename) {
  const descMap = {
    '1': 'A classic blue-themed NFT representing the origin of our collection.',
    'cnm': 'A mysterious cosmic creature wandering through digital nightmares.',
    'pppsw': 'An energetic purple wave bringing power and motion to the blockchain.',
    'zdt': 'A serene digital token embodying zen philosophy and minimalism.'
  };
  return descMap[filename] || `A unique digital collectible featuring ${filename} design.`;
}

// 根据文件名生成属性
function getAttributes(filename, index) {
  const attributeMap = {
    '1': [
      { trait_type: "Color Theme", value: "Blue" },
      { trait_type: "Style", value: "Classic" },
      { trait_type: "Rarity", value: "Common" }
    ],
    'cnm': [
      { trait_type: "Color Theme", value: "Dark" },
      { trait_type: "Style", value: "Cosmic" },
      { trait_type: "Rarity", value: "Rare" }
    ],
    'pppsw': [
      { trait_type: "Color Theme", value: "Purple" },
      { trait_type: "Style", value: "Dynamic" },
      { trait_type: "Rarity", value: "Uncommon" }
    ],
    'zdt': [
      { trait_type: "Color Theme", value: "Minimal" },
      { trait_type: "Style", value: "Zen" },
      { trait_type: "Rarity", value: "Epic" }
    ]
  };
  
  return attributeMap[filename] || [
    { trait_type: "Color Theme", value: "Unknown" },
    { trait_type: "Style", value: "Custom" },
    { trait_type: "Rarity", value: "Common" }
  ];
}

// 获取 MIME 类型
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  return mimeMap[ext] || 'image/png';
}

// 根据索引和总数获取稀有度
function getRarity(index, total) {
  if (index === 0) return 'Common';
  if (index === total - 1) return 'Epic';
  if (index === 1) return 'Rare';
  return 'Uncommon';
}

// 根据稀有度设置最大供应量
function getMaxSupply(rarity) {
  const supplyMap = {
    'Common': 50,
    'Uncommon': 30,
    'Rare': 20,
    'Epic': 10
  };
  return supplyMap[rarity] || 25;
}

if (require.main === module) {
  main().catch((err) => { 
    console.error('❌ Error:', err); 
    process.exit(1); 
  });
}

module.exports = { main };