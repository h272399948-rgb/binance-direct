// 简化版 monitor.js (适配 GitHub Actions)
const axios = require('axios');

async function runMonitor() {
  try {
    const binanceApiUrl = "https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history";
    const dingTalkUrl = process.env.DINGTALK_WEBHOOK;

    if (!dingTalkUrl) {
      console.log("错误：未配置 DINGTALK_WEBHOOK");
      return;
    }

    const response = await axios.post(binanceApiUrl, {
      pageNumber: 1,
      pageSize: 1,
      portfolioId: "5075281354358777856"
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const data = response.data?.data?.list?.[0];
    if (!data) {
      console.log("无数据返回");
      return;
    }

    // 构建消息，包含关键词 DT
    const message = `DT_监控提醒\n动作: ${data.closed ? "平仓" : "开仓"}\n币种: ${data.symbol}\n价格: ${data.entryPrice}`;
    
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
