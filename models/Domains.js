module.exports = function(Sequelize,app) {
  return {
    tablename:"domains",
    schema:{
      "name":{
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        lm_order: 0,
        lm_description: "Name",
        lm_placeholder: "name of domain"
      },
      "description":{
        type: Sequelize.STRING,
        allowNull: true,
        lm_order: 1,
        lm_label:"Description",
        lm_placeholder:"description of the domain",
        lm_classlist:["lm_textarea","layout-width-1-2"]
      }
    },
    options:{
      hooks:{
        afterCreate:(domain) => {
          app.log("===> Creating default role(s) for domain '" + domain.name + "'");
          let domainAdminRole = {
            name:"Admin Role",
            description:"Administrative role for the " + domain.name + " domain",
            domainId:domain.id
          };
          app.models["roles"]
          .create(domainAdminRole)
          .then(role => {
            app.log("'" + role.name + "' role has been created for the '" + domain.name + "' domain");
          });
        }
      }
    },
    afterSync:function(db){
      let defaultDomain = {
          name:"Default Domain",
          description:"The default domain"
        };
      let trashDomain = {
          name:"Trash Domain",
          description:"The trashcan of domains"
        };
      let initialRecords = [defaultDomain,trashDomain];
      for(let c=0;c<initialRecords.length;c++) {
        app.log("Checking for domain: '" + initialRecords[c].name + "'...");
        db.count({where:{name:initialRecords[c].name}})
        .then(function(count) {
          if(count===0) {
            app.log("Domain does not exist in DB. Creating...");
            db.create(initialRecords[c])
            .then((record) => {
              app.log("Inserted '" + record.name + "' domain");
            });
          } else {
            app.log("Domain '" + initialRecords[c].name + "' exists in DB - no need to create it.");
          }
        });
      }
    }
  };
};
