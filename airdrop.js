require('dotenv').config();
const fs = require('fs');
const { ethers } = require('ethers');

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;

// Read user data
const users = JSON.parse(fs.readFileSync('user.json', 'utf8'));

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Token contract ABI (ERC-20 transfer function)
const ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)"
];
const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

// Airdrop function
async function airdrop() {
  let totalAirdropped = 0;
  for (const user of users) {
    try {
      const tx = await tokenContract.transfer(user.address, user.value * 1000000000);
      console.log(`Sent ${user.value} tokens to ${user.address}, TX: ${tx.hash}`);
      await tx.wait();
      totalAirdropped += Number(user.value);
    } catch (error) {
      console.error(`Failed to send to ${user.address}:`, error);
    }
  }
  console.log(`Total airdropped: ${totalAirdropped} tokens`);
}

// Run the airdrop
airdrop().then(() => console.log("Airdrop complete!"));
