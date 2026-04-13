// session/session.js
import { createRequire } from "node:module";
import uidSafe from "uid-safe";

// session/memory.js
import memoryStore from "session-memory-store";
var memory_default = memoryStore;

// session/store.js
import { EventEmitter } from "node:events";
import util from "node:util";
function Store() {
  EventEmitter.call(this);
}
util.inherits(Store, EventEmitter);
var store_default = Store;

// session/session.js
var moduleRequire = createRequire(import.meta.url);
var uid = uidSafe.sync;
function withCallback(promise, callabck) {
  if (callabck) {
    promise.then((res) => callabck(null, res)).catch(callabck);
  }
  return promise;
}
function wrapData(data) {
  return {
    cookie: { maxAge: 0 },
    data
  };
}
function unWrap(data) {
  if (data != null && data.data != null) return data.data;
  else return null;
}
function generateSessionId() {
  return uid(24);
}
var TokenSession = class _TokenSession {
  constructor(options) {
    const opts = options || {};
    this.generateSessionId = opts.genid || generateSessionId;
    if (typeof this.generateSessionId !== "function") {
      throw new TypeError("genid option must be a function");
    }
    if (opts.store) this.store = opts.store;
    else {
      this.store = new memory_default(_TokenSession)({
        expires: 1800,
        checkperiod: 60
      });
    }
    this.autoTouch = typeof options.autoTouch === "undefined" ? true : options.autoTouch;
    if (options.hackttl) this.hackttl = options.hackttl;
    else this.hackttl = this._defaultHackTTL;
    this.cookie = { maxAge: 0 };
    if (opts.reqSession) this.reqSession = opts.reqSession;
    else this.reqSession = "tks";
    if (opts.header) this.header = opts.header;
    else this.header = "token-session";
    if (opts.cookie) this.cookie = opts.cookie;
    else this.cookie = "tks";
  }
  _defaultHackTTL(obj, ttl) {
    if (obj.store) {
      if (obj.store.ttl) {
        if (ttl) obj.store.ttl = ttl;
        return obj.store.ttl;
      } else if (obj.store.options) {
        if (obj.store.options.expiration) {
          if (ttl) obj.store.options.expiration = ttl;
          return obj.store.options.expiration;
        } else if (obj.store.store) {
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
  newSessionId(callback) {
    const promise = new Promise((resolve, reject) => {
      const sid = this.generateSessionId();
      process.nextTick(() => {
        resolve(sid);
      });
    });
    return withCallback(promise, callback);
  }
  newSession(data, ttl, callback) {
    const promise = new Promise((resolve, reject) => {
      const sid = this.generateSessionId();
      let ret;
      if (typeof ttl == "number") {
        ret = this.setWttl(sid, data, ttl);
      } else {
        ret = this.set(sid, data);
      }
      ret.then(() => {
        resolve(sid);
      }).catch(reject);
    });
    return withCallback(promise, callback);
  }
  get(sid, callback) {
    const promise = new Promise((resolve, reject) => {
      if (this.autoTouch) {
        this.getAndTouch(sid).then((data) => {
          resolve(data);
        }).catch(reject);
      } else {
        this.store.get(sid, (err, data) => {
          if (err) reject(err);
          else resolve(unWrap(data));
        });
      }
    });
    return withCallback(promise, callback);
  }
  getAndTouch(sid, callback) {
    const promise = new Promise((resolve, reject) => {
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
    });
    return withCallback(promise, callback);
  }
  getNotTouch(sid, callback) {
    const promise = new Promise((resolve, reject) => {
      this.store.get(sid, (err, data) => {
        if (err) reject(err);
        else resolve(unWrap(data));
      });
    });
    return withCallback(promise, callback);
  }
  set(sid, data, callback) {
    const promise = new Promise((resolve, reject) => {
      this.store.set(sid, wrapData(data), (err) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    return withCallback(promise, callback);
  }
  setWttl(sid, data, ttl, callback) {
    const promise = new Promise((resolve, reject) => {
      const oldttl = this.hackttl(this);
      this.hackttl(this, ttl);
      if (!data.cookie) data.cookie = { maxAge: this.maxAge };
      this.store.set(sid, wrapData(data), (err, data2) => {
        this.hackttl(this, oldttl);
        if (err) reject;
        else resolve(data2);
      });
    });
    return withCallback(promise, callback);
  }
  destroy(sid, callback) {
    const promise = new Promise((resolve, reject) => {
      this.store.destroy(sid, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    return withCallback(promise, callback);
  }
  regenerate(sid, data, callback) {
    const promise = new Promise((resolve, reject) => {
      this.destroy(sid).then((result) => {
        const newSid = this.generateSessionId();
        this.set(newSid, data).then(() => {
          resolve(newSid);
        }).catch(reject);
      }).catch(reject);
    });
    return withCallback(promise, callback);
  }
  touch(sid, data, callback) {
    const promise = new Promise((resolve, reject) => {
      if (this.store.touch) {
        this.store.touch(sid, wrapData(data), (err) => {
          if (err) reject(err);
          else resolve(data);
        });
      } else {
        resolve();
      }
    });
  }
  new(data, callback) {
    console.warn("token-session.new(...) is deprectad. User newSession(...)");
    const promise = new Promise((resolve, reject) => {
      const sid = this.generateSessionId();
      this.set(sid, data).then(() => {
        resolve({ sessionId: sid, data });
      }).catch(reject);
    });
    return withCallback(promise, callback);
  }
  newWttl(data, ttl, callback) {
    console.warn("token-session.newWttl(...) is deprectad. User newSession(...)");
    const promise = new Promise((resolve, reject) => {
      const sid = this.generateSessionId();
      this.setWttl(sid, data, ttl, (err, data2) => {
        if (!err) {
          const res = { sessionId: sid, data: data2 };
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
    return withCallback(promise, callback);
  }
  express() {
    const { crc32 } = moduleRequire("crc");
    const me = this;
    return async function(req, res, next) {
      let id;
      let data;
      id = req.headers[me.header];
      if (!id && req.cookies) id = req.cookies[me.cookie];
      if (id == null) {
        id = req.query[me.header];
        if (id) {
          delete req.query[me.header];
        }
      }
      if (id) {
        res.setHeader(me.header, id);
        data = await me.get(id);
        if (data != null) {
          req[me.reqSession] = data;
        } else {
          req[me.reqSession] = {};
        }
        req[me.reqSession].id = id;
      } else {
        req[me.reqSession] = {};
      }
      const oldCrc = req[me.reqSession] == null ? null : crc32(JSON.stringify(req[me.reqSession]));
      res.on("finish", function(err) {
        const newCrc = req[me.reqSession] == null ? null : crc32(JSON.stringify(req[me.reqSession]));
        if (oldCrc != newCrc) {
          delete req[me.reqSession].id;
          me.set(id, req[me.reqSession]);
        } else {
          if (id != null) {
            me.touch(id);
          }
        }
      });
      next();
    };
  }
};
TokenSession.Store = store_default;
TokenSession.MemoryStore = memory_default;
var session_default = TokenSession;
export {
  memory_default as MemoryStore,
  store_default as Store,
  session_default as default
};
/*!
 * Connect - session - Store
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */
/*!
 * token-session
 * version 1.1.0
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */
