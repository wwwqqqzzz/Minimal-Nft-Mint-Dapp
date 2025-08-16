const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x97afa16BaBca5E2BcD448DECd20A0f56A2467546";
  const WALLET_ADDRESS = process.env.WALLET || process.env.PUBLIC_ADDRESS;
  
  if (!WALLET_ADDRESS) {
    console.log("请设置环境变量 WALLET 来指定要检查的钱包地址");
    return;
  }

  try {
    console.log(`检查钱包: ${WALLET_ADDRESS}`);
    console.log(`合约地址: ${CONTRACT_ADDRESS}`);
    
    const MyNFT = await hre.ethers.getContractFactory("MyNFT");
    const contract = MyNFT.attach(CONTRACT_ADDRESS);

    // 获取总供应量，然后逐个检查owner
    const totalSupply = await contract.totalSupply();
    console.log(`合约总供应量: ${totalSupply}`);
    
    console.log("\n检查每个tokenId的owner:");
    const userTokens = [];
    
    for (let i = 0; i < Number(totalSupply); i++) {
      try {
        const owner = await contract.ownerOf(i);
        const tokenURI = await contract.tokenURI(i);
        console.log(`TokenID ${i}: owner=${owner}, URI=${tokenURI}`);
        
        if (owner.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
          userTokens.push({
            tokenId: i,
            tokenURI: tokenURI
          });
        }
      } catch (error) {
        console.log(`TokenID ${i}: 不存在或出错 (${error.message})`);
      }
    }
    
    console.log(`\n钱包 ${WALLET_ADDRESS} 实际拥有的NFT (${userTokens.length}个):`);
    userTokens.forEach(token => {
      console.log(`  - TokenID ${token.tokenId}: ${token.tokenURI}`);
    });

    // 再次验证balanceOf
    const balance = await contract.balanceOf(WALLET_ADDRESS);
    console.log(`\nbalanceOf返回: ${balance}, 实际找到: ${userTokens.length}`);
    
    if (Number(balance) !== userTokens.length) {
      console.log("⚠️  警告：balanceOf返回值与实际token数量不匹配！这可能是ERC721Enumerable的问题。");
    }

  } catch (error) {
    console.error("检查失败:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});