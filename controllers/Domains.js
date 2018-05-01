module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getDomains : function(req,res,next) {
      let myName = "getRoles()";
      app.models[model]
      .findAll()
      .then((domains) => {
        if(domains===null) return res.redirect('/');
        req.appData.domains = domains;
        req.appData.view = "domains";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomain : function(req,res,next) {
      let myName = "getDomain()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["roles"]]})
      .then(domain => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domain";
        return next();
      })
      .catch(err => {
        res.send(err.message);
      });
    },
    getRolesByDomainId : function(req,res,next) {
      let myName = "getRolesByDomainId()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["roles"]]})
      .then((domain) => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domainroles";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getUsersByDomainId : function(req,res,next) {
      let myName = "getUsersByDomainId()";
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"],include:[app.models["users"]]}]})
      .then((domain) => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domainusers";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomainList : function(req,res,next) {
      let myName = "getDomainList()";
      app.models[model]
      .findAll()
      .then(records => {
        app.log("GOT DOMAIN LIST");
        return res.send(records);
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    // These functions are designed to be used by other functions
    fetchDomainIdByName : function(domainName) {
      let myName = "fetchDomainIdByName()";
      app.models[model]
      .findOne({where:{name:domainName}})
      .then(domain => {
        if(domain===null) return false;
        return domain.id;
      })
      .catch(err => {
        app.log(err.message,2);
        return false;
      })
    },
    fetchRoleByName : function(domainName,roleName,cb) {
      let myName = "fetchRoleByName()";
      app.models[model]
      .find({where:{name:domainName},include:[{model:app.models["roles"],where:{name:roleName}}]})
      .then(domain => {
        if(domain===null) cb();
        cb(null,domain);
      })
      .catch(err => {
        cb(err);
      })
    },
    createDomain : function(req,res,next) {
      let myName = "createDomain()";
      let newDomain = app.tools.pullParams(req.body,["name"]);
      if(!newDomain) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newDomain["description"] = req.body.description;
      newDomain.owner = req.session.user.id;
      app.models[model]
      .create(newDomain)
      .then(record => {
        record.getRoles()
        .then(roles => {
          req.appData.domain = record;
          req.appData.roles = roles;
          req.appData.view = "domain";
          return next();
        })
        .catch(err => {
          res.send(err.message);
        });
      })
      .catch(err => {
        res.send(err.message);
      });
    }
  };
  return obj;
};