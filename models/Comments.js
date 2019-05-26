module.exports = function (Sequelize, app) {
  return {
    tablename: 'comments',
    schema: {
      'email': {
        type: Sequelize.STRING,
        allowNull: false
      },
      'name': {
        type: Sequelize.STRING
      },
      'subject': {
        type: Sequelize.STRING,
        allowNull: false
      },
      'text': {
        type: Sequelize.TEXT,
        allowNull: false
      },
      'objectType': {
        type: Sequelize.STRING
      },
      'objectId': {
        type: Sequelize.INTEGER
      }
    },
    requiredField: ['email', 'subject', 'text'],
    optionalFields: ['id', 'name'],
    options: {
      // The below getter method turns getItem(options) into:
      // getFile(options) or getNote(options) depending on what
      // the 'scope' is.
      // The 'scope' is defined in the association between e.g.
      // Files and Comments or Notes and Comments.
      // See the comments.js association file for the rest.
      getterMethods: {
        getItem (options) {
          return this['get' + this.get('objectType')[0].toUpperCase() + this.get('objectType').substr(1)](options)
        }
      }
    }
  }
}
