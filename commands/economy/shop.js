const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Database = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛍️ Displays the available roles for purchase."),
  async execute(interaction) {
    const db = await Database.getInstance();
    const items = await db.ShopItem.find({ guildId: interaction.guild.id });

    if (items.length === 0) {
      return await interaction.reply({ content: "The shop is currently empty. An admin can add items with `/shop-admin add`.", ephemeral: true });
    }

    const shopEmbed = new EmbedBuilder()
      .setColor("#9B59B6") // Purple for shop
      .setTitle(`${interaction.guild.name}'s Role Shop`)
      .setDescription("Use `/buy <item name>` to purchase a role.");

    let itemsDescription = "";
    items.forEach(item => {
      itemsDescription += `**${item.name}** - <@&${item.roleId}>\nPrice: **${item.price.toLocaleString()}** coins\n\n`;
    });

    shopEmbed.addFields({ name: "Available Roles", value: itemsDescription });
    
    await interaction.reply({ embeds: [shopEmbed] });
  },
};