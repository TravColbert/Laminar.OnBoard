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
      "public":{
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      "appid":{
        type: Sequelize.STRING
      }
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