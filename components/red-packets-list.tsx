"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BrowserProvider } from "ethers"
import {
  getCurrentRound,
  getPacket,
  claimPacket,
  formatBNB,
  getTimeRemaining,
  getPoolStatus,
  startNewRound,
  refundExpiredPackets,
} from "@/lib/web3-utils"
import { useToast } from "@/components/toast-provider"
import { translateError } from "@/lib/error-messages"

interface RedPacketsListProps {
  userAddress: string
  userEligible: boolean
}

export function RedPacketsList({ userAddress, userEligible }: RedPacketsListProps) {
  const [round, setRound] = useState<any>(null)
  const [packets, setPackets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [poolStatus, setPoolStatus] = useState<any>(null)
  const [startingRound, setStartingRound] = useState(false)
  const [autoStartStatus, setAutoStartStatus] = useState<string>("")
  const [autoManaging, setAutoManaging] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    const checkAndAutoStart = async () => {
      try {
        if (!window.ethereum) return

        const provider = new BrowserProvider(window.ethereum)

        const status = await getPoolStatus(provider, userAddress)
        console.log("[v0] Auto-start check - Pool status:", status)

        if (!status.isOwner) {
          console.log("[v0] Not owner, skipping auto-start")
          setAutoStartStatus("")
          return
        }

        const roundData = await getCurrentRound(provider)
        const currentRoundId = Number(roundData[0])
        const startTime = Number(roundData[1])
        const roundActive = roundData[5]
        const poolBalance = status.poolBalance

        console.log("[v0] Round info - ID:", currentRoundId, "Active:", roundActive, "Start:", startTime)

        const now = Math.floor(Date.now() / 1000)
        const PACKET_EXPIRY = 10 * 60
        const timeElapsed = now - startTime

        if (roundActive && timeElapsed > PACKET_EXPIRY && currentRoundId > 0) {
          setAutoStartStatus("检测到过期红包，准备自动回流...")
          console.log("[v0] Packets expired, attempting auto-refund...")

          try {
            addToast("检测到过期红包，正在自动回流，请在钱包中确认...", "info")
            await refundExpiredPackets(provider, currentRoundId)
            console.log("[v0] Expired packets refunded successfully")
            setAutoStartStatus("✓ 过期红包已回流！准备启动新轮次...")
            addToast("过期红包已自动回流", "success")

            await new Promise((resolve) => setTimeout(resolve, 3000))
            return
          } catch (refundErr: any) {
            console.log("[v0] Auto-refund error:", refundErr)
            const msg = translateError(refundErr)
            setAutoStartStatus(`自动回流失败: ${msg.substring(0, 50)}`)
            if (!msg.includes("用户拒绝") && !msg.includes("rejected")) {
              addToast(`回流失败: ${msg.substring(0, 50)}`, "warning")
            }
            return
          }
        }

        if (!roundActive && poolBalance > 0n) {
          setAutoStartStatus("条件满足，准备自动启动新轮次...")
          console.log("[v0] Attempting auto-start new round...")

          try {
            addToast("正在自动启动新轮次，请在钱包中确认...", "info")
            await startNewRound(provider)
            console.log("[v0] Auto-start successful!")
            setAutoStartStatus("✓ 新轮次已自动启动！")
            addToast("新轮次已自动启动！页面即将刷新...", "success")

            setTimeout(() => {
              window.location.reload()
            }, 2000)
          } catch (err: any) {
            const msg = translateError(err)
            console.log("[v0] Auto-start failed:", msg)

            if (msg.includes("用户拒绝") || msg.includes("rejected")) {
              setAutoStartStatus("等待所有者确认交易...")
              return
            }

            if (msg.includes("请等待")) {
              const match = msg.match(/(\d+)/)
              const mins = match ? match[1] : "?"
              setAutoStartStatus(`⏳ 需要等待 ${mins} 分钟后才能启动新轮次`)
            } else {
              setAutoStartStatus(`启动失败: ${msg.substring(0, 50)}`)
              addToast(`自动启动失败: ${msg.substring(0, 50)}`, "warning")
            }
          }
        } else {
          let reason = ""
          if (!poolBalance || poolBalance === 0n) {
            reason = "⚠️ 池中没有BNB，无法启动新轮次"
          } else if (roundActive) {
            const remaining = PACKET_EXPIRY - timeElapsed
            if (remaining > 0) {
              const mins = Math.floor(remaining / 60)
              const secs = remaining % 60
              reason = `当前轮次仍活跃 (${mins}:${secs.toString().padStart(2, "0")} 后过期)`
            } else {
              reason = "当前轮次已过期，准备回流..."
            }
          } else {
            reason = "等待启动条件..."
          }
          setAutoStartStatus(reason)
        }
      } catch (err) {
        console.log("[v0] Auto-start check error:", err)
        setAutoStartStatus(`检查错误: ${String(err).substring(0, 40)}`)
      }
    }

    if (!userAddress) return

    checkAndAutoStart()
    const interval = setInterval(checkAndAutoStart, 10000)
    return () => clearInterval(interval)
  }, [userAddress, addToast])

  useEffect(() => {
    const fetchRoundData = async () => {
      try {
        console.log("[v0] Fetching round data...")
        if (!window.ethereum) {
          addToast("未检测到 MetaMask", "error")
          setLoading(false)
          return
        }

        const provider = new BrowserProvider(window.ethereum)

        const status = await getPoolStatus(provider, userAddress)
        setPoolStatus(status)
        console.log("[v0] Pool status:", status)

        const roundData = await getCurrentRound(provider)
        console.log("[v0] Round data received:", roundData)

        const roundInfo = {
          roundId: roundData[0],
          startTime: roundData[1],
          totalAmount: roundData[2],
          packetCount: roundData[3],
          claimedCount: roundData[4],
          active: roundData[5],
        }

        console.log("[v0] Round info - Active:", roundInfo.active, "RoundId:", roundInfo.roundId)
        setRound(roundInfo)

        if (roundInfo.active && roundInfo.packetCount > 0) {
          const packetsList = []
          for (let i = 0; i < roundInfo.packetCount; i++) {
            try {
              const packet = await getPacket(provider, roundInfo.roundId, i)
              packetsList.push({
                id: i,
                amount: packet[0],
                claimer: packet[1],
                claimTime: packet[2],
                claimed: packet[3],
              })
            } catch (err) {
              console.error("[v0] Error fetching packet", i, ":", err)
            }
          }
          console.log("[v0] Packets fetched:", packetsList.length)
          setPackets(packetsList)
        } else {
          setPackets([])
        }

        const remaining = getTimeRemaining(Number(roundInfo.startTime))
        setTimeRemaining(remaining)
      } catch (err) {
        console.error("[v0] Error fetching round data:", err)
        addToast("获取红包数据失败", "error")
      } finally {
        setLoading(false)
      }
    }

    if (!userAddress) return

    fetchRoundData()
    const interval = setInterval(fetchRoundData, 5000)
    return () => clearInterval(interval)
  }, [userAddress, addToast])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClaim = async (packetId: number) => {
    try {
      setClaiming(packetId)
      console.log("[v0] Starting claim for packet:", packetId)

      if (!window.ethereum) {
        addToast("未检测到 MetaMask 钱包", "error")
        return
      }

      const provider = new BrowserProvider(window.ethereum)

      if (!round) {
        addToast("红包数据加载失败", "error")
        return
      }

      console.log("[v0] Calling claimPacket...")
      await claimPacket(provider, round.roundId, packetId)

      console.log("[v0] Claim successful, refreshing packet data...")
      addToast("恭喜！您成功领取了红包！", "success")

      const updatedPacket = await getPacket(provider, round.roundId, packetId)
      console.log("[v0] Updated packet:", updatedPacket)

      setPackets((prev) =>
        prev.map((p) =>
          p.id === packetId
            ? {
                ...p,
                amount: updatedPacket[0],
                claimer: updatedPacket[1],
                claimTime: updatedPacket[2],
                claimed: updatedPacket[3],
              }
            : p,
        ),
      )
    } catch (err) {
      const errorMessage = translateError(err)
      console.error("[v0] Claim error:", errorMessage)
      addToast(errorMessage, "warning")
    } finally {
      setClaiming(null)
    }
  }

  const handleStartRound = async () => {
    try {
      setStartingRound(true)

      if (!window.ethereum) {
        addToast("未检测到 MetaMask 钱包", "error")
        return
      }

      const provider = new BrowserProvider(window.ethereum)

      console.log("[v0] Calling startNewRound...")
      await startNewRound(provider)
      console.log("[v0] Round started successfully!")
      addToast("新红包轮次已启动！", "success")

      setTimeout(async () => {
        try {
          const roundData = await getCurrentRound(provider)
          const roundInfo = {
            roundId: roundData[0],
            startTime: roundData[1],
            totalAmount: roundData[2],
            packetCount: roundData[3],
            claimedCount: roundData[4],
            active: roundData[5],
          }
          console.log("[v0] Updated round info:", roundInfo)
          setRound(roundInfo)
        } catch (err) {
          console.error("[v0] Error refreshing round data:", err)
        }
      }, 2000)
    } catch (err) {
      const errorMessage = translateError(err)
      console.error("[v0] Start round error:", errorMessage)
      addToast(errorMessage, "warning")
    } finally {
      setStartingRound(false)
    }
  }

  const handleAutoManage = async () => {
    try {
      setAutoManaging(true)

      if (!window.ethereum) {
        addToast("未检测到 MetaMask 钱包", "error")
        return
      }

      const provider = new BrowserProvider(window.ethereum)
      const roundData = await getCurrentRound(provider)
      const currentRoundId = Number(roundData[0])
      const startTime = Number(roundData[1])
      const roundActive = roundData[5]

      const now = Math.floor(Date.now() / 1000)
      const PACKET_EXPIRY = 10 * 60
      const timeElapsed = now - startTime

      if (roundActive && timeElapsed > PACKET_EXPIRY && currentRoundId > 0) {
        addToast("步骤 1/2: 正在回流过期红包，请在钱包中确认交易...", "info")
        console.log("[v0] Step 1: Refunding expired packets...")

        try {
          await refundExpiredPackets(provider, currentRoundId)
          addToast("✓ 过期红包已回流！", "success")
          console.log("[v0] Expired packets refunded successfully")

          await new Promise((resolve) => setTimeout(resolve, 3000))
        } catch (refundErr: any) {
          console.error("[v0] Refund error:", refundErr)
          addToast(translateError(refundErr), "error")
          return
        }
      }

      const status = await getPoolStatus(provider, userAddress)
      if (status.poolBalance > 0n) {
        addToast("步骤 2/2: 正在启动新轮次，请在钱包中确认交易...", "info")
        console.log("[v0] Step 2: Starting new round...")

        try {
          await startNewRound(provider)
          addToast("✓ 新轮次已启动！页面即将刷新...", "success")
          console.log("[v0] New round started successfully")

          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } catch (startErr: any) {
          console.error("[v0] Start round error:", startErr)
          addToast(translateError(startErr), "error")
        }
      } else {
        addToast("池中没有 BNB，无法启动新轮次", "warning")
      }
    } catch (err) {
      console.error("[v0] Auto manage error:", err)
      addToast(translateError(err), "error")
    } finally {
      setAutoManaging(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) return <Card className="p-4 text-center">加载红包中...</Card>

  if (!round?.active) {
    return (
      <Card className="p-6 space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-yellow-800 mb-2">暂无活跃红包轮次</p>
          <p className="text-sm text-gray-600 mb-4">请等待下一轮红包启动！</p>
        </div>

        {poolStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600">
              池余额: <span className="font-semibold text-blue-600">{formatBNB(poolStatus.poolBalance)} BNB</span>
            </p>
            {poolStatus.isOwner && (
              <div className="pt-2 space-y-3">
                <p className="text-xs text-gray-600">✓ 您是合约所有者</p>
                {autoStartStatus && (
                  <p className="text-xs text-blue-600 bg-blue-100 p-2 rounded break-words">{autoStartStatus}</p>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleAutoManage}
                    disabled={autoManaging}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold"
                  >
                    {autoManaging ? "🔄 处理中..." : "🚀 一键管理红包池"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">自动回流过期红包并启动新轮次（需确认 1-2 次交易）</p>
                </div>

                <div className="border-t pt-2">
                  <Button
                    onClick={handleStartRound}
                    disabled={startingRound}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    {startingRound ? "正在启动轮次..." : "仅启动新轮次"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  const unclaimedPackets = packets.filter((p) => !p.claimed)

  return (
    <Card className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">当前红包轮次 #{round.roundId.toString()}</p>
            <p className="text-2xl font-bold text-red-600">{formatBNB(round.totalAmount)} BNB</p>
            <p className="text-sm text-gray-600">
              {unclaimedPackets.length}/{round.packetCount} 可领取
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">剩余时间</p>
            <p className={`text-3xl font-bold ${timeRemaining > 0 ? "text-red-600" : "text-gray-400"}`}>
              {formatTime(timeRemaining)}
            </p>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg ${
            userEligible ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <p className={`text-sm font-semibold ${userEligible ? "text-green-800" : "text-yellow-800"}`}>
            {userEligible ? "✓ 您已符合领取条件！" : "⚠️ 您需要先注册代币持有才能领取"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {packets.map((packet) => (
            <div
              key={packet.id}
              className={`p-4 rounded-lg text-center transition-all border-2 ${
                packet.claimed
                  ? "bg-gray-100 text-gray-400 border-gray-200"
                  : userEligible
                    ? "bg-white border-red-300 hover:border-red-500 shadow-md hover:shadow-lg"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              <p className="text-3xl mb-2">{packet.claimed ? "✓" : "🧧"}</p>
              <p className="font-bold text-red-600 mb-2">{packet.claimed ? formatBNB(packet.amount) : "?"}</p>
              {packet.claimed ? (
                <p className="text-xs text-gray-500">已领取</p>
              ) : (
                <Button
                  onClick={() => handleClaim(packet.id)}
                  disabled={!userEligible || claiming === packet.id}
                  size="sm"
                  className={`w-full ${
                    userEligible
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {claiming === packet.id ? "抢中..." : "抢红包"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
