// ================================================================
// MorbDB — Script with Wikipedia Posters & Leaderboards
// ================================================================

// ======== DOM ========
// Navbar & Auth
const navSignInBtn = document.getElementById('navSignInBtn');
const navUserSection = document.getElementById('navUserSection');
const navAvatar = document.getElementById('navAvatar');
const navUsername = document.getElementById('navUsername');
const logoutBtn = document.getElementById('logoutBtn');

// Search
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('movieSearch');
const searchResults = document.getElementById('searchResults');
const searchBtn = document.getElementById('searchBtn');

// Main Views
const movieGrid = document.getElementById('movieGrid');
const categoryTabs = document.querySelectorAll('.cat-tab');
const ratingsContainer = document.getElementById('ratingsContainer');
const globalComments = document.getElementById('globalComments');
const totalRatingsEl = document.getElementById('totalRatings');
const totalMoviesEl = document.getElementById('totalMovies');
const totalCommentsEl = document.getElementById('totalComments');

// Leaderboards
const highestRatedContainer = document.getElementById('highestRated');
const lowestRatedContainer = document.getElementById('lowestRated');

// Modals & Views
const homeView = document.getElementById('homeView');
const movieView = document.getElementById('movieView');
const profileView = document.getElementById('profileView');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const backToHomeBtnProfile = document.getElementById('backToHomeBtnProfile');

const profileUsername = document.getElementById('profileUsername');
const profileHistory = document.getElementById('profileHistory');

const loginModal = document.getElementById('loginModal');
const loginModalClose = document.getElementById('loginModalClose');
const usernameInput = document.getElementById('usernameInput');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');

const modalPosterImg = document.getElementById('modalPosterImg');
const posterLetter = document.getElementById('posterLetter');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalYear = document.getElementById('modalYear');
const modalCat = document.getElementById('modalCat');
const modalDesc = document.getElementById('modalDesc');
const morbEasterEgg = document.getElementById('morbEasterEgg');

// Rating & Comment System (Unified)
const tierRows = document.querySelectorAll('.tier-row');
const morbBlockMsg = document.getElementById('morbBlockMsg');
const ratingVerdict = document.getElementById('ratingVerdict');
const scoreBadge = document.getElementById('scoreBadge');
const submitReviewBtn = document.getElementById('submitReviewBtn');
let currentTierVal = null;

const commentInput = document.getElementById('commentInput');
const movieCommentsContainer = document.getElementById('movieComments');

const toast = document.getElementById('toast');
const root = document.documentElement;

// ======== STATE ========
let currentUser = null;
let currentPin = null;
let currentMovie = null;
let currentBrowseCategory = 'all';
let serverRatings = [];
let pendingAuthCallback = null;

// ======== SPA ROUTING ========
function showHome() {
    homeView.classList.remove('hidden');
    movieView.classList.add('hidden');
    profileView.classList.add('hidden');
    document.title = "MorbDB — The Morbius Movie Database";
}

function showMoviePage(movie) {
    homeView.classList.add('hidden');
    movieView.classList.remove('hidden');
    profileView.classList.add('hidden');
    document.title = movie.title + " - MorbDB";
}

function showProfile() {
    if (!currentUser) {
        checkAuth(() => showProfile());
        return;
    }
    homeView.classList.add('hidden');
    movieView.classList.add('hidden');
    profileView.classList.remove('hidden');
    document.title = currentUser + "'s Profile - MorbDB";
    loadUserProfile();
}

backToHomeBtn.addEventListener('click', showHome);
backToHomeBtnProfile.addEventListener('click', showHome);
navUsername.addEventListener('click', showProfile);
navUsername.style.cursor = 'pointer';

// ======== GLOBAL STATE ========
let allMovies = [];

const catLabels = { english: 'English', indian: 'Indian', nepali: 'Nepali', korean: 'Korean', japanese: 'Japanese', spanish: 'Spanish', series: 'TV Show', custom: 'Custom' };
const catEmojis = { english: '🇺🇸', indian: '🇮🇳', nepali: '🇳🇵', korean: '🇰🇷', japanese: '🇯🇵', spanish: '🇪🇸', series: '📺', custom: '✏️' };

// ======== TMDB THUMBNAIL CACHE & LAZY LOAD ========
const posterCache = {};

// Queue system to prevent hitting TMDB too fast
let isFetchingPoster = false;
const posterQueue = [];

let TMDB_API_KEY = null;

async function initConfig() {
    try {
        const res = await fetch('./data/config.json');
        const data = await res.json();
        if (data.config) {
            TMDB_API_KEY = data.config['TMDB_API_KEY'];
        }
    } catch (e) {
        console.error("Failed to load config");
    }
}

async function processPosterQueue() {
    if (isFetchingPoster || posterQueue.length === 0) return;
    isFetchingPoster = true;
    
    const { title, year, source, imgEl, callback } = posterQueue.shift();
    
    if (source && source.startsWith('youtube:')) {
        const videoId = source.split(':')[1];
        const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        posterCache[title] = url;
        if (imgEl) {
            imgEl.src = url;
            imgEl.classList.remove('hidden');
            imgEl.style.opacity = '1';
        }
        if (callback) callback(url);
        isFetchingPoster = false;
        setTimeout(processPosterQueue, 10);
        return;
    }
    
    if (posterCache[title] !== undefined) {
        if (posterCache[title] && imgEl) {
            imgEl.src = posterCache[title];
            imgEl.classList.remove('hidden');
            imgEl.style.opacity = '1';
        }
        if (callback) callback(posterCache[title]);
        isFetchingPoster = false;
        setTimeout(processPosterQueue, 10);
        return;
    }

    try {
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        const searchData = await searchRes.json();
        
        let posterPath = null;
        if (searchData.results && searchData.results.length > 0) {
            let possibleResults = searchData.results.filter(r => r.poster_path);
            if (year) {
                const yStr = String(year);
                const exactMatch = possibleResults.find(r => 
                    (r.release_date && r.release_date.startsWith(yStr)) || 
                    (r.first_air_date && r.first_air_date.startsWith(yStr))
                );
                if (exactMatch) possibleResults = [exactMatch];
            }
            const result = possibleResults[0] || searchData.results[0];
            posterPath = result.poster_path;
        }

        if (posterPath) {
            const url = `https://image.tmdb.org/t/p/w300${posterPath}`;
            posterCache[title] = url;
            if (imgEl) {
                imgEl.src = url;
                imgEl.classList.remove('hidden');
                imgEl.style.opacity = '1';
            }
            if (callback) callback(url);
        } else {
            posterCache[title] = null;
        }
    } catch (e) {
        posterCache[title] = null;
    }

    isFetchingPoster = false;
    setTimeout(processPosterQueue, 150);
}

