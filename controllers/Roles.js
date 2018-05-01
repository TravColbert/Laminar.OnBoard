module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getRoles : function(req,res,next) {
      let myName = "getRoles()";
      app.models[model]
      .findAll()
      .then(roles => {
        if(roles===null) return res.redirect('/');
        req.appData.roles = roles;
        req.appData.view = "roles";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getRole : function(req,res,next) {
      let myName = "getRole()";
      app.models[model]
      .findById(req.params.id)
      .then(role => {
        if(role===null) return res.redirect('/');
        req.appData.role = role;
        req.appData.view = "role";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getUsersByRoleId : function(req,res,next) {
      let myName = "getUsersByRoleId";
      app.models[model]
      .findById(req.params.id,{include:[app.models["users"]]})
      .then(role => {
        if(role===null) res.redirect('/');
        req.appData.role = role;
        req.appData.view = "roleusers";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomainsByRoleId : function(req,res,next) {
      let myName = "getDomainsByRole()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["domains"]]})
      .then(role => {
        if(role===null) res.redirect('/');
        req.appData.role = role;
        req.appData.view = "roledomains";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    createRole : function(req,res,next) {
      let myName = "createRole()";
      let newRole = app.tools.pullParams(req.body,["name"]);
      if(!newRole) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newRole["description"] = req.body.description;
      app.models[model].create(newRole).then(record => {
        req.appData.view = "role";
        req.appData.role = record;
        return next();
      });
    }
  };
  return obj;
};