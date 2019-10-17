#!/usr/bin/node
const path = require('path')
console.log(`Current directory: ${process.cwd()}`)
const cwd = path.join(__dirname, '../')
console.log('Script directory is:', cwd)
const fs = require('fs')
const Sequelize = require('sequelize')

var app = {}
app.locals = JSON.parse(fs.readFileSync(path.join(cwd, 'config/config.json')))
app.secrets = JSON.parse(fs.readFileSync(path.join(cwd, 'config/secrets.json')))
app.debug = require('debug')('laminar')

var sequelize = new Sequelize(
  app.locals.dbConnection[app.locals.activeDbConnection].database,
  app.locals.dbConnection[app.locals.activeDbConnection].user,
  app.secrets.dbConnection[app.locals.activeDbConnection].password,
  {
    host: app.locals.dbConnection[app.locals.activeDbConnection].host,
    dialect: app.locals.activeDbConnection,
    // For SQLite only :
    storage: cwd + app.locals.dbConnection[app.locals.activeDbConnection].storage,
    // Logging:
    logging: app.locals.dbConnection[app.locals.activeDbConnection].logging
  }
)

app.tools = require('../apptools')(app, sequelize)

var notesDefinition = require('../models/Notes.js')(Sequelize, app)
var notesModel = sequelize.define(notesDefinition.tablename, notesDefinition.schema)

let createSlug = function (str) {
  app.log(`sluggifying: ${str}`, null, 6)
  const separator = '-'
  // remove accents, swap ñ for n, etc
  const from = 'åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;'
  const to = 'aaaaaaeeeeiiiioooouuuunc------'

  str = str.trim()
  str = str.toLowerCase()

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
  }

  let newStr = str
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-+/, '') // trim - from start of text
    .replace(/-+$/, '') // trim - from end of text
    .replace(/-/g, separator)

  app.log(`slug result: ${newStr}`, null, 6)
  return newStr
}

notesModel.findAll({})
  .then(notes => {
    notes.forEach(note => {
      let updateObj = {}
      console.log(`${note.id}: appid:${note.appid}`)
      if(!note.appid) {
        console.log(`no appid fund`)
        note.update({
          appid: app.tools.generateString() + note.id
        }).then(note => {
          console.log(`appid: ${note.appid} applied to note`)
          return true
        })
      }
      if(!note.slug) {
        console.log(`no slug found`)
        updateObj.slug = createSlug(note.name)
        note.update(updateObj)
          .then(note => {
            console.log(`slug: ${note.slug} applied to note`)
            return true
          })
      } else {
        console.log(`${note.slug}`)
      }
    })
  })
