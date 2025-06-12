import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';
import "./tasks";

let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  PRIVATE_KEY = "0x" + "0".repeat(63) + "1";
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // support running local node with custom chain id
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : 31337,
      accounts: {
        mnemonic: "rebuild always symbol rabbit sunset napkin laundry diary doll chalk valid train",
        initialIndex: 0,
        count: 20,
        path: "m/44'/60'/0'/0",
        accountsBalance: "1"+"0".repeat(24),
        passphrase: undefined,
      },
    },
    localhost: {
      // support running local node with custom chain id
      accounts: {
        mnemonic: "rebuild always symbol rabbit sunset napkin laundry diary doll chalk valid train",
        initialIndex: 0,
        count: 20,
        path: "m/44'/60'/0'/0",
        accountsBalance: "1"+"0".repeat(24),
        passphrase: undefined,
      }
    },
    smartbch: {
      url: "https://smartbch.fountainhead.cash/mainnet",
      accounts: [PRIVATE_KEY],
      chainId: 10000,
    },
    bsc: {
      // url: "https://bsc-mainnet.infura.io/v3/9a90988b9f5542a8ac3d180d1c915fbc",
      // url: "https://bsc-mainnet.infura.io/v3/a48f9442af1a4c8da44b4fc26640e23d",
      url: "https://virulent-dark-hill.bsc.quiknode.pro/01a06406e72abc1a563792bc3ae47c5c620299af",
      accounts: [PRIVATE_KEY],
      chainId: 56,
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [PRIVATE_KEY],
      chainId: 97,
    },
    base: {
      url: "https://base.gateway.tenderly.co",
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    },
  },
};

export default config;
