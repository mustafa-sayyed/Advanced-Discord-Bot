// server/index.js
module.exports = {
  // Utils
  database: require('./utils/database.js'),
  scheduler: require('./utils/scheduler.js'),
  moderation: require('./utils/moderation.js'),

  // Schemas
  schemas: require('./models/schemas.js'),
};