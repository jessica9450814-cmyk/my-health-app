require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

// 統一使用絕對路徑指向 health_data.db
const dbPath = path.resolve(__dirname, 'health_data.db');
console.log(`[DB] 使用資料庫：${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] 連線失敗：', err.message);
        process.exit(1); // 連不到資料庫就直接停止，不要讓 server 假裝正常運行
    }
    console.log('[DB] 連線成功');
});

// 初始化資料表
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
)`, (err) => {
    if (err) console.error('[DB] 建立資料表失敗：', err.message);
    else console.log('[DB] 資料表確認完成');
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

app.get('/api/health', (req, res) => {
    db.all("SELECT * FROM health_data ORDER BY record_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/health', (req, res) => {
    const { date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement } = req.body;
    db.run(
        `INSERT INTO health_data (record_date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, systolic, diastolic, heart_rate, took_medicine, discomfort, bowel_movement],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        }
    );
});

app.delete('/api/health/:id', (req, res) => {
    db.run(`DELETE FROM health_data WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "刪除成功" });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`[Server] 啟動於 ${url}`);

    // 自動開啟瀏覽器（Windows/Mac/Linux 都支援）
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32' ? `start ${url}`
              : process.platform === 'darwin' ? `open ${url}`
              : `xdg-open ${url}`;
    exec(cmd);
});
