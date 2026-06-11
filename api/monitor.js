// 在云端缓存上一次的订单唯一标识，防止重复通知
let lastOrderId = null;

export default async function handler(req, res) {
  try {
    // 币安“最新操作记录（带单流水）”官方公开接口
    const binanceApiUrl = "https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history";
    
    const binanceResponse = await fetch(binanceApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "clienttype": "web",
        "lang": "zh-CN",
        "Origin": "https://www.binance.com",
        "Referer": "https://www.binance.com/"
      },
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 10,
        portfolioId: "5075281354358777856" // 带单员ID
      })
    });

    // 币安接口异常处理
    if (!binanceResponse.ok) {
      return res.status(200).json({ success: false, message: "币安接口响应异常，保持静默" });
    }

    const result = await binanceResponse.json();
    
    // 如果带单员暂无任何历史操作记录，直接静默退出
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ success: true, message: "暂无历史操作，保持静默" });
    }

    // 获取最近的一条最新操作流水
    const latestOrder = result.data[0];
    
    // 结合币种、更新时间和订单状态生成全球唯一 ID 标识
    const currentOrderId = `${latestOrder.symbol}_${latestOrder.updateTime}_${latestOrder.id || ''}`;

    // 核心拦截：如果当前最新操作的 ID 和上一次记录的完全一致，说明带单员没动，直接静默退出
    if (lastOrderId === currentOrderId) {
      return res.status(200).json({ success: true, message: "操作记录未更新，保持静默" });
    }

    // 如果运行到这里，说明带单员触发了全新操作，立刻将新 ID 存入脑海中
    lastOrderId = currentOrderId;

    // 解析具体的单子细节
    const symbol = latestOrder.symbol; // 币种 (如 ETHUSDT)
    const side = latestOrder.closed ? "【平仓】" : "【开仓】"; // 开仓还是平仓
    const positionSide = latestOrder.positionSide === "LONG" ? "做多 ↗️" : "做空 ↘️"; // 仓位方向
    const entryPrice = latestOrder.entryPrice; // 成交均价
    const amount = latestOrder.closedVolume || latestOrder.volume; // 成交数量
    const pnl = latestOrder.pnl ? `\n• 已实现盈亏: ${latestOrder.pnl} USDT` : ""; // 平仓单才会显示盈亏

    // 组装钉钉群文本（完全对齐操作流水）
    const messageContent = `✨ 监测到带单员最新动作：\n• 动作: ${side} ${positionSide}\n• 币种: ${symbol}\n• 均价: ${entryPrice} USDT\n• 数量: ${amount}${pnl}`;

    // 发送请求到你的钉钉群机器人
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

    res.status(200).json({ success: true, message: "发现新动作，已成功推送至钉钉！" });
  } catch (error) {
    res.status(200).json({ success: false, error: "系统捕获异常，保持静默" });
  }
}
