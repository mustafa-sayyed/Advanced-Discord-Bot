const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { database: Database } = require("@adb/server");
const {
  isModeratorOrOwner,
  getPriorityColor,
  formatTicketStatus,
  timeAgo,
} = require("../../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketdashboard")
    .setDescription("🎛️ Manage all server tickets (Moderators Only)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all tickets")
        .addStringOption((option) =>
          option
            .setName("status")
            .setDescription("Filter by ticket status")
            .setRequired(false)
            .addChoices(
              { name: "🟢 Open", value: "open" },
              { name: "🟡 In Progress", value: "in_progress" },
              { name: "🟠 Waiting", value: "waiting" },
              { name: "🔴 Closed", value: "closed" },
              { name: "✅ Resolved", value: "resolved" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("stats").setDescription("View ticket statistics")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manage")
        .setDescription("Manage a specific ticket")
        .addIntegerOption((option) =>
          option
            .setName("ticket_id")
            .setDescription("The ticket ID to manage")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Configure ticket system settings")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  async execute(interaction, client) {
    // 🛡️ Check if user is moderator
    if (!isModeratorOrOwner(interaction.member, interaction.guild)) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("🚫 Access Denied")
        .setDescription(
          "This command is only available to moderators and administrators."
        )
        .setFooter({
          text: "Contact a server administrator if you need access.",
        });

      return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    const db = Database; // Use the exported instance
await db.ensureConnection(); // Ensure connection is established

    try {
      switch (subcommand) {
        case "list":
          await handleList(interaction, client, db);
          break;
        case "stats":
          await handleStats(interaction, client, db);
          break;
        case "manage":
          await handleManage(interaction, client, db);
          break;
        case "setup":
          await handleSetup(interaction, client, db);
          break;
      }
    } catch (error) {
      console.error("❌ Ticket dashboard error:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("❌ Dashboard Error")
        .setDescription(
          "An error occurred while accessing the ticket dashboard."
        )
        .setFooter({ text: "Please try again or contact support." });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};

// 📋 List tickets handler
async function handleList(interaction, client, db) {
  await interaction.deferReply({ ephemeral: true });

  const status = interaction.options.getString("status");
  const tickets = await db.getTickets(interaction.guild.id, status);

  if (tickets.length === 0) {
    const noTicketsEmbed = new EmbedBuilder()
      .setColor(client.colors.warning)
      .setTitle("📋 No Tickets Found")
      .setDescription(
        status
          ? `No tickets with status "${status}" found.`
          : "No tickets found for this server."
      )
      .setFooter({ text: "Users can create tickets with /ticket command." })
      .setTimestamp();

    return interaction.editReply({ embeds: [noTicketsEmbed] });
  }

  // 📊 Paginate tickets (show 10 per page)
  const ticketsPerPage = 10;
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  let currentPage = 0;

  const generateTicketList = (page) => {
    const start = page * ticketsPerPage;
    const end = start + ticketsPerPage;
    const pageTickets = tickets.slice(start, end);

    const listEmbed = new EmbedBuilder()
      .setColor(client.colors.primary)
      .setTitle(`🎫 Ticket Dashboard ${status ? `(${status})` : ""}`)
      .setDescription(
        `Showing ${pageTickets.length} of ${tickets.length} tickets`
      )
      .setFooter({
        text: `Page ${
          page + 1
        } of ${totalPages} • Use /ticketdashboard manage <id> to manage specific tickets`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    pageTickets.forEach((ticket) => {
      const user = client.users.cache.get(ticket.user_id);
      const channel = interaction.guild.channels.cache.get(ticket.channel_id);

      listEmbed.addFields({
        name: `🎫 Ticket #${ticket.id} - ${ticket.title}`,
        value: `
                **Status:** ${formatTicketStatus(ticket.status)}
                **Priority:** ${
                  ticket.priority.charAt(0).toUpperCase() +
                  ticket.priority.slice(1)
                }
                **User:** ${user ? user.tag : "Unknown User"}
                **Channel:** ${channel ? channel : "Deleted Channel"}
                **Created:** ${timeAgo(ticket.created_at)}
                ${
                  ticket.moderator_id
                    ? `**Assigned:** <@${ticket.moderator_id}>`
                    : "**Assigned:** Unassigned"
                }
                `,
        inline: false,
      });
    });

    return listEmbed;
  };

  const listEmbed = generateTicketList(currentPage);

  // 🎮 Navigation buttons for pagination
  const navigationRow = new ActionRowBuilder();

  if (totalPages > 1) {
    navigationRow.addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_list_prev")
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("ticket_list_next")
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages - 1)
    );
  }

  const components = totalPages > 1 ? [navigationRow] : [];
  await interaction.editReply({ embeds: [listEmbed], components });
}

// 📊 Stats handler
async function handleStats(interaction, client, db) {
  await interaction.deferReply({ ephemeral: true });

  const allTickets = await db.getTickets(interaction.guild.id);

  // 📈 Calculate statistics
  const stats = {
    total: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    inProgress: allTickets.filter((t) => t.status === "in_progress").length,
    waiting: allTickets.filter((t) => t.status === "waiting").length,
    closed: allTickets.filter((t) => t.status === "closed").length,
    resolved: allTickets.filter((t) => t.status === "resolved").length,
    high: allTickets.filter((t) => t.priority === "high").length,
    medium: allTickets.filter((t) => t.priority === "medium").length,
    low: allTickets.filter((t) => t.priority === "low").length,
  };

  // 📅 Recent activity
  const last24h = allTickets.filter(
    (t) => new Date(t.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  const last7d = allTickets.filter(
    (t) =>
      new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const statsEmbed = new EmbedBuilder()
    .setColor(client.colors.primary)
    .setTitle("📊 Ticket Statistics")
    .setDescription(
      `Comprehensive ticket analytics for ${interaction.guild.name}`
    )
    .addFields(
      {
        name: "📋 Status Overview",
        value: `
                🟢 Open: **${stats.open}**
                🟡 In Progress: **${stats.inProgress}**
                🟠 Waiting: **${stats.waiting}**
                🔴 Closed: **${stats.closed}**
                ✅ Resolved: **${stats.resolved}**
                `,
        inline: true,
      },
      {
        name: "📊 Priority Breakdown",
        value: `
                🔴 High: **${stats.high}**
                🟡 Medium: **${stats.medium}**
                🟢 Low: **${stats.low}**
                `,
        inline: true,
      },
      {
        name: "📈 Activity",
        value: `
                **Total Tickets:** ${stats.total}
                **Last 24h:** ${last24h}
                **Last 7 days:** ${last7d}
                `,
        inline: true,
      }
    )
    .setFooter({
      text: `Generated by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  // 📊 Add progress bars for visual representation
  if (stats.total > 0) {
    const activeTickets = stats.open + stats.inProgress + stats.waiting;
    const completedTickets = stats.closed + stats.resolved;

    statsEmbed.addFields({
      name: "📈 Progress Overview",
      value: `
            **Active Tickets:** ${activeTickets}/${stats.total} (${Math.round(
        (activeTickets / stats.total) * 100
      )}%)
            **Completed:** ${completedTickets}/${stats.total} (${Math.round(
        (completedTickets / stats.total) * 100
      )}%)
            `,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [statsEmbed] });
}

// 🛠️ Manage specific ticket handler
async function handleManage(interaction, client, db) {
  const ticketId = interaction.options.getInteger("ticket_id");

  // Implementation for managing specific tickets would go here
  // This would include status changes, assignment, etc.

  const manageEmbed = new EmbedBuilder()
    .setColor(client.colors.primary)
    .setTitle(`🛠️ Managing Ticket #${ticketId}`)
    .setDescription("Ticket management interface")
    .setFooter({ text: "Advanced ticket management features coming soon!" });

  await interaction.reply({ embeds: [manageEmbed], ephemeral: true });
}

// ⚙️ Setup handler
async function handleSetup(interaction, client, db) {
  const setupEmbed = new EmbedBuilder()
    .setColor(client.colors.primary)
    .setTitle("⚙️ Ticket System Setup")
    .setDescription("Configure your server's ticket system")
    .addFields(
      {
        name: "📁 Category Channel",
        value: "Tickets will be created in a dedicated category",
        inline: false,
      },
      {
        name: "📢 Log Channel",
        value: "Set a channel for ticket notifications",
        inline: false,
      },
      {
        name: "🎯 Current Status",
        value: "Ticket system is active and ready to use!",
        inline: false,
      }
    )
    .setFooter({ text: "Advanced setup options coming soon!" })
    .setTimestamp();

  await interaction.reply({ embeds: [setupEmbed], ephemeral: true });
}
