require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 強制確保 apiKey 存在
const apiKey = process.env.GEMINI_API_KEY;

// 2. 初始化 Gemini
const genAI = new GoogleGenerativeAI(apiKey || "MISSING_KEY");

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'));

// 初始化資料庫
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

// 路由
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- AI 諮詢 API (診斷模式) ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    // 診斷檢查
    if (!apiKey) return res.status(500).json({ error: "伺服器環境變數未偵測到 GEMINI_API_KEY" });

    try {
        // 使用 gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(message);
        res.json({ reply: result.response.text() });
    } catch (error) {
        // 直接將 Google 回傳的錯誤完整回傳給前端，方便你判斷
        console.error("【詳細錯誤】:", error);
        res.status(500).json({ 
            error: "Gemini API 拒絕回應", 
            details: error.message,
            hint: "若錯誤為 404，請確認此 API Key 是否已於 Google AI Studio 正確啟動" 
        });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動於 Port: ${PORT}`));