/*!
 * Connect - session - Store
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');


/**
 * Abstract base class for session stores.
 * @public
 */
function Store () {
  EventEmitter.call(this);
}

/**
 * Inherit from EventEmitter.
 */
util.inherits(Store, EventEmitter);

/**
 * Module exports.
 * @public
 */

module.exports = Store;

