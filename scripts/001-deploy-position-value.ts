import { ethers } from "hardhat";

/// UniV3PositionValue is a helper contract to calculate the value of a Uniswap V3 position from liquidity and sqrtpriceX96
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying UniV3PositionValue with the account:", deployer.address);

  const UniV3PositionValue = await ethers.getContractFactory(
    "UniV3PositionValue"
  );

  const uniV3PositionValue = await UniV3PositionValue.deploy();
  await uniV3PositionValue.waitForDeployment();
  console.log("UniV3PositionValue deployed to:", await uniV3PositionValue.getAddress());

  process.exit(0);
}

main();
