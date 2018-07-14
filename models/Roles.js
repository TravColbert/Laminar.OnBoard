module.exports = function(Sequelize,app) {
  return {
    tablename:"roles",
    schema:{
      "name":{
        type: Sequelize.STRING,
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
        lm_placeholder:"description of the role",
        lm_classlist:["lm_textarea","layout-width-1-2"]
      },
      "capabilities":{
        type: Sequelize.JSONB,
        allowNull: true
      },
      "appid":{
        type: Sequelize.STRING
      }
    },
    options:{
      hooks:{
        afterCreate:(role) => {
          let myName = "role_model:afterCreate()";
          app.log("creating unique app ID for role: " + role.id,myName,6);
          role.appId = app.tools.generateString() + role.id;
          role.update({"appid":role.appId})
          .then((role) => {
            app.log("unique app ID generated for role: " + role.id,myName,6);
          })
          .catch((err) => {
            app.log(err.message,myName,4,"===>");
          })
        }
      }
    },
    afterSync:function(db){
      let roleSuperAdmin = {
          id:0,
          name:"Super Admin",
          description:"Role can manage all models in all domains (super-admin users)",
          capabilities:{'edit':'all','create':'all','list':'all','delete':'all'}
        };
      let initialRecords = [roleSuperAdmin];
      for(let c=0;c<initialRecords.length;c++) {
        app.log("Checking for role: '" + initialRecords[c].name + "'...");
        db.count({where:{name:initialRecords[c].name}})
        .then((count) => {
          if(count===0) {
            app.log("Couldn't find role '" + initialRecords[c].name + "'. Creating...");
            db.create(initialRecords[c])
            .then((record) => {
              app.log("Inserted '" + record.name + "' role");
            });
          } else {
            app.log("Role '" + initialRecords[c].name + "' exists - no need to create it.");
          }
        });
      }
    }
  };
};
