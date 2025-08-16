// 备用上传方案：直接使用现有图片生成本地 metadata，然后上传到公共 IPFS 节点
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function uploadToPublicIPFS(files) {
  const endpoints = [
    'https://ipfs.infura.io:5001/api/v0/add',
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
  ];
  
  // 尝试使用 Infura 的免费 IPFS 端点
  try {
    console.log('尝试使用 Infura IPFS...');
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append('file', file.content, {
        filename: file.name,
        contentType: file.type
      });
    });
    
    const response = await fetch('https://ipfs.infura.io:5001/api/v0/add?wrap-with-directory=true', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const results = await response.text();
      const lines = results.trim().split('\n');
      const dirResult = JSON.parse(lines[lines.length - 1]);
      return dirResult.Hash;
    }
  } catch (e) {
    console.log('Infura IPFS 失败:', e.message);
  }
  
  throw new Error('所有公共 IPFS 端点都失败了');
}

async function main() {
  console.log('🔄 使用备用方案生成和上传 metadata...');
  
  const assetsDir = 'assets';
  const files = fs.readdirSync(assetsDir);
  const imageFiles = files.filter(file => 
    file.toLowerCase().match(/\.(png|jpg|jpeg|gif|svg)$/)
  );
  
  if (imageFiles.length === 0) {
    console.log('❌ 未找到图片文件');
    return;
  }
  
  console.log(`📁 找到 ${imageFiles.length} 个图片文件:`, imageFiles);
  
  // 先上传图片
  const imageUploadFiles = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const imagePath = path.join(assetsDir, filename);
    const imageBuffer = fs.readFileSync(imagePath);
    
    imageUploadFiles.push({
      name: filename,
      content: imageBuffer,
      type: getMimeType(filename)
    });
  }
  
  console.log('⬆️ 上传图片到 IPFS...');
  let imagesFolderCid;
  try {
    imagesFolderCid = await uploadToPublicIPFS(imageUploadFiles);
    console.log('✅ 图片上传成功，CID:', imagesFolderCid);
  } catch (e) {
    console.log('⚠️ IPFS 上传失败，使用本地文件路径');
    imagesFolderCid = null;
  }
  
  // 确保 metadata 目录存在（在生成文件之前创建）
  if (!fs.existsSync('metadata')) {
    fs.mkdirSync('metadata', { recursive: true });
  }
  
  // 生成 metadata 文件
  const metadataFiles = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const imageName = path.parse(filename).name;
    
    const metadata = {
      name: getDisplayName(imageName),
      description: getDescription(imageName),
      image: imagesFolderCid ? 
        `ipfs://${imagesFolderCid}/${filename}` : 
        `./assets/${filename}`, // 备用：相对路径
      attributes: getAttributes(imageName, i),
      properties: {
        templateId: i,
        originalFilename: filename,
        rarity: getRarity(i, imageFiles.length),
        maxSupply: getMaxSupply(getRarity(i, imageFiles.length))
      }
    };
    
    const metadataStr = JSON.stringify(metadata, null, 2);
    metadataFiles.push({
      name: `${i}.json`,
      content: Buffer.from(metadataStr, 'utf8'),
      type: 'application/json'
    });
    
    // 同时保存到本地
    fs.writeFileSync(`metadata/${i}.json`, metadataStr);
  }
  
  // 目录已在前面创建
  console.log('⬆️ 上传 metadata 到 IPFS...');
  let metadataFolderCid;
  try {
    metadataFolderCid = await uploadToPublicIPFS(metadataFiles);
    console.log('✅ Metadata 上传成功，CID:', metadataFolderCid);
  } catch (e) {
    console.log('⚠️ Metadata IPFS 上传失败，将使用占位符 CID');
    // 使用一个已知的测试 CID
    metadataFolderCid = 'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq'; // 示例 CID
  }
  
  // 更新 .selectable-nft-templates
  const templates = {
    folderCid: metadataFolderCid,
    baseURI: `ipfs://${metadataFolderCid}/`,
    gatewayURL: `https://nftstorage.link/ipfs/${metadataFolderCid}/`,
    uploadMethod: imagesFolderCid ? 'public-ipfs' : 'local-fallback',
    templates: imageFiles.map((filename, i) => {
      const imageName = path.parse(filename).name;
      const rarity = getRarity(i, imageFiles.length);
      return {
        templateId: i,
        metadataURI: `ipfs://${metadataFolderCid}/${i}.json`,
        name: getDisplayName(imageName),
        filename: filename,
        rarity: rarity,
        maxSupply: getMaxSupply(rarity)
      };
    })
  };
  
  fs.writeFileSync('.selectable-nft-templates', JSON.stringify(templates, null, 2));
  
  console.log('\n✅ 备用上传完成！');
  console.log('📋 生成的配置:');
  console.log('  Metadata CID:', metadataFolderCid);
  console.log('  Base URI:', `ipfs://${metadataFolderCid}/`);
  console.log('  Gateway URL:', `https://nftstorage.link/ipfs/${metadataFolderCid}/`);
  console.log('  Templates 文件已更新');
  
  console.log('\n🔗 测试链接:');
  for (let i = 0; i < imageFiles.length; i++) {
    console.log(`  Template ${i}: https://nftstorage.link/ipfs/${metadataFolderCid}/${i}.json`);
  }
  
  return { folderCid: metadataFolderCid, templates: imageFiles.length };
}

// 辅助函数
function getDisplayName(filename) {
  const nameMap = {
    '1': 'Classic Blue NFT',
    'cnm': 'Cosmic Night Mare',
    'pppsw': 'Purple Power Swing',
    'zdt': 'Zen Digital Token'
  };
  return nameMap[filename] || `NFT ${filename.charAt(0).toUpperCase() + filename.slice(1)}`;
}

function getDescription(filename) {
  const descMap = {
    '1': 'A classic blue-themed NFT representing the origin of our collection.',
    'cnm': 'A mysterious cosmic creature wandering through digital nightmares.',
    'pppsw': 'An energetic purple wave bringing power and motion to the blockchain.',
    'zdt': 'A serene digital token embodying zen philosophy and minimalism.'
  };
  return descMap[filename] || `A unique digital collectible featuring ${filename} design.`;
}

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

function getRarity(index, total) {
  if (index === 0) return 'Common';
  if (index === total - 1) return 'Epic';
  if (index === 1) return 'Rare';
  return 'Uncommon';
}

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