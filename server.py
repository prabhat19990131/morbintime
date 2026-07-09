#!/usr/bin/env python3
"""MorbDB — Backend server.
Serves static files + API for ratings and comments saved to .md files."""

import http.server
import json
import os
from datetime import datetime

PORT = 8080
BASE = os.path.dirname(os.path.abspath(__file__))
RATINGS_FILE = os.path.join(BASE, 'ratings.md')
COMMENTS_FILE = os.path.join(BASE, 'comments.md')
USERS_FILE = os.path.join(BASE, 'users.md')
CONFIG_FILE = os.path.join(BASE, 'config.md')
MOVIES_FILE = os.path.join(BASE, 'movies.md')


def init_file(path, header):
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(header)


def init_all():
    init_file(RATINGS_FILE, """# 🧛 MorbDB — All Ratings

> Every movie rated on the sacred Morbius Scale.

| User | Movie | Score | Verdict | Date |
|------|-------|-------|---------|------|
""")
    init_file(COMMENTS_FILE, """# 🧛 MorbDB — Comments

| User | Movie | Comment | Date |
|------|-------|---------|------|
""")
    init_file(USERS_FILE, """# 🧛 MorbDB — Users

| User | PIN | Date |
|------|-----|------|
""")
    init_file(MOVIES_FILE, """# 🧛 MorbDB — Movies

| Title | Year | Category | IMDb | RT | Source | Desc |
|-------|------|----------|------|----|--------|------|
| The Dark Knight | 2008 | english | 9.0 | 94 | tmdb | When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice. |
| Morbius | 2022 | english | 5.2 | 15 | tmdb | Biochemist Michael Morbius tries to cure himself of a rare blood disease, but he inadvertently infects himself with a form of vampirism instead. |
| Inception | 2010 | english | 8.8 | 87 | tmdb | A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O. |
| The Room | 2003 | english | 3.6 | 25 | tmdb | Johnny is a successful bank executive who lives quietly in a San Francisco townhouse with his fiancée, Lisa. |
| Oppenheimer | 2023 | english | 8.3 | 93 | tmdb | The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb. |
| Madame Web | 2024 | english | 3.8 | 11 | tmdb | Cassandra Webb is a New York City paramedic who starts to show signs of clairvoyance. |
| 3 Idiots | 2009 | indian | 8.4 | 100 | tmdb | Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently. |
| Sholay | 1975 | indian | 8.1 | 90 | tmdb | After his family is murdered by a notorious and ruthless bandit, a former police officer enlists the services of two outlaws to capture the bandit. |
| Dangal | 2016 | indian | 8.3 | 88 | tmdb | Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression. |
| Pathaan | 2023 | indian | 5.9 | 84 | tmdb | An Indian spy takes on the leader of a group of mercenaries who have nefarious plans to target his homeland. |
| Kabaddi | 2014 | nepali | 7.6 | 80 | tmdb | Kazi, a third-grade dropout, dreams of marrying Maiya, a village girl by any means, but Maiya has a different plan. |
| Pashupati Prasad | 2016 | nepali | 8.9 | 85 | tmdb | Pashupati Prasad revolves around the life of a young man who travels to Kathmandu after an earthquake to pay off his deceased parents' debt. |
| Loot | 2012 | nepali | 7.7 | 75 | tmdb | A man with a master plan to rob a bank in Kathmandu finds four tough guys to assist him. |
| Parasite | 2019 | korean | 8.5 | 99 | tmdb | Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan. |
| Train to Busan | 2016 | korean | 7.6 | 95 | tmdb | While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan. |
| Oldboy | 2003 | korean | 8.4 | 83 | tmdb | After being kidnapped and imprisoned for fifteen years, Oh Dae-Su is released, only to find that he must find his captor in five days. |
| Spirited Away | 2001 | japanese | 8.6 | 96 | tmdb | During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts. |
| Godzilla Minus One | 2023 | japanese | 7.9 | 98 | tmdb | Post-war Japan is at its lowest point when a new crisis emerges in the form of a giant monster, baptized in the horrific power of the atomic bomb. |
| Seven Samurai | 1954 | japanese | 8.6 | 100 | tmdb | Farmers from a village exploited by bandits hire a veteran samurai for protection, who gathers six other samurai to join him. |
| Pan's Labyrinth | 2006 | spanish | 8.2 | 95 | tmdb | In the Falangist Spain of 1944, the bookish young stepdaughter of a sadistic army officer escapes into an eerie but captivating fantasy world. |
| The Platform | 2019 | spanish | 7.0 | 80 | tmdb | A vertical prison with one cell per level. Two people per cell. Only one food platform and two minutes per day to feed. An endless nightmare trapped in The Hole. |
| Breaking Bad | 2008 | series | 9.5 | 96 | tmdb | A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future. |
| The Boys | 2019 | series | 8.7 | 93 | tmdb | A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers. |
| Squid Game | 2021 | series | 8.0 | 95 | tmdb | Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes. |
| Stranger Things | 2016 | series | 8.7 | 92 | tmdb | When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl. |
| The Witcher | 2019 | series | 8.0 | 81 | tmdb | Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world where people often prove more wicked than beasts. |
| The Mandalorian | 2019 | series | 8.6 | 93 | tmdb | After the fall of the Galactic Empire, lawlessness has spread throughout the galaxy. A lone gunfighter makes his way through the outer reaches. |
| Loki | 2021 | series | 8.2 | 87 | tmdb | After stealing the Tesseract during the events of Avengers: Endgame, an alternate version of Loki is brought to the mysterious Time Variance Authority. |
| WandaVision | 2021 | series | 7.9 | 91 | tmdb | Blending the style of classic sitcoms with the MCU, super-powered beings Wanda and Vision begin to suspect that everything is not as it seems. |
| Game of Thrones | 2011 | series | 9.2 | 89 | tmdb | Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia. |
| Dark | 2017 | series | 8.7 | 95 | tmdb | A family saga with a supernatural twist, set in a German town where the disappearance of two young children exposes the relationships among four families. |
""")


