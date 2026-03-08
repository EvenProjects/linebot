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
const fs = require('fs');
const config = require('./config.json');

const MY_ID = "1094664981305372852";
let channelsData = { allowedChannels: [] };
let infoData = { tickets: [], ticketCount: 0, security: { maxTicketsPerUser: 1, activeTickets: {} }, afk: {}, giveaways: {}, profileThemes: {} };
let xpData = { users: {}, weekly: {}, daily: {}, monthly: {}, hourly: {} };

if (fs.existsSync('./channels.json')) {
    try {
        const data = fs.readFileSync('./channels.json', 'utf8');
        channelsData = JSON.parse(data);
    } catch (e) {
        channelsData = { allowedChannels: [] };
    }
}

if (fs.existsSync('./info.json')) {
    try {
        const data = fs.readFileSync('./info.json', 'utf8');
        infoData = JSON.parse(data);
    } catch (e) {
        infoData = { tickets: [], ticketCount: 0, security: { maxTicketsPerUser: 1, activeTickets: {} }, afk: {}, giveaways: {} };
    }
}

function saveInfo() {
    fs.writeFileSync('./info.json', JSON.stringify(infoData, null, 2));
}

if (fs.existsSync('./xp.json')) {
    try {
        const data = fs.readFileSync('./xp.json', 'utf8');
        xpData = JSON.parse(data);
    } catch (e) {
        xpData = { users: {}, weekly: {}, daily: {}, monthly: {}, hourly: {} };
    }
}

function saveXp() {
    fs.writeFileSync('./xp.json', JSON.stringify(xpData, null, 2));
}

let economyData = { users: {}, dailyCooldown: {} };

if (fs.existsSync('./economy.json')) {
    try {
        const data = fs.readFileSync('./economy.json', 'utf8');
        economyData = JSON.parse(data);
    } catch (e) {
        economyData = { users: {}, dailyCooldown: {} };
    }
}

function saveEconomy() {
    fs.writeFileSync('./economy.json', JSON.stringify(economyData, null, 2));
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

function saveChannels() {
    fs.writeFileSync('./channels.json', JSON.stringify(channelsData, null, 2));
}

function sendLine(channel) {
    const file = new AttachmentBuilder(path.join(__dirname, config.lineUrl), { name: 'line.png' });
    return channel.send({ files: [file] }).catch((err) => console.error("Line sending failed:", err));
}
 
async function fetchAllMessages(channel) {
    let allMessages = [];
    let lastId;
    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const messages = await channel.messages.fetch(options).catch(() => new Map());
        if (messages.size === 0) break;
        allMessages.push(...messages.values());
        lastId = messages.last().id;
        if (messages.size < 100) break;
    }
    return allMessages;
}

client.once('ready', () => {
    console.log(`Lumè System Online | Operator: ${config.credits}`);
});

client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;
    await channel.send(`Access granted: <@${member.id}>\nSequence: ${member.guild.memberCount}`);
    await sendLine(channel);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    if (infoData.afk[message.author.id]) {
        delete infoData.afk[message.author.id];
        saveInfo();
    }
    
    const mentions = message.mentions.users;
    for (const [userId, user] of mentions) {
        if (infoData.afk[userId]) {
            const afkData = infoData.afk[userId];
            message.channel.send(`<@${userId}> AFK - ${afkData.reason}`);
        }
    }

    const allowedChans = channelsData?.allowedChannels || [];
    const autoCats = config?.categories || [];
    const isAdmin = message.member.roles.cache.has(config.adminRoleId);
    const isOwner = message.author.id === MY_ID;

    const isInAutoCategory = autoCats.includes(message.channel.parentId);
    const isManualChannel = allowedChans.includes(message.channel.id);

if (isInAutoCategory || isManualChannel) {
        if (isAdmin && message.content === "-") {
            return await sendLine(message.channel);
        }
        if (message.content !== "-") {
            sendLine(message.channel).catch(() => {});
        }
    }

    const content = message.content.toLowerCase();
const args = message.content.trim().split(/ +/);
const cmd = args.shift().toLowerCase();
if (message.author.bot) return;










































