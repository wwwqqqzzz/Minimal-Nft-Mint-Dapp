const { ethers } = require("ethers");
require('dotenv').config();

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const RPC_URL = process.env.SEPOLIA_URL || process.env.ALCHEMY || process.env.INFURA;
const ABI = require('../frontend/src/MyNFT.json');

async function main(){
  if(!RPC_URL) throw new Error('Missing RPC URL in .env (SEPOLIA_URL/ALCHEMY/INFURA)');
  if(!CONTRACT_ADDRESS) throw new Error('Missing REACT_APP_CONTRACT_ADDRESS in .env');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);

  const supply = await contract.totalSupply();
  console.log('totalSupply =', supply.toString());

  // 尝试读取 tokenURI(0)
  try {
    const uri0 = await contract.tokenURI(0);
    console.log('tokenURI(0) =', uri0);
  } catch (e) {
    console.log('tokenURI(0) 读取失败:', e.message);
  }

  // 读取你钱包最近一次铸造的 tokenId：通过 balanceOf+tokenOfOwnerByIndex
  const account = process.env.DEPLOYER || process.env.OWNER || process.env.PUBLIC_ADDRESS;
  if(account){
    const bal = await contract.balanceOf(account);
    console.log('owner balance =', bal.toString());
    for(let i=0;i<Number(bal);i++){
      const tid = await contract.tokenOfOwnerByIndex(account, i);
      const uri = await contract.tokenURI(tid);
      console.log(` - token[${i}] id=${tid.toString()} uri=${uri}`);
    }
  }else{
    console.log('未在 .env 中配置账户(DEPLOYER/OWNER/PUBLIC_ADDRESS)，跳过按地址列举。');
  }
}

main().catch((e)=>{
  console.error(e);
  process.exit(1);
});