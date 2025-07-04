const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Check bot latency and response time with style"),
  cooldown: 3,
  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: "🏓 Pinging... ⏳",
    });

    // Get the message for timing calculation
    const message = await interaction.fetchReply();
    const roundtripLatency =
      message.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = client.ws.ping;

    // 🎨 Dynamic color based on latency
    let latencyColor;
    let latencyEmoji;
    let latencyStatus;

    if (roundtripLatency < 100) {
      latencyColor = client.colors.success;
      latencyEmoji = "🟢";
      latencyStatus = "Excellent";
    } else if (roundtripLatency < 200) {
      latencyColor = client.colors.warning;
      latencyEmoji = "🟡";
      latencyStatus = "Good";
    } else {
      latencyColor = client.colors.error;
      latencyEmoji = "🔴";
      latencyStatus = "Poor";
    }

    const pingEmbed = new EmbedBuilder()
      .setColor(latencyColor)
      .setTitle("🏓 Pong! Connection Status")
      .setDescription(`${latencyEmoji} **${latencyStatus}** connection quality`)
      .addFields(
        {
          name: "📡 Roundtrip Latency",
          value: `\`${roundtripLatency}ms\``,
          inline: true,
        },
        {
          name: "💓 WebSocket Heartbeat",
          value: `\`${wsLatency}ms\``,
          inline: true,
        },
        {
          name: "⚡ Status",
          value: `\`${latencyStatus}\``,
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({
      content: null,
      embeds: [pingEmbed],
    });
  },
};
