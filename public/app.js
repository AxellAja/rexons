const projectGrid = document.getElementById('projectGrid');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const resultCount = document.getElementById('resultCount');

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authModeInput = document.getElementById('authMode');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const modalTitle = document.getElementById('modalTitle');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const authToggleText = document.getElementById('authToggleText');
const standardInputs = document.getElementById('standardInputs');
const emailGroup = document.getElementById('emailGroup');
const otpGroup = document.getElementById('otpGroup');

const openUploadBtn = document.getElementById('openUploadBtn');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const uploadForm = document.getElementById('uploadForm');

const commentModal = document.getElementById('commentModal');
const closeCommentModalBtn = document.getElementById('closeCommentModalBtn');
const commentList = document.getElementById('commentList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentTitle = document.getElementById('commentTitle');
let currentCommentProjectId = null;
let currentProjectsData = [];

let currentEdition = 'All'; let currentCategory = 'All'; let currentSearch = ''; let currentPendingEmail = ''; 

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.loggedIn) {
            document.getElementById('authButtons').style.display = 'none';
            document.getElementById('userProfile').style.display = 'flex';
            
            const nameEl = document.getElementById('displayUsername');
            nameEl.textContent = data.username;
            
            // LOGIKA EFEK NAMA EMAS
            if (data.isPremium) {
                nameEl.classList.add('premium-text');
                nameEl.innerHTML = `${data.username} <span class="premium-badge">👑</span>`;
            } else {
                nameEl.classList.remove('premium-text');
            }

            if (data.isCreator) {
                openUploadBtn.style.display = 'block'; document.getElementById('verifiedBadge').style.display = 'inline-block';
            } else {
                openUploadBtn.style.display = 'none'; document.getElementById('verifiedBadge').style.display = 'none';
            }
        } else {
            document.getElementById('authButtons').style.display = 'flex'; document.getElementById('userProfile').style.display = 'none';
        }
    } catch (error) { console.error(error); }
}

toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault(); standardInputs.style.display = 'block'; otpGroup.style.display = 'none';
    if (authModeInput.value === 'login') {
        authModeInput.value = 'register'; modalTitle.textContent = 'Daftar Akun Baru';
        authSubmitBtn.textContent = 'Kirim OTP'; emailGroup.style.display = 'block'; document.getElementById('email').required = true;
        authToggleText.textContent = 'Sudah punya akun?'; toggleAuthMode.textContent = 'Login di sini';
    } else {
        authModeInput.value = 'login'; modalTitle.textContent = 'Masuk ke Rexons';
        authSubmitBtn.textContent = 'Login'; emailGroup.style.display = 'none'; document.getElementById('email').required = false;
        authToggleText.textContent = 'Belum punya akun?'; toggleAuthMode.textContent = 'Daftar Sekarang';
    }
});
document.getElementById('openLoginBtn').addEventListener('click', () => { if (authModeInput.value !== 'login') toggleAuthMode.click(); authModal.style.display = 'flex'; });
document.getElementById('openRegisterBtn').addEventListener('click', () => { if (authModeInput.value !== 'register') toggleAuthMode.click(); authModal.style.display = 'flex'; });
document.getElementById('closeModalBtn').addEventListener('click', () => authModal.style.display = 'none');

authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const mode = authModeInput.value;
    const btnText = authSubmitBtn.textContent; authSubmitBtn.textContent = 'Memproses...'; authSubmitBtn.disabled = true;
    try {
        if (mode === 'verify_otp') {
            const otp = document.getElementById('otpCode').value;
            const res = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: currentPendingEmail, otp }) });
            const data = await res.json();
            if (data.success) { 
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: data.message, confirmButtonColor: '#1d9bf0' });
                authModal.style.display = 'none'; authForm.reset(); toggleAuthMode.click(); 
            } else Swal.fire({ icon: 'error', title: 'Oops...', text: data.error, confirmButtonColor: '#e74c3c' });
            return; 
        }
        const endpoint = mode === 'login' ? '/api/login' : '/api/register';
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value, email: document.getElementById('email').value }) });
        const data = await res.json();
        
        if (data.success) {
            if (data.step === 'otp_sent') {
                Swal.fire({ icon: 'info', title: 'Cek Email!', text: data.message, confirmButtonColor: '#1d9bf0' });
                currentPendingEmail = document.getElementById('email').value; authModeInput.value = 'verify_otp';
                standardInputs.style.display = 'none'; otpGroup.style.display = 'block'; document.getElementById('otpCode').required = true;
                authSubmitBtn.textContent = 'Verifikasi Akun'; modalTitle.textContent = 'Masukkan Kode OTP';
            } else { 
                Swal.fire({ icon: 'success', title: 'Login Berhasil!', timer: 1500, showConfirmButton: false });
                authModal.style.display = 'none'; authForm.reset(); checkAuthStatus(); 
            }
        } else Swal.fire({ icon: 'error', title: 'Gagal', text: data.error, confirmButtonColor: '#e74c3c' });
    } finally { if(authModeInput.value !== 'verify_otp') authSubmitBtn.textContent = btnText; authSubmitBtn.disabled = false; }
});

