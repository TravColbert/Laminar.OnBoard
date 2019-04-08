module.exports = function (app, model) {
  if (!model) return false
  let myName = model + 'Controller'
  let myModel = model
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

    getByUserId: function (userId, pub) {
      let myName = 'getByUserId()'
      let searchObj = {
        where: {
          'userId': userId
        },
        include: [
          {
            model: app.models['domains'],
            as: 'domain'
          }
        ]
      }
      if(pub) { 
        searchObj.include[0].where = {
          'public': true
        }
      }
      app.log('Looking for files by user ID: ' + userId)
      return app.controllers[model].__get(searchObj)
    },

    getPublic: function () {
      let myName = 'getPublic()'
      let searchObj = {
        where: {
          'public': true
        },
        include: [
          {
            model: app.models['domains'],
            where: {
              public: true
            },
            as: 'domain'
          }
        ]
      }
      app.log('Looking for public files')
      return app.controllers[model].__get(searchObj)
    },

    gets: function (req, res, next) {
      let myName = 'gets(files)'
      let getPromise = Promise.resolve()
      getPromise
        .then(() => {
          if (app.tools.isAuthenticated(req)) {
            return app.controllers[model].getByUserId(req.session.user.id, false)
          } else {
            return app.controllers[model].getPublic()
          }
        })
        .then(files => {
          req.appData.view = 'files'
          if (!files) {
            req.appData.files = []
          } else {
            req.appData.files = files
          }
          return next()
        })
        .catch(err => {
          return res.send('Err: ' + err.message)
        })
    },

    uploadFile: function (req, res, next) {
      let myName = 'uploadFile()'
      if (Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.')
      }

      // let newFile = app.tools.pullParams(req.body, app.modelDefinitions[model].requiredFields, app.modelDefinitions[model].optionalFields)
      // if (!newFile) return res.send('Required field missing... try again')
      // newFile.userId = req.session.user.id
      // newFile.domainId = req.body.domainId || req.session.user.currentDomain.id
      // app.log('New file: ' + JSON.stringify(newFile), myName, 6, '::::>')

      app.log('Upload name is: ' + req.files.uploadfile.name, myName, 6)
      app.log('Upload type is: ' + req.files.uploadfile.mimetype, myName, 6)
      app.log('Upload size is: ' + req.files.uploadfile.size, myName, 6)
      app.log('Upload owner is: ' + req.body['userId'], myName, 6)
      // app.log('Upload wants to save file: ' + req.body['name'], myName, 6)
      app.log('Upload description: ' + req.body['description'], myName, 6)
      app.log('Upload visibility: ' + req.body['public'], myName, 6)
      app.log('Upload domain: ' + req.body['domainId'], myName, 6)

      let newFile = {
        'name': req.files.uploadfile.name,
        'description': req.body['description'],
        'public': req.body['public'] || false,
        'domainId': req.body['domainId'],
        'userId': req.body['userId'],
        'mimetype': req.files.uploadfile.mimetype
      }

      return app.controllers[model].__create(newFile)
        .then(file => {
          app.log('Upload file saving to: ' + app.cwd + app.locals.staticDir + '/' + app.locals.uploadsDir + '/' + file.appid)
          req.files.uploadfile.mv(app.cwd + app.locals.staticDir + '/' + app.locals.uploadsDir + '/' + file.appid)
          return res.send('Got the file')
        })
        .catch(err => {
          app.log('Error: ' + err.message, myName, 4)
          return res.status(400).send(err.message)
        })
    }
  }
}
