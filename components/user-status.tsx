"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BrowserProvider } from "ethers"
import { getUserHoldingInfo, registerHolding } from "@/lib/web3-utils"
import { HOLDING_DURATION, TOKEN_REQUIRED } from "@/lib/contracts"
import { translateError } from "@/lib/error-messages"

interface UserStatusProps {
  userAddress: string
  onEligibilityChange?: (eligible: boolean) => void
}

export function UserStatus({ userAddress, onEligibilityChange }: UserStatusProps) {
  const [holdingInfo, setHoldingInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const fetchHoldingInfo = async () => {
      try {
        if (!window.ethereum) return
        const provider = new BrowserProvider(window.ethereum)
        const info = await getUserHoldingInfo(provider, userAddress)
        setHoldingInfo(info)
        onEligibilityChange?.(info.eligible)
        setError("")
      } catch (err) {
        console.error("[v0] Error fetching holding info:", err)
        setError("Failed to fetch holding information")
        onEligibilityChange?.(false)
      } finally {
        setLoading(false)
      }
    }

    fetchHoldingInfo()
    const interval = setInterval(fetchHoldingInfo, 10000)
    return () => clearInterval(interval)
  }, [userAddress, onEligibilityChange])

  const handleRegister = async () => {
    try {
      setRegistering(true)
      setError("")
      if (!window.ethereum) return
      const provider = new BrowserProvider(window.ethereum)
      await registerHolding(provider)

      const info = await getUserHoldingInfo(provider, userAddress)
      setHoldingInfo(info)
      onEligibilityChange?.(info.eligible)
      setError("") // Clear error on success
    } catch (err) {
      const errorMessage = translateError(err)
      setError(errorMessage)
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <Card className="p-4">Loading user status...</Card>

  const currentBalance = holdingInfo?.currentBalance ? Number(holdingInfo.currentBalance) / 1e18 : 0
  const isEligible = holdingInfo?.eligible ?? false
  const holdingStartTime = holdingInfo?.startTime ?? 0
  const eligibleTime =
    holdingStartTime > 0 ? new Date((holdingStartTime + HOLDING_DURATION) * 1000).toLocaleString() : "Not registered"

  const hasEnoughBalance = currentBalance >= TOKEN_REQUIRED

  return (
    <Card className="p-4 border border-blue-200 bg-blue-50">
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">代币余额</p>
          <p className="text-2xl font-bold text-blue-600">{currentBalance.toFixed(0)}</p>
          <p className="text-xs text-gray-500">
            需要: {TOKEN_REQUIRED} (现有: {currentBalance.toFixed(0)})
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">资格状态</p>
          <p className={`font-semibold ${isEligible ? "text-green-600" : "text-orange-600"}`}>
            {isEligible ? "✓ 可以领取红包" : "⏳ 还不符合条件"}
          </p>
          {!isEligible && holdingStartTime > 0 && (
            <p className="text-xs text-gray-500 mt-1">可在以下时间后领取: {eligibleTime}</p>
          )}
        </div>

        {!isEligible && hasEnoughBalance && (
          <Button onClick={handleRegister} disabled={registering} variant="outline" className="w-full bg-transparent">
            {registering ? "正在注册..." : "注册代币持有"}
          </Button>
        )}

        {!hasEnoughBalance && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            代币余额不足，需要至少 {TOKEN_REQUIRED} 个代币
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </Card>
  )
}
