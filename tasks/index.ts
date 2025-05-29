import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { task } from "hardhat/config";
import { AbiCoder, BaseContract, Contract, EventLog, keccak256, ZeroAddress } from 'ethers';

import "@nomicfoundation/hardhat-ethers";
import { TypedContractEvent } from '../typechain-types/common';
import { IStakingRewards } from '../typechain-types';
import IStakingRewards_Artifact from '../artifacts/contracts/IStakingRewards.sol/IStakingRewards.json';
import { IERC20 } from '../typechain-types';
import IERC20_Artifact from '../artifacts/contracts/IERC20.sol/IERC20.json';
import { INonfungiblePositionManager } from '../typechain-types';
import INonfungiblePositionManager_Artifact from '../artifacts/contracts/INonfungiblePositionManager.sol/INonfungiblePositionManager.json';
import { IUniswapV3Pool } from '../typechain-types';
import IUniswapV3Pool_Artifact from '../artifacts/contracts/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { IUniswapV3Factory } from '../typechain-types';
import IUniswapV3Factory_Artifact from '../artifacts/contracts/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import { UniV3PositionValue } from '../typechain-types';
import UniV3PositionValue_Artifact from '../artifacts/contracts/UniV3PositionValue.sol/UniV3PositionValue.json';
import { IUniswapV3Staker } from '../typechain-types';
import IUniswapV3Staker_Artifact from '../artifacts/contracts/IUniswapV3Staker.sol/IUniswapV3Staker.json';
import { AirdropDistributor } from '../typechain-types/contracts/AirdropDistributor';
import AirdropDistributor_Artifact from '../artifacts/contracts/AirdropDistributor.sol/AirdropDistributor.json';

const IStakingRewards_ABI = IStakingRewards_Artifact.abi;
const IERC20_ABI = IERC20_Artifact.abi;
const INonfungiblePositionManager_ABI = INonfungiblePositionManager_Artifact.abi;
const IUniswapV3Pool_ABI = IUniswapV3Pool_Artifact.abi;
const IUniswapV3Factory_ABI = IUniswapV3Factory_Artifact.abi;
const UniV3PositionValue_ABI = UniV3PositionValue_Artifact.abi;
const IUniswapV3Staker_ABI = IUniswapV3Staker_Artifact.abi;
const AirdropDistributor_ABI = AirdropDistributor_Artifact.abi;

export const deadAddress = "0x000000000000000000000000000000000000dEaD";

export interface HolderInfo {
  address: string;
  balance: string;
  isContract: boolean;
}

export interface UniV3HolderInfo {
  tokenId: string;
  minter: string;
  owner: string;
  balance: string;
  ownerIsContract: boolean
}


// same for all networks
const UniV3PositionValueAddress = "0xeB6A822930edb2e4e65b056933aFD050d984E889";

// Gob holders
const GobSbchAddress = "0x56381cb87c8990971f3e9d948939e1a95ea113a3";
const GobSbchStartBlock = 2875823;
const GobBscAddress = "0x701ACA29AE0F5d24555f1E8A6Cf007541291d110";
const GobBscStartBlock = 43428859;
const GobBaseAddress = "0xcDBa3E4C5c505F37CfbBB7aCCF20D57e793568E3";
const GobBaseStartBlock = 22731422;

// Gob stakers
const StakingRewardsSbchAddress = "0xfA3D02c971F6D97076b8405500c2210476C6A5E8";
const StakingRewardsSbchStartBlock = 14815912;
const StakingRewardsBscAddress = "0xB4D117f9c404652030F3d12f6DE58172317a2eDa";
const StakingRewardsBscStartBlock = 43532843;
const StakingRewardsBaseAddress = "0xAAFa8A16121939414B529289fA69F08aefE51769";
const StakingRewardsBaseStartBlock = 23605756;

// SGob holders
const SGobSbchAddress = "0x47c61F29B1458d234409Ebbe4B6a70F3b16528EF";
const SGobSbchStartBlock = 2875959;

