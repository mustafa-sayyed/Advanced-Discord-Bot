const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Database = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economy-setup")
    .setDescription("⚙️ Configure economy settings for this server (Admin Only).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Restricts to Admins
    .addIntegerOption(option =>
      option.setName("work-amount")
        .setDescription("The amount of coins users get from /work.")
        .setRequired(false)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option.setName("work-cooldown")
        .setDescription("The cooldown for /work in minutes.")
        .setRequired(false)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const db = await Database.getInstance();
    const economySettings = await db.getGuildEconomy(interaction.guild.id);

    const workAmount = interaction.options.getInteger("work-amount");
    const workCooldownMinutes = interaction.options.getInteger("work-cooldown");

    const changes = [];

    if (workAmount !== null) {
      economySettings.workAmount = workAmount;
      changes.push(`Set **Work Amount** to **${workAmount}** coins.`);
    }
    if (workCooldownMinutes !== null) {
      economySettings.workCooldown = workCooldownMinutes * 60; // Convert minutes to seconds
      changes.push(`Set **Work Cooldown** to **${workCooldownMinutes}** minutes.`);
    }

    if (changes.length === 0) {
      return await interaction.reply({
        content: "You must provide at least one option to configure.",
        ephemeral: true,
      });
    }

    await economySettings.save();

    const setupEmbed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("✅ Economy Settings Updated")
      .setDescription(changes.join("\n"))
      .addFields(
        { name: "Current Work Amount", value: `${economySettings.workAmount} coins`, inline: true },
        { name: "Current Work Cooldown", value: `${economySettings.workCooldown / 60} minutes`, inline: true }
      )
      .setFooter({ text: "More settings will be available in the future!" })
      .setTimestamp();

    await interaction.reply({ embeds: [setupEmbed] });
  },
};