/**
 * @author Travis Colbert trav.colbert@gmail.com
 */

"use strict";

var Laminar = Laminar || {};

Laminar.createModel = function(obj,handlerFunctionObj,debug) {
  debug = debug || false;
  var handlerFunctionProperty = "handlerFunctions";
  var handlerFunctionSuffix = "HandlerFunctions";
  var makeProxyHandlerObj = function(handlerFunctionObj) {
    handlerFunctionObj = handlerFunctionObj || {};

    var markDirty = function(target,property) {
      if(!target.hasOwnProperty("__dirty")) {
        Object.defineProperty(
          target,
          "__dirty",
          {
            configurable:false,
            enumerable:false,
            value:[]
          }
        );
      }
      if(target.__dirty.indexOf(property)<0) target.__dirty.push(property);
      return true;
    };

    var proxyHandler = {
      get: function(target,property) {
        var thisHandler = "get";
        var value = (property in target) ? target[property] : false;
        for(var f in this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix]) {
          value = this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix][f](target,property,value);
        }
        return value;
      },
      set: function(target,property,value,receiver) {
        var thisHandler = "set";
        var result = true;
        let targetValue;
        if(this.debug) console.log("proxyHandler:",thisHandler,"called in value:");
        // if(debug) console.log(value);
        /* So, the trouble is if the value is a primitive or an object
         * The value of primitives: boolean, null, string, number, etc 
         * get COPIED. But objects: objects and arrays get copied by 
         * REFERENCE or shared.
         * So, when a primitive is passed (like maybe a property) everything 
         * works great. But if an object is passed, everything works great 
         * BUT if you every modify the object that was passed to the SET 
         * handler, since the object is shared, it will modify the contents
         * of the Laminar Model.
         * So, we have to make a full copy of OBJECTS otherwise, go as normal.
         */
        if(typeof value === "object") {
          targetValue = Object.assign({},value);  // Does this work for arrays?
          // let targetValue = JSON.parse(JSON.stringify(value));
          // The above ^^^ doesn't work because Object.assign({},1) will render: {}
          // But JSON.parse(JSON.stringify(1)) renders 1;
        } else {
          targetValue = value;
        }
        if(this.debug) console.log("??",targetValue);
        for(var f in this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix]) {
          if(this.debug) console.log("proxyHandler:",thisHandler,":function #",f);
          targetValue = this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix][f](target,property,targetValue,receiver);
          // if(debug) console.log(JSON.stringify(targetValue));
          if(targetValue===undefined) {
            if(this.debug) console.log("SET-handler chain broken by bad value");
            return false;
          };
        }
        if(this.debug) console.log("proxyHandler:",thisHandler,": ",JSON.stringify(target),"SET value",targetValue,"on property",property);
        if(!target) return result;
        var result = ((target[property] = targetValue)!==false) ? true : false;
        if(this.debug) console.log("proxyHandler:",thisHandler,": Result of SET value",targetValue,"on property",property,"is",result);
        if(this.debug) console.log("Performing dirty functions");
        markDirty(target,property);
        this.change(target,property);
        return result;
      },
      deleteProperty:function(target,property) {
        if(!property in target) return false;
        var thisHandler = "deleteProperty";
        for(var f in this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix]) {
          if(this.debug) console.log("proxyHandler:",thisHandler,":function #",f);
          this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix][f](target,property);
        }
        var result = !!(delete target[property]);
        if(this.debug) console.log("proxyHandler:",thisHandler,": Result of DELETE operation on property",property,"is",result);
        this.change(target,property);
        return result;
      },
      change: function(target,property) {
        var thisHandler = "change";
        for(var f in this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix]) {
          if(debug) console.log("Launching change handler on property:",property);
          this[handlerFunctionProperty][thisHandler + handlerFunctionSuffix][f](target,property);
        }
        return;
      },
      handlerFunctions: handlerFunctionObj
    };

    if(!proxyHandler.hasOwnProperty(handlerFunctionProperty)) {
      Object.defineProperty(
        proxyHandler,
        handlerFunctionProperty,
        {
          configurable:false,
          enumerable:false,
          value:handlerFunctionObj
        }
      );
    }

    if(!handlerFunctionObj.hasOwnProperty("addHandler")) {
      Object.defineProperty(
        handlerFunctionObj,
        "addHandler",
        {
          configurable:false,
          enumerable:false,
          value:function(type,func) {
            if(debug) console.log("createModel: Adding handler: " + type + handlerFunctionSuffix);
            if(!this.hasOwnProperty(type + handlerFunctionSuffix)) return;
            this[type + handlerFunctionSuffix].push(func);
          }
        }
      );
    };

    for(var handler in proxyHandler) {
      if(!proxyHandler.hasOwnProperty(handler) || handler==handlerFunctionProperty) continue;
      if(proxyHandler.handlerFunctions.hasOwnProperty(handler + handlerFunctionSuffix)) continue;
      if(debug) console.log("createModel: Creating empty function array for " + handler + " at: " + handler + handlerFunctionSuffix);
      Object.defineProperty(
        proxyHandler.handlerFunctions,
        handler + handlerFunctionSuffix,
        {
          configurable:false,
          enumerable:false,
          value:[]
        }
      );
    }
    return proxyHandler;
  }

  handlerFunctionObj = handlerFunctionObj || {};
  obj = obj || [];  // Assume a DB-style list
  let proxyHandlerObj = makeProxyHandlerObj(handlerFunctionObj);
  let newProxyObj = new Proxy(obj,proxyHandlerObj);

  Object.defineProperty(
    newProxyObj,
    "__isLaminarModel",
    {
      configurable:false,
      enumerable:false,
      value:function() {
        return true;
      }
    }
  );

  Object.defineProperty(
    newProxyObj,
    "__save",
    {
      configurable:false,
      enumerable:false,
      value:function(cb) {
        // Signal listening objects of dirty values;
        if(this.hasOwnProperty("__dirty")) {
          this.__dirty.forEach(function(v,i,a) {
            if(debug) console.log(v,"is dirty");
            if(cb && typeof cb === 'function') cb(v);
          });
        }
        return this;
      }
    }
  );

  Object.defineProperty(
    newProxyObj,
    "__getHandlerObject",
    {
      configurable:false,
      enumerable:false,
      value:function() {
        if(debug) console.log("Fetching proxyHandlerObj");
        if(debug) console.log(JSON.stringify(handlerFunctionObj));
        return handlerFunctionObj;
      }
    }
  );

  Object.defineProperty(
    newProxyObj,
    "addMethod",
    {
      configurable:false,
      enumerable:false,
      value:function(name,func,thisObj) {
        thisObj = thisObj || this;
        if(thisObj.hasOwnProperty(name)) {
          console.log("We already have a property in this object called",name,"quitting.");
          return false;
        }
        console.log("Trying to make a method called",name);
        let wrapperFunc = function() {
          if(thisObj.debug) console.log("Starting function:",name);
          let aList = Array.from(arguments);  // Turns the arguments object into a real array
          try{
            return func.apply(this,aList);
          } catch(e) {
            if(thisObj.debug) console.log(name,"function failed with",e.message);
          }
        }.bind(thisObj);
        Object.defineProperty(
          newProxyObj,
          name,
          {
            configurable:false,
            enumerable:false,
            value:wrapperFunc
          }
        );
      }
    }
  );

  return newProxyObj;
}

module.exports = Laminar;