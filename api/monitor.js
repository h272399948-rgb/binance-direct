// 用于在云端缓存上一次的订单ID，防止重复通知
let lastOrderId = null;

export default async function handler(req, res) {
  try {
    // 1. 真正指向币安“最新操作记录（带单流水）”的官方接口
    const binanceApiUrl = "https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history";
    
    const binanceResponse = await fetch(binanceApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 10,
        portfolioId: "5075281354358777856" // 带单员ID
      })
    });

    const result = await binanceResponse.json();
    
    // 2. 验证数据是否成功拿到
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ success: true, message: "未获取到最新操作记录" });
    }

    // 3. 获取最近的一条操作流水
    const latestOrder = result.data[0];
    
    // 生成一个唯一标识，结合币种、更新时间和成交量
    const currentOrderId = `${latestOrder.symbol}_${latestOrder.updateTime}_${latestOrder.id || ''}`;

    // 4. 判断是否是全新的操作（如果和上次一样，就不发通知）
    if (lastOrderId === currentOrderId) {
      return res.status(200).json({ success: true, message: "操作记录未更新，保持静默" });
    }

    // 5. 判定是新操作，更新缓存ID
    lastOrderId = currentOrderId;

    // 6. 解析具体的操作细节（平仓、开仓、均价、数量等）
    const symbol = latestOrder.symbol; // 币种，如 ETHUSDT
    const side = latestOrder.closed ? "【平仓】" : "【开仓】"; // 判断是开还是平
    const positionSide = latestOrder.positionSide === "LONG" ? "做多 ↗️" : "做空 ↘️"; // 方向
    const entryPrice = latestOrder.entryPrice; // 均价
    const amount = latestOrder.closedVolume || latestOrder.volume; // 成交数量
    const pnl = latestOrder.pnl ? `| 已实现盈亏: ${latestOrder.pnl} USDT` : ""; // 如果是平仓会有盈亏

    // 7. 组装成和你图片上一模一样的通知文本
    const messageContent = `✨ 监测到带单员最新动作：\n• 动作: ${side} ${positionSide}\n• 币种: ${symbol}\n• 均价: ${entryPrice} USDT\n• 数量: ${amount}\n${pnl}`;

    // 8. 推送到钉钉
    const dingTalkUrl = "https://oapi.dingtalk.com/robot/send?access_token=b09f09ed791dfcdbd85523763ff091886966cc0fc50312781170ac63313ef78f";
    
    await fetch(dingTalkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "msgtype": "text",
        "text": { 
          "content": `DT_币安带单监控提醒\n${messageContent}` 
        }
      })
    });

    res.status(200).json({ success: true, message: "发现新操作，已成功推送至钉钉！" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
