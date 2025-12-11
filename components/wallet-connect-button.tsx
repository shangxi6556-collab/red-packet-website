"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { connectWallet, switchToChain } from "@/lib/web3-utils"

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void
}

export function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const [address, setAddress] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  const handleConnect = async () => {
    try {
      setLoading(true)
      setError("")
      await switchToChain()
      const account = await connectWallet()
      setAddress(account)
      onConnect?.(account)
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {address ? (
        <div className="px-4 py-2 bg-green-50 text-green-900 rounded-lg text-sm font-medium">
          已连接: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {loading ? "连接中..." : "连接 MetaMask"}
        </Button>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
