// server/index.js
const Database = require('./utils/database.js');

module.exports = {
  // Utils
  database: new Database(), // Export an instance
  scheduler: require('./utils/scheduler.js'),
  moderation: require('./utils/moderation.js'),

  // Schemas
  schemas: require('./models/schemas.js'),
};