// UniV3 position nft holders and stakers
const UniV3PositionManagerSbchAddress = "0x6Cf824f9556cEdE40710AD25BC26fd47f7063944";
const UniV3PositionManagerSbcStartBlock = 14169934;
const UniV3FactorySbchAddress = "0x08153648C209644a68ED4DC0aC06795F6563D17b";

const UniV3PositionManagerBscAddress = "0x32e9182879f62f2429879A1E7D491ccd37f2E613";
const UniV3PositionManagerBscStartBlock = 42363155;
const UniV3FactoryBscAddress = "0x30D9e1f894FBc7d2227Dd2a017F955d5586b1e14";

const UniV3PositionManagerBaseAddress = "0x3f11feF6633f9aF950426fEe3eaE6e68943E28A0";
const UniV3PositionManagerBaseStartBlock = 21481354;
const UniV3FactoryBaseAddress = "0xE82Fa4d4Ff25bad8B07c4d1ebd50e83180DD5eB8";

// UniswapV3Staker
const UniV3StakerSbchAddress = "0x264136e16848008A689FAC1c121631ff6D44376E";
const UniV3StakerSbchStartBlock = 15587170;

const UniV3StakerBscAddress = "0x44355c799dba57e6c22a9d7b3815dfF2A6FB0846";
const UniV3StakerBscStartBlock = 42500706;

const UniV3StakerBaseAddress = "0x07579501479896B286a0Bc9FF67100e99687Af35";
const UniV3StakerBaseStartBlock = 21487962;


// AirdropDistributor
const AirdropDistributorAddress = "0xE873b27Bd777DCbB48ca686e09005be920eCCE5B";
const AirdropTokenAddress = process.env.AIRDROP_TOKEN_ADDRESS;
const BalanceScale = process.env.BALANCE_SCALE;

export async function withretry<T>(
  fn: () => Promise<T>,
  tries: number = 10,
  base: number = 1.5,
): Promise<T> {
  for (let retry=0; retry<tries; ++retry) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message && e.message.includes("execution reverted")) {
        throw e;
      }
      const seconds = base**retry;
      console.warn(`retry request failed, retrying in ${seconds}`);
      console.debug(JSON.stringify(e));
      await new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
    }
  }
  console.error(`retry request failed ${tries} times`);
  throw new Error("retry request failed");
}

task("chainId", "Get chainId")
.setAction(async ({ }, hre) => {
  const [deployer] = await hre.ethers.getSigners();
  console.log((await deployer.provider.getNetwork()).chainId);
});

