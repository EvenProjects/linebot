const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const getTimestamp = () => new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + " UTC";

function registerEvents(client, core) {
    const { config, infoData, channelsData, helpers } = core;
    const { saveInfo, sendLine, isAdmin, isOwner, getXPKey, saveXp, safeReply } = helpers;

    client.on('messageCreate', async (message) => {
        if (infoData.afk[message.author.id]) {
            delete infoData.afk[message.author.id];
            saveInfo();
        }
        const forbiddenWords = ["word1", "word2", "ايري", "انيكه", "قحبة", "انيك", "zbe", "fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigger", "faggot", "cunt", "slut", "whore", "bastard", "damn", "crap", "douche", "prick", "twat", "nigga", "عرص", "شرموطة", "شرموط", "لعنة", "كسخت", "مخنث", "عاهرة"];

        if (message.author.bot) return;
        const hasViolation = forbiddenWords.some(word => message.content.toLowerCase().includes(word));
        if (hasViolation) {
            await message.delete();
            const encrypted = message.content
                .split('')
                .map(() => Math.round(Math.random()))
                .join('');

            const warn = await message.channel.send(
                "System: Fucked up"
            );
            setTimeout(() => warn.delete(), 5000);
        }
    });

    client.on('messageUpdate', async (oldMsg, newMsg) => {
        if (oldMsg.author.bot || oldMsg.content === newMsg.content) return;
        const logCh = client.channels.cache.get(config.logChannelId);
        if (!logCh) return;

        const logEntry = [
            "**[ Operation Log: Message Edit ]**",
            `> **User:** ${oldMsg.author.tag} (${oldMsg.author.id})`,
            `> **Room:** <#${oldMsg.channel.id}>`,
            `> **Pre-Data:** ${oldMsg.content}`,
            `> **Post-Data:** ${newMsg.content}`
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
        if (message.author.bot) return;

        infoData.snipedMessages[message.channel.id] = {
            content: message.content,
            authorTag: message.author?.tag,
            authorAvatar: message.author?.displayAvatarURL(),
            timestamp: message.createdAt
        };

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
            setTimeout(() => channel.delete().catch(() => { }), 5000);
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

            // Real-time Embed Update
            const originalEmbed = int.message.embeds[0];
            if (originalEmbed) {
                const updatedEmbed = EmbedBuilder.from(originalEmbed)
                    .setDescription(`**Prize:** ${gw.prize}\n**Ends:** <t:${Math.floor(gw.endTime / 1000)}:R> (<t:${Math.floor(gw.endTime / 1000)}:f>)\n**Host:** <@${gw.authorId}>\n**Participants:** ${gw.participants.length}`);
                
                await int.update({ embeds: [updatedEmbed] }).catch(() => {});
            } else {
                await int.reply({ content: "Joined.", ephemeral: true });
            }
        }
    });
    
}

module.exports = { registerEvents };
