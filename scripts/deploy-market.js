javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Market = await ethers.getContractFactory("Market");
  const market = await Market.deploy();
  await market.waitForDeployment();

  console.log("Market deployed to:", await market.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});