import { ethers } from "hardhat";

/// TestToken is a contract that allows the owner to distribute tokens to multiple addresses in a single transaction.
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying TestToken with the account:", deployer.address);

  const TestToken = await ethers.getContractFactory(
    "TestToken"
  );

  const uniV3PositionValue = await TestToken.deploy("Test", "TST");
  await uniV3PositionValue.waitForDeployment();
  console.log("TestToken deployed to:", await uniV3PositionValue.getAddress());

  process.exit(0);
}

main();