if (config.allowedChannels.includes(message.channel.id)) {
    if (message.content !== "-") {
        await sendLine(message.channel);
    }
}
    if (cmd === 'up' && (isOwner)) {
        const os = require('os');
        
        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const pings = client.ws.ping;

        const statusReport = [
            "**[ Lumè System Diagnostics ]**",
            `> **Operational Status:** Functional`,
            `> **System Uptime:** ${uptimeString}`,
            `> **Ping:** ${pings}ms`,
            `> **Memory:** ${memoryUsage} MB / ${ramTotal} GB`,
            `> **CPU Architecture:** ${os.arch()}`,
            `> **Node Version:** ${process.version}`,
            `> **Active Assets:** ${client.guilds.cache.size} Servers | ${client.users.cache.size} Users`,
            `> **Operator:** Alexander`,
            "---",
            `System Log: Synchronized.`
        ].join('\n');

await message.channel.send(statusReport);
        await sendLine(message.channel);
        
        if (message.deletable) await message.delete().catch(() => {});
    }

// Pseudo-Voice Commands Layer
if (cmd.startsWith('--')) {
    const action = cmd.replace('--', '');
    const loadingMsg = await message.channel.send(`System: [${action.toUpperCase()}] Command received. Processing deep-scan...`);
    
    setTimeout(async () => {
        if (action === 'scan') {
            const members = message.guild.memberCount;
            await loadingMsg.edit(`System: [SCAN COMPLETE]\n> Sector: ${message.guild.name}\n> Active Signatures: ${members}\nStatus: Verified.`);
        } else if (action === 'sync') {
            await loadingMsg.edit(`System: [SYNCHRONIZATION COMPLETE]\n> Database: Secured\n> Access Token: Active\nOperator: Alexander.`);
        } else {
            await loadingMsg.edit(`System: [ERROR] Unknown flag --${action}. Access Denied.`);
        }
    }, 2000); // محاكاة وقت المعالجة
}


    if (cmd === 'clear' && (isAdmin || isOwner)) {
        const targetChannel = message.mentions.channels.first() || message.channel;
        const targetUser = message.mentions.users.first();
        
        const amountArg = args.find(arg => !isNaN(arg) && arg !== '');
        let amount = parseInt(amountArg);

        if (!amount || amount < 1 || amount > 2000) {
            return message.reply("Parameter range: 1-2000 units.");
        }

        try {
            if (targetUser) {
                const messages = await message.channel.messages.fetch({ limit: 100 });
                const userMessages = messages.filter(m => m.author.id === targetUser.id).first(amount);
                
                if (userMessages.length > 0) {
                    await message.channel.bulkDelete(userMessages, true);
                    return message.channel.send(`System: ${userMessages.length} Unit purged from ${targetUser.username}.`)
                        .then(m => setTimeout(() => m.delete(), 3000));
                } else {
                    return message.reply("No recent data units found for specified user.");
                }
            }

            let remaining = amount;
            let totalDeleted = 0;

            while (remaining > 0) {
                const batchSize = remaining > 100 ? 100 : remaining;
                const deleted = await targetChannel.bulkDelete(batchSize, true);
                
                if (deleted.size === 0) break; 
                
                totalDeleted += deleted.size;
                remaining -= batchSize;

                if (remaining > 0) await new Promise(res => setTimeout(res, 1000));
            }

            const feedback = targetChannel.id === message.channel.id 
                ? `System: Operation complete. ${totalDeleted} units purged.`
                : `System: Purge complete in <#${targetChannel.id}>. Total: ${totalDeleted} units.`;
            
            message.channel.send(feedback).then(m => setTimeout(() => m.delete(), 3000));

            if (message.deletable) await message.delete().catch(() => {});

        } catch (err) {
            console.error(err);
            message.reply("Error: Data integrity failure. Messages exceed 14-day archival limit.");
        }
    }
    if (message.content === 'Support' || message.content === 'Dev' || message.content === 'Rights' ) {
        message.reply(`Developed by ${config.credits}.\nStatus: Operational.`);
    }