def parse_table(path, columns):
    """Generic markdown table parser."""
    rows = []
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    header_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('| ' + columns[0]):
            header_idx = i
            break
    if header_idx == -1:
        return rows
    for i in range(header_idx + 2, len(lines)):
        line = lines[i].strip()
        if not line.startswith('|'):
            continue
        cols = [c.strip() for c in line.split('|') if c.strip()]
        if len(cols) >= len(columns):
            row = {}
            for j, key in enumerate(columns):
                row[key.lower()] = cols[j]
            rows.append(row)
    return rows


def append_row(path, values):
    row = '| ' + ' | '.join(str(v) for v in values) + ' |\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(row)

def update_or_append_rating(user, movie, score, verdict, date):
    with open(RATINGS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    found = False
    for line in lines:
        if line.strip().startswith('|'):
            cols = [c.strip() for c in line.split('|') if c.strip()]
            if len(cols) >= 5 and cols[0].lower() == user.lower() and cols[1].lower() == movie.lower():
                new_lines.append(f"| {user} | {movie} | {score} | {verdict} | {date} |\n")
                found = True
                continue
        new_lines.append(line)
        
    if not found:
        new_lines.append(f"| {user} | {movie} | {score} | {verdict} | {date} |\n")
        
    with open(RATINGS_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

def delete_rating(user, movie):
    with open(RATINGS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith('|'):
            cols = [c.strip() for c in line.split('|') if c.strip()]
            if len(cols) >= 2 and cols[0].lower() == user.lower() and cols[1].lower() == movie.lower():
                continue
        new_lines.append(line)
        
    with open(RATINGS_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

def delete_comment(user, movie):
    with open(COMMENTS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith('|'):
            cols = [c.strip() for c in line.split('|') if c.strip()]
            if len(cols) >= 2 and cols[0].lower() == user.lower() and cols[1].lower() == movie.lower():
                continue
        new_lines.append(line)
        
    with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)


class MorbHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/api/movies':
            try:
                movies = parse_table(MOVIES_FILE, ['Title', 'Year', 'Category', 'IMDb', 'RT', 'Source', 'Desc'])
                # convert fields
                for m in movies:
                    m['year'] = int(m['year']) if m['year'] else ''
                    m['imdb'] = float(m['imdb']) if m['imdb'] else 0
                    m['rt'] = int(m['rt']) if m['rt'] else 0
                self._json({'ok': True, 'movies': movies})
            except Exception as e:
                self._json({'ok': False, 'error': str(e)}, 500)

        elif self.path == '/api/ratings':
            try:
                ratings = parse_table(RATINGS_FILE, ['User', 'Movie', 'Score', 'Verdict', 'Date'])
                for r in ratings:
                    try:
                        r['score'] = int(r['score'])
                    except ValueError:
                        r['score'] = 0
                self._json({'ok': True, 'ratings': ratings})
            except Exception as e:
                self._json({'ok': False, 'error': str(e)}, 500)

        elif self.path.startswith('/api/comments'):
            try:
                # Optional ?movie=xxx filter
                from urllib.parse import urlparse, parse_qs
                qs = parse_qs(urlparse(self.path).query)
                comments = parse_table(COMMENTS_FILE, ['User', 'Movie', 'Comment', 'Date'])
                movie_filter = qs.get('movie', [None])[0]
                if movie_filter:
                    comments = [c for c in comments if c['movie'].lower() == movie_filter.lower()]
                self._json({'ok': True, 'comments': comments})
            except Exception as e:
                self._json({'ok': False, 'error': str(e)}, 500)

        elif self.path == '/api/config':
            try:
                config = parse_table(CONFIG_FILE, ['Key', 'Value'])
                key_dict = {c['key']: c['value'] for c in config}
                self._json({'ok': True, 'config': key_dict})
            except Exception as e:
                self._json({'ok': False, 'error': str(e)}, 500)
                
        elif self.path.startswith('/api/history'):
            try:
                from urllib.parse import urlparse, parse_qs
                qs = parse_qs(urlparse(self.path).query)
                user_filter = qs.get('user', [None])[0]
                if not user_filter:
                    return self._json({'ok': False, 'error': 'Missing user'}, 400)
                
                ratings = parse_table(RATINGS_FILE, ['User', 'Movie', 'Score', 'Verdict', 'Date'])
                comments = parse_table(COMMENTS_FILE, ['User', 'Movie', 'Comment', 'Date'])
                
                user_ratings = [r for r in ratings if r['user'].lower() == user_filter.lower()]
                user_comments = [c for c in comments if c['user'].lower() == user_filter.lower()]
                
                self._json({'ok': True, 'ratings': user_ratings, 'comments': user_comments})
            except Exception as e:
                self._json({'ok': False, 'error': str(e)}, 500)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/ratings':
            self._handle_post_rating()
        elif self.path == '/api/comments':
            self._handle_post_comment()
        elif self.path == '/api/auth':
            self._handle_post_auth()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path == '/api/ratings':
            self._handle_delete_rating()
        elif self.path == '/api/comments':
            self._handle_delete_comment()
        else:
            self.send_error(404)

    def _verify_user_pin(self, user, pin):
        users = parse_table(USERS_FILE, ['User', 'PIN', 'Date'])
        existing_user = next((u for u in users if u['user'].lower() == user.lower()), None)
        return existing_user is not None and existing_user['pin'] == pin
    def _handle_post_rating(self):
        try:
            data = self._read_json()
            user = data.get('user', '').strip().replace('|', '-')
            pin = data.get('pin', '').strip()
            movie = data.get('movie', '').strip().replace('|', '-')
            score = data.get('score')
            verdict = data.get('verdict', '').strip().replace('|', '-')
            if not all([user, pin, movie, score is not None, verdict]):
                return self._json({'ok': False, 'error': 'Missing fields'}, 400)
            if not self._verify_user_pin(user, pin):
                return self._json({'ok': False, 'error': 'Unauthorized'}, 401)
            date = datetime.now().strftime('%Y-%m-%d')
            update_or_append_rating(user, movie, score, verdict, date)
            self._json({'ok': True})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _handle_post_comment(self):
        try:
            data = self._read_json()
            user = data.get('user', '').strip().replace('|', '-')
            pin = data.get('pin', '').strip()
            movie = data.get('movie', '').strip().replace('|', '-')
            comment = data.get('comment', '').strip().replace('|', '-').replace('\n', ' ')
            if not all([user, pin, movie, comment]):
                return self._json({'ok': False, 'error': 'Missing fields'}, 400)
            if not self._verify_user_pin(user, pin):
                return self._json({'ok': False, 'error': 'Unauthorized'}, 401)
            date = datetime.now().strftime('%Y-%m-%d %H:%M')
            append_row(COMMENTS_FILE, [user, movie, comment, date])
            self._json({'ok': True})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _handle_post_auth(self):
        try:
            data = self._read_json()
            user = data.get('user', '').strip().replace('|', '-')
            pin = data.get('pin', '').strip().replace('|', '-')
            
            if not user or not pin or len(pin) != 4:
                return self._json({'ok': False, 'error': 'Invalid username or PIN (must be 4 digits)'}, 400)
            
            users = parse_table(USERS_FILE, ['User', 'PIN', 'Date'])
            existing_user = next((u for u in users if u['user'].lower() == user.lower()), None)
            
            if existing_user:
                if existing_user['pin'] == pin:
                    self._json({'ok': True, 'message': 'Logged in successfully', 'user': existing_user['user']})
                else:
                    self._json({'ok': False, 'error': 'Incorrect PIN for existing user or username taken'}, 401)
            else:
                date = datetime.now().strftime('%Y-%m-%d')
                append_row(USERS_FILE, [user, pin, date])
                self._json({'ok': True, 'message': 'Signed up successfully', 'user': user})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _handle_delete_rating(self):
        try:
            data = self._read_json()
            user = data.get('user', '').strip()
            pin = data.get('pin', '').strip()
            movie = data.get('movie', '').strip()
            if not user or not pin or not movie:
                return self._json({'ok': False, 'error': 'Missing fields'}, 400)
            if not self._verify_user_pin(user, pin):
                return self._json({'ok': False, 'error': 'Unauthorized'}, 401)
            delete_rating(user, movie)
            self._json({'ok': True})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _handle_delete_comment(self):
        try:
            data = self._read_json()
            user = data.get('user', '').strip()
            pin = data.get('pin', '').strip()
            movie = data.get('movie', '').strip()
            if not user or not pin or not movie:
                return self._json({'ok': False, 'error': 'Missing fields'}, 400)
            if not self._verify_user_pin(user, pin):
                return self._json({'ok': False, 'error': 'Unauthorized'}, 401)
            delete_comment(user, movie)
            self._json({'ok': True})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _read_json(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length))

    def _json(self, obj, status=200):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print(f'  {args[0]}')


if __name__ == '__main__':
    init_all()
    os.chdir(BASE)
    with http.server.HTTPServer(('', PORT), MorbHandler) as httpd:
        print(f'\n  🧛 MorbDB server running at http://localhost:{PORT}\n')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n  Server stopped.')
