// 引入必要的套件
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定 API Key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// --- AI 諮詢 API ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "你是專業的居家健康照護助手。回答要溫暖、清晰。若有緊急狀況（如胸痛、呼吸困難），務必建議立即就醫。不要提供正式醫療診斷。" },
                { role: "user", content: message }
            ],
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI 服務暫時無法回應" });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器已啟動，監聽 Port: ${PORT}`);
});