// Lazy loader using IntersectionObserver
const posterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const imgEl = entry.target;
            const title = imgEl.dataset.title;
            const year = imgEl.dataset.year;
            const source = imgEl.dataset.source;
            if (title) {
                posterQueue.push({ title, year, source, imgEl });
                processPosterQueue();
            }
            obs.unobserve(imgEl);
        }
    });
}, { rootMargin: '100px' });

// Used only for the immediate modal popup
async function fetchTMDBPoster(title, year, source, callback) {
    posterQueue.push({ title, year, source, callback });
    processPosterQueue();
}

function getPosterGradient(title) {
    const gradients = [
        'linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)', 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
        'linear-gradient(135deg, #fccb90, #d57eeb)', 'linear-gradient(135deg, #e0c3fc, #8ec5fc)'
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
}

// ======== AUTH (LAZY LOGIN) ========
function checkAuth(callback) {
    if (currentUser) {
        callback();
    } else {
        pendingAuthCallback = callback;
        loginModal.classList.remove('hidden');
    }
}

navSignInBtn.addEventListener('click', () => { loginModal.classList.remove('hidden'); });
loginModalClose.addEventListener('click', () => { loginModal.classList.add('hidden'); });

async function doLogin() {
    const name = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!name || name.length < 3) {
        showToast("Username must be 3+ chars");
        usernameInput.parentElement.classList.add('shake');
        setTimeout(() => usernameInput.parentElement.classList.remove('shake'), 500);
        return;
    }
    if (!pin || pin.length !== 4) {
        showToast("PIN must be 4 digits");
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Checking...';
        
        setTimeout(() => {
            currentUser = name;
        currentPin = pin;
        loginModal.classList.add('hidden');
        navSignInBtn.classList.add('hidden');
        navUserSection.classList.remove('hidden');
        navAvatar.textContent = name.charAt(0).toUpperCase();
        navUsername.textContent = name;
        pinInput.value = ''; // clear pin
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.1 }, colors: ['#f5c518', '#ffffff'] });
        showToast("Logged in locally!");
        
        if (pendingAuthCallback) {
            pendingAuthCallback();
            pendingAuthCallback = null;
        }
        
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In / Register';
        }, 500);
    } catch (err) {
        showToast("Error during login.");
    }
}

loginBtn.addEventListener('click', doLogin);
pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
});
usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') pinInput.focus();
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentPin = null;
    navSignInBtn.classList.remove('hidden');
    navUserSection.classList.add('hidden');
    usernameInput.value = '';
    pinInput.value = '';
    showToast("Signed out.");
    showHome(); // return to home if on profile
});

// ======== PROFILE LOGIC ========
async function loadUserProfile() {
    profileUsername.textContent = `${currentUser}'s Morb History`;
    profileHistory.innerHTML = '<p>Loading history...</p>';
    
    try {
        const rRes = await fetch('./data/ratings.json');
        const rData = await rRes.json();
        const cRes = await fetch('./data/comments.json');
        const cData = await cRes.json();
        
        const localR = JSON.parse(localStorage.getItem('local_ratings')) || [];
        const localC = JSON.parse(localStorage.getItem('local_comments')) || [];
        
        const allR = [...localR, ...rData.ratings].filter(r => r.user.toLowerCase() === currentUser.toLowerCase());
        const allC = [...localC, ...cData.comments].filter(c => c.user.toLowerCase() === currentUser.toLowerCase());
        
        const data = { ratings: allR, comments: allC };
        
        let html = '';
        if (data.ratings.length > 0) {
            html += '<h3>Ratings</h3>';
            data.ratings.reverse().forEach(r => {
                const safeMovie = r.movie.replace(/'/g, "\\'");
                html += `<div class="history-item">
                    <h4>${r.movie} - <span>${r.verdict}</span> <button class="btn-delete" onclick="deleteRecord('rating', '${safeMovie}')">Delete</button></h4>
                    <p>Rated on ${r.date}</p>
                </div>`;
            });
        }
        
        if (allComments.length > 0) {
            html += '<h3 style="margin-top: 1rem;">Comments</h3>';
            data.comments.reverse().forEach(c => {
                const safeMovie = c.movie.replace(/'/g, "\\'");
                html += `<div class="history-item">
                    <h4>${c.movie} <button class="btn-delete" onclick="deleteRecord('comment', '${safeMovie}')">Delete</button></h4>
                    <p style="color: white; margin: 0.5rem 0;">"${c.comment}"</p>
                    <p>Posted on ${c.date}</p>
                </div>`;
            });
        }
        
        if (html === '') {
            html = '<div class="empty-state">No ratings or comments yet. Get to morbing!</div>';
        }
        
        profileHistory.innerHTML = html;
        renderTop10();
        
    } catch (err) {
        profileHistory.innerHTML = '<p>Error loading history.</p>';
    }
}

window.deleteRecord = async function(type, movie) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
        const key = type === 'rating' ? 'local_ratings' : 'local_comments';
        let local = JSON.parse(localStorage.getItem(key)) || [];
        local = local.filter(x => !(x.user === currentUser && x.movie === movie));
        localStorage.setItem(key, JSON.stringify(local));
        
        showToast(`Deleted local ${type}. (Global data cannot be deleted)`);
        loadUserProfile();
        loadRatings();
        loadGlobalComments();
    } catch (err) {
        showToast('Error deleting locally');
    }
};

