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
        res.send(err.message);
      });
    },
    createDomain : function(req,res,next) {
      let myName = "createDomain()";
      let newDomain = app.tools.pullParams(req.body,["name"]);
      if(!newDomain) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newDomain["description"] = req.body.description;
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