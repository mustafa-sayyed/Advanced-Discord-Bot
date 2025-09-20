const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const Database = require("../../utils/database");
const {
  isModeratorOrOwner,
  generateTicketId,
  getPriorityColor,
  formatTicketStatus,
  timeAgo,
} = require("@adb/server/utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("🎫 Create a support ticket")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Brief title for your ticket")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Detailed description of your issue")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Priority level of your ticket")
        .setRequired(false)
        .addChoices(
          { name: "🔴 High Priority", value: "high" },
          { name: "🟡 Medium Priority", value: "medium" },
          { name: "🟢 Low Priority", value: "low" }
        )
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment")
        .setDescription(
          "Upload a file, screenshot, or proof related to your ticket"
        )
        .setRequired(false)
    ),
  cooldown: 60, // 1 minute cooldown to prevent spam
  async execute(interaction, client) {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const priority = interaction.options.getString("priority") || "medium";
    const attachment = interaction.options.getAttachment("attachment");

    await interaction.deferReply({ flags: 64 });

    const db = Database; // Use the exported instance
await db.ensureConnection(); // Ensure connection is established

    try {
      // 🏰 Get server configuration for ticket category
      let config = await db.getServerConfig(interaction.guild.id);
      let ticketCategory = null;

      // 📁 Find or create ticket category
      if (config && config.ticket_category_id) {
        ticketCategory = interaction.guild.channels.cache.get(
          config.ticket_category_id
        );
      }

      if (!ticketCategory) {
        try {
          ticketCategory = await interaction.guild.channels.create({
            name: "🎫 Support Tickets",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: client.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ],
          });

          // Update config with new category
          await db.updateServerConfig(interaction.guild.id, {
            ticket_category_id: ticketCategory.id,
          });
        } catch (error) {
          console.error("❌ Error creating ticket category:", error);

          const errorEmbed = new EmbedBuilder()
            .setColor(client.colors.error)
            .setTitle("❌ Category Creation Failed")
            .setDescription(
              "Could not create ticket category. Please contact an administrator."
            )
            .setFooter({ text: "Bot needs Manage Channels permission." });

          return interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // 🎫 Generate unique ticket ID and create channel
      const ticketId = generateTicketId();
      const channelName = `ticket-${ticketId.toLowerCase()}`;

      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        topic: `🎫 Support Ticket | ${title} | Created by ${interaction.user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      // 🗃️ Store ticket in database
      const dbTicketId = await db.createTicket({
        guildId: interaction.guild.id,
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        title: title,
        description: description,
        priority: priority,
      });

      // 🎨 Create ticket embed
      const ticketEmbed = new EmbedBuilder()
        .setColor(getPriorityColor(priority, client.colors))
        .setTitle(`🎫 Support Ticket #${ticketId}`)
        .setDescription(description)
        .addFields(
          {
            name: "👤 Created by",
            value: `${interaction.user}`,
            inline: true,
          },
          {
            name: "📊 Priority",
            value: `${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
            inline: true,
          },
          {
            name: "📅 Created",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "📋 Title",
            value: title,
            inline: false,
          }
        )
        .setFooter({
          text: `Ticket ID: ${ticketId} | Use the buttons below to manage this ticket`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // 📎 Add attachment info if provided
      if (attachment) {
        ticketEmbed.addFields({
          name: "📎 Attachment",
          value: `[${attachment.name}](${attachment.url})`,
          inline: false,
        });

        // Store attachment in database
        await db.addTicketMessage(
          dbTicketId,
          interaction.user.id,
          "Attachment uploaded",
          attachment.url
        );
      }

      // 🎮 Create control buttons
      const controlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${dbTicketId}`)
          .setLabel("🙋 Claim Ticket")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${dbTicketId}`)
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_priority_${dbTicketId}`)
          .setLabel("📊 Change Priority")
          .setStyle(ButtonStyle.Secondary)
      );

      // 📤 Send ticket message
      const ticketMessage = await ticketChannel.send({
        content: `${interaction.user} Welcome to your support ticket!`,
        embeds: [ticketEmbed],
        components: [controlRow],
      });

      await ticketMessage.pin();

      // 📬 Send confirmation to user
      const confirmEmbed = new EmbedBuilder()
        .setColor(client.colors.success)
        .setTitle("✅ Ticket Created Successfully")
        .setDescription(
          `Your support ticket has been created! Click the link below to access it.`
        )
        .addFields(
          {
            name: "🎫 Ticket ID",
            value: `#${ticketId}`,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: `${ticketChannel}`,
            inline: true,
          },
          {
            name: "📊 Priority",
            value: priority.charAt(0).toUpperCase() + priority.slice(1),
            inline: true,
          }
        )
        .setFooter({ text: "A moderator will assist you shortly!" })
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed] });

      // 🔔 Notify moderators (if log channel is configured)
      if (config && config.ticket_log_channel_id) {
        const logChannel = interaction.guild.channels.cache.get(
          config.ticket_log_channel_id
        );
        if (logChannel) {
          const notificationEmbed = new EmbedBuilder()
            .setColor(getPriorityColor(priority, client.colors))
            .setTitle("🎫 New Support Ticket Created")
            .setDescription(
              `A new ${priority} priority ticket has been created.`
            )
            .addFields(
              { name: "👤 User", value: `${interaction.user}`, inline: true },
              { name: "📍 Channel", value: `${ticketChannel}`, inline: true },
              { name: "🎫 ID", value: `#${ticketId}`, inline: true },
              { name: "📋 Title", value: title, inline: false }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [notificationEmbed] });
        }
      }

      console.log(
        `🎫 Ticket #${ticketId} created by ${interaction.user.tag} in ${interaction.guild.name}`
      );
    } catch (error) {
      console.error("❌ Ticket creation error:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("❌ Ticket Creation Failed")
        .setDescription("An error occurred while creating your ticket.")
        .addFields({
          name: "🔧 Possible Issues",
          value:
            "• Bot missing permissions\n• Server configuration error\n• Channel limit reached",
          inline: false,
        })
        .setFooter({ text: "Please contact a moderator for assistance." });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
