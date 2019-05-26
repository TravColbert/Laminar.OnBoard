module.exports = function (Sequelize, app) {
  return {
    tablename: 'users',
    schema: {
      'email': {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        },
        lm_order: 1,
        lm_label: 'Email Address',
        lm_placeholder: 'email address'
      },
      'firstname': {
        type: Sequelize.STRING,
        onCreate: 'first name here!',
        lm_order: 2,
        lm_label: 'First Name',
        lm_placeholder: 'first (given) name'
      },
      'lastname': {
        type: Sequelize.STRING,
        onCreate: 'last name here!',
        lm_order: 3,
        lm_label: 'Last Name',
        lm_placeholder: 'last (family) name'
      },
      'nickname': {
        type: Sequelize.STRING,
        unique: true
      },
      'verified': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      'disabled': {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        lm_order: 4,
        lm_label: 'User disabled for activity',
        lm_placeholder: 'disabled user'
      },
      'password': {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isPassword: function (val) {
            if (val.length < 8) throw new Error('Password too short')
          }
        },
        lm_order: 5,
        lm_label: "User's Passphrase"
      },
      'appid': {
        type: Sequelize.STRING
      }
    },
    options: {
      getterMethods: {
        fullname: function () {
          return this.lastname + ', ' + this.firstname
        },
        uniqueAppId: function () {
          return this.appid + this.id
        }
      },
      hooks: {
        beforeCreate: (user) => {
          let myName = 'user_model:beforeCreate()'
          app.log('Generating app-wide ID for user', myName, 7)
          user.appid = app.tools.generateString()
          // app.log("Hashing user password: " + user.password,myName,6);
          return app.controllers.users.cryptPassword(user.password)
            .then(success => {
              app.log('Hash created', myName, 6)
              user.password = success
            })
            .catch(err => {
              if (err) console.log(err)
            })
        }
      }
    }
  }
}
