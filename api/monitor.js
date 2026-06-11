let lastOrderId = null;

export default async function handler(req, res) {
  try {
    const binanceApiUrl = "https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history";
    
    const binanceResponse = await fetch(binanceApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 👇 下面这几行是核心伪装，完美模拟币安网页前端的真实请求
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "clienttype": "web",
        "lang": "zh-CN",
        "Origin": "https://www.binance.com",
        "Referer": "https://www.binance.com/"
      },
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 10,
        portfolioId: "5075281354358777856"
      })
    });

    // 如果币安返回了非 200 的错误（比如 401），把错误打印出来方便看
    if (!binanceResponse.ok) {
      const errText = await binanceResponse.text();
      return res.status(binanceResponse.status).json({ success: false, error: `币安接口拒绝: ${binanceResponse.status} - ${errText}` });
    }

    const result = await binanceResponse.json();
    
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ success: true, message: "未获取到最新操作记录" });
    }

    const latestOrder = result.data[0];
    const currentOrderId = `${latestOrder.symbol}_${latestOrder.updateTime}_${latestOrder.id || ''}`;

    if (lastOrderId === currentOrderId) {
      return res.status(200).json({ success: true, message: "操作记录未更新，保持静默" });
    }

    lastOrderId = currentOrderId;

    const symbol = latestOrder.symbol; 
    const side = latestOrder.closed ? "【平仓】" : "【开仓】"; 
    const positionSide = latestOrder.positionSide === "LONG" ? "做多 ↗️" : "做空 ↘️"; 
    const entryPrice = latestOrder.entryPrice; 
    const amount = latestOrder.closedVolume || latestOrder.volume; 
    const pnl = latestOrder.pnl ? `| 已实现盈亏: ${latestOrder.pnl} USDT` : ""; 

    const messageContent = `✨ 监测到带单员最新动作：\n• 动作: ${side} ${positionSide}\n• 币种: ${symbol}\n• 均价: ${entryPrice} USDT\n• 数量: ${amount}\n${pnl}`;

    const dingTalkUrl = "https://oapi.dingtalk.com/robot/send?access_token=b09f09ed791dfcdbd85523763ff091886966cc0fc50312781170ac63313ef78f";
    
    await fetch(dingTalkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "msgtype": "text",
        "text": { "content": `DT_币安带单监控提醒\n${messageContent}` }
      })
    });

    res.status(200).json({ success: true, message: "发现新操作，已成功推送至钉钉！" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
