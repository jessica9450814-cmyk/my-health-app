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

// 連接資料庫
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

// --- 頁面路由 ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- 資料庫 API ---
app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    db.run(`INSERT INTO health_records (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_records ORDER BY record_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- AI 諮詢 API (Gemini 版) ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY 未在環境變數中設定");
        }
        
        // 修正模型名稱路徑
      // 將原本的 const model = ... 那一行替換為：
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        const prompt = `你是專業的居家健康照護助手。回答要溫暖、清晰。若有緊急狀況（如胸痛、呼吸困難），務必建議立即就醫。不要提供正式醫療診斷。使用者問題：${message}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (error) {
        console.error("Gemini Error Details:", error.message);
        res.status(500).json({ error: "AI 服務無法回應，請確認 API Key 是否正確且有足夠權限。" });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動，監聽 Port: ${PORT}`));