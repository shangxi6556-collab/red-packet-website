"use client"

import { useEffect, useState } from "react"

interface RedPacket {
  id: number
  left: number
  delay: number
  duration: number
}

export function RedPacketRain() {
  const [packets, setPackets] = useState<RedPacket[]>([])

  useEffect(() => {
    const generatePackets = () => {
      const newPackets: RedPacket[] = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 4,
      }))
      setPackets(newPackets)
    }

    generatePackets()

    const interval = setInterval(() => {
      generatePackets()
    }, 12000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {packets.map((packet) => (
        <div
          key={packet.id}
          className="absolute"
          style={{
            left: `${packet.left}%`,
            top: "-60px",
            animation: `fall ${packet.duration}s linear ${packet.delay}s infinite`,
          }}
        >
          <div className="w-12 h-14 bg-gradient-to-b from-red-500 via-red-600 to-red-700 rounded-lg shadow-xl transform -rotate-12 flex items-center justify-center border-2 border-red-400 relative overflow-hidden">
            {/* Red packet shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg"></div>

            {/* Binance logo (yellow circle with BNB text) */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-red-700 font-bold text-xs">B</span>
              </div>
              <span className="text-white font-bold text-xs mt-1">红包</span>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(-12deg);
            opacity: 1;
          }
          50% {
            transform: translateX(15px) translateY(50vh) rotate(-12deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
