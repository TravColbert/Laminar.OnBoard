module.exports = function(Sequelize,app) {
  return {
    tablename:"invites",
    schema:{
      "roleAppid":{
        type: Sequelize.STRING,
        allowNull: false
      },
      "userEmail":{
        type: Sequelize.STRING,
        allowNull: false
      },
      "fromEmail":{
        type: Sequelize.STRING
      },
      "pin":{
        type: Sequelize.STRING,
        allowNull: false
      },
      "comment":{
        type: Sequelize.STRING
      },
      "accepted":{
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    }
  }
}