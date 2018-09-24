module.exports = function(app) {
  (function() {
    let myName = "default associations";
    app.log("Building model associations",myName,6,"::>");
    app.models["domains"].belongsToMany(app.models["roles"],{through:app.models["domainsroles"]});
    app.models["roles"].belongsToMany(app.models["domains"],{through:app.models["domainsroles"]});
    app.models["users"].belongsToMany(app.models["roles"],{through:app.models["usersroles"]});
    app.models["roles"].belongsToMany(app.models["users"],{through:app.models["usersroles"]});
    app.models["users"].belongsTo(app.models["domains"],{as:'defaultDomain'});  // makes users.defaultDomainId field
    app.models["users"].hasOne(app.models["domains"],{as:'owner'});             // makes domains.ownerId field
    app.models["notes"].belongsTo(app.models["domains"],{as:'domain'});         // makes notes.domainId
    app.models["notes"].belongsTo(app.models["users"],{as:"user"});             // makes notes.userId
  })(app);
}

