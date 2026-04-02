require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    AttachmentBuilder,
    PermissionFlagsBits
} = require('discord.js');
const fs         = require('fs');
const http       = require('http');
const config     = require('./config.json');
const { createCanvas } = require('canvas');

// ── Discord RPC (Rich Presence) ───────────────────────────────────────────
let DiscordRPC, rpcClient, rpcConnected = false;
try {
    DiscordRPC = require('discord-rpc');
    DiscordRPC.register(process.env.DISCORD_CLIENT_ID || '1479900931750494388');
    rpcClient  = new DiscordRPC.Client({ transport: 'ipc' });
} catch {
    console.warn('[RPC] discord-rpc not installed. Run: npm install discord-rpc');
}

const RPC_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1479900931750494388';
const RPC_PORT      = parseInt(process.env.RPC_PORT) || 3001;

const TYPE_MAP = {
    playing: 0, play: 0, p: 0,
    streaming: 1, stream: 1, s: 1,
    listening: 2, listen: 2, l: 2,
    watching: 3, watch: 3, w: 3,
    competing: 5, compete: 5, c: 5,
};

async function setRPC(opts = {}) {
    if (!rpcClient || !rpcConnected) throw new Error('RPC not connected to Discord desktop.');
    const { type = 0, details = '', state = '', startTimestamp = true } = opts;
    const activity = {
        details:  details || undefined,
        state:    state   || undefined,
        type,
        startTimestamp: startTimestamp ? new Date() : undefined,
    };
    await rpcClient.setActivity(activity);
    console.log(`[RPC] Set → type:${type} | "${details}" / "${state}"`);
}

async function clearRPC() {
    if (!rpcClient || !rpcConnected) throw new Error('RPC not connected.');
    await rpcClient.clearActivity();
    console.log('[RPC] Cleared.');
}

function startRPC() {
    if (!rpcClient) return;

    rpcClient.on('ready', () => {
        rpcConnected = true;
        const u = rpcClient.user;
        console.log(`[RPC] Connected as ${u?.username ?? 'unknown'}`);
    });

    rpcClient.on('disconnected', () => {
        rpcConnected = false;
        console.warn('[RPC] Disconnected. Retrying in 15s…');
        setTimeout(() => rpcClient.login({ clientId: RPC_CLIENT_ID }).catch(() => {}), 15000);
    });

    rpcClient.login({ clientId: RPC_CLIENT_ID }).catch(err => {
        console.warn('[RPC] Could not connect to Discord desktop:', err.message);
        console.warn('      → Is Discord desktop app running on this machine?');
    });

    // ── Tiny HTTP API so the dashboard can trigger RPC ──────────────────────
    http.createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET' && req.url === '/rpc/status') {
            return res.end(JSON.stringify({ connected: rpcConnected, clientId: RPC_CLIENT_ID }));
        }

        if (req.method === 'POST' && req.url === '/rpc') {
            let body = '';
            req.on('data', d => body += d);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    if (data.clear) { await clearRPC(); return res.end(JSON.stringify({ ok: true, action: 'cleared' })); }
                    await setRPC(data);
                    return res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
            return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
    }).listen(RPC_PORT, () => console.log(`[RPC API] Listening on http://localhost:${RPC_PORT}`));
}

// --- Global Constants & State ---
const MY_ID = "1094664981305372852";
const economyPath = './economy.json';
const infoPath = './info.json';
const xpPath = './xp.json';
const channelsPath = './channels.json';

let channelsData = { allowedChannels: [] };
let infoData = { tickets: [], ticketCount: 0, security: { maxTicketsPerUser: 1, activeTickets: {} }, afk: {}, giveaways: {}, reminders: {}, snipedMessages: {}, invites: {} };
let xpData = { users: {}, weekly: {}, daily: {}, monthly: {}, hourly: {} };
let economyData = { users: {} };

const pendingTransfers = new Map();

// --- Helper Functions (Core Operations) ---

const saveJSON = (path, data) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`[System Error] Failed to save ${path}:`, e);
    }
};

const loadJSON = (path, defaultData) => {
    if (fs.existsSync(path)) {
        try {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        } catch (e) {
            console.error(`[System Error] ${path} corrupted. Using defaults.`);
            return defaultData;
        }
    }
    return defaultData;
};

// Initial Load
channelsData = loadJSON(channelsPath, channelsData);
infoData = loadJSON(infoPath, infoData);
xpData = loadJSON(xpPath, xpData);
economyData = loadJSON(economyPath, economyData);

// Ensure new schema properties exist in loaded data
if (!infoData.snipedMessages) infoData.snipedMessages = {};
if (!infoData.invites) infoData.invites = {};
if (!infoData.reminders) infoData.reminders = {};
if (!infoData.afk) infoData.afk = {};
if (!infoData.giveaways) infoData.giveaways = {};
if (!infoData.tickets) infoData.tickets = [];
if (!infoData.security) infoData.security = { maxTicketsPerUser: 1, activeTickets: {} };

const saveConfig = () => saveJSON('./config.json', config);
const saveInfo = () => saveJSON(infoPath, infoData);
const saveXp = () => saveJSON(xpPath, xpData);
const saveEconomy = () => saveJSON(economyPath, economyData);
const saveChannels = () => saveJSON(channelsPath, channelsData);

