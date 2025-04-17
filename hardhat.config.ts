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
      url: "https://smartbch.greyh.at",
      accounts: [PRIVATE_KEY],
      chainId: 10000,
    },
    bsc: {
      url: "https://binance.llamarpc.com",
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
