require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  console.log(`\n🔍 测试新合约: ${contractAddress}`);
  
  const MyNFT = await hre.ethers.getContractFactory('MyNFT');
  const contract = MyNFT.attach(contractAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`部署者地址: ${deployer.address}`);
  
  try {
    // 1. 检查基本状态
    console.log('\n📊 合约基本状态:');
    const totalSupply = await contract.totalSupply();
    console.log(`totalSupply: ${totalSupply}`);
    
    const maxMintPerWallet = await contract.maxMintPerWallet();
    console.log(`maxMintPerWallet: ${maxMintPerWallet}`);
    
    const whitelistEnabled = await contract.whitelistEnabled();
    console.log(`whitelistEnabled: ${whitelistEnabled}`);
    
    // 2. 测试铸造
    if (totalSupply.toString() === '0') {
      console.log('\n🎯 尝试铸造第一个 NFT...');
      
      const tx = await contract.mint();
      console.log(`铸造交易: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`交易确认，Gas费: ${receipt.gasUsed}`);
      
      const newTotalSupply = await contract.totalSupply();
      console.log(`新的 totalSupply: ${newTotalSupply}`);
    }
    
    // 3. 测试 ERC721Enumerable 功能
    console.log('\n🔬 测试 ERC721Enumerable:');
    const balance = await contract.balanceOf(deployer.address);
    console.log(`balanceOf(${deployer.address}): ${balance}`);
    
    if (balance > 0) {
      console.log('\n📖 遍历拥有的 NFT:');
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(deployer.address, i);
          console.log(`  tokenOfOwnerByIndex(${i}): ${tokenId}`);
          
          const tokenURI = await contract.tokenURI(tokenId);
          console.log(`  tokenURI(${tokenId}): ${tokenURI}`);
        } catch (error) {
          console.log(`  ❌ tokenOfOwnerByIndex(${i}) 失败: ${error.message}`);
        }
      }
    }
    
    // 4. 测试钱包信息
    console.log('\n💼 测试钱包信息:');
    const walletInfo = await contract.getWalletMintInfo(deployer.address);
    console.log(`已铸造数量: ${walletInfo.mintedCount}`);
    console.log(`剩余额度: ${walletInfo.remainingMints}`);
    console.log(`白名单状态: ${walletInfo.isWhitelistedWallet}`);
    
  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});