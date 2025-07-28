const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Database = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop-admin")
    .setDescription("🛍️ Manage the server's role shop (Admin Only).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand.setName("add")
        .setDescription("Add a new role to the shop.")
        .addStringOption(option => option.setName("name").setDescription("The name of the role/item.").setRequired(true))
        .addIntegerOption(option => option.setName("price").setDescription("The price of the role.").setRequired(true).setMinValue(0))
        .addStringOption(option => option.setName("color").setDescription("Hex color for the role (e.g., #5865F2). Optional.").setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand.setName("delete")
        .setDescription("Delete a role from the shop.")
        .addRoleOption(option => option.setName("role").setDescription("The role to remove from the shop.").setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand.setName("edit")
        .setDescription("Edit a role in the shop.")
        .addRoleOption(option => option.setName("role").setDescription("The role to edit.").setRequired(true))
        .addStringOption(option => option.setName("new-name").setDescription("The new name for the role.").setRequired(false))
        .addIntegerOption(option => option.setName("new-price").setDescription("The new price for the role.").setRequired(false).setMinValue(0))
        .addStringOption(option => option.setName("new-color").setDescription("New hex color for the role (e.g., #FEE75C).").setRequired(false))
    ),

  async execute(interaction) {
    const db = await Database.getInstance();
    const subcommand = interaction.options.getSubcommand();

    const hexColorRegex = /^#[0-9A-F]{6}$/i;

    if (subcommand === "add") {
      const name = interaction.options.getString("name");
      const price = interaction.options.getInteger("price");
      const color = interaction.options.getString("color") || 'Random'; // Default to 'Random' if not provided

      if (color !== 'Random' && !hexColorRegex.test(color)) {
        return interaction.reply({ content: "❌ Invalid hex color format. Please use a format like `#5865F2`.", ephemeral: true });
      }

      const existingItem = await db.ShopItem.findOne({ guildId: interaction.guild.id, name: name });
      if (existingItem) {
        return interaction.reply({ content: "❌ An item with this name already exists in the shop.", ephemeral: true });
      }

      try {
        const newRole = await interaction.guild.roles.create({
          name: name,
          color: color, // Use the provided or default color
          reason: `Shop item added by ${interaction.user.tag}`,
        });

        const shopItem = new db.ShopItem({
          guildId: interaction.guild.id,
          roleId: newRole.id,
          name: name,
          price: price,
        });
        await shopItem.save();

        await interaction.reply({ content: `✅ Successfully added the **${name}** role to the shop for **${price}** coins.` });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: "❌ Failed to create the role. Make sure I have 'Manage Roles' permissions.", ephemeral: true });
      }
    } else if (subcommand === "delete") {
      const role = interaction.options.getRole("role");

      const item = await db.ShopItem.findOne({ guildId: interaction.guild.id, roleId: role.id });
      if (!item) {
        return interaction.reply({ content: "❌ That role is not an item in the shop.", ephemeral: true });
      }

      try {
        await role.delete("Shop item removed.");
        await db.ShopItem.deleteOne({ _id: item._id });
        await interaction.reply({ content: `✅ Successfully deleted the **${item.name}** item from the shop.` });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: "❌ Failed to delete the role. Make sure my role is above the shop roles.", ephemeral: true });
      }
    } else if (subcommand === "edit") {
        const role = interaction.options.getRole("role");
        const newName = interaction.options.getString("new-name");
        const newPrice = interaction.options.getInteger("new-price");
        const newColor = interaction.options.getString("new-color");

        if (!newName && !newPrice && !newColor) {
            return interaction.reply({ content: "❌ You must provide a new name, price, or color to edit.", ephemeral: true });
        }
        
        if (newColor && !hexColorRegex.test(newColor)) {
          return interaction.reply({ content: "❌ Invalid hex color format. Please use a format like `#5865F2`.", ephemeral: true });
        }

        const item = await db.ShopItem.findOne({ guildId: interaction.guild.id, roleId: role.id });
        if (!item) {
            return interaction.reply({ content: "❌ That role is not an item in the shop.", ephemeral: true });
        }

        const changes = [];
        const roleUpdates = {};
        if (newName) {
            roleUpdates.name = newName;
            item.name = newName;
            changes.push(`Name changed to **${newName}**.`);
        }
        if (newPrice !== null) {
            item.price = newPrice;
            changes.push(`Price changed to **${newPrice}** coins.`);
        }
        if (newColor) {
            roleUpdates.color = newColor;
            changes.push(`Color changed to **${newColor}**.`);
        }

        if (Object.keys(roleUpdates).length > 0) {
            await role.edit(roleUpdates, `Shop item edited by ${interaction.user.tag}`);
        }
        
        await item.save();
        await interaction.reply({ content: `✅ Successfully edited item: ${changes.join(" ")}` });
    }
  },
};