if (content === 'us' && isOwner) {
        const statusMsg = await message.reply("Database analysis in progress...");
        
        const scanCategory = async (catId) => {
            let msgCount = 0, fileCount = 0;
            const cat = message.guild.channels.cache.get(catId);
            if (cat && cat.children && cat.children.cache) {
                for (const ch of Array.from(cat.children.cache.values())) {
                    if (ch.isTextBased()) {
                        const msgs = await fetchAllMessages(ch);
                        msgCount += msgs.length;
                        fileCount += msgs.reduce((acc, m) => acc + m.attachments.size, 0);
                    }
                }
            }
            return { msgCount, fileCount };
        };
        
        const img = await scanCategory('1467095726747029536');
        const quote = await scanCategory('1479623065540362381');
        const info = await scanCategory('1479624119594123324');
        const dev = await scanCategory('1479847656321712158');
        
        const report = [
            "**Lumè Database Report**",
            `Visual Assets: ${img.fileCount} Images`,
            `Archive Messages: ${quote.msgCount} Quotes`,
            `Info Messages: ${info.msgCount} Infos`,
            `Developers: ${dev.msgCount} Projects`,
            `Total Units: ${img.msgCount + quote.msgCount + info.msgCount + dev.msgCount}`,
            `Status: Synchronized`,
            `Verified by: ${config.credits}`
        ].join('\n');

        const logCh = message.guild.channels.cache.get(config.statsChannelId);
        if (logCh) {
            await logCh.send(report);
            await sendLine(logCh);
        }
        await statusMsg.edit("Database updated successfully.");
    }

   if (content === 'ts' && isOwner) {
const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('t_open')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Secondary)
        );
        
        await message.channel.send({ 
            content: "Lumè Support System\nInitialize inquiry via button below.", 
            components: [row] 
        });
        if (message.deletable) await message.delete();
    }
    
    if (content === 'addl' && (isAdmin || isOwner)) {
        const targetChannel = message.mentions.channels.first() || message.channel;
        
        if (targetChannel.type !== ChannelType.GuildText) {
            return message.reply("Synchronization restricted to text channels.");
        }

        if (!config.allowedChannels.includes(targetChannel.id)) {
            config.allowedChannels.push(targetChannel.id);
            
            saveConfig(); 
            
            message.reply(`Auto-line activated for <#${targetChannel.id}>.`);
        } else {
            message.reply("Synchronization already active for this channel.");
        }
    }
    if (cmd === 'check' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first() || message.member;
        const user = member.user;

        const report = [
            `**[ Scanning Digital Info: ${user.username} ]**`,
            `> **UID:** ${user.id}`,
            `> **Join Date:** ${member.joinedAt.toDateString()}`,
            `> **Account Creation:** ${user.createdAt.toDateString()}`,
            `> **Role Clearance:** ${member.roles.highest.name}`,
            `> **Integrity Status:** ${member.permissions.has(PermissionFlagsBits.Administrator) ? "Absolute" : "Standard"}`,
            `> **Sector Access:** ${message.channel.name}`,
            "---",
            `System: Database Match Confirmed.`
        ].join('\n');

const lineEmbed = new EmbedBuilder()
            .setImage(config.lineUrl)
            .setColor('#2b2d31');
        await message.channel.send({ content: report, embeds: [lineEmbed] });
        if (message.deletable) await message.delete();
    }
    if (content === 'rml' && (isAdmin || isOwner)) {
        const targetChannel = message.mentions.channels.first() || message.channel;
        
        if (config.allowedChannels.includes(targetChannel.id)) {
            config.allowedChannels = config.allowedChannels.filter(id => id !== targetChannel.id);
            
            saveConfig();
            
            message.reply(`Auto-line deactivated for <#${targetChannel.id}>.`);
        } else {
            message.reply("Synchronization not active for this channel.");
        }
    }

    if (cmd === 'img' && (isAdmin || isOwner)) {
        const targetChannel = message.mentions.channels.first();
        
        if (!targetChannel) {
            return message.reply("Mention a channel. img #room");
        }

        const attachments = message.attachments;
        
        if (attachments.size === 0) {
            return message.reply("Attach an image to send.");
        }

        try {
            for (const attachment of attachments.values()) {
                await targetChannel.send({ files: [attachment.url] });
            }
            await sendLine(targetChannel);
            message.reply(`Image sent to <#${targetChannel.id}>.`);
            if (message.deletable) await message.delete();
        } catch (err) {
            console.error(err);
            message.reply("Image transmission failed.");
        }
    }

    if (cmd === 'colorroles' && isOwner) {
        const targetChannel = message.mentions.channels.first();
        if (!targetChannel) return message.reply("colorroles #channel");
        
        const colors = [
            { name: "Red", color: "#FF0000", emoji: "🔴" },
            { name: "Blue", color: "#0000FF", emoji: "🔵" },
            { name: "Green", color: "#00FF00", emoji: "🟢" },
            { name: "Yellow", color: "#FFFF00", emoji: "🟡" },
            { name: "Purple", color: "#800080", emoji: "🟣" },
            { name: "Orange", color: "#FFA500", emoji: "🟠" },
            { name: "Pink", color: "#FFC0CB", emoji: "🩷" },
            { name: "Black", color: "#000000", emoji: "⚫" }
        ];
        
        const colorEmbed = new EmbedBuilder()
            .setTitle("Color Roles")
            .setDescription("React to get a color role!")
            .setColor('#2b2d31');
        
        const msg = await targetChannel.send({ embeds: [colorEmbed] });
        
        for (const c of colors) {
            await msg.react(c.emoji);
        }
        
        infoData.colorRoles = {
            messageId: msg.id,
            channelId: targetChannel.id,
            roles: {}
        };
        saveInfo();
        
        message.reply("Color roles message created.").then(m => setTimeout(() => m.delete(), 3000));
    }

    if (cmd === 'settheme' && isOwner) {
        const url = args[0];
        if (!url) return message.reply("settheme <url>");
        config.profileTheme = url;
        saveConfig();
        message.reply("Profile theme updated.").then(m => setTimeout(() => m.delete(), 3000));
    }
    