function createMovieCardElement(movie, i) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.animationDelay = `${(i % 15) * 0.04}s`;
    
    const grad = getPosterGradient(movie.title);
    const emoji = catEmojis[movie.category] || '🎥';

    // Calc Morb score
    const movieRatings = serverRatings.filter(r => r.movie === movie.title);
    let morbAvg = "N/A";
    if (movieRatings.length > 0) {
        const sum = movieRatings.reduce((acc, curr) => acc + curr.score, 0);
        morbAvg = (sum / movieRatings.length).toFixed(1);
    }
    
    const imdbHtml = movie.imdb ? `<span class="c-rtg-i">IMDb ${movie.imdb.toFixed(1)}</span>` : '';
    const rtHtml = movie.rt ? `<span class="c-rtg-r">🍅 ${movie.rt}%</span>` : '';
    const morbHtml = `<span class="c-rtg-m">🧛 ${morbAvg}</span>`;

    card.innerHTML = `
        <div class="card-poster" style="background: ${grad}">
            <img src="" style="opacity: 0; transition: opacity 0.3s;" alt="poster" data-title="${movie.title}" data-year="${movie.year}" data-source="${movie.source || ''}">
            <span>${movie.title.charAt(0)}</span>
            <span class="poster-emoji">${emoji}</span>
        </div>
        <div class="card-body">
            <div class="card-title" title="${movie.title}">${movie.title}</div>
            <div class="card-year">${movie.year}</div>
            <div class="card-ratings">${imdbHtml}${rtHtml}${morbHtml}</div>
            <button class="card-rate-btn">
                <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-linejoin="round"/></svg>
                Rate
            </button>
        </div>
    `;

    card.addEventListener('click', () => {
        checkAuth(() => showMoviePage(movie, grad));
    });
    
    return card;
}

// ======== HIGHEST RATED GRID ========
function renderHighestRatedGrid() {
    const grid = document.getElementById('highestRatedGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Sort all movies by IMDb rating descending
    const topMovies = allMovies.slice().sort((a, b) => (b.imdb || 0) - (a.imdb || 0)).slice(0, 6);
    
    topMovies.forEach((movie, i) => {
        const card = createMovieCardElement(movie, i);
        grid.appendChild(card);
        posterObserver.observe(card.querySelector('img'));
    });
}

// ======== FAMOUS GRID ========
function renderFamousGrid() {
    const grid = document.getElementById('famousGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // The most famous titles are the ones we added first via TMDB 'popular' endpoint
    const famousEng = allMovies.filter(m => m.category === 'english').slice(0, 3);
    const famousSeries = allMovies.filter(m => m.category === 'series').slice(0, 3);
    const famousTitles = [...famousEng, ...famousSeries];
    
    famousTitles.forEach((movie, i) => {
        const card = createMovieCardElement(movie, i);
        grid.appendChild(card);
        posterObserver.observe(card.querySelector('img'));
    });
}

// ======== MOVIE GRID ========
let currentIsFullView = false;

async function renderMovieGrid(category, isFullView = false) {
    currentIsFullView = isFullView;
    movieGrid.innerHTML = '';
    let filtered = [];
    if (category === 'all') {
        // Prioritize English and Series (internationally famous), newest first
        const eng = allMovies.filter(m => m.category === 'english').slice().reverse();
        const ser = allMovies.filter(m => m.category === 'series').slice().reverse();
        const others = allMovies.filter(m => m.category !== 'english' && m.category !== 'series').slice().reverse();
        filtered = [...eng, ...ser, ...others];
    } else {
        filtered = allMovies.filter(m => m.category === category).slice().reverse();
    }
    
    totalMoviesEl.textContent = allMovies.length;
    
    const seeMoreBtn = document.getElementById('seeMoreBtn');
    const seeMoreContainer = document.getElementById('seeMoreContainer');
    const backBtn = document.getElementById('backFromSeeMoreBtn');
    
    if (!isFullView && filtered.length > 18) {
        filtered = filtered.slice(0, 18);
        seeMoreContainer.classList.remove('hidden');
    } else {
        seeMoreContainer.classList.add('hidden');
    }

    const highestSection = document.getElementById('highestRatedSection');
    const famousSection = document.getElementById('famousSection');
    const upcomingSection = document.getElementById('upcomingSection');
    const watchLaterSection = document.getElementById('watchLaterSection');

    if (isFullView) {
        document.querySelector('.carousel-banner').classList.add('hidden');
        if (highestSection) highestSection.classList.add('hidden');
        if (famousSection) famousSection.classList.add('hidden');
        if (upcomingSection) upcomingSection.classList.add('hidden');
        if (watchLaterSection) watchLaterSection.classList.add('hidden');
        document.querySelector('.leaderboard-section').classList.add('hidden');
        document.querySelector('.ratings-section').classList.add('hidden');
        document.querySelector('.comments-section').classList.add('hidden');
        backBtn.classList.remove('hidden');
    } else {
        document.querySelector('.carousel-banner').classList.remove('hidden');
        if (highestSection) highestSection.classList.remove('hidden');
        if (famousSection) famousSection.classList.remove('hidden');
        if (upcomingSection) upcomingSection.classList.remove('hidden');
        renderWatchLaterGrid(); // re-check visibility
        document.querySelector('.leaderboard-section').classList.remove('hidden');
        document.querySelector('.ratings-section').classList.remove('hidden');
        document.querySelector('.comments-section').classList.remove('hidden');
        backBtn.classList.add('hidden');
    }

    filtered.forEach((movie, i) => {
        const card = createMovieCardElement(movie, i);
        movieGrid.appendChild(card);
        posterObserver.observe(card.querySelector('img'));
    });
}

// ======== TABS & PAGINATION ========
categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentBrowseCategory = tab.dataset.category;
        renderMovieGrid(currentBrowseCategory, currentIsFullView);
    });
});

document.getElementById('seeMoreBtn').addEventListener('click', () => {
    renderMovieGrid(currentBrowseCategory, true);
    window.scrollTo(0, 0);
});

document.getElementById('backFromSeeMoreBtn').addEventListener('click', () => {
    renderMovieGrid(currentBrowseCategory, false);
    document.querySelector('.browse-section').scrollIntoView({ behavior: 'smooth' });
});

// ======== SEARCH ========
categorySelect.addEventListener('change', () => { if (searchInput.value.trim().length > 0) doSearch(); });
searchInput.addEventListener('input', doSearch);
searchInput.addEventListener('focus', doSearch);

