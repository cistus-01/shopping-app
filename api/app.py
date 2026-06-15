import os, secrets, hashlib
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

DB_PATH = os.environ.get('DB_PATH', '/tmp/kago.db')

def uid(): return secrets.token_hex(8)
def now_iso(): return datetime.utcnow().isoformat()
def hash_pin(pin): return hashlib.sha256(pin.encode()).hexdigest()

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA journal_mode=WAL')
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db: db.close()

SCHEMA = '''
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  hh_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'その他',
  keywords TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  hh_id INTEGER NOT NULL,
  item_id TEXT,
  text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  quantity INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  hh_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
'''

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)
    try:
        db.execute('ALTER TABLE items ADD COLUMN untracked INTEGER DEFAULT 0')
        db.commit()
    except Exception:
        pass
    try:
        db.execute('INSERT OR IGNORE INTO users (username, pin_hash) VALUES (?,?)',
                   ('aoi', hash_pin('0420')))
        db.commit()
    except Exception:
        pass
    db.close()

init_db()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'unauthorized'}), 401
        db = get_db()
        row = db.execute('SELECT * FROM sessions WHERE token=? AND expires_at>?',
                         (token, now_iso())).fetchone()
        if not row:
            return jsonify({'error': 'unauthorized'}), 401
        g.user_id = row['user_id']
        return f(*args, **kwargs)
    return decorated

# ── Auth ───────────────────────────────────────────────────
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username=?',
                      (data.get('username', ''),)).fetchone()
    if not user or user['pin_hash'] != hash_pin(str(data.get('pin', ''))):
        return jsonify({'error': 'invalid credentials'}), 401
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat()
    db.execute('INSERT INTO sessions VALUES (?,?,?)', (token, user['id'], expires))
    db.commit()
    return jsonify({'token': token, 'username': user['username']})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    pin = str(data.get('pin') or '')
    if not username or not pin:
        return jsonify({'error': 'missing fields'}), 400
    try:
        get_db().execute('INSERT INTO users (username, pin_hash) VALUES (?,?)',
                         (username, hash_pin(pin)))
        get_db().commit()
        return jsonify({'ok': True}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'username taken'}), 409

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def me():
    db = get_db()
    user = db.execute('SELECT id, username FROM users WHERE id=?',
                      (g.user_id,)).fetchone()
    return jsonify(dict(user))

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    get_db().execute('DELETE FROM sessions WHERE token=?', (token,))
    get_db().commit()
    return jsonify({'ok': True})

@app.route('/api/auth/pin', methods=['PATCH'])
@require_auth
def change_pin():
    data = request.get_json()
    current = str(data.get('current') or '')
    new_pin = str(data.get('new') or '')
    if not current or not new_pin:
        return jsonify({'error': 'missing fields'}), 400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (g.user_id,)).fetchone()
    if user['pin_hash'] != hash_pin(current):
        return jsonify({'error': 'wrong pin'}), 401
    db.execute('UPDATE users SET pin_hash=? WHERE id=?', (hash_pin(new_pin), g.user_id))
    db.commit()
    return jsonify({'ok': True})

# ── Sync ───────────────────────────────────────────────────
@app.route('/api/sync', methods=['GET'])
@require_auth
def sync():
    db = get_db()
    items = [dict(r) for r in db.execute(
        'SELECT * FROM items WHERE hh_id=? ORDER BY category, name', (g.user_id,)).fetchall()]
    memos = [dict(r) for r in db.execute(
        "SELECT * FROM memos WHERE hh_id=? AND status NOT IN ('recorded','deleted') ORDER BY created_at DESC",
        (g.user_id,)).fetchall()]
    purchases = [dict(r) for r in db.execute(
        'SELECT * FROM purchases WHERE hh_id=? ORDER BY date DESC, created_at DESC',
        (g.user_id,)).fetchall()]
    return jsonify({'items': items, 'memos': memos, 'purchases': purchases})

# ── Items ──────────────────────────────────────────────────
@app.route('/api/items/<iid>', methods=['PATCH'])
@require_auth
def update_item(iid):
    data = request.get_json()
    cols = {k: data[k] for k in ('name', 'category', 'keywords', 'untracked') if k in data}
    if not cols:
        return jsonify({'error': 'no fields'}), 400
    sets = ', '.join(f'{k}=?' for k in cols)
    get_db().execute(f'UPDATE items SET {sets} WHERE id=? AND hh_id=?',
                     list(cols.values()) + [iid, g.user_id])
    get_db().commit()
    return jsonify({'ok': True})

