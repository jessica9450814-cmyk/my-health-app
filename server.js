require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname))); 

// 使用絕對路徑
const dbPath = path.join(process.cwd(), 'health_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("資料庫連線失敗:", err.message);
    else console.log("資料庫已連接，儲存位置:", dbPath);
});

// 初始化資料庫 (確保表名為 health_data)
db.run(`CREATE TABLE IF NOT EXISTS health_data (
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

// 讀取資料 (對接 health_data 表)
app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_data ORDER BY record_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 新增資料 (對接 health_data 表)
app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    const sql = `INSERT INTO health_data (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], function(err) {
        if (err) {
            console.error("寫入失敗:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

// 刪除路由 (對接 health_data 表)
app.delete('/api/health/:id', (req, res) => {
    db.run(`DELETE FROM health_data WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "刪除成功" });
    });
});

app.listen(PORT, '0.0.0.0', () => console.log(`伺服器已啟動於 Port:${PORT}`));