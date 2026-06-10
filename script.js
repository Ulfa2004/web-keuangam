// CONFIG HARCODED DATA
const ADMIN_CODE = "KODEADMIN2026";
// Ambil variabel environment GitHub dari LocalStorage atau ganti langsung di string ini:
const GITHUB_TOKEN = "MASUKKAN_TOKEN_GITHUB_DISINI"; 
const GITHUB_REPO = "USERNAME_KAMU/NAMA_REPO_KAMU"; 

// DOM ELEMENTS
const loginScreen = document.getElementById('login-screen');
const mainDashboard = document.getElementById('main-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const songsListContainer = document.getElementById('songs-list');
const playerBar = document.getElementById('player-bar');

// AUDIO OBJECT & STATE
const audio = document.getElementById('main-audio');
let songsData = [];
let currentSongIndex = 0;
let isShuffle = false;
let isLoop = false;
let playlists = JSON.parse(localStorage.getItem('glass_playlists')) || {};

// ================= AUTH SYSTEM =================
function checkSession() {
  const session = JSON.parse(localStorage.getItem('music_session'));
  if (session && session.loggedIn) {
    showDashboard(session.username);
  } else {
    loginScreen.classList.add('active');
  }
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-user').value;
  const code = document.getElementById('login-code').value;

  if (code === ADMIN_CODE) {
    const sessionData = { username, loggedIn: true };
    localStorage.setItem('music_session', JSON.stringify(sessionData));
    loginScreen.classList.remove('active');
    showDashboard(username);
  } else {
    loginError.innerText = "Access Code Salah!";
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('music_session');
  location.reload();
});

function showDashboard(username) {
  mainDashboard.style.display = 'flex';
  document.getElementById('welcome-msg').innerText = `Selamat Datang, ${username}`;
  loadSongsFromGithub();
  renderPlaylists();
}

// ================= TAB NAVIGATION =================
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ================= FETCH SONGS FROM GITHUB =================
async function loadSongsFromGithub() {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/songs.json`);
    if (res.ok) {
      songsData = await res.json();
      renderSongs(songsData);
    } else {
      songsListContainer.innerHTML = `<p class="error-msg">songs.json tidak ditemukan di GitHub. Silakan upload lagu pertama.</p>`;
    }
  } catch (err) {
    songsListContainer.innerHTML = `<p class="error-msg">Gagal terkoneksi ke database GitHub.</p>`;
  }
}

function renderSongs(songs) {
  songsListContainer.innerHTML = '';
  if(songs.length === 0) {
    songsListContainer.innerHTML = '<p style="color: #666">Belum ada koleksi musik.</p>';
    return;
  }
  
  songs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
      <div class="card-cover-wrap">
        <img src="${song.coverUrl || 'placeholder.jpg'}" alt="Cover">
        <div class="play-btn-overlay"></div>
      </div>
      <h3 class="truncate">${song.title}</h3>
      <p class="truncate">${song.artist}</p>
      <select class="add-pl-select" style="width:100%; margin-top:8px; background:transparent; color:#fff; font-size:11px; border:1px solid #444; border-radius:4px;">
        <option value="" disabled selected>+ Tambah ke Playlist</option>
        ${Object.keys(playlists).map(pName => `<option value="${pName}">${pName}</option>`).join('')}
      </select>
    `;
    
    // Play Event Klik Kartu
    card.querySelector('.card-cover-wrap').addEventListener('click', () => playSong(index));
    
    // Add to playlist change handler
    card.querySelector('.add-pl-select').addEventListener('change', (e) => {
      const targetPl = e.target.value;
      if (!playlists[targetPl].includes(song.id)) {
        playlists[targetPl].push(song.id);
        localStorage.setItem('glass_playlists', JSON.stringify(playlists));
        alert(`Lagu dimasukkan ke playlist [${targetPl}]`);
      } else {
        alert('Lagu sudah terdaftar di playlist tersebut!');
      }
      e.target.value = ""; // Reset dropdown
    });

    songsListContainer.appendChild(card);
  });
}

// ================= MUSIC PLAYER CONTROLS =================
function playSong(index) {
  if (songsData.length === 0) return;
  currentSongIndex = index;
  const track = songsData[currentSongIndex];

  audio.src = track.url;
  audio.play();

  // Update Bottom Bar UI
  document.getElementById('player-title').innerText = track.title;
  document.getElementById('player-artist').innerText = track.artist;
  document.getElementById('player-cover').src = track.coverUrl || 'placeholder.jpg';
  document.getElementById('btn-play-pause').innerText = '';
  playerBar.style.display = 'flex';
}

const playPauseBtn = document.getElementById('btn-play-pause');
playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.innerText = '';
  } else {
    audio.pause();
    playPauseBtn.innerText = '';
  }
});

document.getElementById('btn-next').addEventListener('click', () => {
  if (isShuffle) {
    playSong(Math.floor(Math.random() * songsData.length));
  } else {
    let nextIndex = (currentSongIndex + 1) % songsData.length;
    playSong(nextIndex);
  }
});

document.getElementById('btn-prev').addEventListener('click', () => {
  let prevIndex = currentSongIndex - 1;
  if (prevIndex < 0) prevIndex = songsData.length - 1;
  playSong(prevIndex);
});

// Timeline update
const timeline = document.getElementById('timeline');
audio.addEventListener('timeupdate', () => {
  if(audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    timeline.value = progress;
    document.getElementById('time-current').innerText = formatTime(audio.currentTime);
    document.getElementById('time-duration').innerText = formatTime(audio.duration);
  }
});

