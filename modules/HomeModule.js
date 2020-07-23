module.exports = function(app) {
  let homeModule = false
  if (app.locals.hasOwnProperty('homeModule')) {
    if (app.locals.homeModule !== false && app.locals.homeModule !== null) {
      app.log('Including home module: ' + app.locals.homeModule, myName, 6)
      homeModule = require(path.join(app.cwd, app.locals.modulesDir, app.locals.homeModule))(app)
    }
  }
  return homeModule
}