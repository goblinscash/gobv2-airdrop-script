import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { expect } from "chai";
import { TestToken } from "../typechain-types";
import { AirdropDistributor } from "../typechain-types";

import { inspect } from 'util';
inspect.defaultOptions.depth = 10;

chai.use(chaiAsPromised);

describe("Airdrop Unit Tests", () => {
  async function deployContractsFixture(): Promise<{
    airdropDistributor: AirdropDistributor;
    fakeToken: TestToken;
    deployer: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
  }> {
    const [deployer, user1, user2] = await ethers.getSigners();

    const AirdropDistributor = await ethers.getContractFactory(
      "AirdropDistributor"
    );

    const airdropDistributor = await AirdropDistributor.deploy() as unknown as AirdropDistributor;
    await airdropDistributor.waitForDeployment();
    console.log("AirdropDistributor deployed to:", await airdropDistributor.getAddress());

    const TestToken = await ethers.getContractFactory(
      "TestToken"
    );
    const fakeToken = await TestToken.deploy("Test", "TST") as unknown as TestToken;
    await fakeToken.waitForDeployment();
    console.log("TestToken deployed to:", await fakeToken.getAddress(), "\n");

    // await fakeToken.connect(deployer).transfer(await user1.getAddress(), BigInt(1000e18));
    // await fakeToken.connect(user1).approve(await airdropDistributor.getAddress(), BigInt(1000e18));

    return { airdropDistributor, fakeToken, deployer, user1, user2 };
  }

  describe("tests", () => {
    it("mismatching recipients and amounts lengths", async () => {
      const { airdropDistributor, fakeToken, user1, user2 } = await loadFixture(deployContractsFixture);

      {
        const recipients = [await user1.getAddress(), await user2.getAddress()];
        const amounts = [BigInt(1e18)];

        await expect(airdropDistributor.connect(user1).distributeTokens(fakeToken.getAddress(), recipients, amounts))
          .to.be.revertedWith("Wallets and amounts length mismatch");
      }

      {
        const recipients = [await user1.getAddress()];
        const amounts = [BigInt(1e18), BigInt(1e18)];

        await expect(airdropDistributor.connect(user1).distributeTokens(fakeToken.getAddress(), recipients, amounts))
          .to.be.revertedWith("Wallets and amounts length mismatch");
      }
    });

    it("insufficient balance", async () => {
      const { airdropDistributor, fakeToken, deployer, user1 } = await loadFixture(deployContractsFixture);

      {
        const recipients = [await user1.getAddress()];
        const amounts = [BigInt(1e18) * BigInt(1e18)];

        await expect(airdropDistributor.connect(deployer).distributeTokens(fakeToken.getAddress(), recipients, amounts))
          .to.be.revertedWith("Insufficient balance");
      }
    });

    it("not enough allowance", async () => {
      const { airdropDistributor, fakeToken, deployer, user1, user2 } = await loadFixture(deployContractsFixture);

      await fakeToken.connect(deployer).transfer(await user1.getAddress(), BigInt(1e18));

      {
        const recipients = [await user2.getAddress()];
        const amounts = [BigInt(1e18)];

        await expect(airdropDistributor.connect(user1).distributeTokens(fakeToken.getAddress(), recipients, amounts))
          .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
      }
    });

    it("happy path", async () => {
      const { airdropDistributor, fakeToken, deployer, user1, user2 } = await loadFixture(deployContractsFixture);

      await fakeToken.connect(deployer).transfer(await user1.getAddress(), BigInt(3e18));
      await fakeToken.connect(user1).approve(await airdropDistributor.getAddress(), BigInt(3e18));

      {
        const recipients = [await user2.getAddress(), await deployer.getAddress()];
        const amounts = [BigInt(1e18), BigInt(2e18)];

        await expect(airdropDistributor.connect(user1).distributeTokens(fakeToken.getAddress(), recipients, amounts))
          .to.emit(airdropDistributor, "Airdrop").withArgs(await user2.getAddress(), BigInt(1e18), fakeToken.getAddress())
          .to.emit(airdropDistributor, "Airdrop").withArgs(await deployer.getAddress(), BigInt(2e18), fakeToken.getAddress());
      }
    });
  });
});