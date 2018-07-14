module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    __create : function(obj) {
      let myName = "__create";
      app.log("Creating obj: " + obj,myName,6);
      return app.controllers["default"].create(model,obj);
    },
    __get : function(obj) {
      let myName = "__get";
      app.log("Getting obj: " + obj,myName,6);
      return app.controllers["default"].get(model,obj);
    },
    __update : function(obj) {
      let myName = "__update";
      app.log("Updating obj: " + obj,myName,6);
      return app.controllers["default"].update(model,obj);
    },
    __delete : function(obj) {
      let myName = "__delete";
      app.log("Deleting obj: " + obj,myName,6);
      return app.controllers["default"].delete(model,obj);
    },

    add : function(roleAppid,userEmail,pin,comment) {
      let myName = "add";
      return new Promise((resolve,reject) => {
        app.log("Adding new invite: " + roleAppid + " : " + userEmail + " : " + pin,myName,6);
        let createObj = {
          roleAppid : roleAppid,
          userEmail : userEmail,
          pin : pin,
          comment : comment
        };
        app.controllers[model].__create(createObj)
        .then(invite => {
          resolve(invite);
        })
        .catch(err => {
          app.log(err.message,myName,4);
          reject(new Error("(" + myName + ") " + err.message));
        })
      })
    }
  };
  return obj;
}
