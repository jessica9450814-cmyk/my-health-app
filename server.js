require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(__dirname));

// 資料庫連接與初始化
const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'));
db.run(`CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    heart_rate INTEGER NOT NULL,
    took_medicine BOOLEAN DEFAULT 1,
    discomfort TEXT,
    bowel_movement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// --- 路由 ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- AI 諮詢 API (動態模型搜尋版) ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("API Key 未設定");

        // 自動取得可用模型列表
        const modelList = await genAI.listModels();
        // 篩選出支援 generateContent 的模型，並優先選擇 pro 或 flash 版本
        const availableModel = modelList.models.find(m => 
            m.supportedGenerationMethods.includes("generateContent") && 
            (m.name.includes("gemini-1.5") || m.name.includes("gemini-pro"))
        );

        if (!availableModel) throw new Error("找不到支援的模型");

        const model = genAI.getGenerativeModel({ model: availableModel.name });
        const prompt = `你是專業的居家健康照護助手。回答要溫暖、清晰。若有緊急狀況（如胸痛、呼吸困難），務必建議立即就醫。不要提供正式醫療診斷。使用者問題：${message}`;
        
        const result = await model.generateContent(prompt);
        res.json({ reply: result.response.text() });
    } catch (error) {
        console.error("Gemini Error:", error.message);
        res.status(500).json({ error: "AI 服務無法回應，請檢查 API 權限或金鑰。" });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動，監聽 Port: ${PORT}`));