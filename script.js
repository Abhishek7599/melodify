const audio = document.getElementById('audio-player');
let songs = [];
let currentIndex = 0;
let isPlaying = false;
let currentQueue = [];
async function itunesSearch(term, limit = 10, entity = 'song') {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=${limit}&country=IN`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function itunesTop(genre, limit = 10) {
  // Use iTunes RSS feed for top songs
  const url = `https://itunes.apple.com/in/rss/topsongs/limit=${limit}/genre=${genre}/json`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.feed?.entry || [];
}
const featuredSongs = [
  {
    trackName: 'Tere Naam',
    artistName: 'Udit Narayan',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/06/e0/cc/06e0cc26-4a24-d8ed-6b2e-0f20b8b32cd0/artwork.jpg/300x300bb.jpg',
    query: 'Tere Naam Udit Narayan'
  },
  {
    trackName: 'Kesariya',
    artistName: 'Arijit Singh',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/7c/de/a7/7cdea7d3-3b77-d39e-6b61-67cba26c7eaf/artwork.jpg/300x300bb.jpg',
    query: 'Kesariya Arijit Singh Brahmastra'
  }
];

async function loadHomepage() {
  loadTrending();
  loadAlbums();
  loadArtists();
  loadCharts();
}

async function loadTrending() {
  const row = document.getElementById('trending-row');
  try {
    const results = await itunesSearch('Bollywood hits 2024', 12);
    if (!results.length) { row.innerHTML = '<div style="color:var(--muted);font-size:13px;">No results</div>'; return; }
    row.innerHTML = '';
    results.filter(s => s.previewUrl).slice(0, 10).forEach((song, i) => {
      const card = makeSongCard(song, i, results);
      row.appendChild(card);
    });
  } catch(e) { row.innerHTML = '<div style="color:var(--muted);font-size:13px;">Failed to load</div>'; }
}

async function loadAlbums() {
  const row = document.getElementById('albums-row');
  const albumQueries = ['Kalki 2898 AD', 'Animal Bollywood', 'Dunki Shah Rukh', 'Stree 2 album', 'Jawan album Shah Rukh'];
  try {
    row.innerHTML = '';
    for (const q of albumQueries) {
      const results = await itunesSearch(q, 3, 'album');
      if (results.length) {
        const album = results[0];
        const card = makeAlbumCard(album);
        row.appendChild(card);
      }
    }
    if (!row.children.length) row.innerHTML = '<div style="color:var(--muted);font-size:13px;">No results</div>';
  } catch(e) { row.innerHTML = '<div style="color:var(--muted);font-size:13px;">Failed to load</div>'; }
}

async function loadArtists() {
  const row = document.getElementById('artists-row');
  // ✅ Search by artist name as a song query — top result always has artworkUrl100
  const artists = [
    'Arijit Singh',
    'Shreya Ghoshal',
    'A.R. Rahman',
    'Pritam',
    'Badshah',
    'Neha Kakkar',
    'Jubin Nautiyal',
    'Armaan Malik',
  ];
  row.innerHTML = '';
  for (const artist of artists) {
    try {
      // fetch top song by this artist — artwork comes from the song result
      const results = await itunesSearch(artist, 3);
      // pick the result whose artistName most closely matches
      const match = results.find(r =>
        r.artistName?.toLowerCase().includes(artist.split(' ')[0].toLowerCase())
      ) || results[0];
 
      if (!match) continue;
 
      const art = match.artworkUrl100
        ? match.artworkUrl100.replace('100x100bb', '300x300bb')
        : 'https://placehold.co/300x300/1a1a1a/666?text=♪';
 
      const card = document.createElement('div');
      card.className = 'song-card';
      card.style.textAlign = 'center';
      card.innerHTML = `
        <img class="card-art" src="${art}" alt=""
          style="border-radius:50%; object-fit:cover;"
          onerror="this.src='https://placehold.co/300x300/1a1a1a/666?text=♪'">
        <div class="card-title">${artist}</div>
        <div class="card-sub">Artist</div>
      `;
      card.onclick = () => {
        document.getElementById('search-input').value = artist;
        doSearch(artist);
      };
      row.appendChild(card);
    } catch(e) {
      console.warn('Artist load failed:', artist, e);
    }
  }
}
async function loadCharts() {
  const list = document.getElementById('charts-list');
  try {
    const results = await itunesSearch('top Hindi songs', 10);
    if (!results.length) { list.innerHTML = '<div style="color:var(--muted);font-size:13px;">No results</div>'; return; }
    list.innerHTML = '';
    const filtered = results.filter(s => s.previewUrl).slice(0, 10);
    filtered.forEach((song, i) => {
      const row = makeListRow(song, i, filtered, i);
      list.appendChild(row);
    });
  } catch(e) { list.innerHTML = '<div style="color:var(--muted);font-size:13px;">Failed to load</div>'; }
}