if (content.startsWith('st ') && isOwner) {
        const argsWithoutCmd = args.slice(1);
        const status = argsWithoutCmd[0];
        const activity = argsWithoutCmd.slice(1).join(' ');
        
        if (status && activity) {
            const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
            if (validStatuses.includes(status)) {
                client.user.setPresence({
                    activities: [{ name: activity, type: 0 }],
                    status: status
                });
                message.reply("Status updated.").then(m => setTimeout(() => m.delete(), 3000));
                if (message.deletable) await message.delete();
            }
        }
    }

if (cmd === 'rank' || cmd === 'r') {
        const target = message.mentions.members.first() || message.member;
        const userId = target.user.id;
        const userData = xpData.users[userId] || { xp: 0, level: 1, messages: 0 };
        const money = economyData.users[userId]?.money || 0;
        const requiredXp = userData.level * 100;
        const progress = Math.floor((userData.xp / requiredXp) * 20);
        const progressBar = "▓".repeat(progress) + "░".repeat(20 - progress);
        
        const rankEmbed = new EmbedBuilder()
            .setTitle(target.user.username)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "Level", value: `${userData.level}`, inline: true },
                { name: "XP", value: `${userData.xp}/${requiredXp}`, inline: true },
                { name: "Messages", value: `${userData.messages}`, inline: true },
                { name: "Progress", value: `${progressBar}`, inline: false },
                { name: "Money", value: `${money}`, inline: true }
            )
            .setColor('#2b2d31');
        
        await message.channel.send({ embeds: [rankEmbed] });
    }

    if (cmd === 'p' || cmd === 'profile') {
        const target = message.mentions.members.first() || message.member;
        const userId = target.user.id;
        const userData = xpData.users[userId] || { xp: 0, level: 1, messages: 0 };
        const money = economyData.users[userId]?.money || 0;
        
        const globalRank = Object.entries(xpData.users)
            .sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
            .findIndex(([id]) => id === userId) + 1;
        
        const profileEmbed = new EmbedBuilder()
            .setTitle(target.user.username)
            .setImage(config.profileTheme || null)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "Level", value: `${userData.level}`, inline: true },
                { name: "Global Rank", value: `#${globalRank}`, inline: true },
                { name: "XP", value: `${userData.xp}`, inline: true },
                { name: "Money", value: `${money}`, inline: true },
                { name: "Messages", value: `${userData.messages}`, inline: true },
                { name: "Joined", value: `${target.joinedAt.toDateString()}`, inline: true }
            )
            .setColor('#2b2d31')
            .setFooter({ text: `ID: ${userId}` })
            .setTimestamp();
        
        await message.channel.send({ embeds: [profileEmbed] });
    }

    if (cmd === 't') {
        const target = message.mentions.members.first() || message.member;
        const userId = target.user.id;
        const userData = xpData.users[userId] || { xp: 0, level: 1, messages: 0 };
        const money = economyData.users[userId]?.money || 0;
        
        const globalRank = Object.entries(xpData.users)
            .sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
            .findIndex(([id]) => id === userId) + 1;
        
        await message.channel.send({
            content: `${target.user.displayAvatarURL()}`
        });
        await message.channel.send(`**${target.user.username}**\nLevel: ${userData.level}\nRank: #${globalRank}\nMoney: ${money}`);
    }

    if (cmd === 'top' && (isAdmin || isOwner)) {
        const type = args[0]?.toLowerCase();
        let leaderboard = [];
        let title = "";
        
        const now = new Date();
        
        if (type === 'w' || type === 'week') {
            leaderboard = Object.entries(xpData.weekly || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0)).slice(0, 10);
            title = "Weekly Leaderboard";
        } else if (type === 'd' || type === 'day') {
            leaderboard = Object.entries(xpData.daily || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0)).slice(0, 10);
            title = "Daily Leaderboard";
        } else if (type === 'm' || type === 'month') {
            leaderboard = Object.entries(xpData.monthly || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0)).slice(0, 10);
            title = "Monthly Leaderboard";
        } else if (type === 'h' || type === 'hour') {
            leaderboard = Object.entries(xpData.hourly || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0)).slice(0, 10);
            title = "Hourly Leaderboard";
        } else {
            leaderboard = Object.entries(xpData.users || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0)).slice(0, 10);
            title = "Global Leaderboard";
        }
        
