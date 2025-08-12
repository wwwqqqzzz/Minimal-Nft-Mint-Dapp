const hre = require('hardhat');
require('dotenv').config();

async function main() {
  const baseURI = process.env.BASE_URI || "ipfs://CHANGE_ME/"; // 注意末尾斜杠
  console.log('Using baseURI:', baseURI);
  const MyNFT = await hre.ethers.getContractFactory('MyNFT');
  const myNFT = await MyNFT.deploy('MyNFT', 'MNFT', baseURI);
  await myNFT.waitForDeployment();
  console.log('Deployed MyNFT to:', myNFT.target);
  
  // 等待几个区块确认后再验证
  console.log('Waiting for block confirmations...');
  await myNFT.deploymentTransaction().wait(5);
  
  console.log('\nContract deployed successfully!');
  console.log('Add this to your frontend .env:');
  console.log(`REACT_APP_CONTRACT_ADDRESS=${myNFT.target}`);
  console.log('\nTo verify contract, run:');
  console.log(`npx hardhat verify --network ${hre.network.name} ${myNFT.target} "MyNFT" "MNFT" "${baseURI}"`);
}

main().catch((err) => { console.error(err); process.exit(1); });