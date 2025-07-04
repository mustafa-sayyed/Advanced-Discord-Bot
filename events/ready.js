const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🚀 ${client.user.tag} is now online and ready!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    console.log(`👥 Connected to ${client.users.cache.size} users`);

    // 🎭 Set dynamic bot status
    const activities = [
      { name: "/help | Always here to assist 🚀", type: ActivityType.Playing },
      {
        name: `${client.guilds.cache.size} servers`,
        type: ActivityType.Watching,
      },
      { name: "modern Discord features", type: ActivityType.Listening },
      { name: "with slash commands", type: ActivityType.Playing },
    ];

    let activityIndex = 0;

    // Set initial activity
    client.user.setActivity(activities[0]);

    // Rotate activities every 30 seconds
    setInterval(() => {
      activityIndex = (activityIndex + 1) % activities.length;
      client.user.setActivity(activities[activityIndex]);
    }, 30000);

    console.log("🎨 Dynamic status rotation started!");
  },
};
