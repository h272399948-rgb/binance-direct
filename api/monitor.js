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
      console.log("❌ 币安接口网络异常，状态码:", binanceResponse.status);
      return res.status(200).json({ success: false, message: "币安异常，静默" });
    }

    const result = await binanceResponse.json();
    
    // 【修改点 1】: 打印币安返回的真实结构，方便排查
    console.log("👀 币安原始返回的 data 结构:", JSON.stringify(result.data).substring(0, 200) + "...");
    
    // 【修改点 2】: 币安带有分页的结构，数据通常在 result.data.list 里面
    const orderList = result.data?.list || result.data; // 兼容不同可能的结构

    // 拦截 1：如果没有数据，直接静默
    if (!orderList || !Array.isArray(orderList) || orderList.length === 0) {
      console.log("⚠️ 无数据或解析失败，静默");
      return res.status(200).json({ success: true, message: "无数据，静默" });
    }

    const latestOrder = orderList[0];
    
    // 【修改点 3】: 有的接口叫 updateTime，有的叫 time，这里打印出来确认一下
    console.log("📦 最新一笔订单数据:", JSON.stringify(latestOrder));
    
    const orderTime = latestOrder.updateTime || latestOrder.time; // 兼容时间字段
    const currentTime = Date.now(); 
    const timeDifference = currentTime - orderTime; 

    // 🌟 拦截 2：如果最新单子是 90 秒前，静默
    if (timeDifference > 90 * 1000) {
      console.log(`⏳ 历史订单 (相差 ${timeDifference / 1000} 秒)，跳过推送`);
      return res.status(200).json({ success: true, message: "历史记录，静默" });
    }

    // 🚀 实时新动作，准备发钉钉
    const symbol = latestOrder.symbol; 
    const side = latestOrder.closed ? "【平仓】" : "【开仓】"; 
    const positionSide = latestOrder.positionSide === "LONG" ? "做多 ↗️" : "做空 ↘️"; 
    const entryPrice = latestOrder.entryPrice || latestOrder.price || "未知"; 
    const amount = latestOrder.closedVolume || latestOrder.volume || "未知"; 
    const pnl = latestOrder.pnl ? `\n• 已实现盈亏: ${latestOrder.pnl} USDT` : ""; 

    const messageContent = `✨ 监测到带单员最新动作：\n• 动作: ${side} ${positionSide}\n• 币种: ${symbol}\n• 均价: ${entryPrice} USDT\n• 数量: ${amount}${pnl}`;

    const dingTalkUrl = "https://oapi.dingtalk.com/robot/send?access_token=b09f09ed791dfcdbd85523763ff091886966cc0fc50312781170ac63313ef78f";
    
    const dingRes = await fetch(dingTalkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "msgtype": "text",
        "text": { "content": `DT_币安带单监控提醒\n${messageContent}` }
      })
    });

    console.log("✅ 钉钉推送结果状态码:", dingRes.status);
    res.status(200).json({ success: true, message: "实时新动作推送成功" });

  } catch (error) {
    // 【修改点 4】: 绝不能让错误石沉大海，必须打印出来
    console.error("💥 代码执行发生异常:", error.message);
    res.status(200).json({ success: false, message: "异常静默" });
  }
}