function makeSongCard(song, indexInQueue, queue) {
  const card = document.createElement('div');
  card.className = 'song-card';
  card.dataset.trackId = song.trackId;
  const art = song.artworkUrl100 || song.artworkUrl60 || '';
  card.innerHTML = `
    <img class="card-art" src="${art}" alt=""
      onerror="this.src='https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4c/b8/60/4cb860df-71c0-4a44-c76d-8978a8d10dab/artwork.jpg/300x300bb.jpg'">
    <div class="card-play"><i class="fa-solid fa-play"></i></div>
    <div class="card-title">${song.trackName}</div>
    <div class="card-sub">${song.artistName}</div>
  `;
  card.onclick = () => {
    currentQueue = queue.filter(s => s.previewUrl);
    const qIdx = currentQueue.findIndex(s => s.trackId === song.trackId);
    playSongAt(qIdx >= 0 ? qIdx : 0);
  };
  return card;
}

function makeAlbumCard(album) {
  const card = document.createElement('div');
  card.className = 'album-card';
  const art = album.artworkUrl100 || '';
  const name = album.collectionName || album.trackName || '';
  const artist = album.artistName || '';
  card.innerHTML = `
    <img class="card-art" src="${art}" alt=""
      onerror="this.src='https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4c/b8/60/4cb860df-71c0-4a44-c76d-8978a8d10dab/artwork.jpg/300x300bb.jpg'">
    <div class="card-play"><i class="fa-solid fa-play"></i></div>
    <div class="card-title">${name}</div>
    <div class="card-sub">${artist}</div>
  `;
  card.onclick = () => doSearch(name + ' ' + artist);
  return card;
}

function makeListRow(song, displayIndex, queue, queueIndex) {
  const row = document.createElement('div');
  row.className = 'list-row';
  row.dataset.trackId = song.trackId;
  const art = song.artworkUrl60 || song.artworkUrl100 || '';
  const mins = Math.floor((song.trackTimeMillis || 30000) / 60000);
  const secs = Math.floor(((song.trackTimeMillis || 30000) % 60000) / 1000).toString().padStart(2, '0');
  row.innerHTML = `
    <div class="list-num">${displayIndex + 1}</div>
    <img class="list-art" src="${art}" alt=""
      onerror="this.src='https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4c/b8/60/4cb860df-71c0-4a44-c76d-8978a8d10dab/artwork.jpg/300x300bb.jpg'">
    <div class="list-info">
      <div class="list-title">${song.trackName}</div>
      <div class="list-sub">${song.artistName}</div>
    </div>
    <i class="fa-solid fa-play list-play"></i>
    <div class="list-duration">${mins}:${secs}</div>
  `;
  row.onclick = () => {
    currentQueue = queue.filter(s => s.previewUrl);
    const qIdx = currentQueue.findIndex(s => s.trackId === song.trackId);
    playSongAt(qIdx >= 0 ? qIdx : queueIndex);
  };
  return row;
}
function playSongAt(index) {
  if (!currentQueue || currentQueue.length === 0) return;
  if (index < 0) index = currentQueue.length - 1;
  if (index >= currentQueue.length) index = 0;
  currentIndex = index;

  const song = currentQueue[currentIndex];
  if (!song || !song.previewUrl) {
    // skip to next if no preview
    playSongAt(index + 1);
    return;
  }

  audio.src = song.previewUrl;
  audio.volume = parseFloat(document.getElementById('vol-fill').style.width || '100') / 100;
  audio.play();
  isPlaying = true;
  updatePlayPauseUI();
  updateNowPlayingUI(song);
}

function togglePlayPause() {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play();
    isPlaying = true;
  }
  updatePlayPauseUI();
}

function playNext() {
  if (!currentQueue.length) return;
  playSongAt(currentIndex + 1);
}

