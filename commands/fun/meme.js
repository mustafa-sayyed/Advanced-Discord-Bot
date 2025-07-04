const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("😂 Get a random meme to brighten your day"),
  cooldown: 5,
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // 🎭 Try multiple meme sources for better reliability
      const memeSources = [
        "https://www.reddit.com/r/memes/hot/.json?limit=50",
        "https://www.reddit.com/r/wholesomememes/hot/.json?limit=50",
        "https://www.reddit.com/r/dankmemes/hot/.json?limit=50",
      ];

      let memeData = null;

      for (const source of memeSources) {
        try {
          const response = await axios.get(source, {
            headers: {
              "User-Agent": "DiscordBot/1.0",
            },
            timeout: 5000,
          });

          if (
            response.data &&
            response.data.data &&
            response.data.data.children
          ) {
            const posts = response.data.data.children.filter(
              (post) =>
                !post.data.over_18 &&
                (post.data.url.includes(".jpg") ||
                  post.data.url.includes(".png") ||
                  post.data.url.includes(".gif"))
            );

            if (posts.length > 0) {
              memeData = posts[Math.floor(Math.random() * posts.length)].data;
              break;
            }
          }
        } catch (sourceError) {
          console.log(`Failed to fetch from ${source}, trying next source...`);
          continue;
        }
      }

      if (memeData) {
        await this.sendMeme(interaction, client, memeData);
      } else {
        throw new Error("No meme sources available");
      }
    } catch (error) {
      console.error("❌ Meme fetch error:", error);

      // 🎨 Fallback with curated memes
      const fallbackMemes = [
        {
          title: "When your code works on the first try",
          url: "https://i.imgur.com/dVDJiez.jpg",
          author: "NovaBot",
        },
        {
          title: "Me debugging at 3 AM",
          url: "https://i.imgur.com/L5GInIF.jpg",
          author: "NovaBot",
        },
        {
          title: "Discord bots be like",
          url: "https://i.imgur.com/xvjQj7B.jpg",
          author: "NovaBot",
        },
      ];

      const randomMeme =
        fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
      await this.sendMeme(interaction, client, randomMeme, true);
    }
  },

  async sendMeme(interaction, client, memeData, isFallback = false) {
    const memeEmbed = new EmbedBuilder()
      .setColor(client.colors.warning)
      .setTitle(`😂 ${memeData.title}`)
      .setImage(memeData.url || memeData.image)
      .addFields(
        {
          name: "👤 Posted by",
          value: `u/${memeData.author}`,
          inline: true,
        },
        {
          name: "⬆️ Upvotes",
          value: `${memeData.ups || "N/A"}`,
          inline: true,
        },
        {
          name: "💬 Comments",
          value: `${memeData.num_comments || "N/A"}`,
          inline: true,
        }
      )
      .setFooter({
        text: `${
          isFallback ? "Curated by NovaBot" : "Fresh from Reddit"
        } • Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // 🔗 Add source link if not fallback
    if (!isFallback) {
      memeEmbed.setURL(`https://reddit.com${memeData.permalink}`);
    }

    await interaction.editReply({ embeds: [memeEmbed] });
  },
};
