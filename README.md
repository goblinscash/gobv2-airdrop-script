# gobv2-airdrop-script

## Overview

`gobv2-airdrop-script` is a tool designed to facilitate the creation and execution of airdrops for GOB token holders. It provides utilities to generate snapshots of token holders, including those holding GOB, sGOB, and staked GOB, as well as GOB holders from staked and unstaked UniV3 LP positions. Additionally, it includes scripts to combine outputs from these snapshots and execute the airdrop efficiently.

## Features

- Generate snapshots of GOB, sGOB, and staked GOB holders.
- Extract GOB holders from staked UniV3 LP positions.
- Combine multiple snapshot outputs into a unified dataset.
- Execute airdrops based on the combined dataset.

## Prerequisites

- Node.js and yarn installed
- Hardhat and other dependencies installed (`yarn install`)
- Access to blockchain data (e.g., via an RPC provider; preconfigured, but can be overriden in `hardhat.config.ts`)

## Usage

### 0. Configure the environment

Create a `.env` file or copy it from `env.example`. Set `PRIVATE_KEY` variable, like `PRIVATE_KEY=0x244d...`;

### 1. Create Snapshots

#### GOB, sGOB, and Staked GOB Holders
Run the Hardhat task to generate lists of GOB, sGOB, and staked GOB holders:
```bash
yarn gob
yarn sgob
yarn staked_gob
```

#### GOB Holders from Staked UniV3 LP Positions
To extract GOB holders from staked UniV3 LP positions, use:
```bash
yarn univ3_gob
```

Each task will output a JSON file containing the relevant holder data.

Note, these tasks will take some time to execute.

### 2. Combine Outputs

Use the `combine_outputs` Hardhat task to merge the individual snapshots into a single dataset:
```bash
yarn combine_outputs
```

### 3. Execute the Airdrop

Once the combined snapshot is ready, use the airdrop execution task to distribute tokens:
```bash
yarn airdrop
```

Ensure you have sufficient tokens to be airdropped in the wallet associated with the provided private key. Ensure that `AirdropTokenAddress` in `tasks/index.ts` points to a correct token address;

## Configuration

Modify the Hardhat configuration file (`hardhat.config.js`) to set parameters such as RPC endpoints

## Notes

- Always verify the snapshot data before executing the airdrop.
- Test the scripts in a development environment before running them on the mainnet.

A test airdrop on BSC Testnet was performed based on snapshot from 04.16.2025 in following transactions:

- 100 holders https://testnet.bscscan.com/tx/0x50d845cb1b7abe5fe916cd0431bd3ddd08ec6ded5ccba78ace97ee09125265e0
- 100 holders https://testnet.bscscan.com/tx/0x36984d2f9f6ed7486c1408cfafce92917b504528711233776e4435476d4b4153
- 47 holders  https://testnet.bscscan.com/tx/0x39e20a15c3e50d0a2e47b37f890cbab209c3f5ae10d1f3017c0e76aa61462b56

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Disclaimer

Use this tool at your own risk. The authors are not responsible for any loss of funds or errors in execution.