const bcrypt = require('bcrypt')

module.exports = function(app) {
  return {
    authenticate: function(email,password) {
      let myName = "authenticate"
      searchObj = { where: { email: email.toLowerCase() } }
      return app.controllers['default'].get(searchObj)
      .then((users) => {
        if(!users || users.length === 0) return false
        return bcrypt.compare(password, users[0].password)
      })
      .then((result) => {
        return result
      })
      .catch((err) => {
        return err
      })
    },
    get: function(email) {
      let myName = `get`
      searchObj = { where: { email: email.toLowerCase() } }
      return app.controllers['default'].get('users',searchObj)
      .then((users) => {
        if(!users || users.length === 0) throw Error(`User ${email} not found`)
        return users[0]
      })
      .catch((err) => {
        return err
      })
    },
    userIsEnabled: function(email) {
      let myName = `userIsEnabled` 
      return this.get(email)
      .then((users) => {
        return !(users.disabled)
      })
      .catch((err) => {
        return err
      })
    },
    userIsVerified: function(email) {
      let myName = `userIsVerified` 
      return this.get(email)
      .then((users) => {
        return !!(users.verified)
      })
      .catch((err) => {
        return err
      })
    }
  }
}