require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Config ────────────────────────────────────────────────────────────────
const PORT          = 3000;
const CLIENT_ID     = process.env.DISCORD_CLIENT_ID || '1479900931750494388';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI  = `http://localhost:${PORT}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'lume-dashboard-secret';
const MY_ID         = '1094664981305372852';

// ── Data loaders (reuse bot's JSON files) ────────────────────────────────
const loadJSON = (p, def) => {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return def; }
};

const ROOT     = path.join(__dirname, '..');
const dataPath = (f) => path.join(ROOT, f);

// ── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 }   // 24 h
}));

// ── Auth guard ────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
    if (req.session?.user) return next();
    res.redirect('/login');
};

const requireOwner = (req, res, next) => {
    if (req.session?.user?.id === MY_ID) return next();
    res.status(403).json({ error: 'Forbidden — owner only.' });
};

// ── Routes: Pages ─────────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// ── Routes: Discord OAuth2 ─────────────────────────────────────────────────
app.get('/auth/discord', (req, res) => {
    // For web OAuth2 login, only 'identify' is valid.
    // activities.write / rpc.* are desktop RPC scopes — not usable here.
    // Presence updates are handled server-side via client.user.setPresence().
    res.redirect(
        `https://discord.com/oauth2/authorize` +
        `?client_id=${CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=identify`
    );
});

app.get('/auth/callback', async (req, res) => {
    const { code, error, error_description } = req.query;

    // Discord sends ?error=access_denied (or similar) when user cancels or scopes are invalid
    if (error) {
        console.error('[Auth] Discord error:', error, error_description);
        return res.redirect(`/login?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
        console.error('[Auth] No code in callback. Full query:', req.query);
        return res.redirect('/login?error=no_code');
    }

    try {
        // Exchange code for token
        const tokenRes = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id:     CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type:    'authorization_code',
                code,
                redirect_uri:  REDIRECT_URI,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        // Fetch Discord user
        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        req.session.user = { ...userRes.data, accessToken };
        res.redirect('/');
    } catch (err) {
        console.error('[Auth] OAuth error:', err.response?.data || err.message);
        res.redirect('/login?error=oauth_failed');
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ── Routes: API ────────────────────────────────────────────────────────────

// Current session user info
app.get('/api/me', requireAuth, (req, res) => {
    const { id, username, discriminator, avatar } = req.session.user;
    res.json({ id, username, discriminator, avatar,
        avatarUrl: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` });
});

// Bot + server stats
app.get('/api/stats', requireAuth, (req, res) => {
    const xp  = loadJSON(dataPath('xp.json'),      { users: {} });
    const eco = loadJSON(dataPath('economy.json'),  { users: {} });
    const inf = loadJSON(dataPath('info.json'),     {});

    res.json({
        totalUsers:    Object.keys(xp.users).length,
        totalEcoUsers: Object.keys(eco.users).length,
        ticketCount:   inf.ticketCount || 0,
        giveaways:     Object.keys(inf.giveaways || {}).length,
        userStatuses:  Object.keys(inf.userStatuses || {}).length,
    });
});

// Leaderboard (top 10 global XP)
app.get('/api/leaderboard', requireAuth, (req, res) => {
    const xp = loadJSON(dataPath('xp.json'), { users: {} });
    const top = Object.entries(xp.users)
        .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
        .slice(0, 10)
        .map(([id, d], i) => ({ rank: i + 1, id, xp: d.xp || 0, level: d.level || 1, messages: d.messages || 0 }));
    res.json(top);
});

// Economy top 10
app.get('/api/economy', requireAuth, (req, res) => {
    const eco = loadJSON(dataPath('economy.json'), { users: {} });
    const top = Object.entries(eco.users)
        .sort((a, b) => (b[1].money || 0) - (a[1].money || 0))
        .slice(0, 10)
        .map(([id, d], i) => ({ rank: i + 1, id, money: d.money || 0 }));
    res.json(top);
});

// User statuses (owner only)
app.get('/api/userstatuses', requireAuth, requireOwner, (req, res) => {
    const inf = loadJSON(dataPath('info.json'), {});
    res.json(inf.userStatuses || {});
});

// RPC proxy — forwards to rpc.js running locally on port 3001 (owner only)
const RPC_API = `http://localhost:${process.env.RPC_PORT || 3001}`;

app.get('/api/rpc/status', requireAuth, requireOwner, async (req, res) => {
    try {
        const r = await axios.get(`${RPC_API}/rpc/status`, { timeout: 2000 });
        res.json(r.data);
    } catch {
        res.json({ connected: false, error: 'rpc.js not running on this machine' });
    }
});

app.post('/api/rpc', requireAuth, requireOwner, async (req, res) => {
    try {
        const r = await axios.post(`${RPC_API}/rpc`, req.body, { timeout: 3000 });
        res.json(r.data);
    } catch (err) {
        res.status(502).json({ ok: false, error: 'rpc.js not reachable. Run: node rpc.js' });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[Lumè Dashboard] Running → http://localhost:${PORT}`);
});
