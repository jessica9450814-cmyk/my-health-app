require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 Gemini (確保 Key 正確)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'));

// --- AI 諮詢 API (最簡潔版) ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        // 直接使用 gemini-1.5-flash，這是目前 Google 最推薦的輕量模型
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `你是專業的居家健康照護助手。回答要溫暖、清晰。若有緊急狀況（如胸痛、呼吸困難），務必建議立即就醫。不要提供正式醫療診斷。使用者問題：${message}`;
        
        const result = await model.generateContent(prompt);
        res.json({ reply: result.response.text() });
    } catch (error) {
        console.error("Gemini Error:", error.message);
        res.status(500).json({ error: "AI 服務無法回應，請確認 API Key 權限。" });
    }
});

// 資料庫與其他路由省略 (保持與你原本的一樣即可)
app.listen(PORT, () => console.log(`伺服器已啟動: ${PORT}`));