module.exports = function (app, model) {
  if (!model) return false
  let myName = model + 'Controller'
  let myModel = model
  return {
    __create: function (obj) {
      let myName = '__create'
      return app.controllers['default'].create(model, obj)
    },
    __get: function (obj) {
      let myName = '__get'
      return app.controllers['default'].get(model, obj)
    },
    __update: function (obj) {
      let myName = '__update'
      return app.controllers['default'].update(model, obj)
    },
    __delete: function (obj) {
      let myName = '__delete'
      return app.controllers['default'].delete(model, obj)
    },

    getByUserAndDomainId: function (userId, domainId) {
      let myName = 'getNotesByUserAndDomainId'
      let searchObj = {
        where: {
          'userId': userId,
          'domainId': domainId
        }
      }
      app.log('Looking for notes in: ' + searchObj, myName, 6)
      return app.controllers[model].__get(searchObj)
    },
    getByDomainId: function (domainId) {
      let myName = 'getByDomainId'
      let searchObj = {
        where: {
          'domainId': domainId
        },
        order: [
          ['updatedAt', 'DESC']
        ]
      }
      app.log('Looking for notes in domain: ' + domainId, myName, 6)
      return app.controllers[model].__get(searchObj)
    },

    gets: function (req, res, next) {
      let myName = 'gets (notes)'
      let getsPromise = Promise.resolve()
      getsPromise = getsPromise.then(() => {
        if (app.tools.isAuthenticated()) {
          return app.controllers[model].getNotesByUserId(app.session.user.id)
        } else {
          return app.controllers[model].getPublicNotes()
        }
      })
        .then(notes => {
          req.appData.notes = notes
          req.appData.view = 'notes'
          return next()
        })
        .catch(err => {
          return res.send('Err: ' + err.message)
        })
      return getsPromise
    },
    get: function (req, res, next) {
      let myName = 'get (note)'
      let searchObj = {
        where: {
          id: req.params.id
        },
        order: [
          ['updatedAt', 'DESC']
        ],
        include: [
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      if (!app.tools.isAuthenticated()) {
        // User is not authenticated...
        // The note and domain must be 'public'
        searchObj.where.public = true
        searchObj.include.push(
          {
            model: app.models['domains'],
            where: {
              public: true
            },
            as: 'domain'
          }
        )
      } else {
        // Use is authenticated...
        // Just include the domain
        searchObj.include.push(
          {
            model: app.models['domains'],
            as: 'domain'
          }
        )
      }
      app.controllers[model].__get(searchObj)
        .then(notes => {
          app.log(`Found ${notes.length} notes`, myName, 7)
          req.appData.note = notes[0]
          // req.appData.title += ` - ${notes[0].name}`
          req.appData.pageTitle = notes[0].name
          if (notes[0].description) {
            req.appData.description = `${notes[0].description}`
          }
          if (notes[0].keywords) {
            req.appData.keywords = `${notes[0].keywords}`
          }
          req.appData.view = 'note'
          return next()
        })
        .catch(err => {
          return res.send('Err: ' + err.message)
        })
    },
    getAsBlog: function (req, res, next) {
      let myName = 'getAsBlog'
      // The main difference here is that we assume that we aren't authenticated.
      // We also check to see if 1) the domain is marked public and 2) the note
      // is marked public
      let searchObj = {
        where: {
          id: req.params.id
        },
        order: [
          ['updatedAt', 'DESC']
        ],
        include: [
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      if (!app.tools.isAuthenticated()) {
        app.log(`User not authenticated - showing public entries only`, myName, 6)
        // User is not authenticated...
        // The note must be 'public'
        searchObj.where.public = true
        searchObj.include.push(
          {
            model: app.models['domains'],
            where: {
              public: true
            },
            as: 'domain'
          }
        )
      } else {
        app.log(`User authenticated - showing all entries`, myName, 6)
        searchObj.include.push(
          {
            model: app.models['domains'],
            as: 'domain'
          }
        )
      }

      app.controllers[model].__get(searchObj)
        .then(notes => {
          app.log(`Found ${notes.length} notes`, myName, 7)
          if (!notes || notes.length === 0) return res.redirect('/blog/')
          req.appData.note = notes[0]
          // req.appData.title += ` - ${notes[0].name}`
          req.appData.pageTitle = notes[0].name
          if (notes[0].description) {
            req.appData.description = `${notes[0].description}`
          }
          if (notes[0].keywords) {
            req.appData.keywords = `${notes[0].keywords}`
          }
          req.appData.view = 'blogentry'
          // Now, get a list of notes...
          if (app.tools.isAuthenticated()) {
            return app.controllers[model].getNotesByUserId(app.session.user.id)
          } else {
            return app.controllers[model].getPublicNotes()
          }
        })
        .then(notes => {
          req.appData.notes = notes
          return next()
        })
    },
    getPublicNotes: function () {
      let myName = 'getPublicNotes'
      let searchObj = {
        where: {
          public: true
        },
        order: [
          ['updatedAt', 'DESC']
        ],
        include: [
          {
            model: app.models['domains'],
            where: {
              public: true
            },
            as: 'domain'
          },
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      return app.controllers[model].__get(searchObj)
        .then(notes => {
          return notes
        })
    },
    getNotesByUserId: function (userId) {
      let myName = 'getNotesByUserId'
      let searchObj = {
        order: [
          ['updatedAt', 'DESC']
        ],
        include: [
          {
            model: app.models['domains'],
            as: 'domain'
          },
          {
            model: app.models['users'],
            as: 'user',
            where: {
              id: userId
            }
          }
        ]
      }
      return app.controllers[model].__get(searchObj)
        .then(notes => {
          return notes
        })
    },
    getNotesInDomain: function (req, res, next) {
      let searchObj = {
        where: {
          public: true
        },
        include: [
          {
            model: app.models['domains'],
            where: {
              public: true,
              urn: req.params.domainId
            },
            as: 'domain'
          },
          {
            model: app.models['users'],
            as: 'user'
          }
        ]
      }
      app.controllers[model].__get(searchObj)
        .then(notes => {
          req.appData.notes = notes
          req.appData.view = 'notes-list'
          return next()
        })
    },
    showBlog: function (req, res, next) {
      // req.appData.view = 'blogs-list'
      // req.appData.title += ' - Blog Articles'
      req.appData.pageTitle = 'Blog Articles'
      req.appData.view = 'home-blog'
      return next()
    },
    editNoteForm: function (req, res, next) {
      let myName = 'editNoteForm()'
      let searchObj = {
        where: {
          'id': req.params.id,
          'userId': req.session.user.id
        },
        include: [
          {
            model: app.models['domains'],
            as: 'domain'
          }
        ]
      }
      app.controllers[model].__get(searchObj)
        .then(notes => {
          if (!notes) return res.redirect('/notes/')
          // app.log("Note found: " + notes[0],myName,6);
          // app.log(JSON.stringify(notes[0]), myName, 6)
          req.appData.note = notes[0]
          req.appData.view = 'noteedit'
          return next()
        })
        .catch(err => {
          return res.send(myName + ':' + err.message)
        })
    },
    editNote: function (req, res, next) {
      let myName = 'editNote()'
      let noteObj = app.tools.pullParams(req.body, app.modelDefinitions[model].requiredFields, app.modelDefinitions[model].optionalFields)

      let requestedNoteId = req.params.id
      if (noteObj.id !== requestedNoteId) return res.send("Didn't request the requested note")
      if (!noteObj.hasOwnProperty('public')) noteObj.public = false
      app.log(noteObj.id + ' ' + requestedNoteId, myName, 6)
      delete noteObj.id
      // app.log('Updating note: ' + JSON.stringify(noteObj), myName, 6)
      app.controllers[model].__update({ values: noteObj, options: { where: { 'id': requestedNoteId } } })
        .then((notes) => {
          app.log(notes[0] + ' notes updated')
          return res.redirect('/notes/' + requestedNoteId + '/')
        })
        .catch(err => {
          app.log('Error: ' + err.message, myName, 4)
          return res.send(err.message)
        })
    },
    createNote: function (req, res, next) {
      let myName = 'createNote()'
      let newNote = app.tools.pullParams(req.body, app.modelDefinitions[model].requiredFields, app.modelDefinitions[model].optionalFields)
      if (!newNote) return res.send('Required field missing... try again')
      newNote.userId = req.session.user.id
      newNote.domainId = req.body.domainId || req.session.user.currentDomain.id
      // app.log('New note: ' + JSON.stringify(newNote), myName, 6, '::::>')
      app.controllers[model].__create(newNote)
        .then(note => {
          return res.redirect('/notes/' + note.id + '/')
        })
        .catch(err => {
          app.log('Error: ' + err.message, myName, 4)
          return res.send(err.message)
        })
    },
    countByDomain: function (domainId) {
      let myName = 'countByDomain'
      return new Promise((resolve, reject) => {
        let searchObj = {
          where: { 'domainId': domainId }
        }
        app.controllers[model].__get(searchObj)
          .then(notes => {
            app.log('Counted: ' + notes.length + ' notes', myName, 6)
            resolve(notes.length)
          })
          .catch(err => {
            app.log('Error: ' + err.messages)
            reject(err)
          })
      })
    }
  }
}
