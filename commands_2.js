const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, createCanvas } = require('discord.js');
/**
 * Handle additional bot commands
 * @param {import('discord.js').Message} message 
 * @param {Object} core - The core bot state and helpers
 */
async function handleCommand2(message, core) {
    const { client, config, infoData, xpData, economyData, channelsData, pendingTransfers, helpers } = core;
    const { saveInfo, saveXp, saveEconomy, saveChannels, sendLine, safeReply, isAdmin, isOwner, getXPKey } = helpers;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const content = message.content.toLowerCase();

    try {
        if (cmd === 'برا' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || "No reason";
    if (!member) return message.reply("ban @user <reason>");
    try {
        await member.ban({ reason: reason });
        message.channel.send(`Banned: ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot ban user.");
    }
}

if (cmd === 'هش' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || "No reason";
    if (!member) return message.reply("kick @user <reason>");
    try {
        await member.kick(reason);
        message.channel.send(`Kicked: ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot kick user.");
    }
}

if (cmd === 'timeout' || cmd === 'اص' || cmd === 'تايم' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    if (!member || !minutes) return message.reply("timeout @user <minutes>");
    try {
        await member.timeout(minutes * 60 * 1000);
        message.channel.send(`Timeout: ${member.user.tag} for ${minutes} minutes`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot timeout user.");
    }
}

if (cmd === 'nickname' || cmd === 'nick' || cmd === 'نك' || cmd === 'نيم' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const nickname = args.slice(1).join(' ');
    if (!member || !nickname) return message.reply("nickname @user <name>");
    try {
        await member.setNickname(nickname);
        message.channel.send(`Nickname set for ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot set nickname.");
    }
}

if (cmd === 'addrole' || cmd === 'ar' || cmd === 'ر' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!member || !role) return message.reply("addrole @user @role");
    try {
        await member.roles.add(role);
        message.channel.send(`Role added to ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot add role.");
    }
}

if (cmd === 'removerole' || cmd === 'rr' || cmd === 'رر' && (isAdmin || isOwner)) {
    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!member || !role) return message.reply("removerole @user @role");
    try {
        await member.roles.remove(role);
        message.channel.send(`Role removed from ${member.user.tag}`).then(m => setTimeout(() => m.delete(), 3000));
        if (message.deletable) await message.delete().catch(()=>{});
    } catch (e) {
        message.reply("Error: Cannot remove role.");
    }
}


// --- XP System (Windowed Tracking) ---
if (!message.author.bot && message.guild) {
    const xpGain = Math.floor(Math.random() * 5) + 1;
    const userId = message.author.id;

    if (!xpData.users[userId]) xpData.users[userId] = { xp: 0, level: 1, messages: 0 };
    const user = xpData.users[userId];
    user.xp += xpGain;
    user.messages++;

    const nextLevelXp = (Math.pow(user.level, 2) * 50) + (user.level * 100);
    if (user.xp >= nextLevelXp) {
        user.level++;
        message.channel.send(`Level Up: <@${userId}> reached **Level ${user.level}**`).then(m => setTimeout(() => m.delete(), 5000));
    }

    const periods = ['hourly', 'daily', 'weekly', 'monthly'];
    periods.forEach(p => {
        const key = getXPKey(p);
        if (!xpData[p][key]) xpData[p][key] = {};
        if (!xpData[p][key][userId]) xpData[p][key][userId] = { xp: 0 };
        xpData[p][key][userId].xp += xpGain;
    });

    saveXp();

}
if (cmd === 'say' && (userIsAdmin || userIsOwner)) {
    const mentionedChannel = message.mentions.channels.first();
    let text = args.slice(mentionedChannel ? 1 : 0).join(' ');
    if (mentionedChannel) text = text.replace(/<#\d+>/g, '').trim();
    if (!text) return;
    const target = mentionedChannel || message.channel;
    await target.send(text);
    await sendLine(target);
    if (message.deletable) await message.delete().catch(() => { });
}

if ((cmd === 'snipe' || cmd === 'سنايب')) {
    const sniped = infoData.snipedMessages[message.channel.id];
    if (!sniped) return message.reply("Empty.");
    const embed = new EmbedBuilder()
        .setAuthor({ name: sniped.authorTag, iconURL: sniped.authorAvatar })
        .setDescription(sniped.content || "Attachment")
        .setFooter({ text: `At: ${sniped.timestamp}` })
        .setColor('#2b2d31');
    await message.reply({ embeds: [embed] });
}
    } catch (e) {
        console.error("[Command Error]", e);
    }
}

module.exports = { handleCommand2 };
