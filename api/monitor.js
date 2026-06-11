export default async function handler(req, res) {
  try {
    const binanceApiUrl = "https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history";
    
    const requestBody = {
      pageNumber: 1,
      pageSize: 10,
      portfolioId: "5075281354358777856"
    };

    const binanceResponse = await fetch(binanceApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await binanceResponse.json();
    
    let messageContent = "未获取到最新持仓数据";
    if (data.data && data.data.length > 0) {
      const latestOrders = data.data.slice(0, 3).map(order => {
        return `• 币种: ${order.symbol} | 方向: ${order.positionSide} | 收益率: ${order.roi ? (order.roi * 100).toFixed(2) + '%' : '进行中'}`;
      }).join("\n");
      
      messageContent = `最新操作历史:\n${latestOrders}`;
    }

    const dingTalkUrl = "https://oapi.dingtalk.com/robot/send?access_token=b09f09ed791dfcdbd85523763ff091886966cc0fc50312781170ac63313ef78f";
    
    await fetch(dingTalkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "msgtype": "text",
        "text": { "content": `DT_币安带单监控提醒\n${messageContent}` }
      })
    });

    res.status(200).json({ success: true, message: "已成功直连币安后台并同步至钉钉！" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
