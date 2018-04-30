module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getRoles : function(req,res,next) {
      let myName = "getRoles()";
      app.models[model]
      .findAll()
      .then(results => {
        req.appData.rows = results;
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
        req.appData.role = role;
        req.appData.view = "role";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getRolesByDomainId : function(req,res,next) {
      let myName = "getRolesByDomainId()";
      let domainId = req.params.domainid;
      app.models[model]
      .findAll({where:{domainId:domainId}})
      .then(roles => {
        return res.send(roles);
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomainsByRole : function(req,res,next) {
      let myName = "getDomainsByRole()";
      let roleId = req.params.id;
      app.models[model]
      .findById(roleId)
      .then(role => {
        return res.send(role);
      })
      .catch(err => {
        return res.send(err.message);
      })
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