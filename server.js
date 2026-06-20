require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// 確保安裝了正確的套件: npm install @google/generative-ai
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 Gemini (請確保 Render 的環境變數 GEMINI_API_KEY 是有效的 AIza... 開頭)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname))); 

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

// 路由
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- AI 諮詢 API (最穩定的呼叫方式) ---
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        // 使用 gemini-1.5-flash，這是目前效能與費用最好的模型
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `你是專業的居家健康照護助手。回答要溫暖、清晰。若有緊急狀況（如胸痛、呼吸困難），務必建議立即就醫。不要提供正式醫療診斷。使用者問題：${message}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ reply: response.text() });
        
    } catch (error) {
        console.error("Gemini API 錯誤:", error);
        // 如果還是 404，這裡會噴出詳細資訊，方便你在 Render Logs 查看
        res.status(500).json({ error: "AI 服務目前無法回應，請確認 API Key 有效且已啟用 Gemini API。" });
    }
});

app.listen(PORT, () => console.log(`伺服器已啟動於 Port: ${PORT}`));