let searchTimeout = null;
async function doSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) { searchResults.classList.add('hidden'); return; }

    let matches = allMovies.filter(m => m.title.toLowerCase().includes(query));

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " movie")}&utf8=&format=json&origin=*`);
            const data = await res.json();
            if (data.query && data.query.search) {
                data.query.search.forEach(w => {
                    const title = w.title.replace(/ \([^)]*\)/g, ''); // Remove (film), (1998 film) etc
                    if (!matches.find(m => m.title.toLowerCase() === title.toLowerCase())) {
                        matches.push({ title: title, year: "Found via Search", category: "custom", desc: "Dynamically found via Wikipedia database search." });
                    }
                });
            }
            renderSearchDropdown(matches.slice(0, 20));
        } catch(e) {
            renderSearchDropdown(matches.slice(0, 20));
        }
    }, 400);
}

function renderSearchDropdown(results) {
    searchResults.innerHTML = '';
    results.forEach(async (movie) => {
        const li = document.createElement('li');
        const grad = getPosterGradient(movie.title);
        const catLabel = catLabels[movie.category] || 'Custom';
        
        const source = movie.source || '';
        
        li.innerHTML = `
            <div class="sr-poster" style="background: ${grad}; position: relative; display: flex; align-items: center; justify-content: center; font-weight: bold; color: rgba(255,255,255,0.5);">
                <span style="position: absolute; z-index: 1;">${movie.title.charAt(0)}</span>
                <img src="" style="opacity: 0; transition: opacity 0.3s; position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" alt="" data-title="${movie.title}" data-year="${movie.year}" data-source="${source}">
            </div>
            <div class="sr-info">
                <span class="sr-title">${movie.title}</span>
                <span class="sr-meta">${movie.year} · ${catLabel}</span>
                <span class="sr-desc">${movie.desc || 'Rate this custom entry'}</span>
            </div>
        `;
        
        li.addEventListener('click', () => {
            checkAuth(() => {
                showMoviePage(movie, grad);
                searchResults.classList.add('hidden');
                searchInput.value = '';
            });
        });
        
        searchResults.appendChild(li);
        
        // Let intersection observer handle search results too
        posterObserver.observe(li.querySelector('img'));
    });
    searchResults.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) searchResults.classList.add('hidden');
});

// ======== MOVIE PAGE ========
async function showMoviePage(movie, grad) {
    currentMovie = movie;
    modalPoster.style.background = grad;
    posterLetter.textContent = movie.title.charAt(0);
    posterLetter.classList.remove('hidden');
    modalPosterImg.src = '';
    
    modalTitle.textContent = movie.title;
    modalYear.textContent = movie.year;
    modalCat.textContent = catLabels[movie.category] || 'Custom';
    modalDesc.textContent = movie.desc || 'No description available for this title. Rate it anyway!';

    // Calculate community Morb rating
    const movieRatings = serverRatings.filter(r => r.movie === movie.title);
    let morbAvg = "N/A";
    if (movieRatings.length > 0) {
        const sum = movieRatings.reduce((acc, curr) => acc + curr.score, 0);
        morbAvg = (sum / movieRatings.length).toFixed(1) + "/10";
    } else {
        if (movie.imdb && movie.imdb > 0) {
            morbAvg = "IMDb: " + movie.imdb.toFixed(1) + "/10";
        } else if (movie.rt && movie.rt > 0) {
            morbAvg = "RT: " + movie.rt + "%";
        }
    }

    const imdbScore = movie.imdb ? movie.imdb.toFixed(1) + "/10" : "N/A";
    const rtScore = movie.rt ? movie.rt + "%" : "N/A";
    
    // Set the ratings in the DOM
    const modalImdbEl = document.getElementById('modalImdbRating');
    const modalRtEl = document.getElementById('modalRtRating');
    const modalMorbEl = document.getElementById('modalMorbRating');
    if (modalImdbEl) modalImdbEl.textContent = imdbScore;
    if (modalRtEl) modalRtEl.textContent = rtScore;
    if (modalMorbEl) modalMorbEl.textContent = morbAvg;

    if (movie.title.toLowerCase().includes('morbius')) {
        morbEasterEgg.classList.remove('hidden');
        document.getElementById('tierArea').classList.add('hidden');
        morbBlockMsg.classList.remove('hidden');
        submitReviewBtn.classList.add('hidden');
        spawnFloatingEmojis(['🚫', '🦇'], 3);
    } else {
        morbEasterEgg.classList.add('hidden');
        document.getElementById('tierArea').classList.remove('hidden');
        morbBlockMsg.classList.add('hidden');
        submitReviewBtn.classList.remove('hidden');
    }

    currentTierVal = 0; // Default Morbius
    updateRatingDisplay();
    commentInput.value = '';
    movieCommentsContainer.innerHTML = '';


    // Fetch poster for modal
    modalPosterImg.classList.add('hidden');
    fetchTMDBPoster(movie.title, movie.year, movie.source, (url) => {
        if (url && currentMovie && currentMovie.title === movie.title) {
            modalPosterImg.src = url;
            modalPosterImg.classList.remove('hidden');
            posterLetter.classList.add('hidden');
            updateRatingDisplay(); // Update thumbnail in tier list
        }
    });

    // Fetch comments for this specific movie
    loadMovieComments(movie.title);
    
    // Update Watch Later button state
    const wlBtn = document.getElementById('watchLaterBtn');
    const wlList = getWatchLater();
    if (wlList.includes(movie.title)) {
        wlBtn.textContent = '✅ In Watch Later';
        wlBtn.style.borderColor = 'var(--color-good)';
        wlBtn.style.color = 'var(--color-good)';
    } else {
        wlBtn.textContent = '🔖 Watch Later';
        wlBtn.style.borderColor = '';
        wlBtn.style.color = '';
    }
    wlBtn.onclick = () => {
        toggleWatchLater(movie.title);
        // Update button state
        const updated = getWatchLater();
        if (updated.includes(movie.title)) {
            wlBtn.textContent = '✅ In Watch Later';
            wlBtn.style.borderColor = 'var(--color-good)';
            wlBtn.style.color = 'var(--color-good)';
        } else {
            wlBtn.textContent = '🔖 Watch Later';
            wlBtn.style.borderColor = '';
            wlBtn.style.color = '';
        }
    };
    
    // Show View
    homeView.classList.add('hidden');
    profileView.classList.add('hidden');
    movieView.classList.remove('hidden');
    document.title = movie.title + " - MorbDB";
    window.scrollTo(0,0);
}

// ======== VERDICTS ========
function getVerdict(val) {
    const verdicts = {
        "10": { text: "Anti-Morbius Masterpiece 🏆", colorVar: "--color-good" },
        "8":  { text: "Peak Morbius Evasion 🛡️", colorVar: "--color-good" },
        "7":  { text: "Morbius-Free 🌟", colorVar: "--color-good" },
        "4":  { text: "Better than Morbius 👍", colorVar: "--color-good" },
        "0":  { text: "Morbius 🧛", colorVar: "--color-mid" },
        "-2": { text: "Almost as bad as Morbius 🤡", colorVar: "--color-bad" },
        "-3": { text: "Watch Morbius instead 📺", colorVar: "--color-bad" },
        "-4": { text: "Dangerously close to Morbius ☠️", colorVar: "--color-bad" },
        "-5": { text: "like captain movie vfx 🇳🇵", colorVar: "--color-bad" }
    };
    return verdicts[val.toString()] || { text: "Morbius 🧛", colorVar: "--color-mid" };
}

function updateRatingDisplay() {
    const val = currentTierVal;
    
    // Get user's past ratings
    const userPastRatings = serverRatings.filter(r => r.user.toLowerCase() === (currentUser || '').toLowerCase());
    
    // Update button states
    tierRows.forEach(row => {
        const contentDiv = row.querySelector('.tier-content');
        contentDiv.innerHTML = ''; // Clear existing thumbnails
        const rowVal = parseInt(row.dataset.val);

        if (rowVal === val) {
            row.classList.add('active');
            row.style.background = '#2a2a2a';
            
            if (currentMovie) {
                const span = document.createElement('span');
                span.className = 'tier-item-name current-movie';
                span.textContent = currentMovie.title;
                contentDiv.appendChild(span);
            }
        } else {
            row.classList.remove('active');
            row.style.background = '#1a1a1a';
        }

        // Find past movies in this tier (excluding current movie)
        const pastMoviesInTier = userPastRatings.filter(r => r.score === rowVal && (!currentMovie || r.movie !== currentMovie.title));
        
        pastMoviesInTier.forEach(r => {
            const span = document.createElement('span');
            span.className = 'tier-item-name';
            span.textContent = r.movie;
            contentDiv.appendChild(span);
        });
    });

    const { text, colorVar } = getVerdict(val);
    ratingVerdict.textContent = text;

    const color = getComputedStyle(root).getPropertyValue(colorVar).trim();
    root.style.setProperty('--accent', color);
    scoreBadge.style.borderColor = color;
    scoreBadge.style.boxShadow = `0 0 16px ${color}40`;

    if (val <= -4) {
        scoreBadge.classList.add('shake');
        setTimeout(() => scoreBadge.classList.remove('shake'), 400);
    }
}

tierRows.forEach(row => {
    row.addEventListener('click', async (e) => {
        currentTierVal = parseInt(row.dataset.val);
        updateRatingDisplay();
        
        // Auto-save rating
        if (currentUser && currentMovie && !currentMovie.title.toLowerCase().includes('morbius')) {
            const val = currentTierVal;
            const { text: verdictText } = getVerdict(val);
            try {
                const local = JSON.parse(localStorage.getItem('local_ratings')) || [];
                const date = new Date().toISOString().split('T')[0];
                local.push({ user: currentUser, movie: currentMovie.title, score: val, verdict: verdictText, date: date });
                localStorage.setItem('local_ratings', JSON.stringify(local));
                loadRatings();
            } catch (err) {
                console.error("Auto-save failed");
            }
        }
    });
});

commentInput.addEventListener('blur', async () => {
    if (currentUser && currentMovie && !currentMovie.title.toLowerCase().includes('morbius')) {
        const commentText = commentInput.value.trim();
        if (commentText) {
            try {
                const local = JSON.parse(localStorage.getItem('local_comments')) || [];
                const date = new Date().toISOString().split('T')[0];
                local.push({ user: currentUser, movie: currentMovie.title, comment: commentText, date: date });
                localStorage.setItem('local_comments', JSON.stringify(local));
                loadGlobalComments();
            } catch (err) {
                console.error("Auto-save comment failed");
            }
        }
    }
});
// ======== SUBMIT REVIEW ========
submitReviewBtn.addEventListener('click', () => {
    checkAuth(async () => {
        if (!currentMovie) return;
        if (currentMovie.title.toLowerCase().includes('morbius')) return; // Block
        const val = currentTierVal;
        const { text: verdictText } = getVerdict(val);
        const commentText = commentInput.value.trim();

        // Confetti
        if (val >= 8) {
            confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: ['#f5c518', '#21d07a', '#fff'] });
            spawnFloatingEmojis(['🏆', '⭐', '🎉'], 5);
        } else if (val >= 5) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ['#21d07a', '#34d399'] });
        } else if (val >= 0) {
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: ['#f5c518'] });
        } else if (val <= -8) {
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 500);
            confetti({ particleCount: 80, spread: 180, gravity: 0.4, origin: { y: 0 }, colors: ['#ef4444', '#000'] });
            spawnFloatingEmojis(['💀', '🗑️', '🤮'], 6);
        }

        submitReviewBtn.disabled = true;
        submitReviewBtn.textContent = 'Submitting...';

        try {
            // Post Rating
            const localR = JSON.parse(localStorage.getItem('local_ratings')) || [];
            const date = new Date().toISOString().split('T')[0];
            localR.push({ user: currentUser, movie: currentMovie.title, score: val, verdict: verdictText, date: date });
            localStorage.setItem('local_ratings', JSON.stringify(localR));
            
            // Post Comment (optional)
            if (commentText) {
                const localC = JSON.parse(localStorage.getItem('local_comments')) || [];
                localC.push({ user: currentUser, movie: currentMovie.title, comment: commentText, date: date });
                localStorage.setItem('local_comments', JSON.stringify(localC));
            }

            if (true) {
                showToast(`🦇 Rated "${currentMovie.title}"`);
                currentMovie = null;
                commentInput.value = '';
                loadRatings();
                loadGlobalComments();
                setTimeout(() => showHome(), 500); // Redirect back to Home View
            } else {
                showToast('❌ Error saving review');
            }
        } catch {
            showToast('⚠️ Server not reachable');
        } finally {
            submitReviewBtn.disabled = false;
            submitReviewBtn.textContent = 'Submit Rating & Comment';
        }
    });
});

// ======== LOAD DATA ========
async function loadRatings() {
    try {
        const res = await fetch('./data/ratings.json');
        const data = await res.json();
        if (!data.ok) return;

        const localRatings = JSON.parse(localStorage.getItem('local_ratings')) || [];
        serverRatings = [...localRatings, ...data.ratings];
        const displayRatings = [...serverRatings].reverse();
        totalRatingsEl.textContent = serverRatings.length;
        ratingsContainer.innerHTML = '';

        if (displayRatings.length === 0) {
            ratingsContainer.innerHTML = '<div class="empty-state">No ratings yet. Be the first morber! 🧛</div>';
        } else {
            displayRatings.slice(0, 15).forEach(async (r, i) => {
                const mData = allMovies.find(m => m.title === r.movie) || {};
                const year = mData.year || '';
                const source = mData.source || '';
                const color = getColorForScore(r.score);
                const grad = getPosterGradient(r.movie);
                const row = document.createElement('div');
                row.className = 'rating-row';
                row.style.animationDelay = `${i * 0.04}s`;
                row.innerHTML = `
                    <div class="rr-poster" style="background: ${grad}; position: relative; display: flex; align-items: center; justify-content: center; font-weight: bold; color: rgba(255,255,255,0.5);">
                        <span style="position: absolute; z-index: 1;">${r.movie.charAt(0)}</span>
                        <img src="" style="opacity: 0; transition: opacity 0.3s; position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" alt="" data-title="${r.movie}" data-year="${year}" data-source="${source}">
                    </div>
                    <div class="rr-info">
                        <div class="rr-title">${r.movie}</div>
                        <div class="rr-meta">by ${r.user} · ${r.date}</div>
                    </div>
                    <div class="rr-score">
                        <span class="rr-score-badge" style="background:${color}18; color:${color}; border: 1px solid ${color}35;">${r.verdict}</span>
                    </div>
                `;
                
                const fallbackMovie = (mData && mData.title) ? mData : { title: r.movie, year: year, source: source, category: 'unknown', desc: 'No description available.' };
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    checkAuth(() => showMoviePage(fallbackMovie, grad));
                });
                
                ratingsContainer.appendChild(row);
                
                posterObserver.observe(row.querySelector('img'));
            });
        }
        calculateLeaderboards();
    } catch {
        console.log("Failed to load ratings");
    }
}

function calculateLeaderboards() {
    if (serverRatings.length === 0) {
        highestRatedContainer.innerHTML = '<div class="empty-state">No data</div>';
        lowestRatedContainer.innerHTML = '<div class="empty-state">No data</div>';
        return;
    }

    const movieStats = {};
    serverRatings.forEach(r => {
        if (!movieStats[r.movie]) movieStats[r.movie] = { total: 0, count: 0 };
        movieStats[r.movie].total += r.score;
        movieStats[r.movie].count += 1;
    });

    const averages = Object.keys(movieStats).map(movie => ({
        title: movie,
        avg: movieStats[movie].total / movieStats[movie].count,
        count: movieStats[movie].count
    })).filter(m => m.count > 0); // Only movies with at least 1 rating

    averages.sort((a, b) => b.avg - a.avg);
    
    renderLeaderboardList(highestRatedContainer, averages.slice(0, 3));
    renderLeaderboardList(lowestRatedContainer, averages.slice().reverse().slice(0, 3));
}

function renderLeaderboardList(container, list) {
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state">Not enough ratings</div>';
        return;
    }
    list.forEach(async (item, idx) => {
        const mData = allMovies.find(m => m.title === item.title) || {};
        const year = mData.year || '';
        const source = mData.source || '';
        const grad = getPosterGradient(item.title);
        const el = document.createElement('div');
        el.className = 'lb-item';
        el.innerHTML = `
            <div class="lb-rank">#${idx + 1}</div>
            <div class="lb-poster" style="background: ${grad}; position: relative; display: flex; align-items: center; justify-content: center; font-weight: bold; color: rgba(255,255,255,0.5);">
                <span style="position: absolute; z-index: 1;">${item.title.charAt(0)}</span>
                <img src="" style="opacity: 0; transition: opacity 0.3s; position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" data-title="${item.title}" data-year="${year}" data-source="${source}">
            </div>
            <div class="lb-info">
                <div class="lb-title">${item.title}</div>
                <div class="lb-score">Morb Score 🧛: <span>${item.avg.toFixed(1)}/10</span></div>
            </div>
        `;
        
        const fallbackMovie = (mData && mData.title) ? mData : { title: item.title, year: year, source: source, category: 'unknown', desc: 'No description available.' };
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            checkAuth(() => showMoviePage(fallbackMovie, grad));
        });
        
        container.appendChild(el);
        
        posterObserver.observe(el.querySelector('img'));
    });
}

async function loadGlobalComments() {
    try {
        const res = await fetch('./data/comments.json');
        const data = await res.json();
        if (!data.ok) return;
        
        totalCommentsEl.textContent = allComments.length;
        const localComments = JSON.parse(localStorage.getItem('local_comments')) || [];
        const allComments = [...localComments, ...data.comments];
        const displayComments = [...allComments].reverse().slice(0, 10);
        globalComments.innerHTML = '';
        
        if (displayComments.length === 0) {
            globalComments.innerHTML = '<div class="empty-state">No comments yet.</div>';
            return;
        }

        displayComments.forEach((c, i) => {
            const mData = allMovies.find(m => m.title === c.movie) || {};
            const year = mData.year || '';
            const source = mData.source || '';
            const grad = getPosterGradient(c.movie);
            const el = document.createElement('div');
            el.className = 'global-comment';
            el.style.animationDelay = `${i * 0.04}s`;
            el.innerHTML = `
                <div style="background: ${grad}; width: 40px; height: 60px; border-radius: 4px; overflow: hidden; flex-shrink: 0; margin-right: 0.8rem; position: relative; display: flex; align-items: center; justify-content: center; font-weight: bold; color: rgba(255,255,255,0.5);">
                    <span style="position: absolute; z-index: 1;">${c.movie.charAt(0)}</span>
                    <img src="" style="opacity: 0; transition: opacity 0.3s; position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" data-title="${c.movie}" data-year="${year}" data-source="${source}">
                </div>
                <div class="gc-body">
                    <div class="gc-header">
                        <span class="gc-user">${c.user}</span>
                        <span>on</span>
                        <span class="gc-movie">${c.movie}</span>
                        <span class="gc-date">${c.date}</span>
                    </div>
                    <div class="gc-text">${c.comment}</div>
                </div>
            `;
            
            const fallbackMovie = (mData && mData.title) ? mData : { title: c.movie, year: year, source: source, category: 'unknown', desc: 'No description available.' };
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                checkAuth(() => showMoviePage(fallbackMovie, grad));
            });
            
            globalComments.appendChild(el);
            posterObserver.observe(el.querySelector('img'));
        });
    } catch {}
}

async function loadMovieComments(title) {
    movieCommentsContainer.innerHTML = '<p class="mc-title">COMMUNITY COMMENTS</p>';
    try {
        const res = await fetch(`/api/comments?movie=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (!data.ok || allComments.length === 0) {
            movieCommentsContainer.innerHTML += '<div style="font-size:0.8rem; color:#888;">No comments yet for this title.</div>';
            return;
        }
        
        data.comments.reverse().forEach((c) => {
            const el = document.createElement('div');
            el.className = 'comment-item';
            el.innerHTML = `
                <div class="ci-header">
                    <div class="ci-avatar">${c.user.charAt(0)}</div>
                    <span class="ci-user">${c.user}</span>
                    <span class="ci-date">${c.date}</span>
                </div>
                <div class="ci-text">${c.comment}</div>
            `;
            movieCommentsContainer.appendChild(el);
        });
    } catch {}
}

