# token-session

###  Sessions without cookies, specially designed for *REST services*; *time limited code validations* like email verification, temporaly links, etc., and much more.

#### Version 1.1.0 added Promise support and Express intregration.

Session data is stored server-side. 

token-session is compatible with the *session store implementations* of express-session like **connect-redis, connect-mongo, express-mysql-session, session-memory-store, etc**.

*session-memory-store* is the default storage. Note that it can only be used in a single node of node.js, not being suitable for clusters.

If you do not know which storage to use, **Redis** can be a good alternative.

For a list of stores, see [compatible session stores](#compatible-session-stores).

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install token-session
```

## API

```js
var TokenSession = require('token-session');
var tokenSession = new TokenSession({options});
//Save tokenSession for future uses.
```

**NOTE: You must save tokenSession for future uses.**  
If you use Express, TokenSession express middelware, `tokenSession.express`, dose it for you. *See next topic*.

## ExpressJs integration

```js
var TokenSession = require('token-session');
var tokenSession = new TokenSession({options});
var express = require('express');
var app = express();
app.use(tokenSession.express);

```
### Example



### OPTIONS

`token-session` accepts these properties in the options object.

#### store

The session store instance. Defaults is instance of session-memory-store.

For a list of stores, see [compatible session stores](#compatible-session-stores).

Example for connect-redis:

```js
var TokenSession = require('token-session');
var RedisStore = require('connect-redis')(TokenSession);
var tokenSession = new TokenSession({options});

//Create a TokenSession object.
//We recomend persist this object for future use inted create each time.
var tokenSession = new TokenSession({
  autoTouch: true,
  store: new RedisStore({
    host: '127.0.0.1',
    ttl: 60,
    logErrors: true,
    prefix: 'tokensess:',
    pass: 'if established'
  })
});

//Data to store in session
let myData = {
  name:'jhon', 
  count:0
};

//Create new session with stored data
tokenSession.newSession(myData)
.then(function(sid) {
  console.log(sid); //sessionId
})
.catch(function(err) {
  
});

// ........

// Retrive data by token.
tokenSession.get(sid)
.then(function(data) {
  console.log(data);
})
.catch(function(err){

});


```

#### genid

Function to call to generate a new session ID. Provide a function that returns
a string that will be used as a session ID. The function is given `req` as the
first argument if you want to use some value attached to `req` when generating
the ID.

The default value is a function which uses the `uid-safe` library to generate IDs.

**NOTE** be careful to generate unique IDs so your sessions do not conflict.

```js
var tokenSession = new TokenSession({
  genid: function(req) {
    return genuuid() // use UUIDs for session IDs
  },
  ...
});
```

#### autoTouch

If true, TokenSession.touch () is automatically invoked when TokenSession.get () is invoked

The default value is `true`.

#### hackttl

Optional. Because the "Express Session Store" does not have the setWttl (sid, data, ttl) method, this hack provided a mechanism to support this new functionality.

Default function is provided by TokenSession.

## token-session Methods

### TokenSession.new(data, callback)

Create a new session with the given data. The new session ID is obtained in the callback result object.
<br>The callback should be called as callback(error, result), being result = {**sid**, data}

```js
let sessionData = {
  name:'jhon', 
  count:0
};

tokenSession.new(sessionData, (err, result) => {
  if (!err) {
    //Get the session ID!
    let sid = result.sessionId;
    
    //Get stored data (matches sessionData.)
    let data = result.data;   
    ...

  } else {
    // Deal with the error
  }
});
```

### TokenSession.get(sid, callback)

Fetch session data by the given sid.
<br>The callback should be called as callback(err, data) once the session has been set in the store.

```js

tokenSession.get(sid, (err, data) => {
  if (!err) {
    // Do something with data object
    // Following the above example:
    // data.name
    // data.count
 
  } else {
    // Deal with the error
    
  }
});
```

Notice that if option.autoTouch is true then session Id is also touched.

### TokenSession.getNtouch(sid, callback)

Fetch session data by the given sid and touches it.
<br>The callback should be called as callback(err, data) once the session has been set in the store.

*Notice that if option.autoTouch is true **get** and **getNtouch** are the same.*

```js

tokenSession.getNtouch(sid, (err, data) => {
  if (!err) {
    // Do something with data object
    // Following the above example:
    // data.name
    // data.count
 
  } else {
    // Deal with the error
    
  }
});
```

### TokenSession.set(sid, data, callback)

Update the stored session data associated with the given sid with the given data object.
<br>The callback should be called as callback(error) once the data has been set in the store.

```js
tokenSession.set(sid, data);
```

or

```js
tokenSession.set(sid, data, (err) => {
	if (err) {
	  ...
	} else {
	  ...
	}
}); 
```

### TokenSession.destroy(sid, callback)

Destroys the session and once complete, the `callback` will be invoked.

```js
tokenSession.destroy(function(err) {
  // cannot access session here
})
```

### TokenSession.regenerate(sid, session, callback)

To regenerate the session simply invoke the method. Once complete,
a new SID and `Session` instance will be initialized and the `callback` will be invoked.

```js
tokenSession.regenerate(function(err, newSid) {
  // will have a new session here
})
```

### TokenSession.touch(sid, session, callback)

Update the session period by adding a option.ttl time.

Notice that **set(...)** and **getNtouch(...)** call automatically this method.

Also, if option.autoTouch is true (default value) then **get(...)** touch the sid too.
  
So, Typically is not necessary to call this method, except if some of the above methods are not invoked for a long time.

## token-session Extended Methods

Since the *session store implementation* of Express does not support sessions with different ttl and the fact that being compatible with these implementations is one of the objectives of this module, **token-session** performs a hack in order to implement the following methods without having to modify those stores implementations.

**Note: This hack and therefore the following methods were tested only with this stores: connect-redis, connect-mongo, express-mysql-session, session-memory-store**

For other *session store implementation* you can provide your own hack function using **option.hackttl** when create the token-session object.


### TokenSession.newWttl(data, ttl, callback)

Create a new session with the given data and specific ttl (time to live in seconds). The new session ID is obtained in the callback result object.

Sometimes it is necessary to create a sessions with different ttl depending on the data or the purpose. 

The callback should be called as callback(error, result), being result = {**sid**, data}

```js
let sessionData = {
  name:'jhon', 
  count:0
};

let ttl = 600;		//10 minutes.

tokenSession.newWttl(sessionData, ttl, (err, result) => {
  if (!err) {
    //Get the session ID!
    let sid = result.sessionId;
    
    //Get stored data (matches sessionData.)
    let data = result.data;   
    ...

  } else {
    // Deal with the error
  }
});
```

### TokenSession.setWttl(sid, session, ttl, callback)

Update the stored session data associated with the given sid, ttl (time to live in seconds) and data object.
<br>The callback should be called as callback(error) once the data has been set in the store.

```js
tokenSession.setWttl(sid, data);
```

or

```js
tokenSession.setWttl(sid, data, (err) => {
	if (err) {
	  ...
	} else {
	  ...
	}
}); 
```

## Session Store Implementation

Every session store _must_ be an `EventEmitter` and implement specific
methods. The following methods are the list of **required**, **recommended**,
and **optional**.

  * Required methods are ones that this module will always call on the store.
  * Recommended methods are ones that this module will call on the store if
    available.
  * Optional methods are ones this module does not call at all, but helps
    present uniform stores to users.

For an example implementation view the [connect-redis](http://github.com/visionmedia/connect-redis) repo.

### store.all(callback)

**Optional**

This optional method is used to get all sessions in the store as an array. The
`callback` should be called as `callback(error, sessions)`.

### store.destroy(sid, callback)

**Required**

This required method is used to destroy/delete a session from the store given
a session ID (`sid`). The `callback` should be called as `callback(error)` once
the session is destroyed.

### store.clear(callback)

**Optional**

This optional method is used to delete all sessions from the store. The
`callback` should be called as `callback(error)` once the store is cleared.

### store.length(callback)

**Optional**

This optional method is used to get the count of all sessions in the store.
The `callback` should be called as `callback(error, len)`.

### store.get(sid, callback)

**Required**

This required method is used to get a session from the store given a session
ID (`sid`). The `callback` should be called as `callback(error, session)`.

The `session` argument should be a session if found, otherwise `null` or
`undefined` if the session was not found (and there was no error). A special
case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.

### store.set(sid, session, callback)

**Required**

This required method is used to upsert a session into the store given a
session ID (`sid`) and session (`session`) object. The callback should be
called as `callback(error)` once the session has been set in the store.

### store.touch(sid, session, callback)

**Recommended**

This recommended method is used to "touch" a given session given a
session ID (`sid`) and session (`session`) object. The `callback` should be
called as `callback(error)` once the session has been touched.

This is primarily used when the store will automatically delete idle sessions
and this method is used to signal to the store the given session is active,
potentially resetting the idle timer.

## Compatible Session Stores

The following modules implement a session store that is compatible with this
module. Please make a PR to add additional modules :)

[![★][aerospike-session-store-image] aerospike-session-store][aerospike-session-store-url] A session store using [Aerospike](http://www.aerospike.com/).

[aerospike-session-store-url]: https://www.npmjs.com/package/aerospike-session-store
[aerospike-session-store-image]: https://img.shields.io/github/stars/aerospike/aerospike-session-store-expressjs.svg?label=%E2%98%85

[![★][cassandra-store-image] cassandra-store][cassandra-store-url] An Apache Cassandra-based session store.

[cassandra-store-url]: https://www.npmjs.com/package/cassandra-store
[cassandra-store-image]: https://img.shields.io/github/stars/webcc/cassandra-store.svg?label=%E2%98%85

[![★][cluster-store-image] cluster-store][cluster-store-url] A wrapper for using in-process / embedded
stores - such as SQLite (via knex), leveldb, files, or memory - with node cluster (desirable for Raspberry Pi 2
and other multi-core embedded devices).

[cluster-store-url]: https://www.npmjs.com/package/cluster-store
[cluster-store-image]: https://img.shields.io/github/stars/coolaj86/cluster-store.svg?label=%E2%98%85

[![★][connect-azuretables-image] connect-azuretables][connect-azuretables-url] An [Azure Table Storage](https://azure.microsoft.com/en-gb/services/storage/tables/)-based session store.

[connect-azuretables-url]: https://www.npmjs.com/package/connect-azuretables
[connect-azuretables-image]: https://img.shields.io/github/stars/mike-goodwin/connect-azuretables.svg?label=%E2%98%85

[![★][connect-cloudant-store-image] connect-cloudant-store][connect-cloudant-store-url] An [IBM Cloudant](https://cloudant.com/)-based session store.

[connect-cloudant-store-url]: https://www.npmjs.com/package/connect-cloudant-store
[connect-cloudant-store-image]: https://img.shields.io/github/stars/adriantanasa/connect-cloudant-store.svg?label=%E2%98%85

[![★][connect-couchbase-image] connect-couchbase][connect-couchbase-url] A [couchbase](http://www.couchbase.com/)-based session store.

[connect-couchbase-url]: https://www.npmjs.com/package/connect-couchbase
[connect-couchbase-image]: https://img.shields.io/github/stars/christophermina/connect-couchbase.svg?label=%E2%98%85

[![★][connect-datacache-image] connect-datacache][connect-datacache-url] An [IBM Bluemix Data Cache](http://www.ibm.com/cloud-computing/bluemix/)-based session store.

[connect-datacache-url]: https://www.npmjs.com/package/connect-datacache
[connect-datacache-image]: https://img.shields.io/github/stars/adriantanasa/connect-datacache.svg?label=%E2%98%85

[![★][connect-db2-image] connect-db2][connect-db2-url] An IBM DB2-based session store built using [ibm_db](https://www.npmjs.com/package/ibm_db) module.

[connect-db2-url]: https://www.npmjs.com/package/connect-db2
[connect-db2-image]: https://img.shields.io/github/stars/wallali/connect-db2.svg?label=%E2%98%85

[![★][connect-dynamodb-image] connect-dynamodb][connect-dynamodb-url] A DynamoDB-based session store.

[connect-dynamodb-url]: https://github.com/ca98am79/connect-dynamodb
[connect-dynamodb-image]: https://img.shields.io/github/stars/ca98am79/connect-dynamodb.svg?label=%E2%98%85

[![★][connect-loki-image] connect-loki][connect-loki-url] A Loki.js-based session store.

[connect-loki-url]: https://www.npmjs.com/package/connect-loki
[connect-loki-image]: https://img.shields.io/github/stars/Requarks/connect-loki.svg?label=%E2%98%85

[![★][connect-ml-image] connect-ml][connect-ml-url] A MarkLogic Server-based session store.

[connect-ml-url]: https://www.npmjs.com/package/connect-ml
[connect-ml-image]: https://img.shields.io/github/stars/bluetorch/connect-ml.svg?label=%E2%98%85

[![★][connect-mssql-image] connect-mssql][connect-mssql-url] A SQL Server-based session store.

[connect-mssql-url]: https://www.npmjs.com/package/connect-mssql
[connect-mssql-image]: https://img.shields.io/github/stars/patriksimek/connect-mssql.svg?label=%E2%98%85

[![★][connect-monetdb-image] connect-monetdb][connect-monetdb-url] A MonetDB-based session store.

[connect-monetdb-url]: https://www.npmjs.com/package/connect-monetdb
[connect-monetdb-image]: https://img.shields.io/github/stars/MonetDB/npm-connect-monetdb.svg?label=%E2%98%85

[![★][connect-mongo-image] connect-mongo][connect-mongo-url] A MongoDB-based session store.

[connect-mongo-url]: https://www.npmjs.com/package/connect-mongo
[connect-mongo-image]: https://img.shields.io/github/stars/kcbanner/connect-mongo.svg?label=%E2%98%85

[![★][connect-mongodb-session-image] connect-mongodb-session][connect-mongodb-session-url] Lightweight MongoDB-based session store built and maintained by MongoDB.

[connect-mongodb-session-url]: https://www.npmjs.com/package/connect-mongodb-session
[connect-mongodb-session-image]: https://img.shields.io/github/stars/mongodb-js/connect-mongodb-session.svg?label=%E2%98%85

[![★][connect-pg-simple-image] connect-pg-simple][connect-pg-simple-url] A PostgreSQL-based session store.

[connect-pg-simple-url]: https://www.npmjs.com/package/connect-pg-simple
[connect-pg-simple-image]: https://img.shields.io/github/stars/voxpelli/node-connect-pg-simple.svg?label=%E2%98%85

[![★][connect-redis-image] connect-redis][connect-redis-url] A Redis-based session store.

[connect-redis-url]: https://www.npmjs.com/package/connect-redis
[connect-redis-image]: https://img.shields.io/github/stars/tj/connect-redis.svg?label=%E2%98%85

[![★][connect-memcached-image] connect-memcached][connect-memcached-url] A memcached-based session store.

[connect-memcached-url]: https://www.npmjs.com/package/connect-memcached
[connect-memcached-image]: https://img.shields.io/github/stars/balor/connect-memcached.svg?label=%E2%98%85

[![★][connect-memjs-image] connect-memjs][connect-memjs-url] A memcached-based session store using
[memjs](https://www.npmjs.com/package/memjs) as the memcached client.

[connect-memjs-url]: https://www.npmjs.com/package/connect-memjs
[connect-memjs-image]: https://img.shields.io/github/stars/liamdon/connect-memjs.svg?label=%E2%98%85

[![★][connect-session-knex-image] connect-session-knex][connect-session-knex-url] A session store using
[Knex.js](http://knexjs.org/), which is a SQL query builder for PostgreSQL, MySQL, MariaDB, SQLite3, and Oracle.

[connect-session-knex-url]: https://www.npmjs.com/package/connect-session-knex
[connect-session-knex-image]: https://img.shields.io/github/stars/llambda/connect-session-knex.svg?label=%E2%98%85

[![★][connect-session-sequelize-image] connect-session-sequelize][connect-session-sequelize-url] A session store using
[Sequelize.js](http://sequelizejs.com/), which is a Node.js / io.js ORM for PostgreSQL, MySQL, SQLite and MSSQL.

[connect-session-sequelize-url]: https://www.npmjs.com/package/connect-session-sequelize
[connect-session-sequelize-image]: https://img.shields.io/github/stars/mweibel/connect-session-sequelize.svg?label=%E2%98%85

[![★][express-mysql-session-image] express-mysql-session][express-mysql-session-url] A session store using native
[MySQL](https://www.mysql.com/) via the [node-mysql](https://github.com/felixge/node-mysql) module.

[express-mysql-session-url]: https://www.npmjs.com/package/express-mysql-session
[express-mysql-session-image]: https://img.shields.io/github/stars/chill117/express-mysql-session.svg?label=%E2%98%85

[![★][express-oracle-session-image] express-oracle-session][express-oracle-session-url] A session store using native
[oracle](https://www.oracle.com/) via the [node-oracledb](https://www.npmjs.com/package/oracledb) module.

[express-oracle-session-url]: https://www.npmjs.com/package/express-oracle-session
[express-oracle-session-image]: https://img.shields.io/github/stars/slumber86/express-oracle-session.svg?label=%E2%98%85

[![★][express-sessions-image] express-sessions][express-sessions-url]: A session store supporting both MongoDB and Redis.

[express-sessions-url]: https://www.npmjs.com/package/express-sessions
[express-sessions-image]: https://img.shields.io/github/stars/konteck/express-sessions.svg?label=%E2%98%85

[![★][connect-sqlite3-image] connect-sqlite3][connect-sqlite3-url] A [SQLite3](https://github.com/mapbox/node-sqlite3) session store modeled after the TJ's `connect-redis` store.

[connect-sqlite3-url]: https://www.npmjs.com/package/connect-sqlite3
[connect-sqlite3-image]: https://img.shields.io/github/stars/rawberg/connect-sqlite3.svg?label=%E2%98%85

[![★][documentdb-session-image] documentdb-session][documentdb-session-url] A session store for Microsoft Azure's [DocumentDB](https://azure.microsoft.com/en-us/services/documentdb/) NoSQL database service.

[documentdb-session-url]: https://www.npmjs.com/package/documentdb-session
[documentdb-session-image]: https://img.shields.io/github/stars/dwhieb/documentdb-session.svg?label=%E2%98%85

[![★][express-nedb-session-image] express-nedb-session][express-nedb-session-url] A NeDB-based session store.

[express-nedb-session-url]: https://www.npmjs.com/package/express-nedb-session
[express-nedb-session-image]: https://img.shields.io/github/stars/louischatriot/express-nedb-session.svg?label=%E2%98%85

[![★][express-session-cache-manager-image] express-session-cache-manager][express-session-cache-manager-url] 
A store that implements [cache-manager](https://www.npmjs.com/package/cache-manager), which supports
a [variety of storage types](https://www.npmjs.com/package/cache-manager#store-engines).

[express-session-cache-manager-url]: https://www.npmjs.com/package/express-session-cache-manager
[express-session-cache-manager-image]: https://img.shields.io/github/stars/theogravity/express-session-cache-manager.svg?label=%E2%98%85

[![★][express-session-level-image] express-session-level][express-session-level-url] A [LevelDB](https://github.com/Level/levelup) based session store.

[express-session-level-url]: https://www.npmjs.com/package/express-session-level
[express-session-level-image]: https://img.shields.io/github/stars/tgohn/express-session-level.svg?label=%E2%98%85

[![★][express-etcd-image] express-etcd][express-etcd-url] An [etcd](https://github.com/stianeikeland/node-etcd) based session store.

[express-etcd-url]: https://www.npmjs.com/package/express-etcd
[express-etcd-image]: https://img.shields.io/github/stars/gildean/express-etcd.svg?label=%E2%98%85

[![★][fortune-session-image] fortune-session][fortune-session-url] A [Fortune.js](https://github.com/fortunejs/fortune)
based session store. Supports all backends supported by Fortune (MongoDB, Redis, Postgres, NeDB).

[fortune-session-url]: https://www.npmjs.com/package/fortune-session
[fortune-session-image]: https://img.shields.io/github/stars/aliceklipper/fortune-session.svg?label=%E2%98%85

[![★][hazelcast-store-image] hazelcast-store][hazelcast-store-url] A Hazelcast-based session store built on the [Hazelcast Node Client](https://www.npmjs.com/package/hazelcast-client).

[hazelcast-store-url]: https://www.npmjs.com/package/hazelcast-store
[hazelcast-store-image]: https://img.shields.io/github/stars/jackspaniel/hazelcast-store.svg?label=%E2%98%85

[![★][level-session-store-image] level-session-store][level-session-store-url] A LevelDB-based session store.

[level-session-store-url]: https://www.npmjs.com/package/level-session-store
[level-session-store-image]: https://img.shields.io/github/stars/scriptollc/level-session-store.svg?label=%E2%98%85

[![★][medea-session-store-image] medea-session-store][medea-session-store-url] A Medea-based session store.

[medea-session-store-url]: https://www.npmjs.com/package/medea-session-store
[medea-session-store-image]: https://img.shields.io/github/stars/BenjaminVadant/medea-session-store.svg?label=%E2%98%85

[![★][mssql-session-store-image] mssql-session-store][mssql-session-store-url] A SQL Server-based session store.

[mssql-session-store-url]: https://www.npmjs.com/package/mssql-session-store
[mssql-session-store-image]: https://img.shields.io/github/stars/jwathen/mssql-session-store.svg?label=%E2%98%85

[![★][nedb-session-store-image] nedb-session-store][nedb-session-store-url] An alternate NeDB-based (either in-memory or file-persisted) session store.

[nedb-session-store-url]: https://www.npmjs.com/package/nedb-session-store
[nedb-session-store-image]: https://img.shields.io/github/stars/JamesMGreene/nedb-session-store.svg?label=%E2%98%85

[![★][sequelstore-connect-image] sequelstore-connect][sequelstore-connect-url] A session store using [Sequelize.js](http://sequelizejs.com/).

[sequelstore-connect-url]: https://www.npmjs.com/package/sequelstore-connect
[sequelstore-connect-image]: https://img.shields.io/github/stars/MattMcFarland/sequelstore-connect.svg?label=%E2%98%85

[![★][session-file-store-image] session-file-store][session-file-store-url] A file system-based session store.

[session-file-store-url]: https://www.npmjs.com/package/session-file-store
[session-file-store-image]: https://img.shields.io/github/stars/valery-barysok/session-file-store.svg?label=%E2%98%85

[![★][session-rethinkdb-image] session-rethinkdb][session-rethinkdb-url] A [RethinkDB](http://rethinkdb.com/)-based session store.

[session-rethinkdb-url]: https://www.npmjs.com/package/session-rethinkdb
[session-rethinkdb-image]: https://img.shields.io/github/stars/llambda/session-rethinkdb.svg?label=%E2%98%85

<!--## Example
-->


## License

[MIT](LICENSE)


