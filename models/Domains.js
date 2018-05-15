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
      },
      "appid":{
        type: Sequelize.STRING
      }
    },
    options:{
      getterMethods: {
        uniqueAppId: function() {
          return this.appid + this.id;
        }
      },
      hooks:{
        beforeCreate:(domain) => {
          let myName = "domain_model:beforeCreate()";
          app.log("Generating app-wide ID for domain");
          domain.appid = app.tools.generateString();
        },
        afterCreate:(domain) => {
          app.log("===> Creating default role(s) for domain '" + domain.name + "'");
          let domainAdminRole = {
            name:"Admin Role",
            description:"Administrative role for the " + domain.name + " domain",
            capabilities:{"edit":"all","create":"all","delete":"all","list":"all"}
          };
          let domainDefaultRole = {
            name:"Default Role",
            description:"Default role for the " + domain.name + " domain"
          };
          let newRoles = [domainAdminRole,domainDefaultRole];
          for(let c=0;c<newRoles.length;c++) {
            app.models["roles"]
            .create(newRoles[c])
            .then(role => {
              app.log("Adding role '" + role.name + "' to domain '" + domain.name + "'");
              domain.addRoles(role,{through:{comment:"'" + role.name + "' auto-added by domain after-create routine"}})
              .then(function() {
                app.log("'" + role.name + "' role has been created for the '" + domain.name + "' domain");
              })
              .catch(err => {
                app.log(err.message);
              });
            });
          }
          // Remember to add 'Super Admin' role to all created domains!
          app.models["roles"]
          .findOne({where:{name:'Super Admin'}})
          .then(role => {
            app.log("Adding role '" + role.name + "' to domain '" + domain.name + "'");
            domain.addRoles(role,{through:{comment:"'" + role.name + "' auto-added by domain after-create routine"}});
          })
          .catch(err => {
            app.log(err.message);
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