const scanEvents = async ({
  contract,
  filter,
  fromBlock,
  toBlock,
  processFn,
  timeout,
  blockBatch,
}: {
  contract: BaseContract,
  filter: TypedContractEvent,
  fromBlock: number,
  toBlock: number,
  processFn: (event: EventLog) => Promise<boolean | void>,
  timeout: number,
  blockBatch: number,
}) => {
  const startBlock = fromBlock;
  const endBlock = toBlock;
  const blocks = Math.ceil((endBlock - startBlock) / blockBatch);
  const blockRanges = [];
  for (let i = 0; i < blocks; i++) {
    const from = startBlock + i * blockBatch;
    const to = Math.min(from + blockBatch - 1, endBlock);
    blockRanges.push([from, to]);
  }
  console.log("Processing events from", startBlock, "to", endBlock, "in", blocks, "batches of", blockBatch, "blocks");
  for (const [from, to] of blockRanges) {
    const eventsBatch = await withretry(async () => contract.queryFilter(filter, from, to));
    console.log("event search", from, to, "found", eventsBatch.length, ((1 - (toBlock - from) / (toBlock - fromBlock)) * 100).toFixed(2), "% completed");
    for (const event of eventsBatch) {
      const stop = await processFn(event as unknown as EventLog);
      if (stop) {
        console.log("Stopping early");
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }
}

const getTokenHolders = async (hre: HardhatRuntimeEnvironment, address: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const contract = await hre.ethers.getContractAt(IERC20_ABI, address) as unknown as IERC20;

  let holderMap: Record<string, boolean> = {};
  const method = getMethodName();
  const cacheFile = `data/cache_${method}_${hre.network.name}.json`;

  if (fs.existsSync(cacheFile)) {
    console.log("Using cached data from", cacheFile);
    holderMap = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<string, boolean>;
  } else {
    console.log(`No cache found for key ${cacheFile}, scanning events...`);
    await scanEvents({
      contract,
      filter: contract.filters['Transfer(address,address,uint256)'],
      fromBlock: fromBlock,
      toBlock: toBlock || await provider.getBlockNumber(),
      processFn: async (event) => {
        holderMap[event.args.from.toLowerCase()] = true;
        holderMap[event.args.to.toLowerCase()] = true;
      },
      timeout: timeout,
      blockBatch: 10000,
    });

    console.log(`Saving to cache file ${cacheFile}...`);
    fs.writeFileSync(cacheFile, JSON.stringify(holderMap, null, 2));
  }
  const holders = Object.keys(holderMap);

  console.log("Postprocessing", holders.length, "holders...");
  const holderBalanceMap: HolderInfo[] = [];
  for (const address of holders) {
    if (address.toLowerCase() === ZeroAddress.toLowerCase() || address.toLowerCase() === deadAddress.toLowerCase()) {
      console.log("Skipping dead address", address);
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 2 * timeout));

    const balance = await withretry(async () => contract.balanceOf(address));
    if (balance === 0n) {
      continue;
    }

    const isContract = await withretry(async () => provider.getCode(address)) !== "0x";

    holderBalanceMap.push({
      address: address,
      balance: balance.toString(),
      isContract: isContract,
    });
  }

  holderBalanceMap.sort((a, b) => {
    const aBalance = BigInt(a.balance);
    const bBalance = BigInt(b.balance);
    if (aBalance > bBalance) {
      return -1;
    } else if (aBalance < bBalance) {
      return 1;
    }
    return 0;
  });

  console.log(holderBalanceMap);
  return holderBalanceMap;
}

/// gob token

task("gob_holders_sbch", "Get Gob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, GobSbchAddress, GobSbchStartBlock, 0, 0);

  fs.writeFileSync("data/gob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

task("gob_holders_bsc", "Get Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, GobBscAddress, GobBscStartBlock, 0, 0);

  fs.writeFileSync("data/gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("gob_holders_base", "Get Gob holders on Base").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, GobBaseAddress, GobBaseStartBlock, 0, 0);

  fs.writeFileSync("data/gob_holders_base.json", JSON.stringify(holders, null, 2));
});

const getStakingHolders = async (hre: HardhatRuntimeEnvironment, stakingRewardsAddress: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const contract = await hre.ethers.getContractAt(IStakingRewards_ABI, stakingRewardsAddress) as unknown as IStakingRewards;

  let holderMap: Record<string, boolean> = {};
  const method = getMethodName();
  const cacheFile = `data/cache_${method}_${hre.network.name}.json`;

  if (fs.existsSync(cacheFile)) {
    console.log("Using cached data from", cacheFile);
    holderMap = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<string, boolean>;
  } else {
    console.log(`No cache found for key ${cacheFile}, scanning events...`);

    await scanEvents({
      contract,
      filter: contract.filters['Staked(address,uint256)'],
      fromBlock: fromBlock,
      toBlock: toBlock || await withretry(async () => provider.getBlockNumber()),
      processFn: async (event) => {
        holderMap[event.args.user.toLowerCase()] = true;
      },
      timeout: timeout,
      blockBatch: 10000,
    });

    console.log(`Saving to cache file ${cacheFile}...`);
    fs.writeFileSync(cacheFile, JSON.stringify(holderMap, null, 2));
  }
  const holders = Object.keys(holderMap);

  const rewardsToken = await withretry(async () => contract.rewardsToken());
  const rewardsTokenIsGob = [GobBaseAddress, GobBscAddress, GobSbchAddress].map(address => address.toLowerCase()).includes(rewardsToken.toLowerCase());

  const holderBalanceMap: HolderInfo[] = [];
  console.log("Postprocessing", holders.length, "holders...");
  for (const address of holders) {
    if (address.toLowerCase() === ZeroAddress.toLowerCase() || address.toLowerCase() === deadAddress.toLowerCase()) {
      console.log("Skipping dead address", address);
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 2 * timeout));

    const balance = await withretry(async () => contract.balanceOf(address));
    if (balance === 0n) {
      continue;
    }

    let earned = 0n;
    if (rewardsTokenIsGob) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      earned = await withretry(async () => contract.earned(address));
    }

    const isContract = await withretry(async () => provider.getCode(address)) !== "0x";

    holderBalanceMap.push({
      address: address,
      balance: (balance + earned).toString(),
      isContract: isContract,
    });
  }

  holderBalanceMap.sort((a, b) => {
    const aBalance = BigInt(a.balance);
    const bBalance = BigInt(b.balance);
    if (aBalance > bBalance) {
      return -1;
    } else if (aBalance < bBalance) {
      return 1;
    }
    return 0;
  });

  console.log(holderBalanceMap);
  return holderBalanceMap;
}

/// gob staking

task("staked_gob_sbch", "Get staked Gob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, StakingRewardsSbchAddress, StakingRewardsSbchStartBlock, 0, 0);

  fs.writeFileSync("data/staked_gob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

task("staked_gob_bsc", "Get staked Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, StakingRewardsBscAddress, StakingRewardsBscStartBlock, 0, 0);

  fs.writeFileSync("data/staked_gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("staked_gob_base", "Get staked Gob holders on Base").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, StakingRewardsBaseAddress, StakingRewardsBaseStartBlock, 0, 0);

  fs.writeFileSync("data/staked_gob_holders_base.json", JSON.stringify(holders, null, 2));
});

/// sgob token
task("sgob_holders_sbch", "Get sGob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, SGobSbchAddress, SGobSbchStartBlock, 0, 0);

  fs.writeFileSync("data/sgob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

/// univ3 gob holders
const getUniv3GobHolders = async (hre: HardhatRuntimeEnvironment, nftPositionManagerAddress: string, factoryAddress: string, gobAddress: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const nftPositionManager = await hre.ethers.getContractAt(INonfungiblePositionManager_ABI, nftPositionManagerAddress) as unknown as INonfungiblePositionManager;
  const positionValue = await hre.ethers.getContractAt(UniV3PositionValue_ABI, UniV3PositionValueAddress) as unknown as UniV3PositionValue;

  // maps tokenId to minter address
  let tokenIdMap: Record<string, string> = {};
  const method = getMethodName();
  const cacheFile = `data/cache_${method}_${hre.network.name}.json`;

  if (fs.existsSync(cacheFile)) {
    console.log("Using cached data from", cacheFile);
    tokenIdMap = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<string, string>;
  } else {
    console.log(`No cache found for key ${cacheFile}, scanning events...`);

    await scanEvents({
      contract: nftPositionManager,
      filter: nftPositionManager.filters['Transfer(address,address,uint256)'],
      fromBlock: fromBlock,
      toBlock: toBlock || await withretry(async () => provider.getBlockNumber()),
      processFn: async (event) => {
        if (event.args.from.toLowerCase() === ZeroAddress) {
          // mint event
          tokenIdMap[event.args.tokenId.toString()] = event.args.to;
        }
      },
      timeout: timeout,
      blockBatch: 10000,
    });

    console.log(`Saving to cache file ${cacheFile}...`);
    fs.writeFileSync(cacheFile, JSON.stringify(tokenIdMap, null, 2));
  }

  const tokenIds = Object.keys(tokenIdMap);

  const factory = await hre.ethers.getContractAt(IUniswapV3Factory_ABI, factoryAddress) as unknown as IUniswapV3Factory;

  const holderBalanceMap: UniV3HolderInfo[] = [];
  console.log("Postprocessing", tokenIds.length, "tokenIds...");
  for (const tokenId of tokenIds) {
    let position;
    try {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      position = await withretry(async () => nftPositionManager.positions(tokenId));
    } catch {
      // bail if position for tokenId not found
      console.log("Position not found for tokenId", tokenId);
      continue;
    }

    if (position.liquidity === 0n) {
      console.log("Position has no liquidity for tokenId", tokenId, "skipping...");
      continue;
    }

    let poolAddress: string;
    try {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      poolAddress = await withretry(async () => factory.getPool(position.token0, position.token1, position.fee));
    } catch (e) {
      console.log("Pool not found for tokenId", tokenId, "position:", position, "error:", e);
      continue;
    }
    const pool = await hre.ethers.getContractAt(IUniswapV3Pool_ABI, poolAddress) as unknown as IUniswapV3Pool;
    await new Promise((resolve) => setTimeout(resolve, timeout));
    const token0 = await withretry(async () => pool.token0());
    await new Promise((resolve) => setTimeout(resolve, timeout));
    const token1 = await withretry(async () => pool.token1());
    console.log("Pool address", poolAddress, "token0", token0, "token1", token1);

    if (token0.toLowerCase() !== gobAddress.toLowerCase() && token1.toLowerCase() !== gobAddress.toLowerCase()) {
      console.log("Non-GOB pool", token0, token1, "skipping");
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, timeout));
    const slot0 = await withretry(async () => pool.slot0());
    const sqrtPriceX96 = slot0.sqrtPriceX96;;

    await new Promise((resolve) => setTimeout(resolve, timeout));
    const [amount0, amount1] = await withretry(async () => positionValue.total(await nftPositionManager.getAddress(), tokenId, sqrtPriceX96));

    await new Promise((resolve) => setTimeout(resolve, timeout));
    const owner = await withretry(async () => nftPositionManager.ownerOf(tokenId));
    if (owner.toLowerCase() === ZeroAddress.toLowerCase() || owner.toLowerCase() === deadAddress.toLowerCase()) {
      console.log("Owner is dead address", owner, "skipping");
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, timeout));
    const isContract = await withretry(async () => provider.getCode(owner)) !== "0x";

    const balance = token0.toLowerCase() === gobAddress.toLowerCase() ? amount0 : amount1;
    if (balance === 0n) {
      console.log("Balance is 0 for tokenId", tokenId, "skipping", amount0, amount1);
      continue;
    }

    holderBalanceMap.push({
      tokenId: tokenId,
      minter: tokenIdMap[tokenId].toLowerCase(),
      owner: owner,
      ownerIsContract: isContract,
      balance: token0.toLowerCase() === gobAddress.toLowerCase() ? amount0.toString() : amount1.toString(),
    });
  }

  holderBalanceMap.sort((a, b) => {
    const aBalance = BigInt(a.balance);
    const bBalance = BigInt(b.balance);
    if (aBalance > bBalance) {
      return -1;
    } else if (aBalance < bBalance) {
      return 1;
    }
    return 0;
  });

  console.log(holderBalanceMap);
  return holderBalanceMap;
}

task("univ3_gob_sbch", "Get UniV3 staked NFT LPs Gob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getUniv3GobHolders(hre, UniV3PositionManagerSbchAddress, UniV3FactorySbchAddress, GobSbchAddress, UniV3PositionManagerSbcStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_gob_holders_sbch.json", JSON.stringify(holders, null, 2));
});


task("univ3_gob_bsc", "Get UniV3 staked NFT LPs Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getUniv3GobHolders(hre, UniV3PositionManagerBscAddress, UniV3FactoryBscAddress, GobBscAddress, UniV3PositionManagerBscStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("univ3_gob_base", "Get UniV3 staked NFT LPs Gob holders on Base").setAction(async ({ }, hre) => {
  const holders = await getUniv3GobHolders(hre, UniV3PositionManagerBaseAddress, UniV3FactoryBaseAddress, GobBaseAddress, UniV3PositionManagerBaseStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_gob_holders_base.json", JSON.stringify(holders, null, 2));
});

/// univ3 gob holders
const getUniV3StakerGobRewards = async (hre: HardhatRuntimeEnvironment, network: string, uniV3StakerAddress: string, gobAddress: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const uniV3Staker = await hre.ethers.getContractAt(IUniswapV3Staker_ABI, uniV3StakerAddress) as unknown as IUniswapV3Staker;

  // maps tokenId to minter address
  const incentiveMap: Record<string, {
    rewardToken: string;
    pool: string;
    startTime: bigint;
    endTime: bigint;
    refundee: string;
    minWidth: bigint;
    reward: bigint;
    incentiveId: string;
  }> = {};

  let tokenIdMap: Record<string, string> = {};
  const method = getMethodName();
  const cacheFile = `data/cache_${method}_${hre.network.name}.json`;

  if (fs.existsSync(cacheFile)) {
    console.log("Using cached data from", cacheFile);
    tokenIdMap = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<string, string>;
  } else {
    console.log(`No cache found for key ${cacheFile}, scanning events...`);

    await scanEvents({
      contract: uniV3Staker,
      filter: uniV3Staker.filters['IncentiveCreated(address,address,uint256,uint256,address,int24,uint256)'],
      fromBlock: fromBlock,
      toBlock: toBlock || await withretry(async () => provider.getBlockNumber()),
      processFn: async (event) => {
        // console.log("IncentiveCreated", event.args);
        if (event.args.rewardToken.toLowerCase() === gobAddress.toLowerCase()) {
          const incentiveId = keccak256(AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint256", "uint256", "address"],
            [event.args.rewardToken, event.args.pool, event.args.startTime, event.args.endTime, event.args.refundee]
          ));

          await new Promise((resolve) => setTimeout(resolve, timeout));
          const incentive = await withretry(async () => uniV3Staker.incentives(incentiveId));
          if (incentive.numberOfStakes > 0n) {
            incentiveMap[incentiveId] = {
              rewardToken: event.args.rewardToken,
              pool: event.args.pool,
              startTime: event.args.startTime,
              endTime: event.args.endTime,
              refundee: event.args.refundee,
              minWidth: event.args.minWidth,
              reward: event.args.reward,
              incentiveId: incentiveId,
            };
          }
        }
      },
      timeout: timeout,
      blockBatch: 10000,
    });

    console.log(`Saving to cache file ${cacheFile}...`);
    fs.writeFileSync(cacheFile, JSON.stringify(tokenIdMap, null, 2));
  }

  const univ3NftHolders = JSON.parse(fs.readFileSync(`data/univ3_gob_holders_${network}.json`, "utf-8")) as UniV3HolderInfo[];

  const holderBalanceMap: HolderInfo[] = [];
  console.log("Postprocessing", univ3NftHolders.length, "univ3 nft holders and", Object.values(incentiveMap).length, "incentives...");
  for (const holder of univ3NftHolders) {
    if (!holder.ownerIsContract) {
      continue;
    }

    for (const incentive of Object.values(incentiveMap)) {
      try {
        await new Promise((resolve) => setTimeout(resolve, timeout));

        const rewardInfo = await withretry(async () => uniV3Staker.getRewardInfo({
          rewardToken: incentive.rewardToken,
          pool: incentive.pool,
          startTime: incentive.startTime,
          endTime: incentive.endTime,
          refundee: incentive.refundee,
        }, holder.tokenId));

        const reward = rewardInfo.reward;
        if (reward > 0n) {
          holderBalanceMap.push({
            address: holder.minter,
            balance: reward.toString(),
            isContract: false,
          });
          // console.log("Found reward for tokenId", holder.tokenId, "incentive:", incentive, "reward:", reward.toString());
        }
      } catch (e) {
        // console.error("Error getting incentive for tokenId", holder.tokenId, "incentive:", incentive, "error:", e);
      }
    }
  }

  holderBalanceMap.sort((a, b) => {
    const aBalance = BigInt(a.balance);
    const bBalance = BigInt(b.balance);
    if (aBalance > bBalance) {
      return -1;
    } else if (aBalance < bBalance) {
      return 1;
    }
    return 0;
  });

  console.log(holderBalanceMap);
  return holderBalanceMap;
}