document.getElementById('logoutBtn').addEventListener('click', () => { 
    Swal.fire({ title: 'Keluar Akun?', text: "Yakin ingin keluar?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#64748b', confirmButtonText: 'Ya, Keluar!' })
    .then(async (result) => { if (result.isConfirmed) { await fetch('/api/logout', { method: 'POST' }); checkAuthStatus(); Swal.fire({ icon: 'success', title: 'Berhasil Keluar', timer: 1500, showConfirmButton: false }); } });
});

openUploadBtn.addEventListener('click', () => uploadModal.style.display = 'flex');
closeUploadModalBtn.addEventListener('click', () => uploadModal.style.display = 'none');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('upTitle').value);
    formData.append('short_desc', document.getElementById('upDesc').value);
    formData.append('edition', document.getElementById('upEdition').value);
    formData.append('category', document.getElementById('upCategory').value);
    formData.append('version', document.getElementById('upVersion').value);
    formData.append('image', document.getElementById('upImage').files[0]);
    formData.append('file', document.getElementById('upFile').files[0]);

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent; btnSubmit.textContent = 'Mengupload...'; btnSubmit.disabled = true;

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) {
            Swal.fire({ icon: 'success', title: 'Luar Biasa!', text: 'Karyamu berhasil dipublikasikan!', confirmButtonColor: '#10b981' });
            uploadModal.style.display = 'none'; uploadForm.reset(); loadProjects(); 
        } else Swal.fire({ icon: 'error', title: 'Gagal Upload', text: data.error });
    } catch(err) { Swal.fire({ icon: 'error', title: 'Server Error', text: 'Terjadi masalah jaringan.' });
    } finally { btnSubmit.textContent = originalText; btnSubmit.disabled = false; }
});

closeCommentModalBtn.addEventListener('click', () => commentModal.style.display = 'none');
window.addEventListener('click', (e) => { 
    if (e.target === authModal) authModal.style.display = 'none'; 
    if (e.target === uploadModal) uploadModal.style.display = 'none'; 
    if (e.target === commentModal) commentModal.style.display = 'none';
});

async function openComments(projectId) {
    currentCommentProjectId = projectId;
    const project = currentProjectsData.find(p => p.id === projectId);
    commentTitle.textContent = `Komentar: ${project ? project.title : 'Karya'}`;
    commentModal.style.display = 'flex';
    await fetchAndRenderComments();
}

async function fetchAndRenderComments() {
    commentList.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.9rem;">Memuat komentar...</p>';
    try {
        const res = await fetch(`/api/projects/${currentCommentProjectId}/comments`);
        const comments = await res.json();
        if (comments.length === 0) {
            commentList.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 20px 0;">Jadilah yang pertama berkomentar!</p>';
            return;
        }
        commentList.innerHTML = '';
        comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            // LOGIKA WARNA EMAS DI KOMENTAR
            const userClass = c.is_premium === 1 ? 'comment-user premium-text' : 'comment-user';
            const crown = c.is_premium === 1 ? '<span class="premium-badge">👑</span>' : '';

            const item = document.createElement('div'); item.className = 'comment-item';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span class="${userClass}">${c.username} ${crown}</span> 
                    <span class="comment-date">${date}</span>
                </div>
                <div class="comment-text">${c.comment_text}</div>
            `;
            commentList.appendChild(item);
        });
    } catch (error) { commentList.innerHTML = '<p style="color: red; text-align: center;">Gagal memuat komentar.</p>'; }
}

commentForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const text = commentInput.value;
    try {
        const res = await fetch(`/api/projects/${currentCommentProjectId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        const data = await res.json();
        if (data.success) { commentInput.value = ''; fetchAndRenderComments(); } 
        else {
            Swal.fire({ icon: 'warning', title: 'Ups!', text: data.error, confirmButtonText: 'Login Sekarang', confirmButtonColor: '#1d9bf0' }).then((result) => {
                if(result.isConfirmed) { commentModal.style.display = 'none'; document.getElementById('openLoginBtn').click(); }
            });
        }
    } catch (err) { console.error(err); }
});

