export default async function handler(req, res) {
  try {
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
        pageSize: 5,
        portfolioId: "5075281354358777856" // 带单员ID
      })
    });

    if (!binanceResponse.ok) {
      return res.status(200).json({ success: false, message: "币安接口异常，保持静默" });
    }

    const result = await binanceResponse.json();
    
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ success: true, message: "无操作记录，保持静默" });
    }

    // 获取最近的一条最新操作流水
    const latestOrder = result.data[0];
    
    // ⏱️ 核心时间拦截逻辑
    const orderTime = latestOrder.updateTime; // 币安返回的操作时间戳（毫秒）
    const currentTime = Date.now(); // 当前服务器时间戳（毫秒）
    const timeDifference = currentTime - orderTime; // 算出这笔操作距离现在过去了多久

    // 🌟 如果这笔单子距离现在已经超过了 90 秒（1.5分钟），说明是老历史记录，绝对不发通知！
    if (timeDifference > 90 * 1000) {
      return res.status(200).json({ success: true, message: `最新操作已过去 ${Math.round(timeDifference/1000)} 秒，属于历史记录，保持静默` });
    }

    // 🚀 如果运行到这里，说明操作是在 90 秒内新鲜出炉的，立刻发送钉钉！
    const symbol = latestOrder.symbol; 
    const side = latestOrder.closed ? "【平仓】" : "【开仓】"; 
    const positionSide = latestOrder.positionSide === "LONG" ? "做多 ↗️" : "做空 ↘️"; 
    const entryPrice = latestOrder.entryPrice; 
    const amount = latestOrder.closedVolume || latestOrder.volume; 
    const pnl = latestOrder.pnl ? `\n• 已实现盈亏: ${latestOrder.pnl} USDT` : ""; 

    const messageContent = `✨ 监测到带单员最新动作：\n• 动作: ${side} ${positionSide}\n• 币种: ${symbol}\n• 均价: ${entryPrice} USDT\n• 数量: ${amount}${pnl}`;

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

    res.status(200).json({ success: true, message: "发现实时新动作，已成功推送！" });
  } catch (error) {
    res.status(200).json({ success: false, error: "系统异常，保持静默" });
  }
}
