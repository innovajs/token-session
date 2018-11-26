/*!
 * token-session 
 * version 1.1.0
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */

'use strict';

var uid = require('uid-safe').sync;
var MemoryStore = require('./memory');
var Store = require('./store');
var noop = function(){};

function withCallback(promise, callabck) {
  if (callabck) {
    promise
      .then(res => callabck(null, res))
      .catch(callabck)
  }
  return promise
}

function wrapData(data) {
  return {
    cookie:{maxAge:0}, //Redis connect compatibility
    data:data
  }
}

function unWrap(data) {
  return data.data;
}

/**
 * Generate a session ID for a new session.
 *
 * @return {String}
 * @private
 */

function generateSessionId() {
  return uid(24);
}

class TokenSession {
  
  /**
   * Construct a new TokenSession
   * all options are optionals.
   * option: {
   *    store
   *    autoTouch
   *    hackttl
   *    cookie
   *    reqSession //name of session object added to request; ej: req.tks        
   * }
   * @param {} options 
   */
  constructor(options) {
    let opts = options || {};
    // get the session id generate function
    this.generateSessionId = opts.genid || generateSessionId;
    if (typeof this.generateSessionId !== 'function') {
      throw new TypeError('genid option must be a function');
    }    
    // get the session store
    if (opts.store) this.store = opts.store;
    else {
      this.store = new MemoryStore(module.exports)({
        expires: 1800,
        checkperiod: 60
      });
    }
   
    this.autoTouch = ( (typeof options.autoTouch === 'undefined')?true:options.autoTouch);
    
    //Hack to use express sessions stores for specific ttl set session.
    if (options.hackttl) this.hackttl = options.hackttl;
    else this.hackttl = this._defaultHackTTL;
    
    //Only for compatibility with express sessions stores.
    this.cookie={maxAge:0}; 

    if (opts.reqSession) this.reqSession = opts.reqSession;
    else this.reqSession = 'tks';

    if (opts.header) this.header = opts.header;
    else (this.header = 'token-session');
  }
  
  /**
   * Private. Default hack ttl function.
   * @param {token-session object} - tipically this object
   * @param {Number} - ttl
   */
  _defaultHackTTL(obj, ttl) {
    if (obj.store) {
      if (obj.store.ttl) {  //Redis and mongodb.
        if (ttl) obj.store.ttl = ttl; 
        return obj.store.ttl;
      } else if (obj.store.options) { //mysql
        if (obj.store.options.expiration) {
          if (ttl) obj.store.options.expiration = ttl;  
          return obj.store.options.expiration;
        } else if (obj.store.store) { //memory store
            if (obj.store.store.options.stdTTL) {      
            if (ttl) obj.store.store.options.stdTTL = ttl; 
            return obj.store.store.options.stdTTL;
          } 
        }
      }
    } else if (obj.ttl) {
      if (ttl) obj.ttl = ttl;
      return obj.ttl;
    }
    return null;
  }
  
  /**
   * Generate a new session ID.
   * Return a Promise or optionally, if presents, execute the callback.
   * 
   * @param {Function} callback - callback(err, sessionId)
   */
  newSessionId(callback) {
    let promise = new Promise( (resolve, reject) => {
      let sid = this.generateSessionId();
      process.nextTick(()=>{
        resolve (sid);
      });
    });
    return withCallback(promise, callback);
  }

  /**
   * Create a new session with associated data.
   * ttl is optional. If it is not present, the value specified in the configuration is used.
   * Callback is also optional. 
   * Return the session id in a Promise or optionally, if presents, execute the callback.
   * 
   * @param {*} data 
   * @param {*} ttl 
   * @param {*} callback 
   */
  newSession(data, ttl, callback) {
    let promise = new Promise( (resolve, reject) => {
      let sid = this.generateSessionId();
      let ret;
      if (typeof ttl == 'number') {
        ret = this.setWttl(sid, data, ttl)
      } else {
        ret = this.set(sid, data)
      }
      ret.then ( () => {
          resolve(sid)
      }).catch (reject);
    });
    return withCallback(promise, callback);
  }

