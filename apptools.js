const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

module.exports = function (app, sequelize) {
  let obj = {
    name: 'App',
    log: function (string, caller, debugLevel, prefix) {
      caller = caller || module.id
      /**
       * Debug levels:
       *  0 = off
       *  1 = fatal - the thing can't and won't continue
       *  2 = error - someone needs to be woken up at 2am for this
       *  3 = warn - probably no immediate human intervention required
       *  4 = info - something normal but significant happened
       *  5 = debug - something normal and insignificant happened
       *  6 = trace - variables, if's...
       */
      debugLevel = debugLevel || 0
      prefix = prefix || ''
      if (debugLevel <= app.locals.logLevel) {
        return app.debug('(%s) %s %s', caller, prefix, string)
      }
      return false
    },
    generateString: function (length) {
      let myName = 'generateString()'
      length = parseInt(length) || 12
      app.log(`Generating random string of length: ${length}`, myName, 7)
      let sauce = ''
      while (sauce.length < length) {
        sauce += (Math.random() + 1).toString(36).substring(2)
      }
      return sauce.substring(null, length)
    }
  }
  obj.isFileType = function (fileName, type) {
    let myName = 'isFileType'
    let extension = fileName.split('.').pop()
    return (extension == type)
  }
  obj.readDir = function (dir, extension) {
    let myName = 'readDir'
    return new Promise((resolve, reject) => {
      app.log(`Reading dir: ${dir}`, myName, 8)
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(new Error(`(${myName}) : ${err.message}`))
        } else {
          // Filter extensions here
          let fileList
          if (extension) {
            app.log(`Filtering by extension: ${extension}`, myName, 8)
            fileList = files.filter(file => {
              return (path.extname(file) === extension)
            })
          } else {
            fileList = files
          }
          if (fileList == undefined || fileList === null || fileList.length < 1) {
            app.log('Didn\'t find any files. Sending an empty list', myName, 7)
            resolve([])
          } else {
            app.log(`Found files: ${fileList}`, myName, 7)
            resolve(fileList)
          }
        }
      })
    })
  }
  obj.readModel = function (file) {
    let myName = 'readModel'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        let modelDefintion = require(path.join(__dirname, app.locals.modelsDir, file))(Sequelize, app)
        app.modelDefinitions[modelDefintion.tablename] = modelDefintion
        app.log(modelDefintion.tablename, myName, 6)
        app.models[modelDefintion.tablename] = sequelize.define(modelDefintion.tablename, modelDefintion.schema, modelDefintion.options)
      }
      resolve(true)
    })
  }
  obj.readController = function (file) {
    let myName = 'readController'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        let fileNameParts = file.split('.')
        let controllerName = fileNameParts[0].toLowerCase()
        app.log(controllerName, myName, 6)
        app.controllers[controllerName] = require(path.join(__dirname, app.locals.controllersDir, file))(app, controllerName)
      }
      resolve(true)
    })
  }
  obj.readMenu = function (file) {
    let myName = 'readMenu'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'json')) {
        let menuPath = path.join(__dirname, app.locals.navDir, file)
        app.log(`Menu filename: ${menuPath}`, myName, 7)
        app.menu = app.menu.concat(require(menuPath)['main'])
      }
      resolve(true)
    })
  }
  obj.readElement = function (file) {
    let myName = 'readElement'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        let fileNameParts = file.split('.')
        let elementName = fileNameParts[0].toLowerCase()
        app.log(elementName, myName, 6)
        app.elements[elementName] = require(path.join(__dirname, app.locals.elementsDir, file))
      }
      resolve(true)
    })
  }
  obj.readRoute = function (file) {
    let myName = 'readRoute'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        let fileNameParts = file.split('.')
        let routeName = fileNameParts[0].toLowerCase()
        app.log(routeName, myName, 6)
        app.routes[routeName] = require(path.join(__dirname, app.locals.routesDir, file))(app)
      }
      resolve(true)
    })
  }
  obj.readAssociation = function (file) {
    let myName = 'readAssociation'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        app.log(file, myName, 6)
        let association = require(path.join(__dirname, app.locals.modelsDir, 'associations', file))(app)
      }
      resolve(true)
    })
  }
  obj.readModelStartup = function (file) {
    let myName = 'readModelStartup'
    return new Promise((resolve, reject) => {
      if (app.tools.isFileType(file, 'js')) {
        app.log('Requiring ' + file, myName, 6)
        let modelStartup = require('./' + app.locals.modelsDir + '/modelstartups/' + file)(app)
      }
      resolve(true)
    })
  }
  obj.processFiles = function (files, cb) {
    let myName = 'processFiles'
    let routeReadPromises = Promise.resolve()
    files.forEach(file => {
      app.log(`Processing file: ${file}`, myName, 8)
      routeReadPromises = routeReadPromises.then(data => {
        return cb(file)
      })
    })
    return routeReadPromises
  }
  obj.setupBasePermissions = function () {
    let myName = 'setupBasePermissions'
    app.log('Setting up admin user...', myName, 6)
    let adminUser
    let defaultDomain, trashDomain
    let superAdminRole
    let setupPromises = Promise.resolve()
    setupPromises = setupPromises.then(() => {
      app.log('Looking for user: admin@' + app.locals.smtpDomain, myName, 6)
      return app.controllers.users.getUserByObj({ email: 'admin@' + app.locals.smtpDomain })
    }).then(user => {
      // The 'get' methods return an array of users
      if (user.length < 1) {
        app.log('No admin user found - creating', myName, 6)
        let adminUserDef = {
          'firstname': 'Administrative',
          'lastname': 'User',
          'email': 'admin@' + app.locals.smtpDomain,
          'verified': true,
          'disabled': false,
          'password': app.secrets['admin@' + app.locals.smtpDomain]
        }
        // The 'create' method returns an object, not an array!
        return app.controllers.users.create(adminUserDef)
      } else {
        // If the "user.length" check (above) passes then we're looking at an array here!
        return user[0]
      }
    }).then(user => {
      adminUser = user
      // app.log("Admin user: " + adminUser.fullname,myName,6);
      return app.controllers.roles.getRoleByName('Super Admin')
    }).then(role => {
      if (role === null) {
        app.log('No super-admin role found... creating', myName, 6, '+')
        let adminRoleDef = {
          name: 'Super Admin',
          description: 'Role can manage all models in all domains (super-admin users)',
          capabilities: { 'edit': 'all', 'create': 'all', 'list': 'all', 'delete': 'all' }
        }
        return app.controllers.roles.createRole(adminRoleDef)
      } else {
        app.log('Super-admin role found. Good.', myName, 6)
        return role
      }
    }).then(role => {
      superAdminRole = role
      return adminUser.addRole(role, { through: { comment: 'Initial creation phase' } })
    }).then(() => {
      app.log('Admin user connected to admin role', myName, 6)
      return app.controllers.domains.getDomainByName('Default')
    }).then(domain => {
      if (domain.length === 0) {
        app.log('Creating default domain', myName, 6)
        let defaultDomainDef = {
          name: 'Default',
          urn: 'default',
          description: 'The default domain',
          public: true,
          settings: {
            visible: ['notes']
          },
          ownerId: adminUser.id
        }
        return app.controllers.domains.createDomainAndRoles(defaultDomainDef, adminUser)
      } else {
        return domain
      }
    }).then(domain => {
      if (Array.isArray(domain)) domain = domain[0]
      defaultDomain = domain
      // Make sure and set the admin user's default domainId to this domain's ID
      return app.controllers.users.setDefaultDomainId(adminUser, defaultDomain)
    }).then(() => {
      return app.controllers.domains.getDomainByName('Trash')
    }).then(domain => {
      if (domain.length === 0) {
        app.log('Creating trash domain', myName, 6)
        trashDomain = {
          name: 'Trash',
          urn: 'trash',
          description: 'The trashcan of domains',
          public: false,
          settings: {
            visible: false
          },
          ownerId: adminUser.id
        }
        return app.controllers.domains.createDomainAndRoles(trashDomain, adminUser)
      } else {
        app.log(`Found 'Trash' domain`, myName, 7)
        return domain
      }
    }).then(domain => {
    //   trashDomain = domain
    //   return trashDomain
    // }).then((domain) => {
      trashDomain = domain
      app.log('Time to attach Super-Admin role to default domain...')
      return superAdminRole.addDomains(defaultDomain)
    }).then(() => {
      app.log('Time to attach Super-Admin role to trash domain...')
      return superAdminRole.addDomains(trashDomain)
    }).catch(err => {
      app.log(err.message, myName, 3, '!')
    })
    return setupPromises
  }
  obj.startModels = function (models) {
    let myName = 'startModels'
    app.log('Starting models...', myName, 6)
    let syncPromises = Promise.resolve()
    Object.keys(models).forEach(modelName => {
      // app.log(modelName,myName,6);
      syncPromises = syncPromises.then(() => {
        return models[modelName].sync()
          .then((model) => {
            let modelName = model.getTableName()
            app.log(modelName + ' started', myName, 6)
            return (modelName)
          })
          .catch(err => {
            app.log(err.message, myName, 4, '!')
            return (err)
          })
      })
    })
    return syncPromises
  }
  obj.timeStart = function (req, res, next) {
    let myName = 'timeStart()'
    req.appData.startTime = Date.now()
    app.log('app start time: ' + req.appData.startTime, myName, 5)
    return next()
  }
  obj.timeEnd = function (req, res, next) {
    let myName = 'timeEnd()'
    req.appData.stopTime = Date.now()
    app.log('app end time: ' + req.appData.stopTime, myName, 5)
    return next()
  }
  obj.handleRedirects = function (req, res, next) {
    let myName = 'handleRedirects'
    if (app.locals.redirectFrom && (req.get('Host') === app.locals.redirectFrom)) {
      app.log(`redirecting (301) from ${app.locals.redirectFrom} to ${app.locals.addr}`, myName, 6)
      return res.redirect(301, 'https://' + app.locals.addr + req.originalUrl)
    }
    return next()
  }
  obj.getModelName = function (req) {
    let myName = 'getModelName()'
    let basePath = '/' + req.path.split('/')[1] + '/'
    app.log('Base path: ' + basePath, myName, 6)
    return app.paths[basePath] || '/'
  }
  obj.setAppData = function (req, res, next) {
    let myName = 'setAppData()'
    // app.log("original request: " + req.session.originalReq,myName,4);
    app.log('clearing appData', myName, 6)
    req.appData = {}
    app.log('setting app name', myName, 6)
    req.appData.title = app.locals.appName
    // req.appData.modelName = obj.getModelName(req);
    req.appData.models = []
    req.appData.errors = []
    // app.log("setting MODEL name: " + req.appData.modelName,myName,5);
    obj.clearMessageQueue(req)
    return next()
  }
  obj.render = function (req, res) {
    let myName = 'render'
    if (!req.appData.view) {
      obj.show404(req, res)
    } else {
      let templateFile = req.appData.view
      app.log('Query Params: ' + JSON.stringify(req.query), myName, 7, ' >>> ')
      let format = req.query.format || 'html'
      switch (format.toLowerCase()) {
        case 'json':
          app.log('Rendering in JSON', myName, 6)
          let returnObj = {}
          req.appData.models.forEach(model => {
            app.log(`Loading model ${model} in JSON return data`, myName, 6)
            // console.log(req.appData[model]);
            returnObj[model] = req.appData[model]
            returnObj['errors'] = req.appData.errors
          })
          return res.json(returnObj)
        default:
          app.log('Rendering template: ' + templateFile, myName, 6)
          if (app.headOptions) {
            req.appData.headoptions = app.headOptions
          }
          req.appData.description = req.appData.description || app.locals.siteDescription
          app.log(`Session user: ${JSON.stringify(req.session.user)}`, myName, 8)
          return res.render(templateFile, req.appData)
      }
    }
  }
  obj.makeMessage = function (obj) {
    let myName = 'makeMessage'
    app.log(`${myName}: Making a message for: ${JSON.stringify(obj)}`, myName, 7)
    obj.msgId = Date.now()
    return obj
  }
  obj.clearMessageQueue = function (req) {
    let myName = 'clearMessageQueue()'
    app.log('clearing messages queue', myName, 6)
    req.appData.messages = []
    return true
  }
  obj.setMessage = function (req, res, next) {
    let myName = 'setMessage()'
    app.log('setting up messages', myName, 6)
    if (req.session.hasOwnProperty('messages')) {
      if (req.session.messages.length > 0) {
        // app.log(JSON.stringify(req.session.messages),myName,6);
        req.appData.messages = req.session.messages
      }
    } else {
      obj.clearMessageQueue(req)
    }
    return next()
  }
  obj.ackMesssage = function (req, res, next) {
    let myName = 'ackMesssage()'
    let msgId = req.params.msgId
    app.log("ack'ing message: " + msgId, myName, 5)
    let index = req.session.messages.findIndex(function (message) {
      return message.msgId == msgId
    })
    if (index == -1) return res.json({ 'msgId': false })
    if (req.session.messages.splice(index, 1).length != 1) return res.json({ 'msgId': false })
    return res.json({ 'msgId': msgId })
  }
  obj.getInviteQueryObj = function (userEmail, expirationHours) {
    expirationHours = expirationHours || app.locals.invitationTimeoutHours
    // Calculate the date some days ago
    let timeLimit = new Date(new Date() - (1000 * 60 * 60 * expirationHours))

    return {
      where: {
        'userEmail': userEmail,
        'accepted': 0,
        'createdAt': {
          [Sequelize.Op.gt]: timeLimit
        }
      }
    }
  }
  obj.isAuthenticated = function () {
    let myName = 'isAuthenticated'
    app.log('Checking if session is authenticated', myName, 6)
    if (!app.session) return false
    app.log('session object exists...', myName, 6)
    if (!app.session.cookie) return false
    app.log('session cookie exists...', myName, 6)
    if (!app.session.user) return false
    app.log('session user object exists...', myName, 6)
    if (!app.session.user.email) return false
    app.log('session user email exists...', myName, 6)
    if (!app.session.user.id) return false
    app.log('session user appears to be intact. Authenticated.', myName, 5)
    return true
  }
  obj.checkAuthentication = function (req, res, next) {
    let myName = 'checkAuthentication'
    if (!obj.isAuthenticated()) return res.redirect('/login/')
    // app.log('session user id is set...', myName, 6)
    // app.log('found all session info: ' + req.session.user.email, myName, 6)
    // app.log('final confirmation that ' + req.session.user.email + ' user id (' + req.session.user.id + ') exists', myName, 6)
    return app.models['users']
      .count({ where: { email: req.session.user.email, id: req.session.user.id } })
      .then((count) => {
        app.log(`Number of matching user records: ${count}`, myName, 7)
        if (count === 1) return next()
        app.log(`Incorrect number of user records returned - this is a problem`, myName, 3)
        return res.redirect('/login/')
      })
    // return res.redirect("/login");
  }
  obj.checkAuthorization = function (capability, userId, domainId) {
    let myName = 'checkAuthorization()'
    app.log('Checking if user ' + userId + ' is authorized to ' + capability + ' on domain ' + domainId, myName, 6)
    return new Promise((resolve, reject) => {
      let cap = {}
      cap[capability[0]] = { [Op.eq]: capability[1] }
      // The above is a way to query from within a JSON obj
      // When we call this method we pass capability as, e.g: ["create":"all"]
      // So, the above just makes it look like this: {"create":{[Op.eq]:"all"}}
      // [Op.eq] is a Sequelize operator meaning equal-to
      let query = {}
      query.roles = { capabilities: cap }
      query.users = { id: userId }
      query.domains = (domainId) ? { id: domainId } : null   // Admin user doesn't have a default domain ATM
      app.models['roles']
        .findAll({
          where: query.roles || null,
          include: [
            {
              model: app.models['users'],
              where: query.users || null
            },
            {
              model: app.models['domains'],
              where: query.domains || null
            }
          ]
        })
        .then((roles) => {
          if (roles === null || roles.length === 0) return resolve(false)
          app.log(roles.length + " roles found permitting '" + capability + "'", myName, 6)
          return resolve(true)
        })
        .catch(err => {
          app.log('error looking up authorizations: ' + err.message, myName, 2)
          return reject(err)
        })
    })
  }
  obj.setUserAccount = function (req, res, next) {
    var myName = 'setUserAccount()'
    app.log('setting user account data...', myName, 6)
    app.session = null
    if (req.session.user) {
      app.log('Session found: user: ' + req.session.user.email + ' id: ' + req.session.user.id, myName, 6)
      req.appData.user = req.session.user
      req.appData.account = req.session.user.email
      req.appData.accountNum = req.session.user.id
      app.session = req.session
    } else {
      app.log(`No user session detected`, myName, 6)
    }
    return next()
  }
  obj.getUserDomains = function (req, res, next) {
    var myName = 'getUserDomains()'
    app.log('getting all user domains...', myName, 6)
    if (!req.session.user) {
      app.log(`No user session detected`, myName, 6)
      return next()
    }
    return app.controllers['users'].getUserById(req.session.user.id)
      .then((user) => {
        return app.controllers['users'].compileDomainList(user)
      })
      .then((domains) => {
        for (let domain of domains) {
          app.log(`Adding domain to user's domain list: ${domain.name}`, myName, 7)
        }
        req.session.user.domains = domains
        return next()
      })
      .catch((err) => {
        app.log('Error finding list of domains for this user: ' + err.message, myName, 2)
        return res.send("This is the reason we can't continue: " + err.message)
      })
  }
  obj.triggerDomainSwitchBy = function (modelType) {
    return function (req, res, next) {
      let myName = `switchDomainByType(${modelType})`
      app.log(`Switching domain by model type: ${modelType}`, myName, 6)
      return app.controllers['users'].switchToDomainByType(modelType, req)
        .then(result => {
          app.log(`${myName} got a ${result} result`, myName, 6)
          return next()
        })
    }
  }
  // obj.setCurrentDomain = function (req, res, next) {
  //   let myName = 'setCurrentDomain'
  //   app.log('Setting current domain', myName, 6)
  //   if (!req.session.user) {
  //     app.log('No user session. Moving on...', myName, 6)
  //     return next()
  //   }
  //   let targetDomainId
  //   if (req.session.user.hasOwnProperty('switchDomain')) {
  //     app.log(`Found a switch-domain request for: ${req.session.user.switchDomain}`, myName, 6)
  //     targetDomainId = req.session.user.switchDomain
  //   } else if (req.session.user.defaultDomainId !== null) {
  //     app.log(`No switch-domain request found. Looking for a defaultDomain: ${req.session.user.defaultDomainId}`, myName, 6)
  //     targetDomainId = req.session.user.defaultDomainId
  //   } else {
  //     app.log(`No default domain set. Chosing the first on the list: ${req.session.user.domains[0].id}`, myName, 6)
  //     targetDomainId = req.session.user.domains[0].id
  //   }
  //   app.log(`Target domain is: ${targetDomainId}`, myName, 6)
  //   let switchTo = req.session.user.domains.filter(v => {
  //     return (v.id === targetDomainId)
  //   })
  //   if (switchTo && switchTo[0].id) {
  //     app.log(`Switching to this: ${switchTo[0].name} (${switchTo[0].id})`, myName, 6)
  //     req.session.user.currentDomain = switchTo[0]
  //   }
  //   app.log(`Session's current domain is ==> ${req.session.user.currentDomain.name}`, myName, 6)
  //   return next()
  // }
  obj.switchToDomain = function (req, res, next) {
    let myName = 'switchToDomain()'
    app.log('Request to set current domain to: ' + req.params.domainId, myName, 6)
    domainId = app.controllers['users'].requestNewDomain(req.session.user, req.params.domainId)
    // app.log(domainId + ":" + req.params.domainId,myName,6);
    if (domainId == req.params.domainId) {
      req.session.user.switchDomain = domainId
      app.log('Domain-switch request granted for domain ' + req.session.user.switchDomain, myName, 4)
    }
    return res.redirect('/')
  }
  obj.currentUserHasDomain = function (req, domainId) {
    let myName = 'currentUserHasDomain'
    // app.log(req.session.user,myName,6,"-->");
    return req.session.user.domains.filter(domain => {
      return domain.id === domainId
    }).length > 0
  }
  obj.homePage = function (req, res, next) {
    let myName = 'homePage'
    app.log('queueing home page', myName, 5)
    req.appData.sessionId = req.session.id
    req.appData.view = app.locals.homeView
    req.appData.pageTitle = (app.locals.homeDefaultTitle) ? app.locals.homeDefaultTitle : null
    req.appData.keywords = (app.locals.homeDefaultKeywords) ? app.locals.homeDefaultKeywords : null
    req.appData.pageClass = 'splash'

    let homePagePromises = Promise.resolve()
    homePagePromises = homePagePromises.then(() => {
      if (app.tools.isAuthenticated()) {
        return app.controllers.invites.checkInvites(app.session.user.email)
          .then(invites => {
            let numInvites = (invites) ? invites.length : 0
            app.log('Invites found: ' + numInvites, myName, 6)
            req.appData.invites = invites
            return true
          })
      } else {
        return false
      }
    }).then((result) => {
      if (!result) app.log('No invites found')
      app.log('Checking for notes', myName, 6)
      if (app.tools.isAuthenticated()) {
        return app.controllers['notes'].getNotesByUserId(app.session.user.id)
      } else {
        return app.controllers['notes'].getPublicNotes()
      }
    }).then(notes => {
      req.appData.notes = notes
      // app.log(JSON.stringify(notes),myName,6);
      app.log("Checking for custom 'home' module: " + app.locals.homeModule, myName, 6)
      if (app.homeModule) {
        // app.log("Inserting custom 'home' module...",myName,6)
        return app.homeModule.home(req, res, next)
      } else {
        return
      }
    }).then(() => {
      return next()
    }).catch((err) => {
      app.log(err.message)
      return res.send(err.message)
    })
    return homePagePromises
  }
  obj.loginPage = function (req, res, next) {
    let myName = 'loginPage()'
    app.log('queueing login page', myName, 5)
    // let salt = bcrypt.genSaltSync(10);
    req.appData.view = 'login'
    req.appData.pageClass = 'splash'
    req.appData.secretSauce = obj.generateString(12)
    return next()
  }
  obj.logoutPage = function (req, res, next) {
    let myName = 'logoutPage()'
    app.log('queueing log-out', myName, 5)
    app.controllers['users'].logout(req, res, next)
    return res.redirect('/')
  }
  obj.signupPage = function (req, res, next) {
    let myName = 'signupPage()'
    app.log('queueing sign-up page', myName, 5)
    req.appData.view = 'register'
    req.appData.pageClass = 'splash'
    return next()
  }
  obj.show404 = function (req, res) {
    let myName = 'show404'
    let fourOFourPath = path.join('./', app.locals.viewsDir, app.locals['404Page'])
    app.log(`Showing 404: ${fourOFourPath}`, myName, 3)
    return res.status(404).render(app.locals['404Page'], req.appData)
  }
  /**
   * This function is meant to be used in route lines
   * It returns a function that returns the named view.
   * @param {*} view
   */
  obj.showPage = function (view) {
    return function (req, res, next) {
      let myName = 'showPage' + view
      app.log(`Setting home view to ${view}`, myName, 6)
      req.appData.view = view
      return next()
    }
  }
  obj.showForm = function (req, res, next) {
    let myName = 'showForm()'
    let model = req.params.model || null
    if (!model) return res.redirect('/')
    let action = req.params.action || 'create'
    app.log('Requesting form: ' + model + action)
    app.log(`Session user: ${JSON.stringify(req.session.user)}`, myName, 8)
    let targetDomainId
    if (req.session.user.hasOwnProperty('currentDomainId')) {
      targetDomainId = req.session.user.currentDomainId
    } else {
      targetDomainId = req.session.user.defaultDomainId
    }
    return app.tools.checkAuthorization([action, 'all'], req.session.user.id, targetDomainId)
      .then((response) => {
        if (!response) {
          app.log('User failed authorization check', myName, 6)
          return []
        }
        app.log('User is authorized to show form: ' + model + action, myName, 6)
        app.models['domains']
          .findByPk(targetDomainId)
          .then(domain => {
            if (domain === null) return res.send("Couldn't determine a valid domain")
            req.appData.domain = domain
            return domain.getRoles()
          })
          .then(roles => {
            if (roles === null || roles.length === 0) return res.send('No roles found')
            // req.appData.user = req.session.user;
            req.appData.roles = roles
            req.appData.view = model + action
            if (req.query) {
              app.log(`Sending query string: ${JSON.stringify(req.query)}`, myName, 8)
              req.appData.query = req.query
            }
            app.log('Model is: ' + model, myName, 6)
            if (app.controllers[model].hasOwnProperty(action + 'Form'))
              return app.controllers[model][action + 'Form'](req, res)
            else
              return false
          })
          .then((data) => {
            if (data) req.appData[model + action] = data
            req.appData.domains = req.session.user.domains
            return next()
          })
      })
      .catch(err => {
        app.log(err.message, myName, 4)
        return res.send('Not authorized')
      })
  }
  obj.getElement = function (req, res, next) {
    let myName = 'getElement'
    if (app.elements.hasOwnProperty(req.params.element)) {
      app.log('Found element: ' + req.params.element, myName, 6)
      let targetDomain
      if (req.session.user.hasOwnProperty('currentDomain') && req.session.user.currentDomain.id) {
        targetDomain = req.session.user.currentDomain.id
      } else {
        targetDomain = req.session.user.defaultDomainId || 1
      }
      app.log(`Target domain to search on: ${targetDomain}`, myName, 6)
      return app.tools.checkAuthorization(app.elements[req.params.element].role, req.session.user.id, targetDomain)
        .then(authorized => {
          if (!authorized) {
            app.log('User failed authorization check', myName, 6)
            return next()
          }
          app.log(myName + ': Authorized for request: ' + req.method + ':' + req.route.path)
          // app.log(myName + ': Sending element: ' + JSON.stringify(app.elements[req.params.element]))
          return res.json(app.elements[req.params.element])
        })
        .catch(err => {
          app.log(err.message, myName, 4)
          return res.json({ 'error': err.message })
        })
    }
  }
  obj.logRequest = function (req, res, next) {
    let myName = 'logRequest'
    app.log(`${req.method} - ${req.protocol}://${req.hostname}${req.url} - (from ${req.ip} - ${req.get('User-Agent')})`, myName, 4)
    app.log(`Fresh: ${!!(req.fresh)}`, myName, 4)
    app.log(`Original URL: ${req.originalUrl}`, myName, 4)
    if (req.xhr) app.log(`Probably a client library request (e.g. JQuery) (XHR=${!!(req.xhr)})`, myName, 4)
    return next()
  }
  obj.stringifyQueryObj = function (queryObj) {
    let myName = 'stringifyQueryObj'
    let params = Object.keys(queryObj)
    if (params.length === 0) return ''
    app.log(`Stringifying: ${JSON.stringify(queryObj)}`, myName, 8)
    let returnString = '?'
    for (let param in queryObj) {
      returnString += `${param}=${queryObj[param]}`
    }
    return returnString
  }
  obj.enforceStrictRouting = function (req, res, next) {
    let myName = 'enforceStrictRouting'
    if (app.get('strict routing') && req.path.slice(-1) !== '/') {
      let queryString
      if (req.hasOwnProperty('query')) {
        queryString = app.tools.stringifyQueryObj(req.query)
      }
      app.log(`Enforcing strict routing. Redirecting to: ${req.protocol}://${req.hostname}${req.path}/${queryString}`, myName, 7)
      return res.redirect(301, `${req.protocol}://${req.hostname}${req.path}/${queryString}`)
    }
    return next()
  }
  obj.setOriginalUrl = function (req, res, next) {
    let myName = 'setOriginalUrl()'
    app.log('got a request of type: ' + req.protocol + ' :' + req.method + ' TO: ' + req.originalUrl + ' URL: ' + req.url, myName, 7)
    if (req.session) {
      req.session.originalReq = (req.originalUrl != '/login') ? req.originalUrl : req.session.originalReq
      // app.log("original request: " + req.session.originalReq,myName,4);
    }
    return next()
  }
  obj.redirectToOriginalReq = function (req, res) {
    let myName = 'redirectToOriginalReq()'
    // app.log("Original request: " + req.session.originalReq,myName,5);
    let redirectTo = req.session.originalReq || '/'
    if (redirectTo == '/login' || redirectTo == '/login/') {
      app.log('original request was ' + redirectTo + ' but redirecting to /', myName, 6)
      redirectTo = '/'
    }
    app.log('queueing to original request: ' + redirectTo, myName, 5)
    return res.redirect(redirectTo)
  }
  obj.sendEmail = function (mailObj, toArray) {
    let myName = 'sendEmail'
    return new Promise((resolve, reject) => {
      mailObj.From = {
        'Email': app.locals.smtpFromAddr,
        'Name': app.locals.smtpFromName
      }
      mailObj.To = toArray

      let finalObj = { 'Messages': [mailObj] }

      // app.log('Prepared email object for sending: ' + JSON.stringify(finalObj), myName, 7)
      let sendMail = app.mailjet
      .post('send', { 'version': 'v3.1' })
      .request(finalObj)
      .then(result => {
        app.log("Here's what happened: " + JSON.stringify(result), myName, 7)
        resolve(result)
      })
      .catch(err => {
        app.log('Error: ' + JSON.stringify(err), myName, 4)
        reject(err)
      })
    })
  }
  obj.secureTest = function (req, res, next) {
    var myName = 'secureTest'
    app.log('Request to render secure test page', myName)
    req.appData.view = 'secure'
    return next()
  }
  obj.pullParams = function (sourceObj, arr, optArr) {
    let myName = 'pullParams'
    let returnObj = {}
    arr = arr || []
    optArr = optArr || []
    for (let requiredValue of arr) {
      if (!sourceObj.hasOwnProperty(requiredValue)) return false
      returnObj[requiredValue] = sourceObj[requiredValue]
    }
    for (let optionalValue of optArr) {
      if (sourceObj.hasOwnProperty(optionalValue)) returnObj[optionalValue] = sourceObj[optionalValue]
    }
    return returnObj
  }
  obj.makeObj = function (sourceObj, arr) {
    let myName = 'makeObj'
    // app.log(sourceObj,myName,6);
    let returnObj = {}
    for (let value of arr) {
      app.log('Checking for valid param: ' + value, myName, 6)
      if (sourceObj[value]) {
        if (sourceObj[value] == 'null') sourceObj[value] = null
        returnObj[value] = sourceObj[value]
      }
    }
    return returnObj
  }
  obj.addProperties = function (inObj, propertyArray, outObj) {
    let myName = 'addProperties'
    outObj = outObj || {}
    if (inObj === null || inObj === undefined) return {}
    if (propertyArray === null || propertyArray === undefined) return inObj
    if (!Array.isArray(propertyArray)) propertyArray = [propertyArray]
    propertyArray.forEach((prop) => {
      if (inObj.hasOwnProperty(prop)) outObj[prop] = inObj.prop
    })
    return outObj
  }
  obj.errorHandler = function (err, req, res, next) {
    let myName = 'errorHandler()'
    if (!err) return next()
    app.log(err, myName, 3, '!')
    // responseString += "!!" + err;
    // return res.redirect('/')
    return obj.showPage(app.locals['404Page'])
  }
  app.log = function (string, caller, debugLevel, prefix) {
    caller = caller || this.name
    debugLevel = debugLevel || 6
    return obj.log(string, caller, debugLevel, prefix)
  }
  return obj
}
