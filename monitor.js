const axios = require('axios');

async function runMonitor() {
  try {
    const dingTalkUrl = process.env.DINGTALK_WEBHOOK;
    
    // 模拟真实浏览器访问，包含必要的 Referer 和浏览器指纹
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Referer": "https://www.binance.com/zh-CN/copy-trading/lead-details/5075281354358777856",
      "Origin": "https://www.binance.com",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Connection": "keep-alive"
    };

    const response = await axios.get("https://www.binance.com/bapi/futures/v1/public/future/copy-trading/lead-portfolio/position-history?portfolioId=5075281354358777856", {
      headers: headers
    });

    const data = response.data?.data?.list?.[0];
    if (!data) {
      console.log("服务器返回数据为空");
      return;
    }

    // 必须包含关键词 DT
    const message = `DT_监控更新\n动作: ${data.closed ? "平仓" : "开仓"}\n币种: ${data.symbol}\n价格: ${data.entryPrice}\n时间: ${new Date(data.updateTime).toLocaleString()}`;
    
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