if (leaderboard.length === 0) {
            return message.reply("No data available.");
        }
        
        const fields = [];
        for (let i = 0; i < leaderboard.length; i++) {
            const [userId, data] = leaderboard[i];
            fields.push({ name: `#${i + 1}`, value: `<@${userId}>\n${data?.xp || 0} XP`, inline: true });
        }
        
        const topEmbed = new EmbedBuilder()
            .setTitle(title)
            .addFields(fields)
            .setColor('#2b2d31')
            .setTimestamp();
        
        await message.channel.send({ embeds: [topEmbed] });
    }

    if (cmd === 'suggest' || cmd === 'sug') {
        const suggestion = args.join(' ');
        if (!suggestion) {
            return message.reply("Enter a suggestion. suggest <message>");
        }
        
        const suggestCh = message.guild.channels.cache.get('1467492786205884508');
        if (!suggestCh) {
            return message.reply("Suggestion channel not found.");
        }
        
        const suggestEmbed = new EmbedBuilder()
            .setTitle("New Suggestion")
            .setDescription(suggestion)
            .setColor('#2b2d31')
            .setFooter({ text: `From: ${message.author.tag} | ID: ${message.author.id}` })
            .setTimestamp();
        
        const suggestRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sug_up_${message.author.id}`)
                .setLabel('⬆')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`sug_down_${message.author.id}`)
                .setLabel('⬇')
                .setStyle(ButtonStyle.Secondary)
        );
        
        await suggestCh.send({ embeds: [suggestEmbed], components: [suggestRow] });
        message.reply("Submitted.").then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete();
    }

    if (cmd === 'afk') {
        const reason = args.join(' ') || "No reason";
        infoData.afk[message.author.id] = {
            reason: reason,
            time: new Date().toISOString()
        };
        saveInfo();
        message.reply("AFK set.").then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete();
    }

    if (cmd === 'gstart' && (isAdmin || isOwner)) {
        const duration = parseInt(args[0]);
        const prize = args.slice(1).join(' ');
        
        if (!duration || !prize) {
            return message.reply("gstart <minutes> <prize>");
        }
        
        const endTime = Date.now() + (duration * 60 * 1000);
        const giveawayId = Date.now().toString();
        
        infoData.giveaways[giveawayId] = {
            prize: prize,
            endTime: endTime,
            channelId: message.channel.id,
            participants: [],
            messageId: null
        };
        saveInfo();
        
        const giveawayEmbed = new EmbedBuilder()
            .setTitle("Giveaway")
            .setDescription(`**Prize:** ${prize}\n**Time:** ${duration} minutes\n**Participants:** 0`)
            .setColor('#2b2d31')
            .setFooter({ text: `Ends` })
            .setTimestamp(endTime);
        
        const giveawayRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`gw_join_${giveawayId}`)
                .setLabel('Join')
                .setStyle(ButtonStyle.Success)
        );
        
        const gwMsg = await message.channel.send({ embeds: [giveawayEmbed], components: [giveawayRow] });
        infoData.giveaways[giveawayId].messageId = gwMsg.id;
        saveInfo();
        
        setTimeout(async () => {
            const gw = infoData.giveaways[giveawayId];
            if (!gw) return;
            
            if (gw.participants.length === 0) {
                await message.channel.send(`Giveaway ended. No winners.`);
            } else {
                const winner = gw.participants[Math.floor(Math.random() * gw.participants.length)];
                await message.channel.send(`**Winner:** <@${winner}> | Prize: ${gw.prize}`);
            }
            
            delete infoData.giveaways[giveawayId];
            saveInfo();
        }, duration * 60 * 1000);
        
        if (message.deletable) await message.delete();
    }

    if (cmd === 'ban' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || "No reason";
        if (!member) return message.reply("ban @user <reason>");
        try {
            await member.ban({ reason: reason });
            message.reply(`Banned: ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot ban user.");
        }
    }

    if (cmd === 'kick' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || "No reason";
        if (!member) return message.reply("kick @user <reason>");
        try {
            await member.kick(reason);
            message.reply(`Kicked: ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot kick user.");
        }
    }

    if (cmd === 'timeout' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const minutes = parseInt(args[1]);
        if (!member || !minutes) return message.reply("timeout @user <minutes>");
        try {
            await member.timeout(minutes * 60 * 1000);
            message.reply(`Timeout: ${member.user.tag} for ${minutes} minutes`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot timeout user.");
        }
    }

    if (cmd === 'nickname' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const nickname = args.slice(1).join(' ');
        if (!member || !nickname) return message.reply("nickname @user <name>");
        try {
            await member.setNickname(nickname);
            message.reply(`Nickname set for ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot set nickname.");
        }
    }

    if (cmd === 'addrole' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply("addrole @user @role");
        try {
            await member.roles.add(role);
            message.reply(`Role added to ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot add role.");
        }
    }

    if (cmd === 'removerole' && (isAdmin || isOwner)) {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply("removerole @user @role");
        try {
            await member.roles.remove(role);
            message.reply(`Role removed from ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
            if (message.deletable) await message.delete();
        } catch (e) {
            message.reply("Error: Cannot remove role.");
        }
    }

    if (cmd === 'daily') {
        const userId = message.author.id;
        const now = Date.now();
        const lastDaily = economyData.dailyCooldown[userId] || 0;
        const cooldown = 24 * 60 * 60 * 1000;
        
        if (now - lastDaily < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastDaily)) / (1000 * 60));
            return message.reply(`Daily already claimed. Next in ${remaining} minutes.`);
        }
        
        const dailyAmount = Math.floor(Math.random() * 500) + 500;
        if (!economyData.users[userId]) economyData.users[userId] = { money: 0 };
        economyData.users[userId].money += dailyAmount;
        economyData.dailyCooldown[userId] = now;
        saveEconomy();
        
        message.reply(`Daily: +${dailyAmount} coins`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (cmd === 'c') {
        const userId = message.author.id;
        const target = message.mentions.users.first();
        
        if (target) {
            const amount = parseInt(args[1]);
            if (!amount || amount <= 0) return message.reply("c @user <amount>");
            if (!economyData.users[userId] || economyData.users[userId].money < amount) {
                return message.reply("Insufficient funds.");
            }
            if (!economyData.users[target.id]) economyData.users[target.id] = { money: 0 };
            economyData.users[userId].money -= amount;
            economyData.users[target.id].money += amount;
            saveEconomy();
            message.reply(`Transferred ${amount} To <@${target.id}>`).then(m => setTimeout(() => m.delete(), 3000));
        } else {
            const money = economyData.users[userId]?.money || 0;
            message.reply(`Balance: ${money}`).then(m => setTimeout(() => m.delete(), 5000));
        }
    }

    const userId = message.author.id;
    const xpGain = Math.floor(Math.random() * 5) + 1;
    
    if (!xpData.users[userId]) {
        xpData.users[userId] = { xp: 0, level: 1, messages: 0 };
    }
    xpData.users[userId].xp += xpGain;
    xpData.users[userId].messages += 1;
    
    const userXp = xpData.users[userId];
    const requiredXp = userXp.level * 100;
    if (userXp.xp >= requiredXp) {
        userXp.level++;
        message.channel.send(`<@${userId}> Level ${userXp.level}`).then(m => setTimeout(() => m.delete(), 5000));
    }
    
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const date = new Date().toDateString();
    const hourKey = `${date}_${hour}`;
    
    if (!xpData.hourly[userId]) xpData.hourly[userId] = { xp: 0 };
    xpData.hourly[userId].xp += xpGain;
    
    if (!xpData.daily[userId]) xpData.daily[userId] = { xp: 0, date: date };
    if (xpData.daily[userId].date !== date) {
        xpData.daily[userId] = { xp: xpGain, date: date };
    } else {
        xpData.daily[userId].xp += xpGain;
    }
    
    const month = new Date().getMonth();
    const monthKey = `${new Date().getFullYear()}_${month}`;
    if (!xpData.monthly[userId]) xpData.monthly[userId] = { xp: 0, month: monthKey };
    if (xpData.monthly[userId].month !== monthKey) {
        xpData.monthly[userId] = { xp: xpGain, month: monthKey };
    } else {
        xpData.monthly[userId].xp += xpGain;
    }
    
    const weekStart = Math.floor(new Date().getTime() / (7 * 24 * 60 * 60 * 1000));
    if (!xpData.weekly[userId]) xpData.weekly[userId] = { xp: 0, week: weekStart };
    if (xpData.weekly[userId].week !== weekStart) {
        xpData.weekly[userId] = { xp: xpGain, week: weekStart };
    } else {
        xpData.weekly[userId].xp += xpGain;
    }
    
    saveXp();

});