function getColorForScore(score) {
    if (score <= -4) return '#ef4444';
    if (score <= 4) return '#f5c518';
    return '#21d07a';
}

function spawnFloatingEmojis(emojis, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const el = document.createElement('span');
            el.className = 'floating-emoji';
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.left = (15 + Math.random() * 70) + 'vw';
            el.style.top = (40 + Math.random() * 30) + 'vh';
            el.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1500);
        }, i * 150);
    }
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ======== PARTICLES ========
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = [];
const pEmojis = ['🦇', '🧛', '🎬', '⭐', '🌙', '🍿'];
class Particle {
    constructor() { this.reset(true); }
    reset(init) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 20;
        this.size = 10 + Math.random() * 10;
        this.speedY = -(0.1 + Math.random() * 0.2);
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.opacity = 0.05 + Math.random() * 0.08;
        this.emoji = pEmojis[Math.floor(Math.random() * pEmojis.length)];
        this.rot = Math.random() * 360;
        this.rotSpd = (Math.random() - 0.5) * 0.8;
    }
    update() {
        this.y += this.speedY; this.x += this.speedX; this.rot += this.rotSpd;
        if (this.y < -30) this.reset(false);
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.opacity; ctx.translate(this.x, this.y);
        ctx.rotate((this.rot * Math.PI) / 180); ctx.font = `${this.size}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}
for (let i = 0; i < 8; i++) particles.push(new Particle());
let lastTime = 0;
function animLoop(timestamp) {
    if (timestamp - lastTime > 30) { // Throttle to ~30fps to reduce lag
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        lastTime = timestamp;
    }
    requestAnimationFrame(animLoop);
}

// ======== INIT ========
async function loadMovies() {
    try {
        const res = await fetch('./data/movies.json');
        const data = await res.json();
        if (data.ok) {
            allMovies = data.movies;
        }
    } catch(e) { console.error('Failed to load movies'); }
}

// ======== CAROUSEL BANNER ========
let bannerMovies = [];
let currentBannerIdx = 0;
let bannerTimer = null;

async function initCarouselBanner() {
    // Prioritize movies: pick 7 trending movies and 3 trending series
    const intlMovies = allMovies.filter(m => m.category === 'english').slice().reverse().slice(0, 7);
    const intlSeries = allMovies.filter(m => m.category === 'series').slice().reverse().slice(0, 3);
    
    bannerMovies = [...intlMovies, ...intlSeries];
    
    // Shuffle them so movies and series are mixed
    for (let i = bannerMovies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bannerMovies[i], bannerMovies[j]] = [bannerMovies[j], bannerMovies[i]];
    }
    
    if (bannerMovies.length === 0) return;
    
    document.getElementById('carouselBanner').classList.remove('hidden');
    
    const dotsContainer = document.getElementById('carouselIndicators');
    dotsContainer.innerHTML = '';
    bannerMovies.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            currentBannerIdx = i;
            updateCarouselBanner();
            resetBannerTimer();
        });
        dotsContainer.appendChild(dot);
    });
    
    updateCarouselBanner();
    resetBannerTimer();
}

function resetBannerTimer() {
    clearInterval(bannerTimer);
    bannerTimer = setInterval(() => {
        currentBannerIdx = (currentBannerIdx + 1) % bannerMovies.length;
        updateCarouselBanner();
    }, 7000);
}

async function updateCarouselBanner() {
    if (!bannerMovies[currentBannerIdx]) return;
    const movie = bannerMovies[currentBannerIdx];
    
    document.getElementById('carouselTitle').textContent = movie.title;
    document.getElementById('carouselYear').textContent = movie.year;
    document.getElementById('carouselCat').textContent = catLabels[movie.category] || movie.category;
    document.getElementById('carouselDesc').textContent = movie.desc;
    
    const imdb = movie.imdb ? movie.imdb.toFixed(1) : 'N/A';
    document.getElementById('carouselImdb').textContent = `IMDb: ${imdb}`;
    
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        if (i === currentBannerIdx) dot.classList.add('active');
        else dot.classList.remove('active');
    });
    
    let bgUrl = '';
    if (TMDB_API_KEY) {
        try {
            const searchType = movie.category === 'series' ? 'search/tv' : 'search/movie';
            const yearQ = movie.year ? `&year=${movie.year}` : (movie.category === 'series' ? `&first_air_date_year=${movie.year}` : '');
            const res = await fetch(`https://api.themoviedb.org/3/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}${yearQ}`);
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].backdrop_path) {
                bgUrl = `https://image.tmdb.org/t/p/original${data.results[0].backdrop_path}`;
            }
        } catch(e) {}
    }
    
    const grad = getPosterGradient(movie.title);
    const bgEl = document.getElementById('carouselBg');
    if (bgUrl) {
        bgEl.style.backgroundImage = `url(${bgUrl})`;
    } else {
        bgEl.style.backgroundImage = grad;
    }
    
    const rateBtn = document.getElementById('carouselRateBtn');
    rateBtn.onclick = () => {
        checkAuth(() => showMoviePage(movie, grad));
    };
}

