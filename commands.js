const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, createCanvas } = require('discord.js');

/**
 * Handle all bot commands
 * @param {import('discord.js').Message} message 
 * @param {Object} core - The core bot state and helpers
 */
async function handleCommand(message, core) {
    const { client, config, infoData, xpData, economyData, channelsData, pendingTransfers, helpers } = core;
    const { saveInfo, saveXp, saveEconomy, saveChannels, sendLine, safeReply, isAdmin, isOwner, getXPKey } = helpers;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
  
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
    await message.channel.send(`**${target.user.username}**\nLevel: ${userData.level}\nRank: #${globalRank}\nLumès: ${money}`);
}

if (cmd === 'sn' || cmd === 'snipe') {
    const sniped = infoData.snipedMessages[message.channel.id];
    if (!sniped) return message.reply("No deleted messages found.");

    const embed = new EmbedBuilder()
        .setAuthor({ name: sniped.authorTag, iconURL: sniped.authorAvatar })
        .setDescription(sniped.content)
        .setFooter({ text: `#${message.channel.name}` })
        .setColor('#2b2d31')
        .setTimestamp(sniped.timestamp);

    await message.channel.send({ embeds: [embed] });
}

if (cmd === 'inv' || cmd === 'invite') {
    const target = message.mentions.users.first();
    if (!target) {
        const inviter = infoData.invites[message.author.id];
        if (inviter) {
            return message.reply(`Invited by: <@${inviter}>`);
        }
        return message.reply("No invite data found.");
    }

    const inviter = infoData.invites[target.id];
    if (inviter) {
        message.reply(`<@${target.id}> invited by: <@${inviter}>`);
    } else {
        message.reply(`No invite data for <@${target.id}>`);
    }
}

if (cmd === 'remind' || cmd === 'تذكر') {
    const time = parseInt(args[0]);
    const remindText = args.slice(1).join(' ');

    if (!time || !remindText) return message.reply("remind <minutes> <text>");

    const reminderId = Date.now().toString();
    const remindTime = Date.now() + (time * 60 * 1000);

    if (!infoData.reminders) infoData.reminders = {};
    infoData.reminders[reminderId] = {
        userId: message.author.id,
        text: remindText,
        time: remindTime,
        channelId: message.channel.id
    };
    saveInfo();

    message.reply(`Reminder set for ${time} minutes.`).then(m => setTimeout(() => m.delete(), 3000));

    setTimeout(async () => {
        const rem = infoData.reminders[reminderId];
        if (rem) {
            const ch = client.channels.cache.get(rem.channelId);
            if (ch) {
                await ch.send(`<@${rem.userId}> Reminder: ${rem.text}`);
            }
            delete infoData.reminders[reminderId];
            saveInfo();
        }
    }, time * 60 * 1000);
}

if (cmd === 'leaderboard' && isOwner) {
    const targetChannel = message.mentions.channels.first();
    if (!targetChannel) return message.reply("leaderboard #channel");

    config.leaderboardChannelId = targetChannel.id;
    saveConfig();

    message.reply(`Leaderboard channel set to <#${targetChannel.id}>`).then(m => setTimeout(() => m.delete(), 3000));
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
    if (message.deletable) await message.delete().catch(()=>{});
}

if (cmd === 'c') {
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);


    if (!economyData.users[message.author.id]) economyData.users[message.author.id] = { money: 0, lastDaily: 0 };


    if (!target) {
        const bal = economyData.users[message.author.id]?.money || 0;
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Assets: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setDescription(`> **Personal Balance:** \`${bal}\` Lumès\n> **Status:** Synchronized`)
            .setColor('#2b2d31');

        await message.reply({ embeds: [embed] });
        return await sendLine(message.channel);
    }


    if (target && isNaN(amount)) {
        const targetBal = economyData.users[target.id]?.money || 0;
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Assets: ${target.user.username}`, iconURL: target.user.displayAvatarURL() })
            .setDescription(`> **User Balance:** \`${targetBal}\` Lumès\n`)
            .setColor('#2b2d31');

        await message.reply({ embeds: [embed] });
        return await sendLine(message.channel);
    }


    if (target && !isNaN(amount)) {

        if (target.id === message.author.id) return message.reply("System Error: Self-transfer Blocked.");
        if (amount <= 0) return message.reply("System: Invalid Lumès.");
        if (economyData.users[message.author.id].money < amount) return message.reply("System: Insufficient Lumès.");


        const captchaCode = Math.floor(100000 + Math.random() * 900000).toString();
        const imageBuffer = createCaptchaImage(captchaCode);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });


        pendingTransfers.set(message.author.id, {
            targetId: target.id,
            amount: amount,
            code: captchaCode
        });

        await message.reply({
            content: `**\nConfirm \`${amount}\` Lumès to <@${target.id}> `,
            files: [attachment]
        });


        setTimeout(() => {
            if (pendingTransfers.has(message.author.id)) pendingTransfers.delete(message.author.id);
        }, 20000);
        return;
    }
}

