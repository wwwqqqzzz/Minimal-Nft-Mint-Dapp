// node scripts/health-check.js
// 一键检查：前端合约地址、链上模板数量、模板 URI 可访问性
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();
const { ethers } = require('hardhat');

function fetchURL(url){
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode>=200&&res.statusCode<400, data }));
    });
    req.on('error', (e) => resolve({ status: 0, ok: false, data: String(e) }));
    req.setTimeout(8000, () => { req.abort(); resolve({ status: 0, ok: false, data: 'timeout' }); });
  });
}

async function main(){
  const frontendEnv = path.join(__dirname, '..', 'frontend', '.env');
  let selectableAddr = process.env.REACT_APP_SELECTABLE_CONTRACT_ADDRESS;
  if(fs.existsSync(frontendEnv)){
    const envText = fs.readFileSync(frontendEnv,'utf-8');
    const m = envText.match(/REACT_APP_SELECTABLE_CONTRACT_ADDRESS\s*=\s*(.*)/);
    if(m && m[1]) selectableAddr = m[1].trim();
  }
  const contractAddr = process.env.CONTRACT_ADDRESS;

  console.log('Frontend Selectable Address:', selectableAddr || '(not found)');
  console.log('Backend CONTRACT_ADDRESS:', contractAddr || '(not found)');

  if(!contractAddr) throw new Error('Missing CONTRACT_ADDRESS in .env');

  const SelectableNFT = await ethers.getContractFactory('SelectableNFT');
  const contract = SelectableNFT.attach(contractAddr);

  const templateCount = await contract.templateCount();
  console.log('On-chain templateCount =', templateCount.toString());

  const baseUri = process.env.BASE_URI || '';
  if(baseUri){
    console.log('Checking template metadata URLs via gateway...');

    // 多网关顺序尝试，避免单一网关（如 nftstorage.link）导致 403/超时
    const GATEWAYS = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.pinata.cloud/ipfs/'
    ];

    async function fetchWithGateways(cidPath){
      for(const gw of GATEWAYS){
        const url = gw + cidPath;
        const r = await fetchURL(url);
        if(r.ok){
          return { gateway: gw, result: r };
        }
      }
      // 全部失败则返回最后一次结果（或构造失败）
      const lastUrl = GATEWAYS[GATEWAYS.length - 1] + cidPath;
      return { gateway: lastUrl, result: { ok:false, status:0, data:'all_gateways_failed' } };
    }

    const cid = baseUri.replace('ipfs://','');
    const checks = [];
    for(let i=0;i<Math.min(6, Number(templateCount)); i++){
      checks.push(fetchWithGateways(`${cid}/${i}.json`));
    }
    const results = await Promise.all(checks);
    results.forEach((r, i) => {
      console.log(`#${i}.json => ok=${r.result.ok} status=${r.result.status} via ${r.gateway}`);
    });
  } else {
    console.log('BASE_URI not set in .env, skip gateway checks.');
  }

  console.log('✅ Health check done.');
}

main().catch((e)=>{ console.error('❌ Health check failed:', e); process.exit(1); });