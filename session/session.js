/*!
 * token-session 
 * version 0.1.0
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */

'use strict';

var uid = require('uid-safe').sync;
var MemoryStore = require('./memory');
var Store = require('./store');
var noop = function(){};

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
   * Generate a session ID an return it in callback value.
   * 
   * @param {Function} callback - callback(err, sessionId)
   */
  newSessionId(callabck) {
    let sid = this.generateSessionId();
    process.nextTick(()=>{
      callabck(null, sid);
    });
  }
  
  /**
   * Create the given session object associated with a new sessionId with default ttl.
   * 
   * @param {Obj} data - Session data object.
   * @param {Function} callback - callback(err, result) being result {sessionId, data}
   */
  new(data, callback) {
    let sid = this.generateSessionId();
    this.set(sid, data, (err, data) => {
      if (!err) {
        let res = {sessionId: sid, data: data};
        callback(null, res);
      } else {
        callback(err);
      }
    });
  }
  
  /**
   * Create the given session object associated with a new sessionId with a specific ttl.
   * Test only on connect-redis, connect-mongo, express-mysql-session and session-memory-store.
   * 
   * @param {Obj} data - Session data object.
   * @param {Function} callback - callback(err, result) being result {sessionId, data}
   */
  newWttl(data, ttl, callback) {
    let sid = this.generateSessionId();
    this.setWttl(sid, data, ttl, (err, data) => {
      if (!err) {
        let res = {sessionId: sid, data: data};
        callback(null, res);
      } else {
        callback(err);
      }
    });
  }
  
  /**
   * Attempt to fetch session by the given sid.
   *
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  get(sid, callback) {
    if (this.autoTouch) {
      this.getNtouch(sid, callback);
    } else {
      this.store.get(sid, callback);
    } 
  }
  
  /**
   * Attempt to fetch session by the given sid and if success touch it.
   *
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  getNtouch(sid, callback) {
    this.store.get(sid, (err, data) => {
      if (!err) {
        this.touch(sid, data);
        callback(null, data);
      } else {
        callback(err);
      }
    });
  }
  
  /**
   * Commit the given session data associated with the given sid.
   * This method use default store ttl.
   *     
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  set(sid, data, callback) {
    if (!data.cookie) data.cookie={maxAge:0}; //Redis connect compatibility
    this.store.set(sid, data, callback);
  } 
  
  /**
   * Commit the given session object associated with the given sid with specific ttl.
   * Test only on connect-redis, connect-mongo, express-mysql-session and session-memory-store.
   * 
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  setWttl(sid, data, ttl, callback) {

    //Save current ttl value
    let oldttl = this.hackttl(this);
    
    //Set new ttl value
    this.hackttl(this, ttl);
    
    //Redis connect compatibility
    if (!data.cookie) data.cookie={maxAge:this.maxAge}; 
    
    //Store de value
    this.store.set(sid, data, callback);
    
    //Restore ttl value
    this.hackttl(this, oldttl);
  }
  
  /**
   * Destroy the session associated with the given `sid`.
   * 
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  destroy(sid, callback) {
    this.store.destroy(sid, callback);
  }
  
  /**
   * Regenerate this session.
   * new sessionId is returned in callback result.
   * 
   * @param {String} sid
   * @param {Object} data
   * @param {Function} callback
   * @api public
   */
  regenerate(sid, data, callback) {
    this.destroy(sid, (err, result) => {
      let newSid = this.newSessionId();
      this.set(newSid, data, (err, result) => {
        if (err) callback(err);
        else callback(null, newSid);
      });
    });
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
    if (this.store.touch) {
      this.store.touch(sid, data, callback);
    }
  }
}

/**
 * Expose class end constructors.
 */
exports = module.exports = TokenSession;
exports.Store = Store;
exports.MemoryStore = MemoryStore;