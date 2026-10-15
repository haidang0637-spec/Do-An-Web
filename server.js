// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Phục vụ các file tĩnh (html, css, js) trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình kết nối MySQL tới XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'haidang_fly_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('✅ Đã kết nối tới Database haidang_fly_db thành công!');
        db.query("ALTER TABLE flights ADD COLUMN price INT DEFAULT 0", (err) => { 
        if(!err) console.log("🛠️ Đã tự động vá lỗi thiếu cột price trong CSDL!"); 
    });
});

// ==========================================
// API DÀNH CHO KHÁCH HÀNG (CLIENT)
// ==========================================

// 1. Lấy danh sách chuyến bay
app.get('/api/flights', (req, res) => {
    const { from, to } = req.query;
    // Dùng alias (AS) để đồng bộ dữ liệu với Frontend
    let sql = "SELECT id, flight_code, departure_city AS departure, arrival_city AS destination, departure_time, price FROM flights WHERE 1=1";
    let params = [];
    
    if (from) { 
        sql += " AND departure_city LIKE ?"; 
        params.push(`%${from}%`); 
    }
    if (to) { 
        sql += " AND arrival_city LIKE ?"; 
        params.push(`%${to}%`); 
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Lỗi khi lấy danh sách chuyến bay:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 2. Tạo Booking mới (Đặt vé)
app.post('/api/bookings', (req, res) => {
    const { flight_id, passenger_name, passenger_phone, seat_type, total_price } = req.body;
    const booking_code = 'HDF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const sql = "INSERT INTO bookings (flight_id, booking_code, passenger_name, passenger_phone, seat_type, total_price) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [flight_id, booking_code, passenger_name, passenger_phone, seat_type, total_price], (err, result) => {
        if (err) {
            console.error("Lỗi khi đặt vé:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, booking_code });
    });
});

// 3. Gửi liên hệ/góp ý
app.post('/api/contacts', (req, res) => {
    const { name, email, subject, message } = req.body;
    const sql = "INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, subject, message], (err, result) => {
        if (err) {
            console.error("Lỗi khi gửi liên hệ:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});


// ==========================================
// API DÀNH CHO ADMIN (QUẢN TRỊ VIÊN)
// ==========================================

// 4. Lấy toàn bộ danh sách Đặt vé (Admin)
app.get('/api/admin/bookings', (req, res) => {
    const sql = `
        SELECT b.*, f.flight_code 
        FROM bookings b 
        JOIN flights f ON b.flight_id = f.id 
        ORDER BY b.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách booking:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 5. Lấy toàn bộ danh sách Liên hệ (Admin)
app.get('/api/admin/contacts', (req, res) => {
    db.query("SELECT * FROM contacts ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách liên hệ:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 6. Xóa chuyến bay (Admin)
app.delete('/api/flights/:id', (req, res) => {
    db.query("DELETE FROM flights WHERE id = ?", [req.params.id], (err) => {
        if (err) {
            console.error("Lỗi khi xóa chuyến bay:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// 7. Thêm chuyến bay mới (Admin)
app.post('/api/flights', (req, res) => {
    const { flight_code, departure, destination, departure_time, price } = req.body;
    
    // Tên cột phải khớp chính xác với CSDL (departure_city, arrival_city)
    const sql = "INSERT INTO flights (flight_code, departure_city, arrival_city, departure_time, price) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [flight_code, departure, destination, departure_time, price], (err, result) => {
        if (err) {
            console.error("❌ LỖI KHI THÊM CHUYẾN BAY:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Thêm thành công", id: result.insertId });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy mượt mà tại http://localhost:${PORT}`);
});
