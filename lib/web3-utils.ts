import { BrowserProvider, Contract, formatEther } from "ethers"
import { CONTRACTS, CHAIN_CONFIG } from "./contracts"

export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed")
  }
  return new BrowserProvider(window.ethereum)
}

export async function connectWallet() {
  const provider = await getProvider()
  const accounts = await provider.send("eth_requestAccounts", [])
  return accounts[0]
}

export async function switchToChain() {
  if (!window.ethereum) return

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x61" }],
    })
  } catch (error: any) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x61",
            chainName: CHAIN_CONFIG.chainName,
            rpcUrls: [CHAIN_CONFIG.rpcUrl],
            blockExplorerUrls: [CHAIN_CONFIG.blockExplorerUrl],
            nativeCurrency: {
              name: "BNB",
              symbol: "BNB",
              decimals: 18,
            },
          },
        ],
      })
    }
  }
}

export async function getRedPacketPoolContract(signer: any) {
  try {
    const contract = new Contract(CONTRACTS.redPacketPool.address, CONTRACTS.redPacketPool.abi, signer)
    console.log("[v0] Contract created successfully at:", CONTRACTS.redPacketPool.address)
    return contract
  } catch (err) {
    console.error("[v0] Error creating contract:", err)
    throw new Error("Failed to create contract instance")
  }
}

export async function getPoolStatus(provider: BrowserProvider, userAddress: string) {
  try {
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    const poolBalance = await contract.poolBalance()
    const owner = await contract.owner()
    const isOwner = owner.toLowerCase() === userAddress.toLowerCase()

    console.log("[v0] Pool status - Balance:", formatEther(poolBalance), "BNB, IsOwner:", isOwner)

    return {
      poolBalance,
      owner,
      isOwner,
    }
  } catch (err) {
    console.error("[v0] Error getting pool status:", err)
    throw err
  }
}

export async function startNewRound(provider: BrowserProvider) {
  try {
    console.log("[v0] Starting new red packet round...")
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)
    const userAddress = await signer.getAddress()

    const poolBalance = await contract.poolBalance()
    console.log("[v0] Current pool balance:", formatEther(poolBalance), "BNB")

    if (poolBalance === 0n) {
      throw new Error("Pool has 0 BNB. Please deposit BNB to the pool contract first.")
    }

    const owner = await contract.owner()
    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Only the contract owner can start a new round.")
    }

    let lastRoundTime = 0n
    try {
      lastRoundTime = await contract.lastRoundTime()
    } catch (err) {
      console.log("[v0] lastRoundTime call failed (may be first round):", err)
      lastRoundTime = 0n
    }

    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const secondsSinceLastRound = Number(currentTime - lastRoundTime)
    const ROUND_INTERVAL = 3600 // 1 hour in seconds

    console.log(
      "[v0] Last round time:",
      Number(lastRoundTime),
      "Current time:",
      Number(currentTime),
      "Seconds since:",
      secondsSinceLastRound,
    )

    if (secondsSinceLastRound < ROUND_INTERVAL && Number(lastRoundTime) > 0) {
      const waitSeconds = ROUND_INTERVAL - secondsSinceLastRound
      const waitMins = Math.ceil(waitSeconds / 60)
      throw new Error(
        `Please wait ${waitMins} minutes before starting a new round (last round was ${Math.floor(secondsSinceLastRound / 60)} minutes ago).`,
      )
    }

    console.log("[v0] All pre-flight checks passed. Calling startNewRound...")
    const tx = await contract.startNewRound()
    console.log("[v0] Start round transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Start round transaction confirmed")

    return receipt
  } catch (err: any) {
    console.error("[v0] Error starting new round:", err)

    let userError = "Failed to start round"

    if (err.message?.includes("Pool has 0 BNB")) {
      userError = err.message
    } else if (err.message?.includes("Please wait")) {
      userError = err.message
    } else if (err.message?.includes("Only the contract owner")) {
      userError = err.message
    } else if (err.message) {
      userError = err.message
    } else if (err.reason) {
      userError = err.reason
    }

    throw new Error(userError)
  }
}

