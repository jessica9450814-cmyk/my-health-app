const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
// 確保靜態檔案路徑是絕對路徑
app.use(express.static(__dirname));

// 資料庫連接
const dbPath = path.join(__dirname, 'health_data.db');
const db = new sqlite3.Database(dbPath);

// 路由：確保 dashboard 能被找到
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// API 路由
app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    db.run(`INSERT INTO health_data (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ status: 'success' });
    });
});

app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_data", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on ${PORT}`));