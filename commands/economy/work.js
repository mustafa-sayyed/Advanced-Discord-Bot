const { SlashCommandBuilder, EmbedBuilder, Collection } = require("discord.js");
const Database = require("../../utils/database");

// Cooldown collection specifically for this command
const workCooldowns = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("💪 Work to earn some coins."),
  async execute(interaction) {
    const db = await Database.getInstance();
    const economySettings = await db.getGuildEconomy(interaction.guild.id);
    
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    // Dynamic Cooldown Logic
    const cooldownKey = `${guildId}-${userId}`;
    const cooldownTime = economySettings.workCooldown * 1000; // in milliseconds
    
    if (workCooldowns.has(cooldownKey)) {
        const expirationTime = workCooldowns.get(cooldownKey);
        if (Date.now() < expirationTime) {
            const expiredTimestamp = Math.round(expirationTime / 1000);
            return await interaction.reply({
                content: `You need to rest! You can work again <t:${expiredTimestamp}:R>.`,
                ephemeral: true,
            });
        }
    }

    const profile = await db.getUserProfile(userId, guildId);
    const amountEarned = economySettings.workAmount;

    // Update wallet and set new cooldown
    profile.wallet += amountEarned;
    await profile.save();
    
    workCooldowns.set(cooldownKey, Date.now() + cooldownTime);
    setTimeout(() => workCooldowns.delete(cooldownKey), cooldownTime); // Remove after cooldown expires

    const workEmbed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("Hard Work Pays Off!")
      .setDescription(`You worked hard and earned **${amountEarned.toLocaleString()}** coins!`)
      .addFields({
        name: "New Wallet Balance",
        value: `**${profile.wallet.toLocaleString()}** coins`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [workEmbed] });
  },
};