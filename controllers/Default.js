module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    create : function(model,obj) {
      let myName = "create(default)";
      return new Promise((resolve,reject) => {
        if(!app.models.hasOwnProperty(model)) reject(new Error("Model: " + model + " does not exist"));
        app.log("Creating " + model + ": " + JSON.stringify(obj),myName,6);
        app.models[model].create(obj)
        .then(item => {
          app.log(JSON.stringify(item),myName,6);
          resolve(item);
        })
        .catch(err => {
          app.log(err.message,myName,5);
          reject(err);
        });
      });
    },
    get : function(model,obj) {
      let myName = "get(default)";
      return new Promise((resolve,reject) => {
        if(!app.models.hasOwnProperty(model)) reject(new Error("Model: " + model + " does not exist"));
        app.log("Getting " + model + ": " + JSON.stringify(obj),myName,6);
        app.models[model].findAll(obj)
        .then(items => {
          if(items===null) resolve([]);
          app.log(JSON.stringify(items),myName,6);
          resolve(items);
        }).catch(err => {
          app.log(err.message,myName,5);
          reject(err);
        });
      });
    },
    update : function(model,obj) {
      let myName = "update(default)";
      return new Promise((resolve,reject) => {
        if(!app.models.hasOwnProperty(model)) reject(new Error("Model: " + model + " does not exist"));
        app.log("Updating " + model + ": " + JSON.stringify(obj),myName,6);
        app.models[model].update(obj.values,{where:obj.where})
        .then(items => {
          app.log(JSON.stringify(items),myName,6);
          resolve(items);
        })
        .catch(err => {
          app.log(err.message,myName,5);
          reject(err);
        })
      })
    },
    delete : function(model,obj) {
      let myName = "delete(default)";
      return new Promise((resolve,reject) => {
        if(!app.models.hasOwnProperty(model)) reject(new Error("Model: " + model + " does not exist"));
        app.log("Deleting " + model + ": " + JSON.stringify(obj),myName,6);
        app.models[model].destroy(obj)
        .then(items => {
          app.log(JSON.stringify(items),myName,6);
          resolve(items);
        })
        .catch(err => {
          app.log(err.message,myName,5);
          reject(err);
        })
      })
    }
  };
  return obj;
};