@app.route('/api/items', methods=['POST'])
@require_auth
def add_item():
    data = request.get_json()
    iid = data.get('id') or uid()
    get_db().execute(
        'INSERT OR REPLACE INTO items (id, hh_id, name, category, keywords) VALUES (?,?,?,?,?)',
        (iid, g.user_id, data['name'].strip(),
         data.get('category', 'その他'), data.get('keywords', '')))
    get_db().commit()
    return jsonify({'id': iid}), 201

# ── Memos ──────────────────────────────────────────────────
@app.route('/api/memos', methods=['POST'])
@require_auth
def add_memo():
    data = request.get_json()
    mid = data.get('id') or uid()
    get_db().execute(
        'INSERT OR REPLACE INTO memos (id, hh_id, item_id, text, status, quantity, created_at) VALUES (?,?,?,?,?,?,?)',
        (mid, g.user_id, data.get('item_id'), data['text'].strip(),
         'pending', data.get('quantity', 1), data.get('created_at') or now_iso()))
    get_db().commit()
    return jsonify({'id': mid}), 201

@app.route('/api/memos/<mid>', methods=['PATCH'])
@require_auth
def update_memo(mid):
    data = request.get_json()
    cols = {k: data[k] for k in ('status', 'item_id', 'quantity', 'text') if k in data}
    if not cols:
        return jsonify({'error': 'no fields'}), 400
    sets = ', '.join(f'{k}=?' for k in cols)
    get_db().execute(f'UPDATE memos SET {sets} WHERE id=? AND hh_id=?',
                     list(cols.values()) + [mid, g.user_id])
    get_db().commit()
    return jsonify({'ok': True})

@app.route('/api/memos/<mid>', methods=['DELETE'])
@require_auth
def delete_memo(mid):
    get_db().execute("UPDATE memos SET status='deleted' WHERE id=? AND hh_id=?",
                     (mid, g.user_id))
    get_db().commit()
    return jsonify({'ok': True})

# ── Record（一括記録） ──────────────────────────────────────
@app.route('/api/record', methods=['POST'])
@require_auth
def batch_record():
    data = request.get_json()
    db = get_db()
    today = now_iso()[:10]
    for rec in data.get('records', []):
        item_id = rec.get('item_id')
        if item_id:
            item = db.execute('SELECT id FROM items WHERE id=? AND hh_id=?',
                              (item_id, g.user_id)).fetchone()
            if item:
                db.execute(
                    'INSERT INTO purchases (id, hh_id, item_id, quantity, date) VALUES (?,?,?,?,?)',
                    (uid(), g.user_id, item_id,
                     rec.get('quantity', 1), rec.get('date') or today))
        memo_id = rec.get('memo_id')
        if memo_id:
            db.execute("UPDATE memos SET status='recorded' WHERE id=? AND hh_id=?",
                       (memo_id, g.user_id))
    db.commit()
    return jsonify({'ok': True}), 201

# ── Purchases ──────────────────────────────────────────────
@app.route('/api/purchases/<pid>', methods=['DELETE'])
@require_auth
def delete_purchase(pid):
    get_db().execute('DELETE FROM purchases WHERE id=? AND hh_id=?', (pid, g.user_id))
    get_db().commit()
    return jsonify({'ok': True})

@app.route('/api/items/<iid>/purchases', methods=['DELETE'])
@require_auth
def delete_item_purchases(iid):
    get_db().execute('DELETE FROM purchases WHERE item_id=? AND hh_id=?', (iid, g.user_id))
    get_db().commit()
    return jsonify({'ok': True})

# ── Data reset ─────────────────────────────────────────────
@app.route('/api/data', methods=['DELETE'])
@require_auth
def reset_data():
    db = get_db()
    db.execute('DELETE FROM purchases WHERE hh_id=?', (g.user_id,))
    db.execute('DELETE FROM memos WHERE hh_id=?', (g.user_id,))
    db.execute('DELETE FROM items WHERE hh_id=?', (g.user_id,))
    db.commit()
    return jsonify({'ok': True})

# ── Health ─────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({'ok': True, 'time': now_iso(), 'version': '3.1.0'})

# ── Static ─────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
