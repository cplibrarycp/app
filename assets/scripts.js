/* Project Logic - Full Master Script | Fixed Page Load & Audio Player */

const firebaseConfig = { 
    apiKey: "AIzaSyBzwhpHmeZdLf_nZrcPQirlnpj3Vhg9EqA", 
    authDomain: "thripudilibrary.firebaseapp.com", 
    projectId: "thripudilibrary", 
    storageBucket: "thripudilibrary.firebasestorage.app", 
    messagingSenderId: "887018912750", 
    appId: "1:887018912750:web:cc05190a72b13db816acff" 
};

const scriptURL = 'https://script.google.com/macros/s/AKfycbxmVIIRQ1cObdwwpAxZl9dz2ZxDRqg5hns8XRkZMQOmZE06-0g80YPOgcWEYFJNJ7jgZw/exec';

const bgMusic = new Audio('assets/cover/bg.mp3');
bgMusic.loop = true;
let isMusicPlaying = false;

document.addEventListener('DOMContentLoaded', () => {
    injectMasterTemplate(); 
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    setupAuthObserver();
    
    if (document.getElementById('library-grid') && !window.location.pathname.includes('history.html')) {
        fetchLibraryData(); 
    }
});

// മ്യൂസിക് കൺട്രോൾ
window.toggleMusic = function() {
    const icon = document.getElementById('music-icon');
    if (isMusicPlaying) {
        bgMusic.pause();
        icon.classList.replace('fa-volume-up', 'fa-volume-mute');
        isMusicPlaying = false;
    } else {
        bgMusic.play().catch(e => console.log("Music play blocked"));
        icon.classList.replace('fa-volume-mute', 'fa-volume-up');
        isMusicPlaying = true;
    }
};

window.goToLogin = function() {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
};

async function fetchLibraryData() {
    const cached = localStorage.getItem('thripudi_cache');
    if (cached) { window.fullLibrary = JSON.parse(cached); renderBooks(); }
    try {
        const response = await fetch(scriptURL);
        const data = await response.json();
        const rows = data.slice(1); 
        window.fullLibrary = rows.map(cols => ({
            lang: cols[0], catKey: (cols[1] || '').toString().trim().toLowerCase(),
            catTitle: cols[2], id: cols[3], type: (cols[4] || 'pdf').toString().toLowerCase(),
            title: cols[5], img: cols[6] || 'assets/cover/default.jpg'
        }));
        localStorage.setItem('thripudi_cache', JSON.stringify(window.fullLibrary));
        renderBooks();
    } catch (error) { console.error("Data Error:", error); }
}

window.filterBooks = function() {
    const searchTerm = document.getElementById('bookSearchInput').value.toLowerCase();
    renderBooks(searchTerm);
};

function renderBooks(searchTerm = "") {
    const container = document.getElementById('library-grid');
    const headArea = document.getElementById('cat-heading');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const cat = (urlParams.get('cat') || '').trim().toLowerCase();
    let books = window.fullLibrary.filter(item => item.catKey === cat);
    if (searchTerm) books = books.filter(book => book.title.toLowerCase().includes(searchTerm));

    if (books.length > 0) {
        headArea.innerText = books[0].catTitle;
        if (!document.getElementById('bookSearchInput')) {
            const searchHTML = `<div class="search-container" style="max-width: 500px; margin: 15px auto 25px; position: relative; padding: 0 15px;"><i class="fas fa-search" style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); color: #00897B; opacity: 0.6;"></i><input type="text" id="bookSearchInput" placeholder="തിരയൂ..." onkeyup="filterBooks()" style="width: 100%; padding: 10px 20px 10px 45px; border-radius: 50px; border: 1.5px solid #00897B; outline: none; box-sizing: border-box; font-size: 16px;"></div>`;
            headArea.insertAdjacentHTML('afterend', searchHTML);
        }
        container.innerHTML = books.map(book => {
            let isMedia = (book.type === 'audio' || book.type === 'video');
            let actionBtn = isMedia ? `<button class="overlay-btn" onclick="playMediaInline('${book.id}', '${book.type}', '${book.title}', '${book.img}')">${book.type === 'video' ? 'കാണാം' : 'കേൾക്കാം'}</button>` : `<button class="overlay-btn" onclick="checkAccess('${book.id}', '${book.type}', '${book.title}', '${book.img}')">തുടങ്ങുക</button>`;
            
            return `
                <div class="book-card">
                    <div class="image-wrapper" style="position:relative; overflow:hidden; border-radius:10px;">
                        <img class="book-cover" src="${book.img}" onerror="this.src='assets/cover/default.jpg'">
                        <div class="read-overlay" id="overlay-${book.id}">${actionBtn}</div>
                        <div class="audio-player-container" id="player-${book.id}" style="display:none; position:absolute; bottom:0; left:0; width:100%; height:20%; background:rgba(0, 77, 64, 0.98); z-index:40;">
                            <div style="width:100%; height:100%; position:relative; overflow:hidden;">
                                <iframe id="iframe-${book.id}" src="" style="width:100%; height:400%; border:none; margin-top:-70px;" allow="autoplay"></iframe>
                                <div style="position:absolute; top:5px; right:5px; background:white; color:#004D40; width:20px; height:20px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:100; font-size:10px;" onclick="stopMediaInline('${book.id}')"><i class="fas fa-times"></i></div>
                            </div>
                        </div>
                    </div>
                    <div class="book-title">${book.title}</div>
                </div>`;
        }).join('');
    }
}