timeline.addEventListener('input', () => {
  const seekTime = (timeline.value / 100) * audio.duration;
  audio.currentTime = seekTime;
});

document.getElementById('volume-slider').addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

// Shuffle & Loop toggles
const shuffleBtn = document.getElementById('btn-shuffle');
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

const loopBtn = document.getElementById('btn-loop');
loopBtn.addEventListener('click', () => {
  isLoop = !isLoop;
  loopBtn.classList.toggle('active', isLoop);
});

audio.addEventListener('ended', () => {
  if (isLoop) {
    audio.currentTime = 0;
    audio.play();
  } else {
    document.getElementById('btn-next').click();
  }
});

function formatTime(secs) {
  let m = Math.floor(secs / 60);
  let s = Math.floor(secs % 60);
  if (s < 10) s = '0' + s;
  return m + ':' + s;
}

// ================= PLAYLIST FEATURES =================
const playlistForm = document.getElementById('playlist-form');
playlistForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playlist-name-input').value.trim();
  if (playlists[name]) return alert('Nama playlist sudah dipakai!');
  
  playlists[name] = [];
  localStorage.setItem('glass_playlists', JSON.stringify(playlists));
  document.getElementById('playlist-name-input').value = '';
  renderPlaylists();
  loadSongsFromGithub(); // Refresh dropdown
});

function renderPlaylists() {
  const plContainer = document.getElementById('playlists-list');
  plContainer.innerHTML = '';
  
  Object.keys(playlists).forEach(name => {
    const folder = document.createElement('div');
    folder.className = 'playlist-folder';
    folder.innerHTML = `<h3> ${name}</h3><p style="font-size:12px; color:#aaa; margin-top:5px;">${playlists[name].length} Lagu</p>`;
    
    folder.addEventListener('click', () => showPlaylistDetail(name));
    plContainer.appendChild(folder);
  });
}

function showPlaylistDetail(name) {
  document.getElementById('playlist-detail').style.display = 'block';
  document.getElementById('selected-playlist-title').innerText = `Isi Playlist: ${name}`;
  const itemsContainer = document.getElementById('playlist-songs-items');
  itemsContainer.innerHTML = '';

  const trackIds = playlists[name];
  const filtered = songsData.filter(s => trackIds.includes(s.id));

  if(filtered.length === 0) {
    itemsContainer.innerHTML = '<p style="font-size:13px; color:#555;">Belum ada lagu di dalam folder ini.</p>';
    return;
  }

  filtered.forEach(song => {
    const row = document.createElement('div');
    row.className = 'pl-track-row';
    row.innerHTML = `<span> <b>${song.title}</b> - ${song.artist}</span> <span> Putar</span>`;
    row.addEventListener('click', () => {
      const realIndex = songsData.findIndex(s => s.id === song.id);
      playSong(realIndex);
    });
    itemsContainer.appendChild(row);
  });
}

// ================= GITHUB UPLOAD CORE FUNCTION =================
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

async function getFileSHA(path) {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.sha;
    }
    return null;
  } catch { return null; }
}

async function uploadToGithub(file, folder, fileName) {
  const base64Content = await fileToBase64(file);
  const path = `${folder}/${fileName}`;
  const sha = await getFileSHA(path);

  const body = {
    message: `Upload ${fileName} via Symphony Glass App`,
    content: base64Content
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if(!res.ok) throw new Error(`Gagal upload ${fileName}`);
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${path}`;
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('up-title').value;
  const artist = document.getElementById('up-artist').value;
  const audioFile = document.getElementById('up-audio').files[0];
  const coverFile = document.getElementById('up-cover').files[0];
  
  uploadStatus.style.display = 'block';
  uploadStatus.innerText = "Mengonversi dan mengupload gambar sampul...";

  try {
    const timestamp = new Date().getTime();
    const coverName = `${timestamp}_${coverFile.name.replace(/\s+/g, '_')}`;
    const audioName = `${timestamp}_${audioFile.name.replace(/\s+/g, '_')}`;

    // 1. Upload Cover Art
    const coverUrl = await uploadToGithub(coverFile, 'albums', coverName);
    
    // 2. Upload MP3
    uploadStatus.innerText = "Gambar terkirim! Sekarang memproses file MP3 ke server cloud GitHub (mohon tunggu)...";
    const audioUrl = await uploadToGithub(audioFile, 'music', audioName);

    // 3. Update File JSON Database
    uploadStatus.innerText = "Menyelaraskan data baru ke dalam songs.json...";
    const sha = await getFileSHA('songs.json');
    let currentSongs = [];

    if(sha) {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/songs.json`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
      });
      const data = await res.json();
      currentSongs = JSON.parse(atob(data.content));
    }

    const newTrack = { id: `id_${timestamp}`, title, artist, url: audioUrl, coverUrl };
    currentSongs.unshift(newTrack); // Masukkan di paling atas

    const updatedJsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentSongs, null, 2))));
    
    const saveRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/songs.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update songs.json: + ${title}`,
        content: updatedJsonBase64,
        sha: sha || undefined
      })
    });

    if(!saveRes.ok) throw new Error("Gagal menyimpan database akhir.");

    uploadStatus.innerText = " Selamat! Lagu berhasil di-upload secara komplit dan siap diputar.";
    uploadForm.reset();
    loadSongsFromGithub(); // Muat ulang lagu di beranda

  } catch (err) {
    uploadStatus.innerText = ` Terjadi Masalah: ${err.message}`;
  }
});

// RUN ON LOAD
checkSession();
