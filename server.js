const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
// Render 必須使用 process.env.PORT，否則會啟動失敗
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 連接資料庫
const db = new Database(path.join(__dirname, 'health_data.db'));

// 初始化資料表 (同步寫法)
db.exec(`CREATE TABLE IF NOT EXISTS health_records (
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// --- API ---

// 儲存健康資料
app.post('/api/health', (req, res) => {
    try {
        const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
        const stmt = db.prepare(`INSERT INTO health_records (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const info = stmt.run(date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement);
        res.status(201).json({ message: "資料儲存成功！", id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 讀取健康資料
app.get('/api/health', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM health_records ORDER BY record_date DESC").all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 刪除健康資料
app.delete('/api/health/:id', (req, res) => {
    try {
        const stmt = db.prepare("DELETE FROM health_records WHERE id = ?");
        stmt.run(req.params.id);
        res.json({ message: "刪除成功" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器已啟動，監聽 Port: ${PORT}`);
});