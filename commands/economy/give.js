const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Database = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("🤝 Give coins to another user.")
    .addUserOption(option =>
      option.setName("recipient")
        .setDescription("The user you want to give coins to.")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("The amount of coins to give.")
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    const db = await Database.getInstance();
    const sender = interaction.user;
    const recipient = interaction.options.getUser("recipient");
    const amount = interaction.options.getInteger("amount");

    // Validation
    if (recipient.bot) {
      return await interaction.reply({ content: "❌ You cannot give coins to a bot.", ephemeral: true });
    }
    if (recipient.id === sender.id) {
      return await interaction.reply({ content: "❌ You cannot give coins to yourself.", ephemeral: true });
    }

    const senderProfile = await db.getUserProfile(sender.id, interaction.guild.id);

    if (senderProfile.wallet < amount) {
      return await interaction.reply({ content: "❌ You don't have enough coins in your wallet to give that much.", ephemeral: true });
    }

    const recipientProfile = await db.getUserProfile(recipient.id, interaction.guild.id);

    // Perform transaction
    senderProfile.wallet -= amount;
    recipientProfile.wallet += amount;

    await senderProfile.save();
    await recipientProfile.save();

    const giveEmbed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("💸 Transaction Successful")
      .setDescription(`**${sender.username}** has given **${amount.toLocaleString()}** coins to **${recipient.username}**!`);

    await interaction.reply({ embeds: [giveEmbed] });
  },
};