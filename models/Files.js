module.exports = function (Sequelize, app) {
  return {
    tablename: 'files',
    schema: {
      'name': {
        type: Sequelize.STRING,
        allowNull: false
      },
      'description': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'public': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      'appid': {
        type: Sequelize.STRING
      }
    },
    requiredFields: ['name'],
    optionalFields: ['id', 'description', 'public', 'appid', 'domainId', 'userId'],
    options: {
      hooks: {
        afterCreate: (file) => {
          let myName = 'file_model:afterCreate()'
          app.log('creating unique app ID for file: ' + file.name, myName, 6)
          file.appId = app.tools.generateString() + file.id
          file.update({ 'appid': file.appId })
            .then((file) => {
              app.log('unique app ID generated for file: ' + file.id, myName, 6)
            })
            .catch((err) => {
              app.log(err.message, myName, 4, '===>')
            })
        }
      }
    }
  }
}
