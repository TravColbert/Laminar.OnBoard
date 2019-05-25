module.exports = function (app, model) {
  if (!model) return false
  let myName = model + 'Controller'
  return {
    __create: function (obj) {
      let myName = '__create'
      app.log('Creating obj: ' + JSON.stringify(obj), myName, 6)
      return app.controllers['default'].create(model, obj)
    },
    __get: function (obj) {
      let myName = '__get'
      app.log('Getting obj: ' + JSON.stringify(obj), myName, 6)
      return app.controllers['default'].get(model, obj)
    },
    __update: function (obj) {
      let myName = '__update'
      app.log('Updating obj: ' + JSON.stringify(obj), myName, 6)
      return app.controllers['default'].update(model, obj)
    },
    __delete: function (obj) {
      let myName = '__delete'
      app.log('Deleting obj: ' + JSON.stringify(obj), myName, 6)
      return app.controllers['default'].delete(model, obj)
    },

    commentPage: function (req, res, next) {
      let myName = 'commentPage'
      app.log('Queueing default comment page', myName, 7)
      req.appData.view = 'comment'
      return next()
    },
    add: function (req, res, next) {
      let myName = 'add(comment)'
      app.log(JSON.stringify(req.body), myName, 8)
      let commentDef = app.tools.pullParams(req.body, ['email', 'name', 'text'])
      commentDef.subject = (req.body.hasOwnProperty('subject')) ? req.body.subject : 'general'
      commentDef.objectType = (req.body.hasOwnProperty('objectType')) ? req.body.objecttype : null
      app.log(`Adding comment ${JSON.stringify(commentDef)}`, myName, 6)
      app.controllers[model].__create(commentDef)
        .then(comment => {
          if (!comment) throw new Error('Comment not created')
          app.log(`Comment created: ${comment.id}`, myName, 6)
          return next()
        }).catch(error => {
          app.log(`Error: ${error.message}`, myName, 3)
          return next()
        })
    }
  }
}
