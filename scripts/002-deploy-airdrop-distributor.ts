import { ethers } from "hardhat";

/// AirdropDistributor is a contract that allows the owner to distribute tokens to multiple addresses in a single transaction.
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying AirdropDistributor with the account:", deployer.address);

  const AirdropDistributor = await ethers.getContractFactory(
    "AirdropDistributor"
  );

  const uniV3PositionValue = await AirdropDistributor.deploy();
  await uniV3PositionValue.waitForDeployment();
  console.log("AirdropDistributor deployed to:", await uniV3PositionValue.getAddress());

  process.exit(0);
}

main();
