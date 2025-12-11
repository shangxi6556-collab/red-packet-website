"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"

export interface Toast {
  id: string
  message: string
  type: "success" | "error" | "warning" | "info"
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: Toast["type"]) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-right-4 duration-300 text-white text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-500"
              : toast.type === "error"
                ? "bg-red-500"
                : toast.type === "warning"
                  ? "bg-yellow-500"
                  : "bg-blue-500"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