const getTimestamp = () => new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + " UTC";



const forbiddenWords = ["word1", "word2"]; 

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const hasViolation = forbiddenWords.some(word => message.content.toLowerCase().includes(word));
    if (hasViolation) {
        await message.delete();
        const encrypted = message.content.split('').map(() => Math.round(Math.random())).join('');
        const warning = await message.channel.send(`System: Unauthorized word detected. \`${encrypted}\`\n**Action:** Original data removed. Review channel guidelines.`);
        setTimeout(() => warning.delete(), 5000);
    }
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (oldMsg.author.bot || oldMsg.content === newMsg.content) return;
    const logCh = client.channels.cache.get(config.logChannelId);
    if (!logCh) return;

    const logEntry = [
        "**[ Operation Log: Message Edit ]**",
        `> **User:** ${oldMsg.author.tag} (${oldMsg.author.id})`,
        `> **Sector:** <#${oldMsg.channel.id}>`,
        `> **Pre-Data:** ${oldMsg.content}`,
        `> **Post-Data:** ${newMsg.content}`,
        `> **Status:** Captured.`
    ].join('\n');

await logCh.send(logEntry);
    await sendLine(logCh);
});
client.on('guildMemberAdd', (member) => {
    const logCh = member.guild.channels.cache.get(config.logChannelId);
    if (!logCh) return;
    logCh.send(`Entry Log\nUser: ${member.user.tag}\nID: ${member.id}\nTime: ${getTimestamp()}`);
});

