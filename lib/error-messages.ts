export const ERROR_TRANSLATIONS: Record<string, string> = {
  // Claim packet errors
  "Packet already claimed": "您已经领取过这个红包了",
  "Already claimed": "您已经领取过这个红包了",
  "not eligible": "您还没有达到领取资格，请先注册代币持有",
  "Not eligible": "您还没有达到领取资格，请先注册代币持有",
  "Packet expired": "红包已过期，无法领取",
  "packet expired": "红包已过期，无法领取",
  "No more packets": "本轮红包已全部领完",
  "no more packets": "本轮红包已全部领完",
  "No active round": "当前没有活跃的红包轮次",
  "invalid packet": "红包ID无效",

  // Registration errors
  "Insufficient balance": "代币余额不足，需要至少20000个代币",
  "insufficient balance": "代币余额不足，需要至少20000个代币",
  "Already registered": "您已经注册过了",
  "already registered": "您已经注册过了",

  // Round start errors
  "Pool has 0 BNB": "红包池为空，请先向合约转入BNB",
  "Only the contract owner": "只有合约所有者可以启动新轮次",
  "Please wait": "启动红包轮次间隔为1小时，请稍后再试",

  // Network errors
  "MetaMask not found": "未检测到MetaMask钱包",
  "MetaMask not installed": "请安装MetaMask钱包",
  USER_REJECTED_REQUEST: "您取消了交易",
  "user rejected": "您取消了交易",
  "insufficient funds": "账户余额不足，无法支付gas费用",

  // Contract errors
  "Failed to create contract instance": "合约实例创建失败，请检查网络",
  "Failed to fetch round data": "获取红包数据失败，请刷新重试",
  "Transaction failed": "交易失败，请检查网络连接",
  "transaction execution reverted": "交易被拒绝，请检查您的资格和余额",
}

export function translateError(error: string | Error): string {
  const message = typeof error === "string" ? error : error.message || error.toString()

  // First, try exact matches
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (message.includes(key)) {
      return translation
    }
  }

  // Then try case-insensitive matches
  const lowerMessage = message.toLowerCase()
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return translation
    }
  }

  // Extract meaningful error from ethers error
  if (message.includes("code=")) {
    const meaningfulPart = message.split("(")[0].trim()
    if (meaningfulPart && meaningfulPart.length > 0) {
      return meaningfulPart
    }
  }

  // Default fallback
  if (message.includes("reverted")) {
    return "交易失败，请检查您的资格和账户余额"
  }

  return "发生了一个错误，请重试"
}
