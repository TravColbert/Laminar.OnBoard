const showdown = require('showdown')
module.exports = function (Sequelize, app) {
  return {
    tablename: 'notes',
    schema: {
      'name': {
        type: Sequelize.STRING,
        allowNull: false
      },
      'description': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'keywords': {
        type: Sequelize.STRING
      },
      'body': {
        type: Sequelize.TEXT,
        allowNull: true
      },
      'public': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      'appid': {
        type: Sequelize.STRING
      },
      'slug': {
        type: Sequelize.STRING,
        allowNull: true,
        set: function (str) {
          app.log(`sluggifying: ${str}`, null, 6)
          const separator = '-'
          // remove accents, swap ñ for n, etc
          const from = 'åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;'
          const to = 'aaaaaaeeeeiiiioooouuuunc------'

          str = str.trim()
          str = str.toLowerCase()

          for (let i = 0, l = from.length; i < l; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
          }

          let newStr = str
            .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
            .replace(/\s+/g, '-') // collapse whitespace and replace by -
            .replace(/-+/g, '-') // collapse dashes
            .replace(/^-+/, '') // trim - from start of text
            .replace(/-+$/, '') // trim - from end of text
            .replace(/-/g, separator)

          app.log(`slug result: ${newStr}`, null, 6)
          this.setDataValue('slug', newStr)
        }
      }
    },
    requiredFields: ['name'],
    optionalFields: ['id', 'description', 'keywords', 'body', 'html', 'public', 'appid', 'slug'],
    options: {
      getterMethods: {
        html () {
          let converter = new showdown.Converter()
          return converter.makeHtml(this.body)
        }
      },
      hooks: {
        beforeCreate: (note) => {
          let myName = 'note_model:beforeCreate()'
          app.log('Generating app-wide ID for note', myName, 6)
          note.appid = app.tools.generateString()
          note.slug = note.name
        },
        afterCreate: (note) => {
          let myName = 'note_model:afterCreate()'
          app.log('uniqifying app ID for note: ' + note.id, myName, 6)
          note.appid = note.appid + note.id
          app.log(`uniqified appid: ${note.appid}`)
          return note.update({ 'appid': note.appid })
            .then((note) => {
              app.log(`unique app ID generated for note: ${note.id}: ${note.appid}`, myName, 6)
              return note
            })
            .catch((err) => {
              app.log(err.message, myName, 4, '===>')
              return err
            })
        }
      }
    }
  }
}
