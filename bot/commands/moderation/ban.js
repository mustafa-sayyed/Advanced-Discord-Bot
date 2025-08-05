const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { isModeratorOrOwner } = require("../../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("🔨 Ban a user from the server with optional reason")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Days of messages to delete (0-7)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  async execute(interaction, client) {
    // 🛡️ Enhanced moderator check
    if (!isModeratorOrOwner(interaction.member, interaction.guild)) {
      const noModPermEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("🚫 Moderator Access Required")
        .setDescription(
          "This command is restricted to server moderators and administrators only."
        )
        .addFields({
          name: "🔐 Required Permissions",
          value:
            "You need one of the following:\n• Administrator permission\n• Moderate Members permission\n• Ban Members permission\n• A moderator role",
          inline: false,
        })
        .setFooter({
          text: "Contact a server administrator if you believe this is an error.",
        });

      return interaction.reply({ embeds: [noModPermEmbed], ephemeral: true });
    }

    const targetUser = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") || 0;
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    // 🛡️ Permission checks
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("❌ Permission Denied")
        .setDescription(
          "You need the `Ban Members` permission to use this command."
        )
        .setFooter({
          text: "Contact an administrator if you believe this is an error.",
        });

      return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
    }

    if (
      !interaction.guild.members.me.permissions.has(
        PermissionFlagsBits.BanMembers
      )
    ) {
      const botNoPermEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("❌ Bot Permission Missing")
        .setDescription(
          "I need the `Ban Members` permission to execute this command."
        )
        .setFooter({
          text: "Please contact an administrator to grant the required permissions.",
        });

      return interaction.reply({ embeds: [botNoPermEmbed], ephemeral: true });
    }

    // 🚫 Self-ban protection
    if (targetUser.id === interaction.user.id) {
      const selfBanEmbed = new EmbedBuilder()
        .setColor(client.colors.warning)
        .setTitle("🤔 Hold Up!")
        .setDescription(
          "You can't ban yourself! If you want to leave, use the leave server option."
        )
        .setFooter({ text: "Self-destruction is not the answer! 😄" });

      return interaction.reply({ embeds: [selfBanEmbed], ephemeral: true });
    }

    // 🤖 Bot protection
    if (targetUser.id === client.user.id) {
      const botBanEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("💔 Betrayal!")
        .setDescription(
          "I can't ban myself! After all we've been through together..."
        )
        .setFooter({ text: "Et tu, Brute? 😭" });

      return interaction.reply({ embeds: [botBanEmbed], ephemeral: true });
    }

    // 🏆 Role hierarchy check (only if user is in server)
    if (targetMember) {
      const executorHighestRole = interaction.member.roles.highest;
      const targetHighestRole = targetMember.roles.highest;
      const botHighestRole = interaction.guild.members.me.roles.highest;

      if (targetHighestRole.position >= executorHighestRole.position) {
        const hierarchyEmbed = new EmbedBuilder()
          .setColor(client.colors.error)
          .setTitle("⚡ Role Hierarchy Error")
          .setDescription(
            "You cannot ban someone with a role equal to or higher than yours."
          )
          .addFields({
            name: "🏆 Role Comparison",
            value: `Your highest role: **${executorHighestRole.name}** (Position: ${executorHighestRole.position})\nTarget's highest role: **${targetHighestRole.name}** (Position: ${targetHighestRole.position})`,
            inline: false,
          })
          .setFooter({ text: "Role hierarchy prevents this action." });

        return interaction.reply({ embeds: [hierarchyEmbed], ephemeral: true });
      }

      if (targetHighestRole.position >= botHighestRole.position) {
        const botHierarchyEmbed = new EmbedBuilder()
          .setColor(client.colors.error)
          .setTitle("⚡ Bot Role Hierarchy Error")
          .setDescription(
            "I cannot ban someone with a role equal to or higher than my highest role."
          )
          .addFields({
            name: "🤖 Role Comparison",
            value: `My highest role: **${botHighestRole.name}** (Position: ${botHighestRole.position})\nTarget's highest role: **${targetHighestRole.name}** (Position: ${targetHighestRole.position})`,
            inline: false,
          })
          .setFooter({
            text: "Please move my role higher or lower the target's role.",
          });

        return interaction.reply({
          embeds: [botHierarchyEmbed],
          ephemeral: true,
        });
      }
    }

    // 🔍 Check if user is already banned
    try {
      const bans = await interaction.guild.bans.fetch();
      if (bans.has(targetUser.id)) {
        const alreadyBannedEmbed = new EmbedBuilder()
          .setColor(client.colors.warning)
          .setTitle("⚠️ Already Banned")
          .setDescription(
            `**${targetUser.tag}** is already banned from this server.`
          )
          .setFooter({
            text: "Use the unban command if you want to remove the ban.",
          });

        return interaction.reply({
          embeds: [alreadyBannedEmbed],
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("❌ Error checking ban list:", error);
    }

    // 🔨 Execute the ban
    try {
      // 📬 Try to DM the user before banning (only if they're in the server)
      if (targetMember) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(client.colors.error)
            .setTitle(`🔨 You've been banned from ${interaction.guild.name}`)
            .setDescription(
              `You have been permanently removed from **${interaction.guild.name}**.`
            )
            .addFields(
              { name: "📝 Reason", value: reason, inline: false },
              {
                name: "👤 Banned by",
                value: interaction.user.tag,
                inline: true,
              },
              {
                name: "📅 Date",
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                inline: true,
              },
              {
                name: "🗑️ Messages Deleted",
                value: `${deleteDays} day${deleteDays === 1 ? "" : "s"}`,
                inline: true,
              }
            )
            .setFooter({
              text: "This ban is permanent unless manually removed by staff.",
            })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`📬 Could not DM ${targetUser.tag} about their ban.`);
        }
      }

      // 🔨 Perform the ban
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | Banned by: ${interaction.user.tag}`,
        deleteMessageDays: deleteDays,
      });

      // ✅ Success confirmation
      const successEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("🔨 User Banned Successfully")
        .setDescription(
          `**${targetUser.tag}** has been banned from the server.`
        )
        .addFields(
          {
            name: "👤 Banned User",
            value: `${targetUser.tag} (${targetUser.id})`,
            inline: true,
          },
          {
            name: "👮 Moderator",
            value: `${interaction.user.tag}`,
            inline: true,
          },
          { name: "📝 Reason", value: reason, inline: false },
          {
            name: "🗑️ Messages Deleted",
            value: `${deleteDays} day${deleteDays === 1 ? "" : "s"} worth`,
            inline: true,
          },
          {
            name: "📊 Status",
            value: targetMember ? "🟢 Was in server" : "🔴 Not in server",
            inline: true,
          }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: `Action performed by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

      // 📊 Log the action
      console.log(
        `🔨 ${targetUser.tag} was banned from ${interaction.guild.name} by ${interaction.user.tag}. Reason: ${reason}`
      );
    } catch (error) {
      console.error("❌ Error banning user:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor(client.colors.error)
        .setTitle("❌ Ban Failed")
        .setDescription("An error occurred while trying to ban the user.")
        .addFields({
          name: "🔧 Possible Issues",
          value:
            "• Missing permissions\n• Role hierarchy conflicts\n• User ID not found\n• Bot malfunction",
          inline: false,
        })
        .setFooter({ text: "Please try again or contact an administrator." });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