  /**
   * Attempt to fetch session by the given sid.
   * Return a Promise or optionally, if presents, execute the callback.
   * 
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  get(sid, callback) {
    let promise = new Promise ( (resolve, reject) => {
      if (this.autoTouch) {
        this.getNtouch(sid)
        .then( (data) => {
          resolve(data);
        })
        .catch(reject);
      } else {
        this.store.get(sid, (err, data) => {
          if (err) reject(err);
          else resolve(unWrap(data));
        });
      } 
    });
    return withCallback(promise, callback); 
  }
  
  /**
   * Attempt to fetch session by the given sid and if success touch it.
   * Return a Promise or optionally, if presents, execute the callback. 
   *
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  getNtouch(sid, callback) {
    let promise = new Promise( (resolve, reject) => {
      this.store.get(sid, (err, data) => {
        if (!err) {
          if (data) {
            this.touch(sid, data);
            resolve(unWrap(data));
          } else {
            resolve(null);
          }
        } else {
          reject(err);
        }
      });      
    } );
    return withCallback(promise, callback);
  }
  
  /**
   * Commit the given session data associated with the given sid.
   * This method use default store ttl.
   * Return a Promise or optionally, if presents, execute the callback.
   *
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  set(sid, data, callback) {
    let promise = new Promise ( (resolve, reject) => {
      this.store.set(sid, wrapData(data), (err) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    return withCallback(promise, callback);
  } 
  
  /**
   * Commit the given session object associated with the given sid with specific ttl.
   * Test only on connect-redis, connect-mongo, express-mysql-session and session-memory-store.
   * Return a Promise or optionally, if presents, execute the callback. 
   * 
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  setWttl(sid, data, ttl, callback) {
    let promise = new Promise ( (resolve, reject) => {
      //Save current ttl value
      let oldttl = this.hackttl(this);
      //Set new ttl value
      this.hackttl(this, ttl);      
      //Redis connect compatibility
      if (!data.cookie) data.cookie={maxAge:this.maxAge}; 
      //Store de value
      this.store.set(sid, wrapData(data), (err, data) => {
        //Restore ttl value
        this.hackttl(this, oldttl);
        if (err) reject;
        else resolve(data);
      } );
    } );
    return withCallback(promise, callback);
  }
  
  /**
   * Destroy the session associated with the given `sid`.
   * Return a Promise or optionally, if presents, execute the callback. 
   * 
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  destroy(sid, callback) {
    let promise = new Promise ( (resolve, reject) => {
      this.store.destroy(sid, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    } );
    return withCallback(promise, callback);
  }
  
  /**
   * Regenerate this session.
   * Return a Promise or optionally or, if presents, execute the callback.
   * new sessionId is returned in both cases.
   * 
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  regenerate(sid, data, callback) {
    let promise = new Promise ( (resolve, reject) => {
      this.destroy(sid)
      .then( (result) => {
        let newSid = this.generateSessionId();
        this.set(newSid, data)
        .then ( () => {
          resolve(newSid);
        })
        .catch (reject);
      })
      .catch(reject);
    } );
    return withCallback ( promise, callback );
  }
  
  /**
   * Refresh the time-to-live for the session with the given `sid`.
   *
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  touch(sid, data, callback) {
    let promise = new Promise ( (resolve, response) => {
      if (this.store.touch) {
        this.store.touch(sid, wrapData(data), (err) => {
          if (err) reject(err)
          else resolve(data);
        } );
      } else {
        resolve();
      }  
    }); 
  }

    /**
   * Deprecated. Use newSession(data)
   * 
   * @deprecated
   */
  new(data, callback) {
    console.warn('token-session.new(...) is deprectad. User newSession(...)')
    let promise = new Promise( (resolve, reject) => {
      let sid = this.generateSessionId();
      this.set(sid, data)
      .then ( () => {
        resolve({sessionId: sid, data: data})
      })
      .catch (reject);
    });
    return withCallback(promise, callback);
  }
  
  /**
   * Deprecated. Use newSession(data, ttl)
   * 
   * @deprecated
   */
  newWttl(data, ttl, callback) {
    console.warn('token-session.newWttl(...) is deprectad. User newSession(...)')
    let promise = new Promise ( (resolve, reject)=> {
      let sid = this.generateSessionId();
      this.setWttl(sid, data, ttl, (err, data) => {
        if (!err) {
          let res = {sessionId: sid, data: data};
          resolve(res);
        } else {
          reject(err);
        }
      });  
    });
    return withCallback(promise, callback);
  }  

  //middleware for Express
  express () {
    const { crc32 } = require('crc');
    //h = crc32(testString+x).toString(16);
    let me = this;
    return async function (req, res, next) {
      let id;
      let data;
      //Query token-session header
      if (req.headers[me.header]) {
        id = req.headers[me.header];
        //Retrive the data.
        data = await me.get(id);
        if (data) {
          req[me.reqSession] = data;    //ej: req.tks = data
        } else {
          res.setHeader(me.header, id);  
          req[me.reqSession] = {};   
        }
      } else {
        id = generateSessionId();
        res.setHeader(me.header, id);  
        req[me.reqSession] = {};    
      }
      req[me.reqSession].id = id;
      let oldCrc = crc32(JSON.stringify(req[me.reqSession]));

     res.on('finish', function(err) {
        let newCrc = crc32(JSON.stringify(req[me.reqSession]));
        if (oldCrc!=newCrc) {
          delete req[me.reqSession].id;
          me.set(id, req[me.reqSession]);
        } else {
          me.touch(id);
        }
      });

      next();
    }
  }
}

/**
 * Expose class end constructors.
 */
exports = module.exports = TokenSession;
exports.Store = Store;
exports.MemoryStore = MemoryStore;