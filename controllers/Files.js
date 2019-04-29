const sharp = require('sharp')

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

    getById: function (id) {
      let myName = 'getById()'
      let searchObj = {
        where: {
          'id': id
        },
        include: [
          {
            model: app.models['domains'],
            as: 'domain'
          },
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      app.log('Looking for file with ID: ' + id, myName, 6)
      return app.controllers[model].__get(searchObj)
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
      if (pub) {
        searchObj.include[0].where = {
          'public': true
        }
      }
      app.log('Looking for files by user ID: ' + userId, myName, 6)
      return app.controllers[model].__get(searchObj)
    },

    getByDomainId: function (id) {
      let myName = 'getByDomainId()'
      let searchObj = {
        where: {
          'domainId': id
        },
        include: [
          {
            model: app.models['domains'],
            as: 'domain'
          },
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      app.log('Looking for files by domain ID: ' + id, myName, 6)
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
      app.log('Looking for public files', myName, 6)
      return app.controllers[model].__get(searchObj)
    },

    makeThumbnail: function (fileName, buffer) {
      let myName = 'makeThumbnail()'
      app.log('Saving thumbnail to: ' + app.cwd + app.locals.staticDir + '/' + app.locals.thumbnailsDir + '/' + fileName, myName, 6)
      return sharp(buffer)
        .resize(200)
        .toFile(app.cwd + app.locals.staticDir + '/' + app.locals.thumbnailsDir + '/' + fileName)
    },

    isImage: function (mimetype) {
      return (mimetype.indexOf('image') < 0) ? false : true
    },

    gets: function (req, res, next) {
      let myName = 'gets(files)'
      let getPromise = Promise.resolve()
      app.log('Getting files', myName, 6)
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

    get: function (req, res, next) {
      let myName = 'get(files)'
      if (!req.params.id) {
        return res.status(400).send('No file ID given')
      }
      app.log('Getting file with ID: ' + req.params.id)
      return app.controllers[model].getById(req.params.id)
        .then(file => {
          if (!file) {
            req.appData.files = []
          } else {
            // app.log('Got: ' + JSON.stringify(file), myName, 6)
            req.appData.files = file[0]
          }
          req.appData.view = 'file'
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

      app.log('Upload name is: ' + req.files.uploadfile.name, myName, 6)
      app.log('Upload type is: ' + req.files.uploadfile.mimetype, myName, 6)
      app.log('Upload size is: ' + req.files.uploadfile.size, myName, 6)
      app.log('Upload owner is: ' + req.body['userId'], myName, 6)
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
          if (app.controllers[model].isImage(newFile.mimetype)) {
            app.log('Uploaded file is an image - let\'s scale it', myName, 6)
            return app.controllers[model].makeThumbnail(file.appid, req.files.uploadfile.data)
              .then(info => {
                app.log('Saved thumbnail: format: ' + info.format + ' size: ' + info.size + ' width: ' + info.width + ' height: ' + info.height, myName, 6)
                return file
              })
          } else {
            return file
          }
        })
        .then(file => {
          return res.redirect('/files/' + file.id + '/')
        })
        .catch(err => {
          app.log('Error: ' + err.message, myName, 4)
          return res.status(400).send(err.message)
        })
    }
  }
}