function playPrev() {
  if (!currentQueue.length) return;
  // if more than 3s in, restart; else go prev
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    playSongAt(currentIndex - 1);
  }
}

async function playFeatured() {
  const f = featuredSongs[0];
  const results = await itunesSearch(f.query, 5);
  const withPreview = results.filter(s => s.previewUrl);
  if (withPreview.length) {
    currentQueue = withPreview;
    playSongAt(0);
  }
}

function updatePlayPauseUI() {
  const btn = document.getElementById('pb-play-btn');
  btn.innerHTML = isPlaying
    ? '<i class="fa-solid fa-pause"></i>'
    : '<i class="fa-solid fa-play"></i>';
}

function updateNowPlayingUI(song) {
  const art = song.artworkUrl100 || song.artworkUrl60 || '';
  document.getElementById('pb-title').textContent  = song.trackName;
  document.getElementById('pb-artist').textContent = song.artistName;

  const pbArt = document.getElementById('pb-art');
  const pbPlaceholder = document.getElementById('pb-art-placeholder');
  pbArt.src = art;
  pbArt.style.display = 'block';
  pbPlaceholder.style.display = 'none';
}

// Progress bar
audio.addEventListener('timeupdate', () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';

  const cur = formatTime(audio.currentTime);
  const dur = formatTime(audio.duration || 30);
  document.getElementById('pb-current').textContent  = cur;
  document.getElementById('pb-duration').textContent = dur;
});

audio.addEventListener('ended', playNext);
audio.addEventListener('play',  () => { isPlaying = true;  updatePlayPauseUI(); });
audio.addEventListener('pause', () => { isPlaying = false; updatePlayPauseUI(); });

function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function seekTo(e) {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
}

function setVolume(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = pct;
  document.getElementById('vol-fill').style.width = (pct * 100) + '%';
}

const searchInput = document.getElementById('search-input');
searchInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && searchInput.value.trim()) {
    doSearch(searchInput.value.trim());
  }
});

async function doSearch(query) {
  showSearchResults();
  document.getElementById('search-heading').textContent = `Results for "${query}"`;

  const spinner = document.getElementById('search-spinner');
  spinner.style.display = 'block';

  try {
    const results = await itunesSearch(query, 12);
    spinner.style.display = 'none';

    const withPreview = results.filter(s => s.previewUrl);

    if (!withPreview.length) {
      document.getElementById('top-result-col').innerHTML =
        '<div style="color:var(--muted);font-size:13px;padding:20px;">No results with preview found.</div>';
      document.getElementById('songs-list-col').innerHTML = '';
      return;
    }

    // Store as queue
    songs = withPreview;

    // Top result
    const topCol = document.getElementById('top-result-col');
    topCol.innerHTML = '';
    const top = withPreview[0];
    const topCard = document.createElement('div');
    topCard.className = 'top-result-card';
    topCard.innerHTML = `
      <img class="top-result-art" src="${top.artworkUrl100}" alt=""
        onerror="this.src='https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4c/b8/60/4cb860df-71c0-4a44-c76d-8978a8d10dab/artwork.jpg/300x300bb.jpg'">
      <div>
        <div class="top-result-name">${top.trackName}</div>
        <div class="top-result-meta">${top.artistName} • ${top.collectionName || 'Single'}</div>
      </div>
      <div class="top-result-play"><i class="fa-solid fa-play"></i></div>
    `;
    topCard.onclick = () => {
      currentQueue = withPreview;
      playSongAt(0);
    };
    topCol.appendChild(topCard);

    // Songs list
    const listCol = document.getElementById('songs-list-col');
    listCol.innerHTML = '';
    withPreview.slice(0, 8).forEach((song, i) => {
      const row = makeListRow(song, i, withPreview, i);
      listCol.appendChild(row);
    });

  } catch(e) {
    spinner.style.display = 'none';
    document.getElementById('top-result-col').innerHTML =
      '<div style="color:var(--muted);font-size:13px;padding:20px;">Search failed. Try again.</div>';
  }
}
function showHome() {
  document.getElementById('home-content').classList.remove('hidden');
  document.getElementById('search-results').classList.remove('active');
  searchInput.value = '';
}

function showSearchResults() {
  document.getElementById('home-content').classList.add('hidden');
  document.getElementById('search-results').classList.add('active');
}

loadHomepage();
