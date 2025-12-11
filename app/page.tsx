"use client"

import { useState } from "react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { UserStatus } from "@/components/user-status"
import { RedPacketsList } from "@/components/red-packets-list"

export default function Home() {
  const [userAddress, setUserAddress] = useState<string>("")
  const [userEligible, setUserEligible] = useState(false)

  const handleConnect = (address: string) => {
    setUserAddress(address)
  }

  const handleEligibilityChange = (eligible: boolean) => {
    setUserEligible(eligible)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with Twitter link */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent mb-2">
              🧧 币安红包
            </h1>
            <p className="text-gray-600">在 BSC 链上领取您的幸运奖励</p>
          </div>
          <a
            href="https://twitter.com/BNBRedPacketBSC"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 p-2 text-blue-400 hover:text-blue-600 transition-colors"
            title="Follow us on Twitter"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9-1 9-5.91z" />
            </svg>
          </a>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {!userAddress ? (
            <div className="text-center space-y-4">
              <div className="p-8 bg-white rounded-xl shadow-lg border border-blue-200">
                <p className="text-gray-600 mb-6">连接钱包开始领取红包</p>
                <WalletConnectButton onConnect={handleConnect} />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-2xl mb-2">💎</p>
                  <p className="text-sm font-semibold">持有 20k 代币</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-2xl mb-2">⏰</p>
                  <p className="text-sm font-semibold">等待 1 小时</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-sm font-semibold">领取奖励</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <UserStatus userAddress={userAddress} onEligibilityChange={handleEligibilityChange} />
              <RedPacketsList userAddress={userAddress} userEligible={userEligible} />
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>BSC 网络 • 每小时领取红包</p>
        </footer>
      </div>
    </main>
  )
}
