/**
 * Lumè — Discord Rich Presence (RPC) Controller
 * ─────────────────────────────────────────────────────────────
 * Run this ON YOUR LAPTOP (where Discord desktop is open).
 * It connects to your local Discord client via IPC and lets you
 * control your own activity/presence remotely via:
 *
 *   1. CLI args:  node rpc.js dnd watching "A Movie"
 *   2. HTTP API:  POST http://localhost:3001/rpc  { ... }
 *                 (your dashboard can call this)
 *
 * Usage (CLI):
 *   node rpc.js [status] [type] [details] [state]
 *
 *   node rpc.js online playing "Lumè Bot" "Writing code"
 *   node rpc.js dnd watching "A Movie" "Scene 1"
 *   node rpc.js idle listening "Lo-Fi Beats" "Chill playlist"
 *   node rpc.js clear   ← clears your presence
 * ─────────────────────────────────────────────────────────────
 */

const DiscordRPC = require('discord-rpc');
const express    = require('express');
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Config ────────────────────────────────────────────────────
const CLIENT_ID  = process.env.DISCORD_CLIENT_ID || '1479900931750494388';
const RPC_PORT   = process.env.RPC_PORT || 3001;

// Activity type map
const TYPE_MAP = {
    playing:    0, play:      0, p: 0,
    streaming:  1, stream:    1,
    listening:  2, listen:    2, l: 2,
    watching:   3, watch:     3, w: 3,
    competing:  5, compete:   5, c: 5,
};

const STATUS_MAP = {
    online:    'online',
    idle:      'idle',
    dnd:       'dnd',
    invisible: 'invisible',
    offline:   'invisible',
};

// ── RPC Client ────────────────────────────────────────────────
DiscordRPC.register(CLIENT_ID);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let connected = false;

async function setActivity(opts = {}) {
    if (!connected) throw new Error('RPC not connected to Discord desktop app yet.');

    const {
        type    = 0,
        details = '',    // top line under game name
        state   = '',    // bottom line
        name    = 'Lumè',
        startTimestamp = true,
        largeImageKey  = null,
        largeImageText = null,
        smallImageKey  = null,
        smallImageText = null,
        buttons        = [],
    } = opts;

    const activity = {
        details: details || undefined,
        state:   state   || undefined,
        type,
        largeImageKey:  largeImageKey  || undefined,
        largeImageText: largeImageText || undefined,
        smallImageKey:  smallImageKey  || undefined,
        smallImageText: smallImageText || undefined,
        buttons: buttons.length ? buttons : undefined,
    };

    if (startTimestamp) {
        activity.startTimestamp = new Date();
    }

    await rpc.setActivity(activity);
    console.log(`[RPC] Activity set → type:${type} | "${details}" / "${state}"`);
}

async function clearActivity() {
    if (!connected) throw new Error('RPC not connected.');
    await rpc.clearActivity();
    console.log('[RPC] Activity cleared.');
}

// ── HTTP API (so the dashboard can call this) ──────────────────
const app = express();
app.use(express.json());

// POST /rpc
// Body: { type, details, state, startTimestamp?, buttons? }
app.post('/rpc', async (req, res) => {
    try {
        if (req.body.clear) {
            await clearActivity();
            return res.json({ ok: true, action: 'cleared' });
        }
        await setActivity(req.body);
        res.json({ ok: true, action: 'set', data: req.body });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /rpc/status
app.get('/rpc/status', (req, res) => {
    res.json({ connected, clientId: CLIENT_ID });
});

app.listen(RPC_PORT, () => {
    console.log(`[RPC API] Listening on http://localhost:${RPC_PORT}`);
    console.log(`  POST /rpc         — set activity`);
    console.log(`  GET  /rpc/status  — connection check`);
});

// ── CLI mode ──────────────────────────────────────────────────
function parseCLI() {
    const argv = process.argv.slice(2);
    if (!argv.length) return null;

    if (argv[0] === 'clear') return { clear: true };

    let idx = 0;
    const status  = STATUS_MAP[argv[idx]?.toLowerCase()] ? argv[idx++] : 'online';
    const typeKey = argv[idx]?.toLowerCase();
    const type    = TYPE_MAP[typeKey] !== undefined ? TYPE_MAP[argv[idx++].toLowerCase()] : 0;
    const details = argv[idx++] || '';
    const state   = argv[idx++] || '';

    return { type, details, state };
}

// ── Connect ───────────────────────────────────────────────────
rpc.on('ready', async () => {
    connected = true;
    const user = rpc.user;
    console.log(`[RPC] Connected to Discord as ${user?.username}#${user?.discriminator}`);

    const cli = parseCLI();
    if (cli) {
        try {
            if (cli.clear) await clearActivity();
            else           await setActivity(cli);
        } catch (e) {
            console.error('[RPC] CLI error:', e.message);
        }
        // In CLI mode stay alive so the activity persists
    } else {
        console.log('[RPC] No CLI args — API mode only. Use POST /rpc to set activity.');
    }
});

rpc.on('disconnected', () => {
    connected = false;
    console.warn('[RPC] Disconnected from Discord. Is Discord desktop running?');
    // Auto-reconnect after 10s
    setTimeout(() => {
        rpc.login({ clientId: CLIENT_ID }).catch(console.error);
    }, 10000);
});

console.log(`[RPC] Connecting to Discord desktop... (Client ID: ${CLIENT_ID})`);
rpc.login({ clientId: CLIENT_ID }).catch((err) => {
    console.error('[RPC] Failed to connect:', err.message);
    console.error('→ Make sure Discord desktop app is running on this machine.');
});
