// Default ORM is Sequelize
const Sequelize = require('sequelize')

module.exports = function(app) {
  return new Sequelize(
    app.locals.dbConnection[app.locals.activeDbConnection].database,
    app.locals.dbConnection[app.locals.activeDbConnection].user,
    app.secrets.dbConnection[app.locals.activeDbConnection].password,
    {
      host: app.locals.dbConnection[app.locals.activeDbConnection].host,
      dialect: app.locals.activeDbConnection,
      // For SQLite only :
      storage: app.cwd + app.locals.dbConnection[app.locals.activeDbConnection].storage,
      // Logging:
      logging: app.locals.dbConnection[app.locals.activeDbConnection].logging
    }
  )
}