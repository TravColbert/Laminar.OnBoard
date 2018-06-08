module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    get : function(obj) {
      let myName = "get(note)";
      return new Promise((resolve,reject) => {
        app.log("Getting notes: " + JSON.stringify(obj),myName,6);
        app.models[model].findAll({where:obj})
        .then(notes => {
          if(notes===null) resolve([]);
          app.log(JSON.stringify(notes),myName,6);
          resolve(notes);
        }).catch(err => {
          app.log(err.message,myName,5);
          reject(err);
        });
      });
    },
    // getByUserAndDomain : function(userId,domainId) {
    //   let myName = "getByUserAndDomain(note)";
    //   return app.controllers[model].get({userId:userId,domainId:domainId});
    // },
    // getByUser : function(userId) {
    //   let myName = "getByUser(note)";
    //   return app.controllers[model].get({userId:userId});
    // },
    // getByDomain : function(domainId) {
    //   let myName = "getByDomain(note)";
    //   return app.controllers[model].get({domainId:domainId});
    // },
    // getById : function(noteId) {
    //   let myName = "getByNoteId(note)";
    //   return app.controllers[model].get({id:noteId});
    // },
    getNotes : function(req,res,next) {
      let myName = "getNotes";
      let searchObj = {
        userId : req.session.user.id,
        domainId : req.session.user.currentDomain.id
      }
      app.tools.checkAuthorization(["list","all"],searchObj.userId,searchObj.domainId)
      .then(response => {
        if(!response) {
          app.log("User failed authorization check",myName,6);
          return next();
        }
        app.log("User is authorized to list notes.",myName,6);
        return app.controllers[model].get(searchObj);
      })
      .then(notes => {
        req.appData.notes = notes;
        req.appData.view = "notes";
        return next();
      })
      .catch(err => {
        return res.send("Err: " + err.message);
      })
    },
    getNote : function(req,res,next) {
      let myName = "getNote()";
      let searchObj = {
        id : req.params.id
      }
      app.tools.checkAuthorization(["list","all"],req.session.user.id,req.session.user.currentDomain.id)
      .then(response => {
        if(!response) {
          app.log("User failed authorization check",myName,6);
          return next();
        }
        app.log("User is authorized to list notes.",myName,6);
        return app.controllers[model].get(searchObj);
      })
      .then(notes => {
        req.appData.note = notes[0];
        req.appData.view = "note";
        return next();
      })
      .catch(err => {
        return res.send("Err: " + err.message);
      })      
    },
    editNoteForm : function(req,res,next) {
      let myName = "editNoteForm()";
      // let prepareEditForm = function(authorized) {
      //   if(!authorized) {
      //     app.log("User is NOT authorized to edit!",myName,6);
      //     return res.send("User not authorized for this view");
      //   }
      //   app.log("User is authorized to edit.",myName,6);
      //   let noteObj = app.tools.pullParams(req.params,["id"]);
      //   app.log("Getting note with ID: " + noteObj.id,myName,6);
      //   app.models[model]
      //   .findById(req.params.id)
      //   .then(note => {
      //     if(note===null) {
      //       app.log("Couldn't find note",myName,4);
      //       return res.redirect("/notes/");
      //     }
      //     req.appData.note = note;
      //     req.appData.view = "notesedit";
      //     return next();
      //   })
      //   .catch(err => {
      //     return res.send(myName + ": " + err.message);
      //   });
      // };
      app.models[model]
      .find({where:{id:req.params.id,userId:req.session.user}})
      .then((note) => {
        if(note===null) {
          app.log("Couldn't find note",myName,4);
          return res.redirect("/notes/");
        }
        req.appData.note = notes;
        req.appData.view = "noteedit";
        return next();
      })
      .catch(err => {
        return res.send(myName + ":" + err.message);
      })
      // app.controllers["users"].ifUserHasRole(,req.session.user,prepareEditForm);
    },
    editNote : function(req,res,next) {
      let myName = "editNote()";
      let noteObj = app.tools.pullParams(req.body,["id","name","description","body","public"]);
      let requestedNoteId = req.params.id;
      app.log(noteObj.id + " " + requestedNoteId);
      if(noteObj.id!=requestedNoteId) return res.send("Didn't request the requested note");
      delete noteObj.id;
      app.models[model]
      .update(noteObj,{where:{id:req.params.id}})
      .then((notes) => {
        return res.redirect("/notes/" + requestedNoteId + "/");
      })
    },
    createNote : function(req,res,next) {
      let myName = "createNote()";
      let newNote = app.tools.pullParams(req.body,["name","description","body","public","userId","domainId"]);
      if(!newNote) return res.send("Required field missing... try again");
      newNote.userId = req.session.user.id;
      app.log("New note: " + JSON.stringify(newNote),myName,6,"::::>");
      app.models[model]
      .create(newNote)
      .then(note => {
        return res.redirect('/notes/' + note.id + "/");
      })
      .catch(err => {
        return res.send(err.message);
      })
    }
  };
  return obj;
};