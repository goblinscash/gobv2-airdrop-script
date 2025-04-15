import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { task } from "hardhat/config";
import { BaseContract, Contract, EventLog } from 'ethers';

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

const IStakingRewards_ABI = IStakingRewards_Artifact.abi;
const IERC20_ABI = IERC20_Artifact.abi;
const INonfungiblePositionManager_ABI = INonfungiblePositionManager_Artifact.abi;
const IUniswapV3Pool_ABI = IUniswapV3Pool_Artifact.abi;
const IUniswapV3Factory_ABI = IUniswapV3Factory_Artifact.abi;
const UniV3PositionValue_ABI = UniV3PositionValue_Artifact.abi;

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
    const eventsBatch = await contract.queryFilter(filter, from, to);
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

  const holderMap: Record<string, boolean> = {};
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
  const holders = Object.keys(holderMap);

  console.log("Postprocessing", holders.length, "holders...");
  const holderBalanceMap: Array<{address: string, balance: string, isContract: boolean }> = [];
  for (const address of holders) {
    await new Promise((resolve) => setTimeout(resolve, 2 * timeout));

    const balance = await contract.balanceOf(address);
    if (balance === 0n) {
      continue;
    }

    const isContract = await provider.getCode(address) !== "0x";

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
  const holders = await getTokenHolders(hre, "0x56381cb87c8990971f3e9d948939e1a95ea113a3", 2875823, 0, 0);

  fs.writeFileSync("data/gob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

task("gob_holders_bsc", "Get Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, "0x701ACA29AE0F5d24555f1E8A6Cf007541291d110", 43428859, 0, 150);

  fs.writeFileSync("data/gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("gob_holders_base", "Get Gob holders on Base").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, "0xcDBa3E4C5c505F37CfbBB7aCCF20D57e793568E3", 22731422, 0, 0);

  fs.writeFileSync("data/gob_holders_base.json", JSON.stringify(holders, null, 2));
});

const getStakingHolders = async (hre: HardhatRuntimeEnvironment, address: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const contract = await hre.ethers.getContractAt(IStakingRewards_ABI, address) as unknown as IStakingRewards;

  const holderMap: Record<string, boolean> = {};
  await scanEvents({
    contract,
    filter: contract.filters['Staked(address,uint256)'],
    fromBlock: fromBlock,
    toBlock: toBlock || await provider.getBlockNumber(),
    processFn: async (event) => {
      holderMap[event.args.user.toLowerCase()] = true;
    },
    timeout: timeout,
    blockBatch: 10000,
  });
  const holders = Object.keys(holderMap);

  const holderBalanceMap: Array<{address: string, balance: string, isContract: boolean }> = [];
  console.log("Postprocessing", holders.length, "holders...");
  for (const address of holders) {
    await new Promise((resolve) => setTimeout(resolve, 2 * timeout));

    const balance = await contract.balanceOf(address);
    if (balance === 0n) {
      continue;
    }

    const isContract = await provider.getCode(address) !== "0x";

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

/// gob staking

task("staked_gob_sbch", "Get staked Gob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, "0xfA3D02c971F6D97076b8405500c2210476C6A5E8", 14815912, 0, 0);

  fs.writeFileSync("data/staked_gob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

task("staked_gob_bsc", "Get staked Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, "0xB4D117f9c404652030F3d12f6DE58172317a2eDa", 43532843, 0, 150);

  fs.writeFileSync("data/staked_gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});

task("staked_gob_base", "Get staked Gob holders on Base").setAction(async ({ }, hre) => {
  const holders = await getStakingHolders(hre, "0xAAFa8A16121939414B529289fA69F08aefE51769", 23605756, 0, 0);

  fs.writeFileSync("data/staked_gob_holders_base.json", JSON.stringify(holders, null, 2));
});

/// sgob token
task("sgob_holders_sbch", "Get sGob holders on SmartBCH").setAction(async ({ }, hre) => {
  const holders = await getTokenHolders(hre, "0x47c61F29B1458d234409Ebbe4B6a70F3b16528EF", 2875959, 0, 0);

  fs.writeFileSync("data/sgob_holders_sbch.json", JSON.stringify(holders, null, 2));
});

/// univ3 gob holders
const getUniv3GobHolders = async (hre: HardhatRuntimeEnvironment, nftPositionManagerAddress: string, factoryAddress: string, gobAddress: string, fromBlock: number, toBlock: number, timeout: number) => {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const nftPositionManager = await hre.ethers.getContractAt(INonfungiblePositionManager_ABI, nftPositionManagerAddress) as unknown as INonfungiblePositionManager;
  const positionValue = await hre.ethers.getContractAt(UniV3PositionValue_ABI, "0xeB6A822930edb2e4e65b056933aFD050d984E889") as unknown as UniV3PositionValue;

  const tokenIdMap: Record<string, boolean> = {};
  await scanEvents({
    contract: nftPositionManager,
    filter: nftPositionManager.filters['IncreaseLiquidity(uint256,uint128,uint256,uint256)'],
    fromBlock: fromBlock,
    toBlock: toBlock || await provider.getBlockNumber(),
    processFn: async (event) => {
      tokenIdMap[event.args.tokenId.toString()] = true;
    },
    timeout: timeout,
    blockBatch: 10000,
  });
  const tokenIds = Object.keys(tokenIdMap);

  const factory = await hre.ethers.getContractAt(IUniswapV3Factory_ABI, factoryAddress) as unknown as IUniswapV3Factory;

  const holderBalanceMap: Array<{address: string, balance: string, isContract: boolean }> = [];
  console.log("Postprocessing", tokenIds.length, "tokenIds...");
  for (const tokenId of tokenIds) {
    await new Promise((resolve) => setTimeout(resolve, 7 * timeout));

    let position;
    try {
      position = await nftPositionManager.positions(tokenId);
    } catch {
      // bail if position for tokenId not found
      console.log("Position not found for tokenId", tokenId);
      continue;
    }
    let poolAddress: string;
    try {
      poolAddress = await factory.getPool(position.token0, position.token1, position.fee);
    } catch (e) {
      console.log("Pool not found for tokenId", tokenId, "position:", position, "error:", e);
      continue;
    }
    const pool = await hre.ethers.getContractAt(IUniswapV3Pool_ABI, poolAddress) as unknown as IUniswapV3Pool;
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    console.log("Pool address", poolAddress, "token0", token0, "token1", token1);

    if (token0.toLowerCase() !== gobAddress.toLowerCase() && token1.toLowerCase() !== gobAddress.toLowerCase()) {
      console.log("Non-GOB pool", token0, token1, "skipping");
      continue;
    }

    const slot0 = await pool.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;;

    const [amount0, amount1] = await positionValue.total(await nftPositionManager.getAddress(), tokenId, sqrtPriceX96);
    const owner = await nftPositionManager.ownerOf(tokenId);

    holderBalanceMap.push({
      address: owner,
      balance: token0.toLowerCase() === gobAddress.toLowerCase() ? amount0.toString() : amount1.toString(),
      isContract: false,
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

task("univ3_gob_bsc", "Get UniV3 staked NFT LPs Gob holders on BSC").setAction(async ({ }, hre) => {
  const holders = await getUniv3GobHolders(hre, "0x32e9182879f62f2429879A1E7D491ccd37f2E613", "0x30D9e1f894FBc7d2227Dd2a017F955d5586b1e14", "0x701ACA29AE0F5d24555f1E8A6Cf007541291d110", 42363155, 0, 150);

  fs.writeFileSync("data/univ3_gob_holders_bsc.json", JSON.stringify(holders, null, 2));
});