async function loadProjects() {
    try {
        const url = `/api/projects?search=${encodeURIComponent(currentSearch)}&edition=${encodeURIComponent(currentEdition)}&category=${encodeURIComponent(currentCategory)}`;
        const res = await fetch(url); currentProjectsData = await res.json(); renderCards(currentProjectsData);
    } catch (error) { console.error(error); }
}

function renderCards(projects) {
    projectGrid.innerHTML = ''; resultCount.textContent = `${projects.length} Proyek Ditemukan`;
    if (projects.length === 0) return projectGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted);">Tidak ada berkas yang cocok.</p>`;

    projects.forEach(project => {
        const card = document.createElement('div'); card.className = 'project-card';
        const imgUrl = project.image_name ? `/uploads/${project.image_name}` : 'https://via.placeholder.com/400x200?text=Rexons+Mod';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${project.title}" class="card-banner">
            <div class="card-content">
                <div>
                    <div class="card-header"><h2 class="project-title">${project.title}</h2><span class="badge">${project.edition} • ${project.category}</span></div>
                    <div class="project-author">Oleh: <span>${project.author}</span></div>
                    <p class="project-desc">${project.short_desc}</p>
                </div>
                <div class="card-footer" style="margin-top: 15px;">
                    <div class="meta-stats">
                        <div>Unduhan: <strong>${project.downloads.toLocaleString()}</strong></div>
                        <div style="font-size: 0.75rem; margin-top: 2px;">Versi: ${project.version}</div>
                    </div>
                    <div class="btn-group">
                        <button class="dl-btn" style="flex: 1;" onclick="triggerDownload(${project.id})">Unduh</button>
                        <button class="dl-btn btn-outline" style="padding: 8px 14px;" onclick="openComments(${project.id})" title="Lihat Komentar">💬</button>
                    </div>
                </div>
            </div>
        `;
        projectGrid.appendChild(card);
    });
}

searchInput.addEventListener('input', (e) => { currentSearch = e.target.value; loadProjects(); });
filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => { filterButtons.forEach(b => b.classList.remove('active')); e.target.classList.add('active'); currentEdition = e.target.getAttribute('data-edition'); currentCategory = e.target.getAttribute('data-category'); loadProjects(); });
});

// --- SISTEM UNDUHAN PREMIUM ---
async function triggerDownload(id) {
    try {
        const res = await fetch(`/api/projects/${id}/download`, { method: 'POST' });
        const data = await res.json();
        
        if (res.status === 401) { 
            Swal.fire({ icon: 'warning', title: 'Login Diperlukan', text: 'Kamu harus login untuk mendownload!', confirmButtonText: 'Login', confirmButtonColor: '#1d9bf0' }).then((result) => { if(result.isConfirmed) document.getElementById('openLoginBtn').click(); });
        } 
        else if (res.status === 403) { 
            if(data.error === 'LIMIT_HABIS') {
                Swal.fire({
                    title: 'Limit Habis! 😢',
                    text: 'Tingkatkan ke VIP/Premium untuk mendapatkan Unduhan Tak Terbatas selamanya + Nama Emas Eksklusif!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#25D366', 
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Beli Premium via WhatsApp',
                    cancelButtonText: 'Tutup'
                }).then((result) => {
                    if (result.isConfirmed) {
                        const noWA = "628xxxxxxxxxx"; // <---- GANTI NOMOR WA KAMU
                        let username = document.getElementById('displayUsername').textContent;
                        username = username.replace('👑', '').trim(); // Hapus logo mahkota kalau ada
                        const pesan = `Halo Admin Rexons, saya tertarik untuk membeli status *Premium/VIP* agar limit saya tak terbatas. \n\nUsername: *${username}*`;
                        window.open(`https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`, '_blank');
                    }
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: data.error, confirmButtonColor: '#e74c3c' }); 
            }
        } 
        else if (data.success) { 
            // LOGIKA NOTIFIKASI KHUSUS PREMIUM
            let alertText = data.type === 'Premium' ? 'Limit: Tak Terbatas 👑' : `Sisa kuota harian: ${data.remaining} file.`;
            
            Swal.fire({ title: 'Mengunduh...', text: alertText, icon: 'success', timer: 2000, showConfirmButton: false });
            if (data.file_url) { const a = document.createElement('a'); a.href = data.file_url; a.download = ''; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
            loadProjects(); 
        }
    } catch (error) { console.error(error); }
}

checkAuthStatus(); loadProjects();