module.exports = function(Sequelize,app) {
  return {
    tablename:"roles",
    schema:{
      "name":{
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        lm_order: 0,
        lm_description: "Name",
        lm_placeholder: "name of role"
      },
      "description":{
        type: Sequelize.STRING,
        allowNull: true,
        lm_order: 1,
        lm_label:"Description",
        lm_placeholder:"description of the role?",
        lm_classlist:["lm_textarea","layout-width-1-2"]
      }
    },
    afterSync:function(db){
      let roleApplicant = {
          name:"applicant",
          description:"user cannot log into website but is not blacklisted"
        };
      let roleValidated = {
          name:"validated",
          description:"user can log into the site"
        };
      let roleAdmin = {
          name:"administrator",
          description:"user can log into the site and make changes to all models"
        };
      let roleBlacklisted = {
          name:"blacklisted",
          description:"user can't log into the site and most passive services (like emails) don't work"
        };
      let roleFrozen = {
          name:"frozen",
          description:"user account is dormant and can't log into the site"
        };
      db.count({where:{}}).then()
      let initialRecords = [roleAdmin,roleApplicant,roleValidated,roleBlacklisted,roleFrozen];
      for(let c=0;c<initialRecords.length;c++) {
        app.log("Checking for role: '" + initialRecords[c].name + "'...");
        db.count({where:initialRecords[c]}).then(function(count) {
          if(count==0) {
            app.log("Couldn't find role. Creating...");
            db.create(initialRecords[c]).then(function(record) {
              app.log("Inserted " + JSON.stringify(record));
            });
          } else {
            app.log("Role '" + initialRecords[c].name + "' exists - no need to create it.");
          }
        });
      };
    }
  }
}
