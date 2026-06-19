const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// --- PENGATURAN PEMBELI ---
const targetUsername = 'xERO'; // Ganti dengan username pembeli premium

// Mengubah status akun menjadi Premium (is_premium = 1)
db.run("UPDATE users SET is_premium = 1 WHERE username = ?", [targetUsername], function(err) {
    if (err) {
        console.log("❌ Gagal:", err.message);
    } else if (this.changes === 0) {
        console.log(`❌ Username '${targetUsername}' tidak ditemukan di database.`);
    } else {
        console.log(`👑 BERHASIL! Akun '${targetUsername}' sekarang adalah pengguna PREMIUM!`);
    }
});