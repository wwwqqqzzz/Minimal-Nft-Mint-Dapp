const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x97afa16BaBca5E2BcD448DECd20A0f56A2467546";
  const WALLET_ADDRESS = process.env.WALLET || process.env.PUBLIC_ADDRESS;
  
  if (!WALLET_ADDRESS) {
    console.log("请设置环境变量 WALLET 来指定要检查的钱包地址");
    console.log("例如: WALLET=0xc886c1bf958d235e50765f662ac031b861d877c0 npx hardhat run scripts/check-wallet-nfts.js --network sepolia");
    return;
  }

  try {
    console.log(`检查钱包: ${WALLET_ADDRESS}`);
    console.log(`合约地址: ${CONTRACT_ADDRESS}`);
    
    const MyNFT = await hre.ethers.getContractFactory("MyNFT");
    const contract = MyNFT.attach(CONTRACT_ADDRESS);

    // 检查基本信息
    const balance = await contract.balanceOf(WALLET_ADDRESS);
    console.log(`该钱包的NFT余额: ${balance}`);

    if (balance > 0) {
      console.log("该钱包拥有的NFT:");
      const balanceNum = Number(balance);
      for (let i = 0; i < Math.min(balanceNum, 10); i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(WALLET_ADDRESS, i);
          const tokenURI = await contract.tokenURI(tokenId);
          console.log(`  - TokenID ${tokenId}: ${tokenURI}`);
        } catch (error) {
          console.log(`  - 索引 ${i}: 获取失败 (${error.message})`);
        }
      }
    }

    // 检查钱包铸造信息
    try {
      const walletInfo = await contract.getWalletMintInfo(WALLET_ADDRESS);
      console.log(`钱包铸造统计:`);
      console.log(`  - 已铸造: ${walletInfo[0]}`);
      console.log(`  - 剩余额度: ${walletInfo[1]}`);
      console.log(`  - 白名单状态: ${walletInfo[2]}`);
    } catch (error) {
      console.log(`获取钱包铸造信息失败: ${error.message}`);
    }

    // 检查合约总体状态
    const totalSupply = await contract.totalSupply();
    console.log(`合约总供应量: ${totalSupply}`);

  } catch (error) {
    console.error("检查失败:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});