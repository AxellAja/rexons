const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'rexons-rahasia-super-aman',
    resave: false, saveUninitialized: false, cookie: { secure: false }
}));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage }).fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

// --- SETUP DATABASE ---
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS rexons_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT, short_desc TEXT, edition TEXT, category TEXT, version TEXT, 
        file_name TEXT, image_name TEXT, downloads INTEGER DEFAULT 0
    )`);
    db.run("ALTER TABLE rexons_projects ADD COLUMN file_name TEXT", () => {}); 
    db.run("ALTER TABLE rexons_projects ADD COLUMN image_name TEXT", () => {}); 

    // TABEL USERS (DITAMBAH KOLOM is_premium)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        is_creator INTEGER DEFAULT 0, download_count INTEGER DEFAULT 0, last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_premium INTEGER DEFAULT 0
    )`);
    db.run("ALTER TABLE users ADD COLUMN extra_limit INTEGER DEFAULT 0", () => {}); 
    db.run("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0", () => {}); 

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, username TEXT, comment_text TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- PENGIRIM EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'mzuhrulmilal@gmail.com', pass: 'srtb fexm yrks phep' }
});

const otpStorage = {}; 

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
        if (row) return res.status(400).json({ error: 'Username atau Email sudah terdaftar!' });
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await bcrypt.hash(password, 10);
        otpStorage[email] = { username, email, password: hashedPassword, otpCode };
        transporter.sendMail({
            from: '"Rexons System" <no-reply@rexons.com>', to: email, subject: 'Kode OTP Registrasi',
            html: `<div style="text-align: center; padding: 20px;"><h2>Halo ${username}!</h2><h1>${otpCode}</h1></div>`
        }, (err) => {
            if (err) return res.status(500).json({ error: 'Gagal mengirim email.' });
            res.json({ success: true, step: 'otp_sent', message: 'Kode OTP dikirim ke Email!' });
        });
    });
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const pendingUser = otpStorage[email];
    if (!pendingUser || pendingUser.otpCode !== otp) return res.status(400).json({ error: 'Sesi kedaluwarsa atau OTP salah!' });
    db.run('INSERT INTO users (username, email, password, is_creator, download_count, last_reset, is_premium) VALUES (?, ?, ?, 0, 0, ?, 0)', 
    [pendingUser.username, pendingUser.email, pendingUser.password, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: 'Gagal membuat akun.' });
        delete otpStorage[email]; res.json({ success: true, message: 'Akun diverifikasi! Silakan Login.' });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Username atau sandi salah!' });
        req.session.userId = user.id; req.session.username = user.username; req.session.isCreator = user.is_creator;
        res.json({ success: true });
    });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

// API STATUS MENGIRIMKAN DATA PREMIUM
app.get('/api/auth/status', (req, res) => { 
    if (!req.session.userId) return res.json({ loggedIn: false });
    db.get('SELECT is_creator, is_premium FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if(err || !user) return res.json({ loggedIn: false });
        res.json({ loggedIn: true, username: req.session.username, isCreator: user.is_creator === 1, isPremium: user.is_premium === 1 });
    });
});

app.post('/api/upload', upload, (req, res) => {
    if (!req.session.userId || req.session.isCreator !== 1) return res.status(403).json({ error: 'Akses ditolak. Hanya kreator!' });
    const { title, short_desc, edition, category, version } = req.body;
    const author = req.session.username;
    const image_name = req.files['image'] ? req.files['image'][0].filename : null;
    const file_name = req.files['file'] ? req.files['file'][0].filename : null;
    if (!file_name || !image_name) return res.status(400).json({ error: 'File mod dan banner wajib diunggah!' });

    db.run(`INSERT INTO rexons_projects (title, author, short_desc, edition, category, version, file_name, image_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
    [title, author, short_desc, edition, category, version, file_name, image_name], function(err) {
        if (err) return res.status(500).json({ error: 'Gagal menyimpan ke database' });
        res.json({ success: true, message: 'Karya berhasil dipublikasikan!' });
    });
});

// API KOMENTAR (DIJOIN DENGAN TABEL USERS UNTUK MENGECEK STATUS PREMIUM KOMENTATOR)
app.get('/api/projects/:id/comments', (req, res) => {
    const sql = `SELECT c.*, u.is_premium FROM comments c LEFT JOIN users u ON c.username = u.username WHERE c.project_id = ? ORDER BY c.created_at DESC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Gagal memuat komentar.' }); res.json(rows || []);
    });
});
app.post('/api/projects/:id/comments', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Kamu harus login untuk berkomentar!' });
    const { text } = req.body;
    if (!text || text.trim() === '') return res.status(400).json({ error: 'Komentar kosong!' });
    db.run("INSERT INTO comments (project_id, username, comment_text) VALUES (?, ?, ?)", [req.params.id, req.session.username, text], function(err) {
        if (err) return res.status(500).json({ error: 'Gagal mengirim komentar.' }); res.json({ success: true });
    });
});

// --- API UNDUHAN (SUDAH MENDUKUNG UNLIMITED PREMIUM) ---
function getActualDownloadCount(user) {
    const now = new Date(); const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0);
    if (now < resetTime) resetTime.setDate(resetTime.getDate() - 1);
    const lastReset = new Date(user.last_reset);
    if (lastReset < resetTime) return 0;
    return user.download_count;
}

app.post('/api/projects/:id/download', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'HARUS_LOGIN' });

    db.get('SELECT file_name FROM rexons_projects WHERE id = ?', [req.params.id], (err, project) => {
        if (err || !project) return res.status(404).json({ error: 'Karya tidak ditemukan.' });

        db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err || !user) return res.status(500).json({ error: 'Server error' });
            const fileUrl = project.file_name ? `/uploads/${project.file_name}` : null;

            // LOGIKA 1: JIKA USER PREMIUM -> LANGSUNG BERIKAN FILE TANPA CEK LIMIT
            if (user.is_premium === 1) {
                db.run('UPDATE rexons_projects SET downloads = downloads + 1 WHERE id = ?', [req.params.id]);
                return res.json({ success: true, remaining: '∞', type: 'Premium', file_url: fileUrl });
            }

            // LOGIKA 2: JIKA USER BIASA -> CEK LIMIT HARIAN
            const currentDownloads = getActualDownloadCount(user);
            if (currentDownloads >= 10) {
                return res.status(403).json({ error: 'LIMIT_HABIS' });
            } else {
                const newCount = currentDownloads + 1;
                db.run('UPDATE users SET download_count = ?, last_reset = ? WHERE id = ?', [newCount, new Date().toISOString(), user.id], () => {
                    db.run('UPDATE rexons_projects SET downloads = downloads + 1 WHERE id = ?', [req.params.id]);
                    res.json({ success: true, remaining: 10 - newCount, type: 'Harian', file_url: fileUrl });
                });
            }
        });
    });
});

app.get('/api/projects', (req, res) => {
    const { search, edition, category } = req.query;
    let query = "SELECT * FROM rexons_projects WHERE 1=1"; let params = [];
    if (search) { query += " AND title LIKE ?"; params.push(`%${search}%`); }
    if (edition && edition !== 'All') { query += " AND edition = ?"; params.push(edition); }
    if (category && category !== 'All') { query += " AND category = ?"; params.push(category); }
    query += " ORDER BY id DESC"; 
    db.all(query, params, (err, rows) => { res.json(rows || []); });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server berjalan di port ${PORT}`));