let currentMediaId = null;
window.playMediaInline = (id, type, title, img) => {
    if (!firebase.auth().currentUser) { document.getElementById('loginAlertModal').style.display = 'flex'; return; }
    if (currentMediaId) stopMediaInline(currentMediaId);
    window.addToHistory(id, type, title, img);
    const p = document.getElementById(`player-${id}`), o = document.getElementById(`overlay-${id}`), f = document.getElementById(`iframe-${id}`);
    if (p && f) { f.src = `https://drive.google.com/file/d/${id}/preview`; p.style.display = 'flex'; o.style.display = 'none'; currentMediaId = id; }
};

window.stopMediaInline = function(id) {
    const p = document.getElementById(`player-${id}`), o = document.getElementById(`overlay-${id}`), f = document.getElementById(`iframe-${id}`);
    if (p && f) { p.style.display = 'none'; o.style.display = 'flex'; f.src = ""; currentMediaId = null; }
};

function injectMasterTemplate() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const exitBtn = isAndroid ? `<button onclick="exitApp()" style="background:none; border:none; color:white; margin-left:8px; cursor:pointer;"><i class="fas fa-power-off"></i></button>` : '';

    const styles = `<style>
        html, body { height: 100%; margin: 0; font-family: sans-serif; }
        body { display: flex; flex-direction: column; background: #fff; }
        header { background: #00897B; color: white; width: 100%; z-index: 1000; flex-shrink: 0; }
        .nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; width: 100%; box-sizing: border-box; }
        .content-wrapper { flex: 1 0 auto; padding-top: 15px; }
        footer { background: #004D40; color: white; padding: 20px 0; flex-shrink: 0; }
        .footer-container { text-align: center; }
        .footer-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 5px; }
        .footer-row a, .footer-row span, .footer-copy { font-size: 0.55em !important; color: #ffffff !important; text-decoration: none; }
        .nav-item { text-decoration: none; color: white; font-size: 0.85em; margin-right: 10px; font-weight: 500; }
    </style>`;
    
    const headerHTML = `<header><div class="nav-container">
        <a href="dashboard.html" class="logo-container"><span class="logo-text">THRIPUDI LIBRARY</span><img src="assets/cover/logo.png" class="logo-img"></a>
        <div class="nav-links" style="display: flex; align-items: center;">
            <button onclick="toggleMusic()" style="background:none; border:none; color:white; margin-right:10px; cursor:pointer;"><i id="music-icon" class="fas fa-volume-mute"></i></button>
            <a class="nav-item" href="dashboard.html">Home</a><a class="nav-item" href="collection.html">ശേഖരം</a><a class="nav-item" href="about.html">About</a><a class="nav-item" href="contact.html">Contact</a>
            <div class="user-profile" id="user-profile-btn" style="display:flex; align-items:center; gap:5px; cursor:pointer; position:relative;">
                <img id="user-avatar-img" style="width:28px; height:28px; border-radius:50%; border:1px solid #fff;" src="assets/cover/default_user.jpg">
                <span id="display-name" style="font-size:0.85em;">...</span><i class="fas fa-chevron-down" style="font-size:0.6em;"></i>${exitBtn}
                <div class="profile-dropdown" id="profile-dropdown" style="display:none; position:absolute; right:0; top:40px; background:white; box-shadow:0 5px 15px rgba(0,0,0,0.2); border-radius:8px; min-width:130px; z-index:2000;">
                    <a href="history.html" style="display:block; padding:8px 12px; color:#333; text-decoration:none; font-size:0.8em;">History</a>
                    <a href="javascript:void(0)" onclick="logoutUser()" style="display:block; padding:8px 12px; color:red; text-decoration:none; font-size:0.8em;">Logout</a>
                </div>
            </div>
        </div>
    </div></header>`;

    const modalsHTML = `
    <div id="loginAlertModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10001; justify-content:center; align-items:center;">
        <div class="popup-box" style="background:white; border-radius:15px; text-align:center; width:220px; border: 1.5px solid #00897B; overflow:hidden; display:flex; flex-direction:column;">
            <div style="background:#00897B; padding:15px 10px; width:100%;"><img src="assets/cover/logo.png" style="height:35px; margin-bottom:8px;"><h2 style="color:white; margin:0; font-size:0.85em; letter-spacing:1px; text-transform:uppercase; font-weight:700;">THRIPUDI LIBRARY</h2></div>
            <div style="padding:20px 15px;">
                <p style="color:#333; margin:0 0 15px 0; font-weight:bold; font-size:0.8em;">തുടരുന്നതിന് ലോഗിൻ ആവശ്യമാണ്</p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button onclick="goToLogin()" style="padding:10px; background:#00897B; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">ലോഗിൻ ചെയ്യുക</button>
                    <button onclick="document.getElementById('loginAlertModal').style.display='none'" style="padding:8px; background:white; color:#00897B; border:1px solid #00897B; border-radius:8px; cursor:pointer;">ഇപ്പോൾ വേണ്ട</button>
                </div>
            </div>
        </div>
    </div>
    <div id="mediaModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#000; z-index:10002; flex-direction:column;">
        <div style="width:100%; background:#004D40; color:white; padding:15px; display:grid; grid-template-columns: 1fr 2fr 1fr; align-items:center;">
            <span id="modalBookTitle" style="font-size:0.8em; opacity:0.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...</span>
            <span style="text-align:center; font-weight:bold; font-size:1em;">ത്രിപുടി വായനാമുറി</span>
            <button onclick="closeMediaModal()" style="color:white; background:none; border:none; cursor:pointer; font-size:2em; text-align:right;">&times;</button>
        </div>
        <div style="flex:1; position:relative; overflow:hidden;">
            <iframe id="mediaFrame" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>
            <div style="position:absolute; top:0; right:0; width:65px; height:65px; background:transparent; z-index:10003;"></div>
        </div>
    </div>`;

    const footerHTML = `<footer><div class="footer-container">
        <div class="footer-row">
            <a href="#"><i class="fab fa-facebook-f"></i></a><a href="#"><i class="fab fa-whatsapp"></i></a>
            <span>|</span><a href="privacy.html">സ്വകാര്യതാ നയം</a><span>|</span><a href="terms.html">നിബന്ധനകൾ</a>
        </div>
        <div class="footer-copy">© 2025 THRIPUDI LIBRARY. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.</div>
    </div></footer>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    const mainContent = document.querySelector('.container:not(.navbar):not(.nav-container)');
    if (mainContent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'content-wrapper';
        mainContent.parentNode.insertBefore(wrapper, mainContent);
        wrapper.appendChild(mainContent);
    }
    document.body.insertAdjacentHTML('beforeend', modalsHTML + footerHTML);

    const btn = document.getElementById('user-profile-btn'), dd = document.getElementById('profile-dropdown');
    if (btn) btn.onclick = (e) => { e.stopPropagation(); dd.style.display = (dd.style.display === 'block') ? 'none' : 'block'; };
    window.onclick = () => { if(dd) dd.style.display = 'none'; };
}

window.addToHistory = (id, type, title, img) => {
    let history = JSON.parse(localStorage.getItem('thripudi_history') || '[]');
    history = history.filter(item => item.id !== id);
    history.push({ id, type, title, img, timestamp: Date.now() });
    if (history.length > 20) history.shift();
    localStorage.setItem('thripudi_history', JSON.stringify(history));
};
window.checkAccess = (id, type, title, img) => {
    if (!firebase.auth().currentUser) { document.getElementById('loginAlertModal').style.display = 'flex'; return; }
    window.addToHistory(id, type, title, img);
    document.getElementById('modalBookTitle').innerText = title;
    document.getElementById('mediaFrame').src = `https://drive.google.com/file/d/${id}/preview?rm=minimal`;
    document.getElementById('mediaModal').style.display = 'flex';
};
function setupAuthObserver() {
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            const dName = document.getElementById('display-name'), dImg = document.getElementById('user-avatar-img');
            if (user) { dName.innerText = user.displayName ? user.displayName.split(' ')[0] : "User"; dImg.src = user.photoURL || 'assets/cover/default_user.jpg'; }
            else { dName.innerText = "അതിഥി"; dImg.src = 'assets/cover/default_user.jpg'; }
        });
    }
}
window.closeMediaModal = () => { document.getElementById('mediaModal').style.display = 'none'; document.getElementById('mediaFrame').src = ""; };
window.logoutUser = () => firebase.auth().signOut().then(() => window.location.href = "logout_success.html");
window.exitApp = () => { if (window.Android) window.Android.closeApp(); else window.close(); };
