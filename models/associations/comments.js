module.exports = function (app) {
  (function () {
    let myName = 'comments associations'
    app.log('Building associations for comments', myName, 6)

    app.models['comments'].hasMany(app.models['comments'], {
      foreignKey: 'objectId',
      constraints: false,
      scope: {
        objectType: 'comments'
      }
    })
    app.models['comments'].belongsTo(app.models['notes'], {
      foreignKey: 'objectId',
      constraints: false,
      as: 'comment'
    })
    app.models['notes'].hasMany(app.models['comments'], {
      foreignKey: 'objectId',
      constraints: false,
      scope: {
        objectType: 'notes'
      }
    })
    app.models['comments'].belongsTo(app.models['notes'], {
      foreignKey: 'objectId',
      constraints: false,
      as: 'note'
    })
    app.models['files'].hasMany(app.models['comments'], {
      foreignKey: 'objectId',
      constraints: false,
      scope: {
        objectType: 'files'
      }
    })
    app.models['comments'].belongsTo(app.models['files'], {
      foreignKey: 'objectId',
      constraints: false,
      as: 'file'
    })
  })(app)
}