client.on('guildMemberRemove', (member) => {
    const logCh = member.guild.channels.cache.get(config.logChannelId);
    if (!logCh) return;
logCh.send(`Exit Log\nUser: ${member.user.tag}\nID: ${member.id}\nTime: ${getTimestamp()}`);
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (!infoData.colorRoles) return;
    
    const { messageId, channelId, roles } = infoData.colorRoles;
    if (reaction.message.id !== messageId) return;
    
    const colors = [
        { name: "Red", color: "#FF0000", emoji: "🔴" },
        { name: "Blue", color: "#0000FF", emoji: "🔵" },
        { name: "Green", color: "#00FF00", emoji: "🟢" },
        { name: "Yellow", color: "#FFFF00", emoji: "🟡" },
        { name: "Purple", color: "#800080", emoji: "🟣" },
        { name: "Orange", color: "#FFA500", emoji: "🟠" },
        { name: "Pink", color: "#FFC0CB", emoji: "🩷" },
        { name: "Black", color: "#000000", emoji: "⚫" }
    ];
    
    const colorData = colors.find(c => c.emoji === reaction.emoji.name);
    if (!colorData) return;
    
    const guild = reaction.message.guild;
    let role = guild.roles.cache.find(r => r.name === colorData.name && r.color === parseInt(colorData.color.replace('#', ''), 16));
    
    if (!role) {
        role = await guild.roles.create({
            name: colorData.name,
            color: colorData.color,
            reason: "Color role"
        });
    }
    
    const member = guild.members.cache.get(user.id);
    if (member) {
        await member.roles.add(role);
    }
});

client.on('messageDelete', (message) => {
    if (message.author?.bot) return;
    const logCh = message.guild.channels.cache.get(config.logChannelId);
    if (!logCh) return;
    logCh.send(`Message Deleted\nAuthor: ${message.author?.tag}\nChannel: <#${message.channel.id}>\nContent: ${message.content || "None/Attachment"}\nTime: ${getTimestamp()}`);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const logCh = oldMsg.guild.channels.cache.get(config.logChannelId);
    if (!logCh) return;
    logCh.send(`Message Edited\nAuthor: ${oldMsg.author.tag}\nChannel: <#${oldMsg.channel.id}>\nBefore: ${oldMsg.content}\nAfter: ${newMsg.content}\nTime: ${getTimestamp()}`);
});


