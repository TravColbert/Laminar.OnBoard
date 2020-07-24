module.exports = function (app, model) {
  if (!model) return false
  let myName = model + 'Controller'
  return {
    hello: function () {
      app.log(`Hello from ${myName}`, myName, 6)
      return true
    },
    create: function (model, obj) {
      let myName = 'create(default)';
      if (!app.models.hasOwnProperty(model)) return new Error('Model: ' + model + ' does not exist')
      app.log(`Creating ${model}`, myName, 6)
      return app.models[model].create(obj)
      .catch(err => {
        app.log(err.message, myName, 5)
        reject(err)
      })
    },
    get: function (model, obj) {
      let myName = 'get(default)';
      return new Promise((resolve, reject) => {
        if (!app.models.hasOwnProperty(model)) reject(new Error('Model: ' + model + ' does not exist'))
        app.models[model].findAll(obj)
        .then(items => {
          if (items === null) resolve([])
          resolve(items)
        })
        .catch(err => {
          app.log(err.message, myName, 5)
          reject(err)
        })
      })
    },
    update: function (model, obj) {
      let myName = 'update(default)';
      return new Promise((resolve, reject) => {
        if (!app.models.hasOwnProperty(model)) reject(new Error('Model: ' + model + ' does not exist'))
        app.models[model].update(obj.values, obj.options)
        .then(items => {
          resolve(items)
        })
        .catch(err => {
          app.log(err.message, myName, 5)
          reject(err)
        })
      })
    },
    delete: function (model, obj) {
      let myName = 'delete(default)';
      return new Promise((resolve, reject) => {
        if (!app.models.hasOwnProperty(model)) reject(new Error('Model: ' + model + ' does not exist'))
        app.models[model].destroy(obj)
        .then(items => {
          resolve(items)
        })
        .catch(err => {
          app.log(err.message, myName, 5)
          reject(err)
        })
      })
    }
  }
};
