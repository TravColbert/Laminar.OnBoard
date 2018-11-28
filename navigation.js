module.exports = function(app) {
  //   /**
  //    * The app's menu.
  //    * It is a JSON file object containing properties representing menu 
  //    * headings that contain an array 
  //    * For exmaple: "main":[]
  //    *
  //    * {link,text[,secured]}
  //    *
  //    * link:    the path part of the URL. The href
  //    * text:    what appears on the menu
  //    * secured: if absent - show the menu item all the time
  //    *          if true - show the menu item only when logged-in
  //    *          if false - show the menu item only when logged-out
  //    */
  //   menu : [
  //     {link:"/items/",text:"Items",icon:"devices"},
  //     {link:"/lends/",text:"Lends",icon:"content_paste"},
  //     /*{link:"/update",text:"Update Database",icon:"update",secured:true},*/
  //     {link:"/users/",text:"Users",icon:"people_outline",secured:true},
  //     /*{link:"/about",text:"About",icon:"info_outline"},*/
  //     {link:"/login/",text:"Log In",icon:"verified_user",secured:false},
  //     {link:"/logout/",text:"Log Out",icon:"highlight_off",secured:true},
  //   ]

  let obj = {};

  obj.getMenu = function(req,res,next) {
    let myName = "getMenu";
    app.log("building menu object",myName,5);
    req.appData.menu = [];
    app.menu.forEach(function(v,i,a) {
      if(!v.hasOwnProperty("secured")) {
        req.appData.menu.push(v);
      } else {
        if(v.secured && req.session.user) req.appData.menu.push(v);
        if(!v.secured && !req.session.user) req.appData.menu.push(v);
      }
    });
    return next();
  };
  obj.isAuthorized = function(req,requiredRole) {
    let myName = "isAuthorized()";
    app.log(myName + ": Checking authorization for: " + req.session.user.email);
    app.log(myName + ": S/He's trying to access: " + req.method + ":" + req.route.path);
    app.log(myName + ": S/He needs role: '" + requiredRole + "'...");
    if(req.user.hasOwnProperty(requiredRole)) {
      app.log(myName + ": Role '" + requiredRole + "' is: " + req.user[requiredRole]);
      return req.user[requiredRole];
    }
    app.log(myName + ": Correct role not set as TRUE for this user. NOT authorized.");
    return false;
  };
  obj.checkAuthorization = function(req,res,next) {
    let myName = "checkAuthorization()";
    /**
     * Maybe check authorization based on: user roles and req.baseUrl
     * First, look up the baseUrl, check the role that it wants vs what the 
     * user's role supports.
     */
    if(authElements.hasOwnProperty(req.method + ":" + req.route.path)) {
      if(isAuthorized(req,authElements[req.method + ":" + req.route.path].role)) {
        this.app.log(myName + ": Authorized for request: " + req.method + ":" + req.route.path);
        return next();
      }
    }
    this.app.log(myName + ": NOT Authorized for request: " + req.method + ":" + req.route.path);
    return res.redirect('/');
  }
  return obj;
}