if (pendingTransfers.has(message.author.id)) {
    const session = pendingTransfers.get(message.author.id);

    if (message.content.trim() === session.code) {
        economyData.users[message.author.id].money -= session.amount;
        if (!economyData.users[session.targetId]) economyData.users[session.targetId] = { money: 0, lastDaily: 0 };
        economyData.users[session.targetId].money += session.amount;

        saveEconomy();
        pendingTransfers.delete(message.author.id);

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: "Transaction Verified", iconURL: client.user.displayAvatarURL() })
            .setDescription(`> **Amount:** \`${session.amount}\` Lumès\n> **Target:** <@${session.targetId}>\n`)
            .setColor('#2b2d31');

        await message.reply({ embeds: [successEmbed] });
        return await sendLine(message.channel);
    }
}
if (cmd === 'afk') {
    const reason = args.join(' ') || "No reason";
    infoData.afk[message.author.id] = {
        reason: reason,
        time: new Date().toISOString()
    };
    saveInfo();
    message.reply("AFK set.").then(m => setTimeout(() => m.delete(), 3000));
    if (message.deletable) await message.delete().catch(()=>{});
}

if (cmd === 'am' && isOwner) {
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount)) return message.reply("System: Define target.");

    if (!economyData.users[target.id]) economyData.users[target.id] = { money: 0, lastDaily: 0 };

    economyData.users[target.id].money += amount;
    saveEconomy();

    message.reply(`System: [${amount}] Added into <@${target.id}> Bank.`);
    await sendLine(message.channel);
}

if (cmd === 'rm' && isOwner) {
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount)) return message.reply("System: Define target.");

    if (economyData.users[target.id]) {
        economyData.users[target.id].money = Math.max(0, economyData.users[target.id].money - amount);
        saveEconomy();
    }

    message.reply(`System: [${amount}] purged from <@${target.id}>.`);
    await sendLine(message.channel);
}

if (cmd === 'gstart' && (isAdmin || isOwner)) {
    const durationMin = parseInt(args[0]);
    const prize = args.slice(1).join(' ');

    if (!durationMin || !prize) {
        return message.channel.send("Syntax: `gstart <minutes> <prize>`");
    }

    const endTime = Date.now() + (durationMin * 60 * 1000);
    const endUnix = Math.floor(endTime / 1000);
    const giveawayId = Date.now().toString();

    infoData.giveaways[giveawayId] = {
        prize: prize,
        endTime: endTime,
        channelId: message.channel.id,
        authorId: message.author.id,
        participants: [],
        messageId: null
    };
    saveInfo();

    const giveawayEmbed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(`**Prize:** ${prize}\n**Ends:** <t:${endUnix}:R> (<t:${endUnix}:f>)\n**Host:** <@${message.author.id}>\n**Participants:** 0`)
        .setColor('#5865F2')
        .setTimestamp(endTime);

    const giveawayRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`gw_join_${giveawayId}`)
            .setLabel('Join')
            .setStyle(ButtonStyle.Primary)
    );

    const gwMsg = await message.channel.send({ embeds: [giveawayEmbed], components: [giveawayRow] });
    infoData.giveaways[giveawayId].messageId = gwMsg.id;
    saveInfo();
    
    if (message.deletable) await message.delete().catch(() => {});

    setTimeout(async () => {
        const gw = infoData.giveaways[giveawayId];
        if (!gw) return;

        // Fetch original message to remove buttons when it ends
        const channel = client.channels.cache.get(gw.channelId);
        if (channel) {
            const endedMsg = await channel.messages.fetch(gw.messageId).catch(() => null);
            if (endedMsg) {
                const endedEmbed = EmbedBuilder.from(endedMsg.embeds[0])
                    .setDescription(`**Prize:** ${gw.prize}\n**Ended:** <t:${Math.floor(Date.now() / 1000)}:R>\n**Host:** <@${gw.authorId}>\n**Total Participants:** ${gw.participants.length}`)
                    .setColor('#36393F')
                    .setTitle("🎉 GIVEAWAY ENDED 🎉");
                await endedMsg.edit({ embeds: [endedEmbed], components: [] }).catch(()=>{});
            }
        }

        if (gw.participants.length === 0) {
            if (channel) await channel.send(`Giveaway for **${gw.prize}** ended. No participants joined...`);
        } else {
            const winnerId = gw.participants[Math.floor(Math.random() * gw.participants.length)];
            if (channel) await channel.send(`🎉 Congratulations <@${winnerId}>! You won **${gw.prize}**!\nHosted by: <@${gw.authorId}>`);
        }

        delete infoData.giveaways[giveawayId];
        saveInfo();
    }, durationMin * 60 * 1000);
}

if ((cmd === 'grmv' || cmd === 'جمسح') && (isAdmin || isOwner)) {
    let deletedCount = 0;
    const giveaways = infoData.giveaways || {};

    for (const [giveawayId, gw] of Object.entries(giveaways)) {
        const channel = client.channels.cache.get(gw.channelId);
        if (channel && gw.messageId) {
            channel.messages.fetch(gw.messageId).then(msg => {
                if (msg && msg.deletable) msg.delete().catch(() => {});
            }).catch(() => {});
        }
        delete infoData.giveaways[giveawayId];
        deletedCount++;
    }

    if (deletedCount > 0) {
        saveInfo();
        message.channel.send(`System: Successfully deleted ${deletedCount} active giveaway(s).`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
    } else {
        message.channel.send("System: No active giveaways found.").then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
    }

    if (message.deletable) await message.delete().catch(() => {});
}

}
module.exports = { handleCommand };
