const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("⏰ Set a personal reminder with timed DM alerts")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("When to remind you (e.g., 10m, 1h, 2d)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("What to remind you about")
        .setRequired(true)
    ),
  cooldown: 5,
  async execute(interaction, client) {
    const timeString = interaction.options.getString("time");
    const reminderMessage = interaction.options.getString("message");

    // ⏱️ Parse time
    const timeMs = ms(timeString);

    if (!timeMs) {
      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("⚠️ Invalid Time Format")
        .setDescription(
          "Please use a valid time format!\n\n**Examples:**\n• `10m` - 10 minutes\n• `1h` - 1 hour\n• `2d` - 2 days\n• `30s` - 30 seconds\n• `1w` - 1 week"
        )
        .setFooter({ text: "Try again with the correct format!" });

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // 🛡️ Time limits
    const minTime = 30 * 1000; // 30 seconds
    const maxTime = 365 * 24 * 60 * 60 * 1000; // 1 year

    if (timeMs < minTime) {
      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.warning)
        .setTitle("⚠️ Too Soon!")
        .setDescription("Reminders must be at least 30 seconds in the future.")
        .setFooter({ text: "Try a longer time!" });

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (timeMs > maxTime) {
      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.warning)
        .setTitle("⚠️ Too Far!")
        .setDescription("Reminders can't be more than 1 year in the future.")
        .setFooter({ text: "Try a shorter time!" });

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const reminderTime = Date.now() + timeMs;
    const reminderId = `reminder_${Date.now()}_${interaction.user.id}`;

    // ✅ Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setColor(client.colors.success)
      .setTitle("⏰ Reminder Set!")
      .setDescription(`I'll remind you about: **${reminderMessage}**`)
      .addFields(
        {
          name: "⏱️ Time",
          value: `<t:${Math.floor(reminderTime / 1000)}:F>`,
          inline: true,
        },
        {
          name: "🕒 In",
          value: `<t:${Math.floor(reminderTime / 1000)}:R>`,
          inline: true,
        },
        {
          name: "📬 Delivery",
          value: "Direct Message",
          inline: true,
        }
      )
      .setFooter({
        text: `Reminder ID: ${reminderId} • Make sure DMs are enabled!`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // 🎮 Add interactive buttons
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reminder_info_${interaction.user.id}`)
        .setLabel("📋 View Details")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("ℹ️"),
      new ButtonBuilder()
        .setCustomId(`reminder_tips_${interaction.user.id}`)
        .setLabel("💡 Tips")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💡")
    );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [actionRow],
      flags: 64, // MessageFlags.Ephemeral
    });

    // ⏰ Set the reminder
    setTimeout(async () => {
      try {
        // 🎉 Create reminder DM embed
        const reminderEmbed = new EmbedBuilder()
          .setColor(client.colors.primary)
          .setTitle("⏰ Reminder Alert!")
          .setDescription(
            `You asked me to remind you about:\n\n**${reminderMessage}**`
          )
          .addFields(
            {
              name: "📅 Set On",
              value: `<t:${Math.floor(interaction.createdTimestamp / 1000)}:F>`,
              inline: true,
            },
            {
              name: "🏰 Server",
              value: interaction.guild?.name || "Direct Message",
              inline: true,
            },
            {
              name: "✅ Status",
              value: "Completed",
              inline: true,
            }
          )
          .setFooter({
            text: `Reminder from ${client.user.tag}`,
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        // 🎮 Add action buttons to reminder DM
        const reminderActionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`reminder_snooze_${interaction.user.id}`)
            .setLabel("⏰ Snooze 5min")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("�"),
          new ButtonBuilder()
            .setCustomId(`reminder_done_${interaction.user.id}`)
            .setLabel("✅ Mark Done")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
        );

        // �📬 Send DM
        await interaction.user.send({
          embeds: [reminderEmbed],
          components: [reminderActionRow],
        });
        console.log(
          `⏰ Reminder sent to ${interaction.user.tag}: "${reminderMessage}"`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send reminder to ${interaction.user.tag}:`,
          error
        );

        // 🔄 Try to send in the original channel if DM fails
        try {
          if (
            interaction.channel &&
            interaction.channel
              .permissionsFor(client.user)
              .has(["SendMessages", "EmbedLinks"])
          ) {
            const fallbackEmbed = new EmbedBuilder()
              .setColor(client.colors.warning)
              .setTitle("⏰ Reminder Alert!")
              .setDescription(
                `${interaction.user}, you asked me to remind you about:\n\n**${reminderMessage}**`
              )
              .setFooter({
                text: "Could not send DM - delivered here instead!",
              })
              .setTimestamp();

            await interaction.channel.send({ embeds: [fallbackEmbed] });
            console.log(
              `⏰ Reminder delivered to channel for ${interaction.user.tag}`
            );
          }
        } catch (channelError) {
          console.error(`❌ Failed to send reminder to channel:`, channelError);
        }
      }
    }, timeMs);

    console.log(
      `⏰ Reminder set for ${interaction.user.tag}: "${reminderMessage}" in ${timeString}`
    );
  },
};
