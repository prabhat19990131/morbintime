import re

with open('js/script.js', 'r') as f:
    code = f.read()

# 1. Update fetch paths
code = code.replace("fetch('/api/config')", "fetch('data/config.json')")
code = code.replace("fetch('/api/movies')", "fetch('data/movies.json')")
code = code.replace("fetch('/api/ratings')", "fetch('data/ratings.json')")
code = code.replace("fetch('/api/comments')", "fetch('data/comments.json')")

# 2. Update initConfig check
code = code.replace("if (data.ok && data.config)", "if (data.config)")

# 3. Modify auth
auth_search = """    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Checking...';
        
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: name, pin: pin })
        });
        const data = await res.json();
        
        if (!data.ok) {
            showToast(data.error || "Authentication failed");
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In / Register';
            return;
        }

        currentUser = name;"""

auth_replace = """    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Checking...';
        
        setTimeout(() => {
            currentUser = name;"""

code = code.replace(auth_search, auth_replace)

auth_end_search = """        showToast(data.message || "Logged in!");
        
        if (pendingAuthCallback) {
            pendingAuthCallback();
            pendingAuthCallback = null;
        }
    } catch (err) {
        showToast("Server error during login.");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In / Register';
    }"""

auth_end_replace = """        showToast("Logged in locally!");
        
        if (pendingAuthCallback) {
            pendingAuthCallback();
            pendingAuthCallback = null;
        }
        
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In / Register';
        }, 500);
    } catch (err) {
        showToast("Error during login.");
    }"""

code = code.replace(auth_end_search, auth_end_replace)

# 4. Ratings logic
ratings_load = """        serverRatings = data.ratings;"""
ratings_load_replace = """        const localRatings = JSON.parse(localStorage.getItem('local_ratings')) || [];
        serverRatings = [...localRatings, ...data.ratings];"""
code = code.replace(ratings_load, ratings_load_replace)

auto_save = """            try {
                const res = await fetch('/api/ratings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: currentUser, pin: currentPin, movie: currentMovie.title, score: val, verdict: verdictText })
                });
                if (res.ok) loadRatings();
            } catch (err) {
                console.error("Auto-save failed");
            }"""

auto_save_replace = """            try {
                const local = JSON.parse(localStorage.getItem('local_ratings')) || [];
                const date = new Date().toISOString().split('T')[0];
                local.push({ user: currentUser, movie: currentMovie.title, score: val, verdict: verdictText, date: date });
                localStorage.setItem('local_ratings', JSON.stringify(local));
                loadRatings();
            } catch (err) {
                console.error("Auto-save failed");
            }"""
code = code.replace(auto_save, auto_save_replace)


# 5. Comment logic
comments_load = """        const displayComments = [...data.comments].reverse().slice(0, 10);"""
comments_load_replace = """        const localComments = JSON.parse(localStorage.getItem('local_comments')) || [];
        const allComments = [...localComments, ...data.comments];
        const displayComments = [...allComments].reverse().slice(0, 10);"""
code = code.replace(comments_load, comments_load_replace)
code = code.replace("data.comments.length", "allComments.length")

auto_save_comment = """            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: currentUser, pin: currentPin, movie: currentMovie.title, comment: commentText })
                });
                if (res.ok) loadGlobalComments();
            } catch (err) {
                console.error("Auto-save comment failed");
            }"""
auto_save_comment_replace = """            try {
                const local = JSON.parse(localStorage.getItem('local_comments')) || [];
                const date = new Date().toISOString().split('T')[0];
                local.push({ user: currentUser, movie: currentMovie.title, comment: commentText, date: date });
                localStorage.setItem('local_comments', JSON.stringify(local));
                loadGlobalComments();
            } catch (err) {
                console.error("Auto-save comment failed");
            }"""
code = code.replace(auto_save_comment, auto_save_comment_replace)


# 6. Submit review btn
submit_btn_save = """            // Post Rating
            const ratingRes = await fetch('/api/ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: currentUser, pin: currentPin, movie: currentMovie.title, score: val, verdict: verdictText })
            });
            const rData = await ratingRes.json();
            
            // Post Comment (optional)
            if (rData.ok && commentText) {
                await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: currentUser, pin: currentPin, movie: currentMovie.title, comment: commentText })
                });
            }

            if (rData.ok) {"""

submit_btn_replace = """            // Post Rating
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

            if (true) {"""
code = code.replace(submit_btn_save, submit_btn_replace)


# 7. Delete logic
delete_logic = """    try {
        const res = await fetch(`/api/${type}s`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, pin: currentPin, movie: movie })
        });
        const data = await res.json();
        if (data.ok) {
            showToast(`Deleted ${type}`);
            loadUserProfile();
            loadRatings();
            loadGlobalComments();
        } else {
            showToast(`Error deleting ${type}`);
        }
    } catch (err) {
        showToast('Server not reachable');
    }"""
    
delete_replace = """    try {
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
    }"""
code = code.replace(delete_logic, delete_replace)

# 8. Profile history fetch logic
profile_history = """    try {
        const res = await fetch(`/api/history?user=${encodeURIComponent(currentUser)}`);
        const data = await res.json();
        
        if (!data.ok) {
            profileHistory.innerHTML = '<p>Error loading history.</p>';
            return;
        }"""
profile_replace = """    try {
        const rRes = await fetch('data/ratings.json');
        const rData = await rRes.json();
        const cRes = await fetch('data/comments.json');
        const cData = await cRes.json();
        
        const localR = JSON.parse(localStorage.getItem('local_ratings')) || [];
        const localC = JSON.parse(localStorage.getItem('local_comments')) || [];
        
        const allR = [...localR, ...rData.ratings].filter(r => r.user.toLowerCase() === currentUser.toLowerCase());
        const allC = [...localC, ...cData.comments].filter(c => c.user.toLowerCase() === currentUser.toLowerCase());
        
        const data = { ratings: allR, comments: allC };"""
code = code.replace(profile_history, profile_replace)

# 9. Movie comments fetch logic
movie_comments = """        const res = await fetch(`/api/comments?movie=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (!data.ok || data.comments.length === 0) {"""
movie_comments_replace = """        const res = await fetch('data/comments.json');
        const rData = await res.json();
        const localC = JSON.parse(localStorage.getItem('local_comments')) || [];
        const allC = [...localC, ...rData.comments].filter(c => c.movie.toLowerCase() === title.toLowerCase());
        const data = { comments: allC };
        if (data.comments.length === 0) {"""
code = code.replace(movie_comments, movie_comments_replace)

with open('js/script.js', 'w') as f:
    f.write(code)

print("Patch applied successfully.")
