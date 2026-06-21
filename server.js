require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname)); 

// 強制鎖定檔案為根目錄下的 health_data.db
const dbPath = path.resolve(__dirname, 'health_data.db');
const db = new sqlite3.Database(dbPath);

// 初始化資料庫 (確保欄位對應)
db.run(`CREATE TABLE IF NOT EXISTS health_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date TEXT,
    systolic INTEGER,
    diastolic INTEGER,
    heart_rate INTEGER,
    took_medicine INTEGER,
    discomfort TEXT,
    bowel_movement TEXT
)`);

app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_data ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    const sql = `INSERT INTO health_data (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], function(err) {
        if (err) {
            console.error("寫入錯誤:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/health/:id', (req, res) => {
    db.run(`DELETE FROM health_data WHERE id = ?`, req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true });
    });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Running on port ${PORT}`));