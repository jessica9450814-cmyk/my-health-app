-require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 讀取金鑰，若讀不到會直接在 Log 報錯
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("【關鍵錯誤】環境變數 GEMINI_API_KEY 未找到！");

const genAI = new GoogleGenerativeAI(apiKey || "INVALID_KEY");

app.use(express.json());
app.use(express.static(path.join(__dirname))); 

const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'));

// 資料庫初始化
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

// API 區塊
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

// AI API：改用 gemini-1.5-flash，並確保路徑完整
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        if (!apiKey) throw new Error("API Key 未設定");
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(message);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (error) {
        // 這會輸出詳細的錯誤資訊，請檢查 Render 的 Logs
        console.error("【Gemini API Error Detail】:", error);
        res.status(500).json({ error: `API 呼叫失敗: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動於 Port: ${PORT}`));