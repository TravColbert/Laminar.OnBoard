module.exports = function(Sequelize,app) {
  return {
    tablename:"usersroles",
    schema:{
      "comment":{
        type: Sequelize.STRING
      }
    }
  }
}