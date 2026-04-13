/*!
 * Connect - session - Store
 * Copyright(c) 2017 Gustavo Gretter
 * MIT Licensed
 */

import { EventEmitter } from 'node:events';
import util from 'node:util';

function Store() {
  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

export default Store;
