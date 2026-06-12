const axios = require('axios');

async function runMonitor() {
  try {
    const dingTalkUrl = process.env.DINGTALK_WEBHOOK;
    
    // 使用一个通用的网页版 API 或页面爬取逻辑
    // 这里的 User-Agent 伪装成了 Chrome 浏览器
    const response = await axios.get("https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history?portfolioId=5075281354358777856", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.binance.com/"
      }
    });

    const data = response.data?.data?.list?.[0];
    if (!data) {
      console.log("未获取到数据");
      return;
    }

    const message = `DT_监控更新\n动作: ${data.closed ? "平仓" : "开仓"}\n币种: ${data.symbol}\n价格: ${data.entryPrice}`;
    
    await axios.post(dingTalkUrl, {
      msgtype: "text",
      text: { content: message }
    });
    
    console.log("推送成功");
  } catch (error) {
    console.error("执行出错:", error.message);
  }
}

runMonitor();
