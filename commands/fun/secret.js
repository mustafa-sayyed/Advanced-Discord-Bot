const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getRandomResponse } = require("@adb/server/utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("secret")
    .setDescription("🤫 Discover a hidden easter egg... if you dare!"),
  cooldown: 30,
  async execute(interaction, client) {
    // 🎭 Array of easter egg responses
    const easterEggs = [
      {
        title: "🕵️‍♂️ Secret Agent Mode Activated!",
        description:
          "You've discovered the secret command! Your mission, should you choose to accept it, is to have an awesome day! 🎯",
        color: client.colors.primary,
        field: {
          name: "🎪 Fun Fact",
          value: "This message will self-destruct in... just kidding! 😄",
        },
      },
      {
        title: "🏴‍☠️ Ahoy, Treasure Hunter!",
        description:
          "X marks the spot! You've found the hidden treasure of... absolutely nothing! But hey, at least you found it! 🗺️",
        color: client.colors.warning,
        field: {
          name: "💰 Reward",
          value: "The real treasure was the commands we ran along the way! ⚡",
        },
      },
      {
        title: "🚀 Houston, We Have Contact!",
        description:
          "Congratulations, space explorer! You've discovered this secret transmission from the NovaBot mothership! 🛸",
        color: client.colors.success,
        field: {
          name: "📡 Message",
          value: "The aliens say: 'Hello, human! You're pretty cool!' 👽",
        },
      },
      {
        title: "🧙‍♂️ Magic Spell Discovered!",
        description:
          "You've cast the ancient spell of curiosity! *Abracadabra!* ✨ Your reward is this magical message!",
        color: client.colors.error,
        field: {
          name: "🔮 Prophecy",
          value:
            "A great destiny awaits those who read this message... or maybe just a good day! 🌟",
        },
      },
      {
        title: "🎮 Achievement Unlocked!",
        description:
          "**Secret Finder** - Found the hidden easter egg command! You're officially a NovaBot power user! 🏆",
        color: client.colors.primary,
        field: {
          name: "🎯 Progress",
          value: "1/1 Secret Commands Found • Master Level: Achieved! 🥇",
        },
      },
      {
        title: "🎪 Welcome to the Secret Society!",
        description:
          "You are now a member of the exclusive 'I Found The Secret Command' club! Membership perks include... well, this message! 🎉",
        color: client.colors.success,
        field: {
          name: "🤝 Members",
          value:
            "You + Everyone else who found this = Best Friends Forever! 💫",
        },
      },
    ];

    const selectedEgg = getRandomResponse(easterEggs);

    // 🎨 Create the easter egg embed
    const easterEggEmbed = new EmbedBuilder()
      .setColor(selectedEgg.color)
      .setTitle(selectedEgg.title)
      .setDescription(selectedEgg.description)
      .addFields(selectedEgg.field)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({
        text: `Secret discovered by ${interaction.user.tag} • Shh, don't tell anyone! 🤫`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // 🎭 Random bonus messages
    const bonusMessages = [
      "P.S. You're awesome! 😎",
      "P.S. The cake is NOT a lie! 🍰",
      "P.S. 42 is indeed the answer! 🌌",
      "P.S. May the force be with you! ⭐",
      "P.S. Keep being curious! 🔍",
      "P.S. You have excellent taste in commands! 👌",
    ];

    const bonusMessage = getRandomResponse(bonusMessages);
    easterEggEmbed.addFields({
      name: "🎁 Bonus",
      value: bonusMessage,
      inline: false,
    });

    await interaction.reply({
      embeds: [easterEggEmbed],
      flags: 64, // MessageFlags.Ephemeral
    });

    // 🎊 Log the discovery
    console.log(
      `🤫 ${interaction.user.tag} discovered the secret command in ${
        interaction.guild?.name || "DM"
      }`
    );

    // 🎲 Small chance for extra surprise
    if (Math.random() < 0.1) {
      // 10% chance
      setTimeout(async () => {
        try {
          const surpriseEmbed = new EmbedBuilder()
            .setColor(client.colors.warning)
            .setTitle("🎉 BONUS SURPRISE!")
            .setDescription(
              "You hit the 10% bonus chance! Here's a virtual high-five! ✋"
            )
            .setFooter({ text: "Your luck stat must be maxed out!" });

          await interaction.followUp({
            embeds: [surpriseEmbed],
            flags: 64, // MessageFlags.Ephemeral
          });
        } catch (error) {
          console.error("❌ Error sending bonus surprise:", error);
        }
      }, 3000);
    }
  },
};
