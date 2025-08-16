// Publish local metadata and assets to frontend/public and update .selectable-nft-templates with HTTP URLs
const fs = require('fs');
const path = require('path');

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyAssetsToPublic(){
  const srcDir = path.join(__dirname, '..', 'assets');
  const destDir = path.join(__dirname, '..', 'frontend', 'public', 'assets');
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().match(/\.(png|jpg|jpeg|gif|svg)$/));
  for(const f of files){
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  }
  return files;
}

function publishMetadataToPublic(){
  const srcDir = path.join(__dirname, '..', 'metadata');
  const destDir = path.join(__dirname, '..', 'frontend', 'public', 'metadata');
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.json'));
  const published = [];
  for(const f of files){
    const srcPath = path.join(srcDir, f);
    const raw = fs.readFileSync(srcPath, 'utf-8');
    let json;
    try { json = JSON.parse(raw); } catch(e){ throw new Error(`Invalid JSON at ${srcPath}: ${e.message}`); }
    const original = json?.properties?.originalFilename;
    if(original){
      json.image = `/assets/${original}`;
    } else if (typeof json.image === 'string') {
      // Try to map "./assets/xxx" -> "/assets/xxx"
      json.image = json.image.replace(/^\.\/?assets\//, '/assets/');
    }
    const destPath = path.join(destDir, f);
    fs.writeFileSync(destPath, JSON.stringify(json, null, 2));
    published.push({ file: f, json });
  }
  return published;
}

function updateTemplatesHTTP(published){
  const devBase = 'http://localhost:3000/metadata/';
  const templates = published
    .map(entry => {
      const id = parseInt(path.parse(entry.file).name, 10);
      const name = entry.json?.name || `Template ${id}`;
      const rarity = entry.json?.properties?.rarity || 'Common';
      const maxSupply = entry.json?.properties?.maxSupply ?? 10;
      return {
        templateId: id,
        metadataURI: `${devBase}${id}.json`,
        name,
        filename: entry.json?.properties?.originalFilename || '',
        rarity,
        maxSupply
      };
    })
    .sort((a,b) => a.templateId - b.templateId);

  const config = {
    folderCid: null,
    baseURI: devBase,
    gatewayURL: devBase,
    uploadMethod: 'http-local-dev',
    templates
  };
  fs.writeFileSync(path.join(__dirname, '..', '.selectable-nft-templates'), JSON.stringify(config, null, 2));
  return config;
}

function main(){
  console.log('Publishing local assets and metadata to frontend/public...');
  const assets = copyAssetsToPublic();
  console.log(`Copied ${assets.length} assets to frontend/public/assets`);
  const published = publishMetadataToPublic();
  console.log(`Published ${published.length} metadata files to frontend/public/metadata`);
  const config = updateTemplatesHTTP(published);
  console.log('Updated .selectable-nft-templates with HTTP URLs:');
  console.log(JSON.stringify(config, null, 2));
}

if (require.main === module){
  try{ main(); } catch(e){ console.error(e); process.exit(1); }
}