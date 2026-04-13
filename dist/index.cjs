var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var index_exports = {};
__export(index_exports, {
  MemoryStore: () => memory_default,
  Store: () => store_default,
  default: () => session_default
});
module.exports = __toCommonJS(index_exports);

// session/session.js
var import_node_module = require("node:module");
var import_uid_safe = __toESM(require("uid-safe"), 1);

// session/memory.js
var import_session_memory_store = __toESM(require("session-memory-store"), 1);
var memory_default = import_session_memory_store.default;

// session/store.js
var import_node_events = require("node:events");
var import_node_util = __toESM(require("node:util"), 1);
function Store() {
  import_node_events.EventEmitter.call(this);
}
import_node_util.default.inherits(Store, import_node_events.EventEmitter);
var store_default = Store;

// session/session.js
var moduleRequire = (0, import_node_module.createRequire)(__filename);
var uid = import_uid_safe.default.sync;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MemoryStore,
  Store
});
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
module.exports = module.exports.default;
