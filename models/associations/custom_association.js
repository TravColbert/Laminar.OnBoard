module.exports = function(app) {
  (function() {
    let myName = "notes association";
    app.log("Invoking association",myName,6,"x x x");
    app.models["notes"].belongsTo(app.models["domains"],{as:'domain'});         // makes notes.domainId
    app.models["notes"].belongsTo(app.models["users"],{as:"user"});             // makes notes.userId
  })(app);
}