client.on('messageCreate', async (message) => { 
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.roles.cache.has(config.adminRoleId);
    const isOwner = message.author.id === MY_ID;
    const content = message.content.toLowerCase();
    const args = message.content.trim().split(/ +/);

if (content.startsWith('say' ) && (isAdmin || isOwner)) {
        const mentionedChannel = message.mentions.channels.first();
        let text = args.slice(1).join(' ');
        
        let targetChannel = message.channel;
        
        if (mentionedChannel) {
            targetChannel = mentionedChannel;
            text = text.replace(/<#\d+>/g, '').trim();
        }
        
        if (!text) return;

        try {
            await targetChannel.send(text);
            await sendLine(targetChannel);
            
            if (message.deletable) await message.delete();
        } catch (err) {
            console.error("Failed to execute say command.");
        }
    }
});
client.on('interactionCreate', async (int) => {
    if (!int.isButton()) return;
    if (int.customId === 't_open') {
        if (infoData.security.activeTickets[int.user.id]) {
            return int.reply({ content: "Error: Active ticket already exists. Please close existing ticket before creating a new one.", ephemeral: true });
        }
        
        const ch = await int.guild.channels.create({
            name: `inquiry-${int.user.username}`,
            type: ChannelType.GuildText,
            parent: config.ticketCategoryId,
            permissionOverwrites: [
                { id: int.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: int.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.adminRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        
        const ticketRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('t_claim')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('t_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
        );
        
        await int.reply({ content: `Ticket opened: <#${ch.id}>`, ephemeral: true });
        await ch.send(`Inquiry Session Started By <@${int.user.id}>.\nSystem Awaiting Administrator.`);
        await ch.send({ embeds: [], components: [ticketRow] });
        await sendLine(ch);
        
        infoData.ticketCount++;
        infoData.tickets.push({
            id: infoData.ticketCount,
            channelId: ch.id,
            userId: int.user.id,
            claimedBy: null,
            status: "open",
            createdAt: new Date().toISOString()
        });
        infoData.security.activeTickets[int.user.id] = true;
        saveInfo();
    }
    
    if (int.customId === 't_close') {
        const channel = int.channel;
        const ticket = infoData.tickets.find(t => t.channelId === channel.id);
        
        if (!ticket) {
            return int.reply({ content: "Error: Ticket record not found.", ephemeral: true });
        }
        
        if (int.user.id !== ticket.userId && !int.member.roles.cache.has(config.adminRoleId)) {
            return int.reply({ content: "Access denied.", ephemeral: true });
        }
        
        ticket.status = "closed";
        if (infoData.security.activeTickets[ticket.userId]) {
            delete infoData.security.activeTickets[ticket.userId];
        }
        saveInfo();
        
        await int.reply({ content: "Ticket closed.", ephemeral: true });
        await channel.send("Ticket closed. Channel will be deleted in 5 seconds.");
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    
    if (int.customId === 't_claim') {
        if (!int.member.roles.cache.has(config.adminRoleId) && int.user.id !== MY_ID) {
            return int.reply({ content: "Access denied. Admin role required.", ephemeral: true });
        }
        
        const channel = int.channel;
        const ticket = infoData.tickets.find(t => t.channelId === channel.id);
        
        if (!ticket) {
            return int.reply({ content: "Error: Ticket record not found.", ephemeral: true });
        }
        
        if (ticket.claimedBy) {
            return int.reply({ content: "Ticket already claimed.", ephemeral: true });
        }
        
        ticket.claimedBy = int.user.id;
        saveInfo();
        
        await int.reply({ content: `Ticket claimed by <@${int.user.id}>`, ephemeral: true });
        await channel.send(`Ticket claimed by <@${int.user.id}>.`);
    }
    
    if (int.customId.startsWith('sug_up_')) {
        await int.reply({ content: "Recorded.", ephemeral: true });
    }
    
    if (int.customId.startsWith('sug_down_')) {
        await int.reply({ content: "Recorded.", ephemeral: true });
    }
    
    if (int.customId.startsWith('gw_join_')) {
        const giveawayId = int.customId.replace('gw_join_', '');
        const gw = infoData.giveaways[giveawayId];
        
        if (!gw) {
            return int.reply({ content: "Giveaway not found or ended.", ephemeral: true });
        }
        
        if (gw.participants.includes(int.user.id)) {
            return int.reply({ content: "Already joined.", ephemeral: true });
        }
        
        gw.participants.push(int.user.id);
        saveInfo();
        
        await int.reply({ content: "Joined.", ephemeral: true });
    }
});

process.on('unhandledRejection', error => console.error(error));
function saveConfig() {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
}
client.login(process.env.TOKEN);