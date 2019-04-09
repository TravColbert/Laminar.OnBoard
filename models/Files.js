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
      'mimetype': {
        type: Sequelize.BOOLEAN
      },
      'appid': {
        type: Sequelize.STRING
      }
    },
    requiredFields: ['name'],
    optionalFields: ['id', 'description', 'public', 'mimetype', 'appid', 'domainId', 'userId'],
    options: {
      hooks: {
        afterCreate: (file) => {
          let myName = 'file_model:afterCreate()'
          app.log('creating unique app ID for file: ' + file.name, myName, 6)
          file.appid = app.tools.generateString() + file.id
          return file.save().then(file => {
            app.log('unique app ID generated for file ' + file.id + ': ' + file.appid, myName, 6)
            return file.appid
          }).catch((err) => {
            app.log(err.message, myName, 4, '===>')
            return false
          })
        }
      }
    }
  }
}
