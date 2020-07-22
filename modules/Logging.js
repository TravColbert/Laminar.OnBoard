const fs = require('fs')
const { Console } = require('console')

module.exports = function(app) {
  console.log(`I'm in the module...`)
  let myName = `Laminar.Logging`
  let outputStream = process.stdout
  let accessStream = process.stdout
  let errorStream = process.stderr
  if(app.locals.hasOwnProperty('logOptions')) {
    let options = {flags:"a"}
    if(app.locals.logOptions.log) outputStream = fs.createWriteStream(app.locals.logOptions.log, options)
    if(app.locals.logOptions.access) accessStream = fs.createWriteStream(app.locals.logOptions.access, options)
    if(app.locals.logOptions.error) errorStream = fs.createWriteStream(app.locals.logOptions.error, options)
  }
  obj = {
    logStdOut : new Console(outputStream, errorStream),
    logStdAccess : new Console(accessStream)
  }
  return obj
}