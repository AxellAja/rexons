const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Mengubah status akun xERO menjadi 1 (Kreator)
db.run("UPDATE users SET is_creator = 1 WHERE username = 'xERO'", function(err) {
    if (err) {
        console.log("❌ Gagal:", err.message);
    } else {
        console.log("✅ Berhasil! Akun xERO sekarang sudah menjadi Kreator.");
    }
});