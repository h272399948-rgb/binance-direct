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
        portfolioId: "5075281354358777856"
      })
    });

    if (!binanceResponse.ok) {
      return res.status(200).json({ success: false, message: "接口异常，静默" });
    }

    const result = await binanceResponse.json();
    
    // 🌟 核心拦截 1：如果币安返回的数据是空的，直接静默退出，绝对不调用钉钉！
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ success: true, message: "暂无数据" });
    }

    const latestOrder = result.data[0];
    const orderTime = latestOrder.updateTime; 
    const currentTime = Date.now(); 
    const timeDifference = currentTime - orderTime; 

    // 🌟 核心拦截 2：如果这笔操作是 90 秒之前发生的旧历史，直接静默退出，绝对不调用钉钉！
    if (timeDifference > 90 * 1000) {
      return res.status(200).json({ success: true, message: "历史记录，静默" });
    }

    // 🚀 只有通过了上面两重重开、重重的拦截，属于 90 秒内刚发生的全新交易，才会执行下面的钉钉发送！
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
        "text": { "content": `DT_币安带单监控提醒\n${messageContent}` }
      })
    });

    res.status(200).json({ success: true, message: "新动作已推送" });
  } catch (error) {
    res.status(200).json({ success: false, message: "日常异常静默" });
  }
}
