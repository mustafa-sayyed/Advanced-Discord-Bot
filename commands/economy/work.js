const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Database = require("../../utils/database");

module.exports = {
  // Set a 1-hour cooldown (3600 seconds)
  cooldown: 3600,
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("💪 Work to earn some coins."),
  async execute(interaction) {
    const db = await Database.getInstance();
    const profile = await db.getUserProfile(
      interaction.user.id,
      interaction.guild.id
    );

    const amountEarned = 100;

    // Update the user's wallet
    profile.wallet += amountEarned;
    await profile.save();

    const workEmbed = new EmbedBuilder()
      .setColor("#2ECC71") // Green color for success
      .setTitle("Hard Work Pays Off!")
      .setDescription(
        `You worked hard and earned **${amountEarned.toLocaleString()}** coins!`
      )
      .addFields({
        name: "New Wallet Balance",
        value: `**${profile.wallet.toLocaleString()}** coins`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [workEmbed] });
  },
};