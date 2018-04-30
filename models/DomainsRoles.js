module.exports = function(Sequelize,app) {
  return {
    tablename:"domainsroles",
    schema:{
      "comment":{
        type: Sequelize.STRING
      }
    }
  };
};