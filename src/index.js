// Strict mode for whole file.
"use strict";

var WfsRequestParser = require('./wfsrequestparser.js');
var WfsConnection = require('./wfsconnection.js');
var Utils = require('./utils.js');
var SplitterCache = require('./splittercache.js');
// import WfsRequestParser from './wfsrequestparser.js';
// import WfsConnection from './wfsconnection.js';
// import Utils from './utils.js';
// import SplitterCache from './splittercache.js';

module.exports = {
  Utils : Utils,
  SplitterCache: SplitterCache,
  WfsRequestParser : WfsRequestParser, //requires Utils
  WfsConnection : WfsConnection, //requires SplitterCache, WfsRequestParser
};
