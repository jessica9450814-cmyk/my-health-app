require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// --- 路由 ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// 讀取資料
app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_records ORDER BY record_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 新增資料
app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    db.run(`INSERT INTO health_records (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

// 【重點修正】：新增 DELETE 路由
app.delete('/api/health/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM health_records WHERE id = ?`, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "找不到該筆資料" });
        }
        res.status(200).json({ message: "刪除成功" });
    });
});

app.listen(PORT, () => console.log(`伺服器已啟動於 Port: ${PORT}`));