export async function getCurrentRound(provider: BrowserProvider) {
  try {
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    console.log("[v0] Calling getCurrentRound...")
    const result = await contract.getCurrentRound()
    console.log("[v0] getCurrentRound result:", result)

    return result
  } catch (err) {
    console.error("[v0] Error in getCurrentRound:", err)
    throw err
  }
}

export async function getUserHoldingInfo(provider: BrowserProvider, userAddress: string) {
  try {
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    console.log("[v0] Calling getUserHoldingInfo for:", userAddress)
    const result = await contract.getUserHoldingInfo(userAddress)
    console.log("[v0] getUserHoldingInfo result:", result)

    return {
      registeredAmount: result[0],
      startTime: Number(result[1]),
      currentBalance: result[2],
      eligible: result[3],
    }
  } catch (err) {
    console.log("[v0] getUserHoldingInfo error (user may not be registered):", err)
    // If call fails, user hasn't registered yet - return default values
    try {
      const tokenContract = new Contract(CONTRACTS.token.address, CONTRACTS.token.abi, provider)
      const balance = await tokenContract.balanceOf(userAddress)
      return {
        registeredAmount: 0n,
        startTime: 0,
        currentBalance: balance,
        eligible: false,
      }
    } catch (balanceErr) {
      console.error("[v0] Error getting token balance:", balanceErr)
      return {
        registeredAmount: 0n,
        startTime: 0,
        currentBalance: 0n,
        eligible: false,
      }
    }
  }
}

export async function getPacket(provider: BrowserProvider, roundId: number, packetId: number) {
  try {
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    console.log("[v0] Getting packet:", roundId, packetId)
    const result = await contract.getPacket(roundId, packetId)
    console.log("[v0] Packet result:", result)

    return result
  } catch (err) {
    console.error("[v0] Error in getPacket:", err)
    throw err
  }
}

export async function registerHolding(provider: BrowserProvider) {
  try {
    console.log("[v0] Starting registerHolding...")
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    console.log("[v0] Contract instance:", contract.address)
    console.log("[v0] Calling registerHolding()...")

    const tx = await contract.registerHolding()
    console.log("[v0] Transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Transaction confirmed:", receipt)

    return receipt
  } catch (err) {
    console.error("[v0] Error in registerHolding:", err)
    throw err
  }
}

export async function claimPacket(provider: BrowserProvider, roundId: number, packetId: number) {
  try {
    console.log("[v0] Starting claimPacket for round:", roundId, "packet:", packetId)
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    console.log("[v0] Calling claimPacket...")
    const tx = await contract.claimPacket(roundId, packetId)
    console.log("[v0] Claim transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Claim transaction confirmed:", receipt)

    return receipt
  } catch (err) {
    console.error("[v0] Error in claimPacket:", err)
    throw err
  }
}

export async function refundExpiredPackets(provider: BrowserProvider, roundId: number) {
  try {
    console.log("[v0] Refunding expired packets for round:", roundId)
    const signer = await provider.getSigner()
    const contract = await getRedPacketPoolContract(signer)

    const tx = await contract.refundExpiredPackets(roundId)
    console.log("[v0] Refund transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Refund transaction confirmed")

    return receipt
  } catch (err) {
    console.error("[v0] Error refunding expired packets:", err)
    throw err
  }
}

export function formatBNB(amount: any) {
  try {
    return Number.parseFloat(formatEther(amount)).toFixed(4)
  } catch (err) {
    console.error("[v0] Error formatting amount:", amount, err)
    return "0.0000"
  }
}

export function getTimeRemaining(startTime: number, expiryMinutes = 10) {
  const now = Math.floor(Date.now() / 1000)
  const remaining = startTime + expiryMinutes * 60 - now
  return Math.max(0, remaining)
}