// ======== TOP 10 & PROFILE ========
function renderTop10() {
    const list = document.getElementById('top10List');
    if (!list || !currentUser) return;
    list.innerHTML = '';
    
    const userRatings = serverRatings
        .filter(r => r.user.toLowerCase() === currentUser.toLowerCase())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    if (userRatings.length === 0) {
        list.innerHTML = '<div class="empty-state">Rate some movies to build your Top 10! 🎬</div>';
        return;
    }
    
    // Check for saved order
    const savedOrder = localStorage.getItem(`top10_${currentUser}`);
    let orderedRatings = userRatings;
    if (savedOrder) {
        try {
            const order = JSON.parse(savedOrder);
            orderedRatings = order
                .map(title => userRatings.find(r => r.movie === title))
                .filter(Boolean);
            // Add any new ratings not in saved order
            userRatings.forEach(r => {
                if (!orderedRatings.find(o => o.movie === r.movie)) orderedRatings.push(r);
            });
        } catch(e) {}
    }
    
    orderedRatings.forEach((rating, i) => {
        const movie = allMovies.find(m => m.title === rating.movie) || { title: rating.movie, year: '', category: 'custom' };
        const grad = getPosterGradient(movie.title);
        const item = document.createElement('div');
        item.className = 'top10-item';
        item.draggable = true;
        item.dataset.movie = rating.movie;
        
        item.innerHTML = `
            <div class="top10-drag">☰</div>
            <div class="top10-rank">${i + 1}</div>
            <div class="top10-poster" style="background: ${grad}">
                <img src="" style="opacity: 0; transition: opacity 0.3s;" data-title="${movie.title}" data-year="${movie.year}" data-source="${movie.source || ''}">
            </div>
            <div class="top10-info">
                <div class="top10-title">${rating.movie}</div>
                <div class="top10-meta">${rating.verdict}</div>
            </div>
            <div class="top10-score">${rating.score}/10</div>
        `;
        
        // Drag events
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            updateTop10Ranks();
            saveTop10Order();
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            if (dragging && dragging !== item) {
                const rect = item.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    list.insertBefore(dragging, item);
                } else {
                    list.insertBefore(dragging, item.nextSibling);
                }
            }
        });
        
        list.appendChild(item);
        posterObserver.observe(item.querySelector('img'));
    });
}

