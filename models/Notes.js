module.exports = function(Sequelize,app) {
  return {
    tablename:"notes",
    schema:{
      "name":{
        type: Sequelize.STRING,
        allowNull: false
      },
      "description":{
        type: Sequelize.STRING,
        allowNull: true
      },
      "body":{
        type: Sequelize.TEXT,
        allowNull: true
      },
      "appid":{
        type: Sequelize.STRING
      }
      // ,
      // "domain":{
      //   type: Sequelize.INTEGER,
      //   references: {
      //     model: app.models["domains"],
      //     key: "id",
      //     deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
      //   }
      // },
      // "user":{
      //   type: Sequelize.INTEGER,
      //   references: {
      //     model: app.models["users"],
      //     key: "id",
      //     deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
      //   }
      // }
    },
    options:{
      hooks:{
        afterCreate:(note) => {
          let myName = "note_model:afterCreate()";
          app.log("creating unique app ID for note: " + note.id,myName,6);
          note.appId = app.tools.generateString() + note.id;
          note.update({"appid":noteappId})
          .then((note) => {
            app.log("unique app ID generated for note: " + note.id,myName,6);
          })
          .catch((err) => {
            app.log(err.message,myName,4,"===>");
          })
        }
      }
    }
  }
}