// node scripts/deploy-selectable-nft.js
// 部署支持可选择铸造的 SelectableNFT 合约

require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying SelectableNFT with account:', deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // 合约参数
  const name = "Selectable NFT Collection";
  const symbol = "SNFT";
  const royaltyReceiver = process.env.ROYALTY_RECEIVER || deployer.address;
  const royaltyFeeNumerator = process.env.ROYALTY_FEE || 250; // 2.5%

  console.log('Contract parameters:');
  console.log('  Name:', name);
  console.log('  Symbol:', symbol);
  console.log('  Royalty Receiver:', royaltyReceiver);
  console.log('  Royalty Fee:', `${royaltyFeeNumerator / 100}%`);

  // 部署合约
  const SelectableNFT = await hre.ethers.getContractFactory('SelectableNFT');
  console.log('Deploying SelectableNFT...');
  
  const selectableNFT = await SelectableNFT.deploy(
    name,
    symbol,
    royaltyReceiver,
    royaltyFeeNumerator
  );

  await selectableNFT.waitForDeployment();
  const contractAddress = await selectableNFT.getAddress();

  console.log('✅ SelectableNFT deployed to:', contractAddress);
  console.log('Transaction hash:', selectableNFT.deploymentTransaction().hash);

  // 等待几个区块确认
  console.log('Waiting for block confirmations...');
  await selectableNFT.deploymentTransaction().wait(5);

  // 显示验证命令
  console.log('\n📋 Contract Information:');
  console.log('Address:', contractAddress);
  console.log('Network:', hre.network.name);
  console.log('Deployer:', deployer.address);

  console.log('\n🔍 To verify on Etherscan:');
  console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress} "${name}" "${symbol}" "${royaltyReceiver}" ${royaltyFeeNumerator}`);

  // 更新 .env 文件
  const envContent = `
# SelectableNFT Contract (deployed on ${new Date().toISOString()})
SELECTABLE_CONTRACT_ADDRESS=${contractAddress}
CONTRACT_ADDRESS=${contractAddress}
REACT_APP_CONTRACT_ADDRESS=${contractAddress}
`;

  require('fs').appendFileSync('.env', envContent);
  console.log('\n✅ Contract address saved to .env');

  console.log('\n🚀 Next steps:');
  console.log('1. Run: node scripts/upload-selectable-nfts.js');
  console.log('2. Run: node scripts/setup-selectable-templates.js');
  console.log('3. Update frontend to use SelectableNFT ABI');
  console.log('4. Test minting functions');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});