function updateTop10Ranks() {
    const items = document.querySelectorAll('#top10List .top10-item');
    items.forEach((item, i) => {
        item.querySelector('.top10-rank').textContent = i + 1;
    });
}

function saveTop10Order() {
    if (!currentUser) return;
    const items = document.querySelectorAll('#top10List .top10-item');
    const order = Array.from(items).map(item => item.dataset.movie);
    localStorage.setItem(`top10_${currentUser}`, JSON.stringify(order));
}

document.getElementById('shareTop10Btn').addEventListener('click', () => {
    if (!currentUser) return;
    const items = document.querySelectorAll('#top10List .top10-item');
    if (items.length === 0) return showToast('Rate some movies first!');
    
    let text = `🏅 ${currentUser}'s Top ${items.length} on MorbDB\n\n`;
    items.forEach((item, i) => {
        const title = item.querySelector('.top10-title').textContent;
        const score = item.querySelector('.top10-score').textContent;
        text += `${i + 1}. ${title} (${score})\n`;
    });
    text += `\nRate movies at MorbDB! 🧛`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Top 10 copied to clipboard! 📋');
    }).catch(() => {
        showToast('Could not copy');
    });
});

// ======== WATCH LATER ========
function getWatchLater() {
    if (!currentUser) return [];
    try {
        return JSON.parse(localStorage.getItem(`watchlater_${currentUser}`)) || [];
    } catch(e) { return []; }
}

