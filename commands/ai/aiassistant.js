const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Database = require("../../utils/database");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("aiassistant")
    .setDescription("🤖 Ask the AI assistant anything!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ask")
        .setDescription("Ask the AI assistant a question")
        .addStringOption((option) =>
          option
            .setName("question")
            .setDescription("Your question for the AI assistant")
            .setRequired(true)
            .setMaxLength(1000)
        )
    ),

  cooldown: 10,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== "ask") {
      return await interaction.reply({
        content: "❌ Invalid subcommand. Use `/aiassistant ask <question>`",
        ephemeral: true,
      });
    }

    const question = interaction.options.getString("question");

    // Check rate limiting (5 requests per hour per user)
    try {
      const database = await Database.getInstance();
      const rateCheck = await database.checkRateLimit(
        interaction.user.id,
        interaction.guild.id,
        5, // 5 requests
        3600000 // 1 hour
      );

      if (!rateCheck.allowed) {
        const resetTime = Math.floor(rateCheck.resetTime.getTime() / 1000);
        const rateLimitEmbed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("⏱️ Rate Limited")
          .setDescription(
            `You've reached the AI request limit (5 per hour).\n\n**Reset:** <t:${resetTime}:R>`
          )
          .setFooter({
            text: "Rate limiting helps manage API costs and ensures fair usage.",
          })
          .setTimestamp();

        return await interaction.reply({
          embeds: [rateLimitEmbed],
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Rate limit check error:", error);
      // Continue with request if rate limit check fails
    }

    await interaction.deferReply();

    try {
      const prompt = `You are a helpful AI assistant. Answer this question concisely: ${question}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Truncate if too long
      const truncatedResponse =
        response.length > 1500 ? response.substring(0, 1500) + "..." : response;

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🤖 AI Assistant")
        .setDescription(truncatedResponse)
        .addFields({
          name: "❓ Your Question",
          value:
            question.length > 200
              ? question.substring(0, 200) + "..."
              : question,
          inline: false,
        })
        .setFooter({
          text: `Asked by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ai_ask_again_${interaction.user.id}`)
          .setLabel("Ask Another")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔄"),
        new ButtonBuilder()
          .setCustomId(`ai_rate_${interaction.user.id}`)
          .setLabel("Rate Response")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⭐")
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error("AI generation error:", error);

      let errorEmbed;

      // Handle specific API errors
      if (error.message && error.message.includes("429")) {
        // Gemini API quota exceeded
        errorEmbed = new EmbedBuilder()
          .setColor("#ff6b6b")
          .setTitle("🚫 API Quota Exceeded")
          .setDescription(
            "The AI service is currently at its daily quota limit. This usually resets at midnight UTC.\n\n" +
              "**What you can do:**\n" +
              "• Try again later (quota resets daily)\n" +
              "• Use shorter, simpler questions\n" +
              "• Contact server admins if this persists\n\n" +
              "**Alternative:** Try using the `/help` command for basic information!"
          )
          .setFooter({
            text: "We're using Google's free tier - quota limits help keep the bot free!",
          })
          .setTimestamp();
      } else if (
        error.status === 429 ||
        (error.response && error.response.status === 429)
      ) {
        // Another way quota exceeded error might appear
        errorEmbed = new EmbedBuilder()
          .setColor("#ff6b6b")
          .setTitle("🚫 API Quota Exceeded")
          .setDescription(
            "The AI service is currently at its daily quota limit. This usually resets at midnight UTC.\n\n" +
              "**What you can do:**\n" +
              "• Try again later (quota resets daily)\n" +
              "• Use shorter, simpler questions\n" +
              "• Contact server admins if this persists\n\n" +
              "**Alternative:** Try using the `/help` command for basic information!"
          )
          .setFooter({
            text: "We're using Google's free tier - quota limits help keep the bot free!",
          })
          .setTimestamp();
      } else if (error.message && error.message.includes("SAFETY")) {
        // Content safety filter triggered
        errorEmbed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("🛡️ Content Safety Filter")
          .setDescription(
            "Your question was flagged by the AI's safety filters. Please try rephrasing your question in a different way."
          )
          .setTimestamp();
      } else {
        // Generic error
        errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ AI Error")
          .setDescription(
            "Sorry, I encountered an error processing your question. Please try again in a moment."
          )
          .setTimestamp();
      }

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
