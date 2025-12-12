import { ethers } from "ethers"

// 配置信息
const CONFIG = {
  RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545",
  CHAIN_ID: 97,
  RED_PACKET_POOL_ADDRESS: "0x040C8f993A1DeF15C015CDDD22E90239F1080A8F",
  TOKEN_ADDRESS: "0xFE77F18Ddc529b3a652195ad4646Ae10C06541Ab",
  CHECK_INTERVAL: 60000, // 每60秒检查一次
}

// 完整的合约 ABI
const RED_PACKET_POOL_ABI = [
  "function currentRound() view returns (uint256)",
  "function lastRoundTime() view returns (uint256)",
  "function poolBalance() view returns (uint256)",
  "function owner() view returns (address)",
  "function rounds(uint256) view returns (uint256 roundNumber, uint256 totalAmount, uint256 packetCount, uint256 startTime, bool active)",
  "function redPackets(uint256, uint256) view returns (uint256 amount, address claimer, bool claimed, uint256 timestamp)",
  "function startNewRound()",
  "function refundExpiredPackets(uint256 roundNumber)",
  "event RoundStarted(uint256 indexed roundNumber, uint256 totalAmount, uint256 packetCount)",
  "event PacketClaimed(uint256 indexed roundNumber, uint256 indexed packetIndex, address indexed claimer, uint256 amount)",
  "event ExpiredPacketsRefunded(uint256 indexed roundNumber, uint256 amount)",
]

const ROUND_INTERVAL = 3600 // 1小时
const EXPIRY_TIME = 600 // 10分钟

class RedPacketAutoManager {
  private provider: ethers.JsonRpcProvider
  private wallet: ethers.Wallet
  private contract: ethers.Contract
  private isRunning = false

  constructor(privateKey: string) {
    console.log("🚀 初始化红包自动管理服务...")

    // 连接到 BSC 测试网
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL, CONFIG.CHAIN_ID)

    // 使用私钥创建钱包
    this.wallet = new ethers.Wallet(privateKey, this.provider)

    // 创建合约实例
    this.contract = new ethers.Contract(CONFIG.RED_PACKET_POOL_ADDRESS, RED_PACKET_POOL_ABI, this.wallet)