// --- Utility Functions ---

async function sendLine(channel) {
    if (!channel || !channel.send) return;
    const file = new AttachmentBuilder('./line.png', { name: 'line.png' });
    return channel.send({ files: [file] }).catch(() => { });
}

const safeReply = async (message, content, ephemeral = false) => {
    try {
        if (typeof content === 'string') {
            return await message.reply({ content, ephemeral });
        }
        return await message.reply({ ...content, ephemeral });
    } catch (e) {
        console.error("[System Error] Failed to send reply:", e);
    }
};

const isAdmin = (member) => {
    if (!member) return false;
    return member.roles.cache.has(config.adminRoleId) || member.id === MY_ID;
};

const isOwner = (user) => {
    return user.id === MY_ID;
};

const getXPKey = (type) => {
    const now = new Date();
    if (type === 'hourly') return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
    if (type === 'daily') return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (type === 'monthly') return `${now.getFullYear()}-${now.getMonth() + 1}`;
    if (type === 'weekly') {
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
        return `${now.getFullYear()}-W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
    }
    return 'global';
};

function createCaptchaImage(text) {
    const canvas = createCanvas(180, 60);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 25; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
        ctx.lineWidth = Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }

    for (let i = 0; i < 150; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    ctx.font = 'bold 30px Courier New';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const startX = 30;
    for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.translate(startX + (i * 25), 35 + (Math.random() * 10 - 5));
        ctx.rotate((Math.random() - 0.5) * 0.6);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }
    return canvas.toBuffer();
}

async function fetchAllMessages(channel) {
    let allMessages = [];
    let lastId;
    try {
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            const messages = await channel.messages.fetch(options).catch(() => new Map());
            if (messages.size === 0) break;
            allMessages.push(...messages.values());
            lastId = messages.last().id;
            if (messages.size < 100) break;
        }
    } catch (e) {
        console.error("[System Error] Failed to fetch messages:", e);
    }
    return allMessages;
}

// --- Client Initialization ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

// --- index.js: Linking Logic ---
const { handleCommand } = require('./commands.js');
const { handleCommand2 } = require('./commands_2.js');
const { handleCommand3 } = require('./commands_3.js');
const { registerEvents } = require('./events.js');

// Core object to pass to modules
const core = { 
    client, 
    config, 
    infoData, 
    xpData, 
    economyData, 
    channelsData, 
    pendingTransfers, 
    helpers: {
        saveConfig,
        saveInfo,
        saveXp,
        saveEconomy,
        saveChannels,
        sendLine,
        safeReply,
        isAdmin,
        isOwner,
        getXPKey,
        createCaptchaImage,
        fetchAllMessages,
        setRPC,
        clearRPC,
        getRpcStatus: () => rpcConnected,
    }
};

startRPC();  // ← starts RPC connection + HTTP API (works only when Discord desktop is on this machine)

client.once('ready', () => {
    console.log(`[Lumè System] Online | Operator: ${config.credits}`);
    registerEvents(client, core);
    // RPC helpers available to commands via core.helpers.setRPC / clearRPC
});


client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;
    await channel.send(`Access granted: <@${member.id}>\nSequence: ${member.guild.memberCount}`);
    await sendLine(channel);

    const invites = await member.guild.invites.fetch();
    for (const [code, invite] of invites) {
        if (invite.inviter && invite.uses > 0) {
            infoData.invites[member.id] = invite.inviter.id;
            saveInfo();
            break;
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const mentions = message.mentions.users;
    for (const [userId, user] of mentions) {
        if (infoData.afk[userId]) {
            const afkData = infoData.afk[userId];
            message.channel.send(`<@${userId}> AFK - ${afkData.reason}`);
        }
    }

    // --- Message Logic ---
    const allowedChans = channelsData?.allowedChannels || [];
    const autoCats = config?.categories || [];
    const userIsAdmin = isAdmin(message.member);
    const userIsOwner = isOwner(message.author);

    const isInAutoCategory = autoCats.includes(message.channel.parentId);
    const isManualChannel = allowedChans.includes(message.channel.id);

    if (isInAutoCategory || isManualChannel) {
        if (userIsAdmin && message.content === "-") {
            if (message.deletable) await message.delete().catch(() => { });
            return await sendLine(message.channel);
        }
        if (message.content !== "-") {
            sendLine(message.channel).catch(() => { });
        }
    }

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const content = message.content.toLowerCase();

    // --- Forbidden Words ---
    const forbiddenWords = ["ايري", "انيكه", "قحبة", "انيك", "fuck", "shit", "bitch", "dick"];
    if (!userIsAdmin && !userIsOwner && forbiddenWords.some(w => content.includes(w))) {
        await message.delete().catch(() => { });
        const warn = await message.channel.send("System: Violating Content Removed.");
        setTimeout(() => warn.delete().catch(() => { }), 3000);
        return;
    }

    await handleCommand(message, core);
    await handleCommand2(message, core);
    await handleCommand3(message, core);

});


client.login(process.env.TOKEN);