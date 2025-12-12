# 红包自动管理服务

这是一个完全自动化的后端服务，用于管理红包池的过期回流和新轮次启动，无需手动确认交易。

## 功能特性

- ✅ 自动检测过期红包并回流
- ✅ 自动启动新轮次（每小时）
- ✅ 高 Gas 费用配置（150% 市场价格）
- ✅ 完整的错误处理和日志
- ✅ 定时检查（每 60 秒）

## 使用方法

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 配置私钥

将 owner 钱包的私钥设置为环境变量：

\`\`\`bash
export OWNER_PRIVATE_KEY="你的私钥（不要包含0x前缀）"
\`\`\`

**⚠️ 安全提示：**
- 永远不要在代码中硬编码私钥
- 不要将私钥提交到 Git
- 在生产环境使用安全的密钥管理服务

### 3. 运行服务

\`\`\`bash
npm run auto-manage
\`\`\`

或者一行命令：

\`\`\`bash
OWNER_PRIVATE_KEY=你的私钥 npm run auto-manage
\`\`\`

### 4. 停止服务

按 `Ctrl + C` 停止服务

## 工作原理

服务每 60 秒执行一次检查：

1. **检查钱包余额** - 确保有足够的 BNB 支付 Gas
2. **获取当前轮次状态**
3. **如果轮次活跃且已过期（10分钟）**
   - 自动调用 `refundExpiredPackets()` 回流
   - 等待 3 秒后自动启动新轮次
4. **如果没有活跃轮次**
   - 检查是否满足 1 小时间隔
   - 自动调用 `startNewRound()` 启动新轮次

## 日志示例

\`\`\`
============================================================
🔍 检查红包池状态...
============================================================

💰 钱包余额: 0.5 BNB
📦 当前轮次: 5
   状态: 活跃
   红包数量: 10
   总金额: 0.1 BNB
⏰ 轮次 5 已过期 (5 分钟前)
🔄 开始回流轮次 5 的过期红包...
📤 交易已发送: 0x123...
⏳ 等待交易确认...
✅ 回流成功! Gas 使用: 150000
⏳ 等待 3 秒后启动新轮次...
🚀 开始启动新轮次... (池余额: 0.15 BNB)
📤 交易已发送: 0x456...
⏳ 等待交易确认...
✅ 新轮次启动成功! Gas 使用: 200000

============================================================
⏰ 下次检查时间: 2024-01-01 12:01:00
============================================================
\`\`\`

## 部署建议

### 本地运行（测试）

\`\`\`bash
OWNER_PRIVATE_KEY=你的私钥 npm run auto-manage
\`\`\`

### 服务器部署（生产）

使用 PM2 管理进程：

\`\`\`bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start scripts/auto-manage-red-packets.ts --name red-packet-auto --interpreter ts-node

# 查看日志
pm2 logs red-packet-auto

# 停止服务
pm2 stop red-packet-auto

# 开机自启
pm2 startup
pm2 save
\`\`\`

### Docker 部署

\`\`\`dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV OWNER_PRIVATE_KEY=""
CMD ["npm", "run", "auto-manage"]
\`\`\`

## 配置说明

在 `scripts/auto-manage-red-packets.ts` 中修改：

\`\`\`typescript
const CONFIG = {
  RPC_URL: 'https://data-seed-prebsc-1-s1.binance.org:8545', // BSC 测试网 RPC
  CHAIN_ID: 97, // BSC 测试网
  RED_PACKET_POOL_ADDRESS: '0x040C8f993A1DeF15C015CDDD22E90239F1080A8F',
  TOKEN_ADDRESS: '0xFE77F18Ddc529b3a652195ad4646Ae10C06541Ab',
  CHECK_INTERVAL: 60000, // 检查间隔（毫秒）
};
\`\`\`

## 故障排除

### 问题：Gas 费用不足

**解决：** 向 owner 钱包充值 BNB

### 问题：交易被回退

**解决：** 检查合约状态，确保满足启动条件（池有余额、满足时间间隔）

### 问题：RPC 连接失败

**解决：** 更换 RPC 节点或检查网络连接

## 安全建议

1. 使用专门的 owner 钱包，不要存放大量资金
2. 定期检查服务日志
3. 在生产环境使用 AWS Secrets Manager 或 HashiCorp Vault 管理私钥
4. 启用服务器防火墙，限制访问
\`\`\`

```json file="" isHidden
