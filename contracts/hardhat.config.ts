import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Your original Sepolia configuration
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // ✅ New: Arc Testnet configuration
    arcTestnet: {
      url: `https://rpc.testnet.arc.network`,
      chainId: 5042002, // Arc's ChainID
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Automatic open-source verification configuration
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "", // Sepolia API Key
      // Arc's explorer usually doesn't require a real Key, but a placeholder must be filled here to prevent errors
      arcTestnetcd: "any-string-api-key"
    },
    // ✅ New: Arc custom chain verification configuration (because Hardhat doesn't know Arc's explorer API by default)
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },
};

export default config;