function saveWatchLater(list) {
    if (!currentUser) return;
    localStorage.setItem(`watchlater_${currentUser}`, JSON.stringify(list));
}

function toggleWatchLater(movieTitle) {
    let list = getWatchLater();
    if (list.includes(movieTitle)) {
        list = list.filter(t => t !== movieTitle);
        showToast('Removed from Watch Later');
    } else {
        list.push(movieTitle);
        showToast('Added to Watch Later! 🔖');
    }
    saveWatchLater(list);
    renderWatchLaterGrid();
}

function renderWatchLaterGrid() {
    const grid = document.getElementById('watchLaterGrid');
    const section = document.getElementById('watchLaterSection');
    if (!grid || !section) return;
    
    const list = getWatchLater();
    if (list.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    grid.innerHTML = '';
    
    list.forEach((title, i) => {
        const movie = allMovies.find(m => m.title === title);
        if (!movie) return;
        const card = createMovieCardElement(movie, i);
        grid.appendChild(card);
        posterObserver.observe(card.querySelector('img'));
    });
}

// ======== UPCOMING MOVIES ========
async function loadUpcomingMovies() {
    const grid = document.getElementById('upcomingGrid');
    if (!grid || !TMDB_API_KEY) return;
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
        const data = await res.json();
        if (!data.results) return;
        
        grid.innerHTML = '';
        
        // TMDB upcoming endpoint often returns recently released movies too.
        // Let's filter to only include movies with release dates in the future.
        const today = new Date().toISOString().split('T')[0];
        const futureMovies = data.results.filter(m => m.release_date && m.release_date > today);
        
        // If the filtered list is empty, just fallback to whatever TMDB returned
        const moviesToShow = futureMovies.length > 0 ? futureMovies : data.results;
        
        moviesToShow.slice(0, 6).forEach((item, i) => {
            const movie = {
                title: item.title,
                year: (item.release_date || '').split('-')[0],
                category: 'english',
                imdb: item.vote_average || 0,
                rt: 0,
                desc: item.overview || '',
                source: 'tmdb'
            };
            const card = createMovieCardElement(movie, i);
            grid.appendChild(card);
            posterObserver.observe(card.querySelector('img'));
        });
    } catch(e) {
        console.error('Failed to load upcoming movies');
    }
}

async function initApp() {
    await initConfig();
    await loadMovies();
    await loadRatings();
    
    initCarouselBanner();
    renderHighestRatedGrid();
    renderFamousGrid();
    loadUpcomingMovies();
    renderWatchLaterGrid();
    renderMovieGrid('all');
    loadGlobalComments();
    animLoop(0);
    
    // Auto-show login popup if not signed in
    if (!currentUser) {
        loginModal.classList.remove('hidden');
    }
    
    // Hide loading screen
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 2500);
}

initApp();
