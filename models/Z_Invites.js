module.exports = function(Sequelize,app) {
  return {
    tablename:"invites",
    schema:{
      "roleAppid":{
        type: Sequelize.STRING,
        references: {
          model:app.models["roles"],
          key:"appid"
        }
      },
      "userEmail":{
        type: Sequelize.STRING,
        references: {
          model:app.models["users"],
          key:"email"
        }
      },
      "pin":{
        type: Sequelize.STRING,
        allowNull: false
      },
      "comment":{
        type: Sequelize.STRING
      }
    }
  }
}