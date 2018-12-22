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
      "urn":{
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      "description":{
        type: Sequelize.STRING,
        allowNull: true,
        lm_order: 1,
        lm_label:"Description",
        lm_placeholder:"description of the domain",
        lm_classlist:["lm_textarea","layout-width-1-2"]
      },
      "public":{
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      "settings":{
        type: Sequelize.JSON
      },
      "appid":{
        type: Sequelize.STRING
      }
    },
    requiredFields: ["name","urn"],
    optionalFields: ["id","description","settings","public"],
    options:{
      getterMethods: {
        uniqueAppId: function() {
          return this.appid + this.id;
        }
      },
      hooks:{
        beforeCreate:(domain) => {
          let myName = "domain_model:beforeCreate()";
          app.log("Generating app-wide ID for domain",myName,6);
          domain.appid = app.tools.generateString();
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
