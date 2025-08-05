const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { generateProgressBar } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("🏰 Display detailed server information and statistics"),
  cooldown: 5,
  async execute(interaction, client) {
    const guild = interaction.guild;

    // 🔢 Calculate member statistics
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(
      (member) => member.user.bot
    ).size;
    const humanCount = totalMembers - botCount;

    // 📊 Online member count (approximation)
    const onlineMembers = guild.presences.cache.filter(
      (presence) => presence.status !== "offline"
    ).size;

    // 🎭 Verification level mapping
    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High",
    };

    // 🔒 Content filter mapping
    const contentFilters = {
      0: "Disabled",
      1: "Members without roles",
      2: "All members",
    };

    const serverEmbed = new EmbedBuilder()
      .setColor(client.colors.primary)
      .setTitle(`🏰 ${guild.name}`)
      .setDescription(guild.description || "No server description set")
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: "👑 Owner",
          value: `<@${guild.ownerId}>`,
          inline: true,
        },
        {
          name: "🆔 Server ID",
          value: `\`${guild.id}\``,
          inline: true,
        },
        {
          name: "📅 Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "👥 Members",
          value: `👤 ${humanCount} Humans\n🤖 ${botCount} Bots\n📊 ${totalMembers} Total`,
          inline: true,
        },
        {
          name: "📊 Activity",
          value: `🟢 ${onlineMembers} Online\n${generateProgressBar(
            onlineMembers,
            totalMembers
          )} ${Math.round((onlineMembers / totalMembers) * 100)}%`,
          inline: true,
        },
        {
          name: "💎 Boosts",
          value: `Level ${guild.premiumTier}\n${
            guild.premiumSubscriptionCount || 0
          } Boosts`,
          inline: true,
        },
        {
          name: "📢 Channels",
          value: `💬 ${
            guild.channels.cache.filter((c) => c.type === 0).size
          } Text\n🔊 ${
            guild.channels.cache.filter((c) => c.type === 2).size
          } Voice\n📁 ${
            guild.channels.cache.filter((c) => c.type === 4).size
          } Categories`,
          inline: true,
        },
        {
          name: "🎭 Roles",
          value: `${guild.roles.cache.size} Roles`,
          inline: true,
        },
        {
          name: "😀 Emojis",
          value: `${guild.emojis.cache.size} Emojis`,
          inline: true,
        },
        {
          name: "🔒 Security",
          value: `Verification: ${
            verificationLevels[guild.verificationLevel]
          }\nContent Filter: ${contentFilters[guild.explicitContentFilter]}`,
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // 🖼️ Add server banner if available
    if (guild.bannerURL()) {
      serverEmbed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    await interaction.reply({ embeds: [serverEmbed] });
  },
};
