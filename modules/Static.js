const path = require('path')
const fs = require('fs')

module.exports = function(app,express) {
  let myName = `Laminar.Static`

  let staticOptions = app.locals.staticOptions || {}
  app.use(express.static(path.join(app.cwd, app.locals.staticDir),staticOptions))

  let staticFiles = [
    {req:'/favicon.ico', file:app.locals.favicon || 'public/img/favicon-laminar.ico'},
    {req:'/robots.txt', file:app.locals.robots || 'public/robots.txt'},
    {req:'/sitemap.xml', file:app.locals.sitemap || 'public/sitemap.xml'}
  ]
  staticFiles.forEach(fileObj => {
    app.log(`Setting static file: ${fileObj.req}`, myName, 5)
    app.use(fileObj.req, express.static(path.join(app.cwd, fileObj.file)))
  })
  
  return app
}