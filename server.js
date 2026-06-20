// 確保最先載入環境變數
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 【修正重點】：同時檢查兩個變數名稱，確保 Render 能讀到
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

// 如果 API 金鑰仍然是空的，在這裡印出詳細的檢查資訊
if (!apiKey) {
    console.error("警告：環境變數 GEMINI_API_KEY 或 API_KEY 均未被讀取到！");
}

const genAI = new GoogleGenerativeAI(apiKey || "MISSING");

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

// --- AI 諮詢 API ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        if (!apiKey || apiKey === "MISSING") {
            return res.status(500).json({ error: "伺服器環境變數未正確載入 API Key。" });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`你是專業居家健康照護助手。問題：${message}`);
        res.json({ reply: result.response.text() });
    } catch (error) {
        console.error("【最終排錯】 Gemini Error:", error.message);
        res.status(500).json({ error: `AI 服務錯誤: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動於 Port: ${PORT}`));