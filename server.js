const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname)); 

const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'));

// 路由設定
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API 路由
app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    const stmt = db.prepare("INSERT INTO health_data (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?,?,?,?,?,?,?)");
    stmt.run([date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement], (err) => {
        if (err) {
            console.error("寫入錯誤:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ status: 'ok' });
    });
    stmt.finalize();
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));