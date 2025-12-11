export const CONTRACTS = {
  token: {
    address: "0xFE77F18Ddc529b3a652195ad4646Ae10C06541Ab",
    abi: [
      {
        constant: true,
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function",
      },
    ],
  },
  redPacketPool: {
    address: "0x040C8f993A1DeF15C015CDDD22E90239F1080A8F",
    abi: [
      {
        inputs: [],
        name: "currentRound",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "poolBalance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "startNewRound",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "getCurrentRound",
        outputs: [
          { name: "roundId", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "totalAmount", type: "uint256" },
          { name: "packetCount", type: "uint256" },
          { name: "claimedCount", type: "uint256" },
          { name: "active", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { name: "roundId", type: "uint256" },
          { name: "packetId", type: "uint256" },
        ],
        name: "getPacket",
        outputs: [
          { name: "amount", type: "uint256" },
          { name: "claimer", type: "address" },
          { name: "claimTime", type: "uint256" },
          { name: "claimed", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "user", type: "address" }],
        name: "getUserHoldingInfo",
        outputs: [
          { name: "amount", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "currentBalance", type: "uint256" },
          { name: "eligible", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "registerHolding",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { name: "roundId", type: "uint256" },
          { name: "packetId", type: "uint256" },
        ],
        name: "claimPacket",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "user", type: "address" }],
        name: "isEligible",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
  },
}

export const CHAIN_CONFIG = {
  chainId: 97, // BSC Testnet
  chainName: "BNB Smart Chain Testnet",
  rpcUrl: "https://bsc-testnet-dataseed1.binance.org:443",
  blockExplorerUrl: "https://testnet.bscscan.com",
}

// Constants
export const TOKEN_REQUIRED = 20000 // 需要持有20000个代币
export const HOLDING_DURATION = 3600 // 1小时（秒）
export const PACKET_EXPIRY = 600 // 10分钟（秒）