    console.log(`✅ 钱包地址: ${this.wallet.address}`)
    console.log(`✅ 合约地址: ${CONFIG.RED_PACKET_POOL_ADDRESS}`)
  }

  // 检查钱包余额
  async checkBalance(): Promise<void> {
    const balance = await this.provider.getBalance(this.wallet.address)
    const balanceInBNB = ethers.formatEther(balance)
    console.log(`💰 钱包余额: ${balanceInBNB} BNB`)

    if (Number.parseFloat(balanceInBNB) < 0.01) {
      console.warn("⚠️  警告: 钱包 BNB 余额不足，可能无法支付 Gas 费用")
    }
  }

  // 获取当前轮次信息
  async getCurrentRound(): Promise<any> {
    try {
      const currentRoundNumber = await this.contract.currentRound()

      if (currentRoundNumber === 0n) {
        return null
      }

      const round = await this.contract.rounds(currentRoundNumber)

      return {
        roundNumber: currentRoundNumber,
        totalAmount: round[1],
        packetCount: round[2],
        startTime: round[3],
        active: round[4],
      }
    } catch (error) {
      console.error("❌ 获取当前轮次失败:", error)
      return null
    }
  }

  // 检查红包是否过期
  async checkExpiredPackets(roundNumber: bigint): Promise<boolean> {
    try {
      const round = await this.contract.rounds(roundNumber)
      const startTime = Number(round[3])
      const currentTime = Math.floor(Date.now() / 1000)

      const isExpired = currentTime > startTime + EXPIRY_TIME

      if (isExpired) {
        console.log(
          `⏰ 轮次 ${roundNumber} 已过期 (${Math.floor((currentTime - startTime - EXPIRY_TIME) / 60)} 分钟前)`,
        )
      }

      return isExpired
    } catch (error) {
      console.error("❌ 检查过期失败:", error)
      return false
    }
  }

  // 回流过期红包
  async refundExpiredPackets(roundNumber: bigint): Promise<boolean> {
    try {
      console.log(`🔄 开始回流轮次 ${roundNumber} 的过期红包...`)

      // 设置高 Gas 费用
      const feeData = await this.provider.getFeeData()
      const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 150n) / 100n : undefined

      const tx = await this.contract.refundExpiredPackets(roundNumber, {
        gasPrice,
        gasLimit: 500000,
      })

      console.log(`📤 交易已发送: ${tx.hash}`)
      console.log("⏳ 等待交易确认...")

      const receipt = await tx.wait()

      if (receipt.status === 1) {
        console.log(`✅ 回流成功! Gas 使用: ${receipt.gasUsed.toString()}`)
        return true
      } else {
        console.log("❌ 回流失败: 交易被回退")
        return false
      }
    } catch (error: any) {
      console.error("❌ 回流过期红包失败:", error.message)
      return false
    }
  }

  // 启动新轮次
  async startNewRound(): Promise<boolean> {
    try {
      // 检查时间间隔
      const lastRoundTime = await this.contract.lastRoundTime()
      const currentTime = Math.floor(Date.now() / 1000)
      const timeSinceLastRound = currentTime - Number(lastRoundTime)

      if (timeSinceLastRound < ROUND_INTERVAL) {
        const remainingTime = ROUND_INTERVAL - timeSinceLastRound
        console.log(`⏰ 需要等待 ${Math.floor(remainingTime / 60)} 分钟后才能启动新轮次`)
        return false
      }

      // 检查池余额
      const poolBalance = await this.contract.poolBalance()
      if (poolBalance === 0n) {
        console.log("⚠️  红包池余额为 0，无法启动新轮次")
        return false
      }

      console.log(`🚀 开始启动新轮次... (池余额: ${ethers.formatEther(poolBalance)} BNB)`)

      // 设置高 Gas 费用
      const feeData = await this.provider.getFeeData()
      const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 150n) / 100n : undefined

      const tx = await this.contract.startNewRound({
        gasPrice,
        gasLimit: 500000,
      })

      console.log(`📤 交易已发送: ${tx.hash}`)
      console.log("⏳ 等待交易确认...")

      const receipt = await tx.wait()

      if (receipt.status === 1) {
        console.log(`✅ 新轮次启动成功! Gas 使用: ${receipt.gasUsed.toString()}`)
        return true
      } else {
        console.log("❌ 启动失败: 交易被回退")
        return false
      }
    } catch (error: any) {
      console.error("❌ 启动新轮次失败:", error.message)
      return false
    }
  }

  // 主循环
  async run(): Promise<void> {
    console.log("\n" + "=".repeat(60))
    console.log("🔍 检查红包池状态...")
    console.log("=".repeat(60) + "\n")

    try {
      // 检查余额
      await this.checkBalance()

      // 获取当前轮次
      const currentRound = await this.getCurrentRound()

      if (!currentRound) {
        console.log("📭 当前没有活跃轮次，尝试启动新轮次...")
        await this.startNewRound()
        return
      }

      console.log(`📦 当前轮次: ${currentRound.roundNumber}`)
      console.log(`   状态: ${currentRound.active ? "活跃" : "非活跃"}`)
      console.log(`   红包数量: ${currentRound.packetCount}`)
      console.log(`   总金额: ${ethers.formatEther(currentRound.totalAmount)} BNB`)

      if (currentRound.active) {
        // 检查是否过期
        const isExpired = await this.checkExpiredPackets(currentRound.roundNumber)

        if (isExpired) {
          console.log("🔄 检测到过期红包，开始回流...")
          const refunded = await this.refundExpiredPackets(currentRound.roundNumber)

          if (refunded) {
            // 回流成功后等待 3 秒，然后尝试启动新轮次
            console.log("⏳ 等待 3 秒后启动新轮次...")
            await new Promise((resolve) => setTimeout(resolve, 3000))
            await this.startNewRound()
          }
        } else {
          console.log("✅ 当前轮次仍在有效期内")
        }
      } else {
        // 轮次不活跃，尝试启动新轮次
        console.log("📭 当前轮次已结束，尝试启动新轮次...")
        await this.startNewRound()
      }
    } catch (error) {
      console.error("❌ 执行失败:", error)
    }

    console.log("\n" + "=".repeat(60))
    console.log(`⏰ 下次检查时间: ${new Date(Date.now() + CONFIG.CHECK_INTERVAL).toLocaleString("zh-CN")}`)
    console.log("=".repeat(60) + "\n")
  }

  // 启动定时任务
  start(): void {
    if (this.isRunning) {
      console.log("⚠️  服务已在运行中")
      return
    }

    this.isRunning = true
    console.log("\n" + "=".repeat(60))
    console.log("🎉 红包自动管理服务已启动")
    console.log("=".repeat(60) + "\n")

    // 立即执行一次
    this.run()

    // 定时执行
    setInterval(() => {
      if (this.isRunning) {
        this.run()
      }
    }, CONFIG.CHECK_INTERVAL)
  }

  // 停止服务
  stop(): void {
    this.isRunning = false
    console.log("🛑 红包自动管理服务已停止")
  }
}

// 主函数
async function main() {
  // 从环境变量获取私钥
  const privateKey = process.env.OWNER_PRIVATE_KEY

  if (!privateKey) {
    console.error("❌ 错误: 未设置 OWNER_PRIVATE_KEY 环境变量")
    console.log("\n使用方法:")
    console.log("OWNER_PRIVATE_KEY=你的私钥 node scripts/auto-manage-red-packets.ts")
    process.exit(1)
  }

  try {
    const manager = new RedPacketAutoManager(privateKey)
    manager.start()

    // 监听进程退出信号
    process.on("SIGINT", () => {
      console.log("\n收到退出信号...")
      manager.stop()
      process.exit(0)
    })
  } catch (error) {
    console.error("❌ 初始化失败:", error)
    process.exit(1)
  }
}

// 启动服务
main()
