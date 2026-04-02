
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, createCanvas } = require('discord.js');

/**
 * Handle additional bot commands
 * @param {import('discord.js').Message} message 
 * @param {Object} core - The core bot state and helpers
 */
async function handleCommand3(message, core) {
    const { client, config, infoData, xpData, economyData, channelsData, pendingTransfers, helpers } = core;
    const { saveInfo, saveXp, saveEconomy, saveChannels, sendLine, safeReply, isAdmin, isOwner, getXPKey, setRPC, clearRPC, getRpcStatus } = helpers;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const content = message.content.toLowerCase();

try {
        if (cmd === 'daily' || cmd === 'd' || cmd === 'يومي') {
                   const cooldown = 86400000;
                   const userId = message.author.id;
                   if (!economyData.users[userId]) economyData.users[userId] = { money: 0, lastDaily: 0 };
                   const lastDaily = economyData.users[userId].lastDaily || 0;
       
                   if (Date.now() - lastDaily < cooldown) {
                       const remaining = cooldown - (Date.now() - lastDaily);
                       const hrs = Math.floor(remaining / 3600000);
                       const mns = Math.floor((remaining % 3600000) / 60000);
                       return safeReply(message, `Locked. Retry in ${hrs}h ${mns}m.`);
                   }
       
                   const reward = Math.floor(Math.random() * 5000) + 1;
                   economyData.users[userId].money += reward;
                   economyData.users[userId].lastDaily = Date.now();
                   saveEconomy();
       
                   const embed = new EmbedBuilder()
                       .setAuthor({ name: "Daily Sync", iconURL: client.user.displayAvatarURL() })
                       .setDescription(`> **Reward:** \`${reward}\` Lumès`)
                       .setColor('#2b2d31');
       
                   await safeReply(message, { embeds: [embed] });
                   await sendLine(message.channel);
               }
       
               if (cmd === 'bal' || cmd === 'رصيد') {
                   const user = message.mentions.users.first() || message.author;
                   if (!economyData.users[user.id]) economyData.users[user.id] = { money: 0 };
                   safeReply(message, `Balance: \`${economyData.users[user.id].money}\` Lumès.`);
               }
       
               if (cmd === 'rank' || cmd === 'رتبة') {
                   const user = message.mentions.users.first() || message.author;
                   const data = xpData.users[user.id] || { xp: 0, level: 1 };
                   const embed = new EmbedBuilder()
                       .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                       .addFields(
                           { name: "Level", value: data.level.toString(), inline: true },
                           { name: "XP", value: data.xp.toString(), inline: true }
                       )
                       .setColor('#2b2d31');
                   safeReply(message, { embeds: [embed] });
               }
       
               if (cmd === 'top' || cmd === 'توب') {
                   const typeArg = args[0]?.toLowerCase();

                   // Resolve period from short or long arg; default → global
                   let period, title;
                   if (typeArg === 'w' || typeArg === 'week' || typeArg === 'weekly') {
                       period = 'weekly';   title = 'Weekly Leaderboard';
                   } else if (typeArg === 'd' || typeArg === 'day' || typeArg === 'daily') {
                       period = 'daily';    title = 'Daily Leaderboard';
                   } else if (typeArg === 'm' || typeArg === 'month' || typeArg === 'monthly') {
                       period = 'monthly';  title = 'Monthly Leaderboard';
                   } else if (typeArg === 'h' || typeArg === 'hour' || typeArg === 'hourly') {
                       period = 'hourly';   title = 'Hourly Leaderboard';
                   } else {
                       period = 'global';   title = 'Global Leaderboard';
                   }

                   // For time-bucketed periods use getXPKey to find the current bucket;
                   // for global read straight from xpData.users
                   let sorted;
                   if (period === 'global') {
                       sorted = Object.entries(xpData.users || {})
                           .sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0));
                   } else {
                       const key  = getXPKey(period);
                       const data = xpData[period]?.[key] || {};
                       sorted = Object.entries(data)
                           .sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0));
                   }

                   if (sorted.length === 0) {
                       return safeReply(message, 'System: No data available for this period.');
                   }

                   const PER_PAGE = 5;
                   const totalPages = Math.ceil(sorted.length / PER_PAGE) || 1;

                   const generateEmbed = (page) => {
                       const start = page * PER_PAGE;
                       const slice = sorted.slice(start, start + PER_PAGE);
                       const desc  = slice
                           .map((u, i) => `\`${start + i + 1}.\` <@${u[0]}> — **${u[1]?.xp || 0}** XP`)
                           .join('\n');

                       return new EmbedBuilder()
                           .setTitle(title)
                           .setDescription(desc)
                           .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
                           .setColor('#2b2d31')
                           .setTimestamp();
                   };

                   const row = new ActionRowBuilder().addComponents(
                       new ButtonBuilder().setCustomId('top_prev').setLabel('◀').setStyle(ButtonStyle.Secondary),
                       new ButtonBuilder().setCustomId('top_next').setLabel('▶').setStyle(ButtonStyle.Secondary)
                   );

                   const msg = await message.reply({ embeds: [generateEmbed(0)], components: [row] });
                   const collector = msg.createMessageComponentCollector({ time: 60000 });
                   let pg = 0;

                   collector.on('collect', async i => {
                       if (i.user.id !== message.author.id) return i.reply({ content: 'Denied.', ephemeral: true });
                       if (i.customId === 'top_prev') pg = Math.max(0, pg - 1);
                       if (i.customId === 'top_next') pg = Math.min(totalPages - 1, pg + 1);
                       await i.update({ embeds: [generateEmbed(pg)] });
                   });

                   collector.on('end', () => {
                       msg.edit({ components: [] }).catch(() => {});
                   });
               }
       
               if (cmd === 'say' && (userIsAdmin || userIsOwner)) {
                   const chan = message.mentions.channels.first();
                   let txt = args.slice(chan ? 1 : 0).join(' ');
                   if (chan) txt = txt.replace(/<#\d+>/g, '').trim();
                   if (!txt) return;
                   const target = chan || message.channel;
                   await target.send(txt);
                   await sendLine(target);
                   if (message.deletable) await message.delete().catch(() => { });
               }
       
               if (cmd === 'snipe' || cmd === 'سنايب') {
                   const sniped = infoData.snipedMessages[message.channel.id];
                   if (!sniped) return safeReply(message, "Empty.");
                   const embed = new EmbedBuilder()
                       .setAuthor({ name: sniped.authorTag, iconURL: sniped.authorAvatar })
                       .setDescription(sniped.content || "Attachment")
                       .setColor('#2b2d31');
                   safeReply(message, { embeds: [embed] });
               }
       
               if ((cmd === 'clear' || cmd === 'مسح') && (isAdmin(message.member) || isOwner(message.author))) {
                   const amount = Math.min(parseInt(args[0]) || 100, 100);
                   await message.channel.bulkDelete(amount, true);
                   const m = await message.channel.send(`Cleaned ${amount}.`);
                   setTimeout(() => m.delete().catch(() => { }), 3000);
               }
       
               // --- XP Gain ---
               if (!message.author.bot) {
                   const xpGain = Math.floor(Math.random() * 5) + 1;
                   const userId = message.author.id;
                   if (!xpData.users[userId]) xpData.users[userId] = { xp: 0, level: 1, messages: 0 };
                   xpData.users[userId].xp += xpGain;
                   xpData.users[userId].messages++;
       
                   ['hourly', 'daily', 'weekly', 'monthly'].forEach(p => {
                       const k = getXPKey(p);
                       if (!xpData[p][k]) xpData[p][k] = {};
                       if (!xpData[p][k][userId]) xpData[p][k][userId] = { xp: 0 };
                       xpData[p][k][userId].xp += xpGain;
                   });
                   saveXp();
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
       
           if (message.deletable) await message.delete().catch(() => { });
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
       
               if (message.deletable) await message.delete().catch(() => { });
       
           } catch (err) {
               console.error(err);
               message.reply("Error: Data integrity failure. Messages exceed 14-day archival limit.");
           }
       }
       if (message.content === 'Support' || message.content === 'Dev' || message.content === 'Rights') {
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
               `Total Units: ${img.fileCount + quote.msgCount + info.msgCount + dev.msgCount}`,
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
           if (message.deletable) await message.delete().catch(()=>{});
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
           if (message.deletable) await message.delete().catch(()=>{});
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
               message.channel.send(`Image sent to <#${targetChannel.id}>.`).then(m => setTimeout(() => m.delete(), 3000));
               if (message.deletable) await message.delete().catch(() => { });
           } catch (err) {
               console.error(err);
               message.reply("Image transmission failed.");
           }
       }
       
       if (cmd === 'cro' && isOwner) {
           const targetChannel = message.mentions.channels.first();
           if (!targetChannel) return message.reply("cro #channel");
       
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
       
       if (cmd === 'sth' && isOwner) {
           const url = args[0];
           if (!url) return message.reply("sth <url>");
           config.profileTheme = url;
           saveConfig();
           message.reply("Profile theme updated.").then(m => setTimeout(() => m.delete(), 3000));
       }
       
       if (content.startsWith('st ') && isOwner) {
           let statusArg = 'online';
           let targetType = 0; // Default: Playing
           
           const rawArgs = message.content.trim().split(/ +/).slice(1);
           const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
           const activityMap = {
               '0': 0, 'playing': 0, 'play': 0, 'p': 0,
               '1': 1, 'streaming': 1, 'stream': 1, 's': 1,
               '2': 2, 'listening': 2, 'listen': 2, 'l': 2,
               '3': 3, 'watching': 3, 'watch': 3, 'w': 3,
               '5': 5, 'competing': 5, 'compete': 5, 'c': 5
           };

           // Dynamically extract optional status and type from the beginning
           while (rawArgs.length > 0) {
               const arg = rawArgs[0].toLowerCase();
               if (validStatuses.includes(arg)) {
                   statusArg = arg;
                   rawArgs.shift();
               } else if (activityMap[arg] !== undefined) {
                   targetType = activityMap[arg];
                   rawArgs.shift();
               } else {
                   break;
               }
           }

           const activityName = rawArgs.join(' ');

           if (activityName) {
               try {
                   client.user.setPresence({
                       activities: [{
                           name: activityName,
                           type: targetType,
                           url: targetType === 1 ? "https://www.twitch.tv/alexander5_fi" : undefined
                       }],
                       status: statusArg
                   });
       
                   message.channel.send(`System: Presence updated to **${statusArg}** | **${Object.keys(activityMap).find(k => activityMap[k] === targetType)}** ${activityName}`)
                       .then(m => setTimeout(() => m.delete(), 3000));
       
                   if (message.deletable) await message.delete().catch(() => { });
               } catch (err) {
                   console.error("Presence Update Failed:", err);
                   message.channel.send("System: Internal Error.").then(m => setTimeout(() => m.delete(), 3000));
               }
           } else {
               message.channel.send(`System: Missing activity name. Example: \`st dnd watching A Movie\``)
                   .then(m => setTimeout(() => m.delete(), 5000));
           }
       }
       if (cmd === 'rank' || cmd === 'r') {
           const target = message.mentions.members.first() || message.member;
           const userId = target.user.id;
       
           const userData = xpData.users[userId] || { xp: 0, level: 1, messages: 0 };
           const money = economyData.users[userId]?.money || 0;
       
           const requiredXp = (Math.pow(userData.level, 2) * 50) + (userData.level * 100);
       
           const xpCurrent = userData.xp;
           const percentage = Math.min((xpCurrent / requiredXp) * 100, 100).toFixed(1);
           const barSize = 15;
           const progress = Math.round((xpCurrent / requiredXp) * barSize);
           const progressBar = "█".repeat(Math.min(progress, barSize)) + "░".repeat(Math.max(barSize - progress, 0));
       
           const leaderboard = Object.entries(xpData.users)
               .sort((a, b) => {
                   if (b[1].level !== a[1].level) return b[1].level - a[1].level;
                   return b[1].xp - a[1].xp;
               });
           const globalRank = leaderboard.findIndex(([id]) => id === userId) + 1;
       
           const rankEmbed = new EmbedBuilder()
               .setAuthor({ name: `User Identity: ${target.user.username}`, iconURL: target.user.displayAvatarURL() })
               .setThumbnail(target.user.displayAvatarURL())
               .setDescription(`**System Status:** Verified\n`)
               .addFields(
                   { name: "Level", value: `\`${userData.level}\``, inline: true },
                   { name: "Lumès", value: `\`${money}\``, inline: true },
                   { name: "Total Messages", value: `\`${userData.messages}\``, inline: true },
                   { name: `Progress [${percentage}%]`, value: `\`${progressBar}\` \`${xpCurrent}/${requiredXp}\``, inline: false },
                   { name: "Global Rank", value: `\`#${globalRank}\``, inline: true }
               )
               .setColor('#2b2d31')
               .setFooter({ text: "Lumè Data Stream" });
       
           await message.channel.send({ embeds: [rankEmbed] });
           await sendLine(message.channel);
       
           if (message.deletable) await message.delete().catch(() => { });
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
                   { name: "Lumès", value: `${money}`, inline: true },
                   { name: "Messages", value: `${userData.messages}`, inline: true },
                   { name: "Joined", value: `${target.joinedAt.toDateString()}`, inline: true }
               )
               .setColor('#2b2d31')
               .setFooter({ text: `ID: ${userId}` })
               .setTimestamp();
       
           await message.channel.send({ embeds: [profileEmbed] });
        }


        // --- User Status / Activity ---
        // Requires bot to be installed as a User App with 'presence' OAuth scope
        // and the Presence Update gateway intent enabled.
        // ─────────────────────────────────────────────────────────────────
        // setstatus / ss / حالة
        // Requires the bot to be installed as a User App on the invoking user.
        // The bot CANNOT change another user's Discord status — only its own.
        // This command stores a personal status per-user and:
        //   1. Attempts to DM the user (confirms bot is installed on their account).
        //   2. Saves their chosen status/activity in infoData.userStatuses.
        //   3. If the invoker is the owner, also updates the bot's live presence.
        //
        // Usage:
        //   setstatus [online|idle|dnd|invisible] [playing|streaming|listening|watching|competing] <name>
        //   setstatus clear           — removes your saved status
        //   setstatus list            — owner: shows all saved user statuses
        //   setstatus help            — shows usage info
        // ─────────────────────────────────────────────────────────────────
        if (cmd === 'setstatus' || cmd === 'ss' || cmd === 'حالة') {
            if (!infoData.userStatuses) infoData.userStatuses = {};

            const subCmd = args[0]?.toLowerCase();

            // ── help ──────────────────────────────────────────────────────
            if (!subCmd || subCmd === 'help') {
                return message.reply(
                    '**[ setstatus — User Status System ]**\n' +
                    '> Update your personal status. Requires the bot installed on your account.\n\n' +
                    '**Usage:**\n' +
                    '`setstatus [status] [type] <name>`\n' +
                    '`setstatus clear` — remove your saved status\n' +
                    '`setstatus list`  — list all statuses (owner only)\n\n' +
                    '**Status:** `online` `idle` `dnd` `invisible`\n' +
                    '**Type:** `playing` `streaming` `listening` `watching` `competing`\n\n' +
                    '**Example:** `setstatus dnd watching A Movie`'
                );
            }

            // ── clear ─────────────────────────────────────────────────────
            if (subCmd === 'clear') {
                if (infoData.userStatuses[message.author.id]) {
                    delete infoData.userStatuses[message.author.id];
                    saveInfo();
                }
                return message.reply('System: Your saved status has been cleared.').then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
            }

            // ── list (owner only) ─────────────────────────────────────────
            if (subCmd === 'list') {
                if (!isOwner(message.author)) {
                    return message.reply('System: Unauthorized.');
                }
                const entries = Object.entries(infoData.userStatuses || {});
                if (entries.length === 0) {
                    return message.reply('System: No user statuses saved.');
                }
                const lines = entries.map(([uid, d]) =>
                    `<@${uid}> → **${d.status}** | **${d.actLabel}** ${d.actName || '—'}`
                );
                return message.reply('**[ Saved User Statuses ]**\n' + lines.join('\n'));
            }

            // ── set status ────────────────────────────────────────────────
            const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
            const activityTypes = {
                'playing': 0, 'play': 0,
                'streaming': 1, 'stream': 1,
                'listening': 2, 'listen': 2,
                'watching': 3, 'watch': 3,
                'competing': 5, 'compete': 5
            };

            const rawArgs = [...args];
            let statusStr = 'online';
            let actType   = 0;
            let actLabel  = 'playing';

            if (rawArgs[0] && validStatuses.includes(rawArgs[0].toLowerCase())) {
                statusStr = rawArgs.shift().toLowerCase();
            }
            if (rawArgs[0] && activityTypes[rawArgs[0].toLowerCase()] !== undefined) {
                actLabel = rawArgs[0].toLowerCase();
                actType  = activityTypes[rawArgs.shift().toLowerCase()];
            }

            const actName = rawArgs.join(' ');

            if (!actName && statusStr === 'online') {
                return message.reply(
                    'System: Missing activity name.\n' +
                    'Example: `setstatus dnd watching A Movie`\n' +
                    'Run `setstatus help` for full usage.'
                );
            }

            // ── verify bot is installed on the user (DM check) ────────────
            let dmOk = false;
            try {
                const dmChannel = await message.author.createDM();
                const confirmMsg = await dmChannel.send(
                    `**[ Lumè — Status Update ]**\n` +
                    `> **Status:** \`${statusStr}\`\n` +
                    `> **Activity:** \`${actLabel}\` ${actName || ''}\n` +
                    `> Saved successfully. ✅`
                );
                // Auto-delete DM after 30 s to keep things clean
                setTimeout(() => confirmMsg.delete().catch(() => {}), 30000);
                dmOk = true;
            } catch {
                // DM failed — bot is not installed on this user's account
                return message.reply(
                    'System: Could not DM you.\n' +
                    '**Install the bot on your account first:**\n' +
                    `> ${client.generateInvite ? 'Use the bot invite link and choose **"Add to my apps".**' : 'Ask the owner for the user-install link.'}\n` +
                    'Once installed, re-run this command.'
                );
            }

            // ── save to infoData ──────────────────────────────────────────
            infoData.userStatuses[message.author.id] = {
                status:   statusStr,
                actType:  actType,
                actLabel: actLabel,
                actName:  actName,
                updatedAt: new Date().toISOString()
            };
            saveInfo();

            // ── if owner: also push to bot's live presence ────────────────
            if (isOwner(message.author)) {
                try {
                    const presenceOpts = { status: statusStr, activities: [] };
                    if (actName) {
                        presenceOpts.activities = [{
                            name: actName,
                            type: actType,
                            url: actType === 1 ? 'https://www.twitch.tv/alexander5_fi' : undefined
                        }];
                    }
                    await client.user.setPresence(presenceOpts);

                    // ── Also push to YOUR Rich Presence via RPC ────────────
                    if (getRpcStatus()) {
                        try {
                            await setRPC({ type: actType, details: actName, state: statusStr });
                        } catch (rpcErr) {
                            console.warn('[setstatus] RPC push failed:', rpcErr.message);
                        }
                    }
                } catch (presErr) {
                    console.error('[setstatus] Presence push failed:', presErr);
                }
            }

            // ── reply ─────────────────────────────────────────────────────
            const feedback = actName
                ? `System: Status saved → **${statusStr}** | **${actLabel}** ${actName}`
                : `System: Status saved → **${statusStr}**`;

            message.channel.send(feedback).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
            if (message.deletable) await message.delete().catch(() => {});
        }

        // (legacy command kept for backward compat — updates bot's own presence, owner only)
        if (cmd === 'userstatus' || cmd === 'useractivity') {
            if (!isOwner(message.author)) {
                return message.reply('System: Unauthorized. Only the owner can use this.');
            }

            const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
            const activityTypes = {
                'playing': 0, 'play': 0,
                'streaming': 1, 'stream': 1,
                'listening': 2, 'listen': 2,
                'watching': 3, 'watch': 3,
                'competing': 5, 'compete': 5
            };

            const rawArgs = [...args];
            let statusStr = 'online';
            let actType = 0;

            if (rawArgs[0] && validStatuses.includes(rawArgs[0].toLowerCase())) {
                statusStr = rawArgs.shift().toLowerCase();
            }
            if (rawArgs[0] && activityTypes[rawArgs[0].toLowerCase()] !== undefined) {
                actType = activityTypes[rawArgs.shift().toLowerCase()];
            }

            const actName = rawArgs.join(' ');

            if (!actName && statusStr === 'online') {
                return message.reply(
                    'Usage: `userstatus [online|idle|dnd|invisible] [playing|streaming|listening|watching|competing] <name>`\n' +
                    'Example: `userstatus dnd watching A Movie`'
                );
            }

            try {
                const presenceOpts = { status: statusStr, activities: [] };
                if (actName) {
                    presenceOpts.activities = [{
                        name: actName,
                        type: actType,
                        url: actType === 1 ? 'https://www.twitch.tv/alexander5_fi' : undefined
                    }];
                }

                await client.user.setPresence(presenceOpts);

                const actLabel = Object.keys(activityTypes).find(k => activityTypes[k] === actType) || '';
                const feedback = actName
                    ? 'System: Presence updated → **' + statusStr + '** | **' + actLabel + '** ' + actName
                    : 'System: Status updated → **' + statusStr + '**';

                message.channel.send(feedback).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
                if (message.deletable) await message.delete().catch(() => {});
            } catch (err) {
                console.error('Presence Update Failed:', err);
                message.reply('System: Failed to update presence. Ensure the bot is installed as a User App with the `presence` OAuth scope.');
            }
        }

    } catch (e) {
        console.error("[Command Error]", e);
    }
}

module.exports = { handleCommand3 };