task("univ3_staker_gob_rewards_sbch", "Get UniV3 staked NFT Gob rewards on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getUniV3StakerGobRewards(hre, "sbch", UniV3StakerSbchAddress, GobSbchAddress, UniV3StakerSbchStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_staker_gob_rewards_holders_sbch.json", JSON.stringify(holders, null, 2));
});


task("univ3_staker_gob_rewards_bsc", "Get UniV3 staked NFT Gob rewards on BSC").setAction(async ({ }, hre) => {
  const holders = await getUniV3StakerGobRewards(hre, "bsc", UniV3StakerBscAddress, GobBscAddress, UniV3StakerBscStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_staker_gob_rewards_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("univ3_staker_gob_rewards_base", "Get UniV3 staked NFT Gob rewards on Base").setAction(async ({ }, hre) => {
  const holders = await getUniV3StakerGobRewards(hre, "base", UniV3StakerBaseAddress, GobBaseAddress, UniV3StakerBaseStartBlock, 0, 0);

  fs.writeFileSync("data/univ3_staker_gob_rewards_holders_base.json", JSON.stringify(holders, null, 2));
});

task("combine_outputs", "Combine all outputs into one file").setAction(async ({ }, hre) => {
  const sbchHolders = JSON.parse(fs.readFileSync("data/gob_holders_sbch.json", "utf-8")) as HolderInfo[];
  const bscHolders = JSON.parse(fs.readFileSync("data/gob_holders_bsc.json", "utf-8")) as HolderInfo[];
  const baseHolders = JSON.parse(fs.readFileSync("data/gob_holders_base.json", "utf-8")) as HolderInfo[];

  const stakedSbchHolders = JSON.parse(fs.readFileSync("data/staked_gob_holders_sbch.json", "utf-8")) as HolderInfo[];
  const stakedBscHolders = JSON.parse(fs.readFileSync("data/staked_gob_holders_bsc.json", "utf-8")) as HolderInfo[];
  const stakedBaseHolders = JSON.parse(fs.readFileSync("data/staked_gob_holders_base.json", "utf-8")) as HolderInfo[];

  const sgobSbchHolders = JSON.parse(fs.readFileSync("data/sgob_holders_sbch.json", "utf-8")) as HolderInfo[];

  const univ3SbchHolders = JSON.parse(fs.readFileSync("data/univ3_gob_holders_sbch.json", "utf-8")) as UniV3HolderInfo[];
  const univ3BscHolders = JSON.parse(fs.readFileSync("data/univ3_gob_holders_bsc.json", "utf-8")) as UniV3HolderInfo[];
  const univ3BaseHolders = JSON.parse(fs.readFileSync("data/univ3_gob_holders_base.json", "utf-8")) as UniV3HolderInfo[];

  const univ3StakerSbchHolders = JSON.parse(fs.readFileSync("data/univ3_staker_gob_rewards_holders_sbch.json", "utf-8")) as HolderInfo[];
  const univ3StakerBscHolders = JSON.parse(fs.readFileSync("data/univ3_staker_gob_rewards_holders_bsc.json", "utf-8")) as HolderInfo[];
  const univ3StakerBaseHolders = JSON.parse(fs.readFileSync("data/univ3_staker_gob_rewards_holders_base.json", "utf-8")) as HolderInfo[];

  const holderMap: Record<string, bigint> = {};

  const addHoldersToHolderMap = (holders: HolderInfo[]) => {
    for (const holder of holders) {
      if (holder.isContract) {
        continue;
      }

      const address = holder.address;
      const balance = BigInt(holder.balance);
      if (holderMap[address]) {
        holderMap[address] += balance;
      } else {
        holderMap[address] = balance;
      }
    }
  };

  const addUniV3HoldersToHolderMap = (holders: UniV3HolderInfo[]) => {
    for (const holder of holders) {
      const address = holder.minter;
      const balance = BigInt(holder.balance);
      if (holderMap[address]) {
        holderMap[address] += balance;
      } else {
        holderMap[address] = balance;
      }
    }
  };

  addHoldersToHolderMap(sbchHolders);
  addHoldersToHolderMap(bscHolders);
  addHoldersToHolderMap(baseHolders);
  addHoldersToHolderMap(stakedSbchHolders);
  addHoldersToHolderMap(stakedBscHolders);
  addHoldersToHolderMap(stakedBaseHolders);
  addHoldersToHolderMap(sgobSbchHolders);
  addUniV3HoldersToHolderMap(univ3SbchHolders);
  addUniV3HoldersToHolderMap(univ3BscHolders);
  addUniV3HoldersToHolderMap(univ3BaseHolders);
  addHoldersToHolderMap(univ3StakerSbchHolders);
  addHoldersToHolderMap(univ3StakerBscHolders);
  addHoldersToHolderMap(univ3StakerBaseHolders);

  const combined = Object.entries(holderMap).map(([address, balance]) => ({
    address,
    balance: balance.toString(),
  }));

  combined.sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

  fs.writeFileSync("data/airdrop.json", JSON.stringify(combined, null, 2));
});

task("airdrop", "Airdrop tokens").setAction(async ({ }, hre) => {
  if (!AirdropTokenAddress) {
    console.error("Airdrop token address not set");
    return;
  }

  if (!BalanceScale) {
    console.error("Balance scale not set");
    return;
  }

  const [deployer] = await hre.ethers.getSigners();

  const holders = JSON.parse(fs.readFileSync("data/airdrop.json", "utf-8")) as HolderInfo[];

  const BalanceScaleBigint = BigInt(BalanceScale);
  for (const holder of holders) {
    const balance = BigInt(holder.balance);
    holder.balance = (balance * BalanceScaleBigint).toString();
  }

  // chunk holders into batches
  const batchSize = 100;
  const batches = [];
  for (let i = 0; i < holders.length; i += batchSize) {
    batches.push(holders.slice(i, i + batchSize));
  }
  console.log("Airdropping to", holders.length, "holders in", batches.length, "batches of", batchSize);
  const contract = await hre.ethers.getContractAt(AirdropDistributor_ABI, AirdropDistributorAddress, deployer) as unknown as AirdropDistributor;
  const token = await hre.ethers.getContractAt(IERC20_ABI, AirdropTokenAddress, deployer) as unknown as IERC20;

  // check token allowance
  const allowance = await token.allowance(await deployer.getAddress(), await contract.getAddress());
  const totalAmount = holders.reduce((acc, holder) => acc + BigInt(holder.balance), 0n);
  if (allowance < totalAmount) {
    console.log("Token allowance is not enough, auto-approving for entire airdrop budget of", totalAmount.toString());
    const tx = await token.approve(await contract.getAddress(), totalAmount);
    console.log("Approve tx", tx.hash);
    await tx.wait();
  }

  for (const batch of batches) {
    const addresses = batch.map((holder) => holder.address);
    const amounts = batch.map((holder) => holder.balance);

    console.log("Airdropping to", addresses.length, "holders");
    const tx = await contract.distributeTokens(await token.getAddress(), addresses, amounts);
    console.log("Airdrop tx", tx.hash);
    await tx.wait();
  }
});

task("test revert", "Test revert").setAction(async ({ }, hre) => {
  const nftPositionManager = await hre.ethers.getContractAt(INonfungiblePositionManager_ABI, UniV3PositionManagerBscAddress) as unknown as INonfungiblePositionManager;
  const tokenId = 1000;
  console.log(await withretry(async () => nftPositionManager.positions(tokenId)));
});


const getMethodName = () => {
  var err = new Error();
  return /at (\w+)/.exec(err.stack!.split('\n')[2])![1];
}
