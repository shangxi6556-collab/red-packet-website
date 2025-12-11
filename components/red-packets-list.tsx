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
  const [autoStartAttempted, setAutoStartAttempted] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    const attemptAutoStart = async () => {
      try {
        if (!window.ethereum || !poolStatus?.isOwner) {
          return
        }

        const provider = new BrowserProvider(window.ethereum)
        const roundData = await getCurrentRound(provider)
        const roundActive = roundData[5]

        console.log("[v0] Auto-start check - Round active:", roundActive, "Has balance:", poolStatus.poolBalance > 0n)

        if (!roundActive && poolStatus.poolBalance > 0n) {
          console.log("[v0] Auto-starting new round...")
          try {
            await startNewRound(provider)
            console.log("[v0] Auto-start successful!")
            addToast("新轮次已自动启动！", "success")
            setAutoStartAttempted(true)
            // Trigger refresh by setting a flag
            setTimeout(() => {
              setAutoStartAttempted(false)
            }, 3000)
          } catch (err: any) {
            const msg = err.message || String(err)
            if (!msg.includes("Please wait")) {
              console.log("[v0] Auto-start failed:", msg)
            }
          }
        }
      } catch (err) {
        console.error("[v0] Error in auto-start check:", err)
      }
    }

    attemptAutoStart()
  }, [poolStatus?.isOwner, poolStatus?.poolBalance, addToast])

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

        // Fetch packets only if round is active
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

    fetchRoundData()
    const interval = setInterval(fetchRoundData, 5000)
    return () => clearInterval(interval)
  }, [userAddress, addToast, autoStartAttempted])

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
              <div className="pt-2">
                <p className="text-xs text-gray-600 mb-2">您是合约所有者</p>
                <Button
                  onClick={handleStartRound}
                  disabled={startingRound}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {startingRound ? "正在启动轮次..." : "启动新轮次"}
                </Button>
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
              <p className="font-bold text-red-600 mb-2">{formatBNB(packet.amount)} BNB</p>
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
