'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = function (accountCredentials, backupPath, prettyPrintJSON) {
  // from: https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
  var promiseSerial = function promiseSerial(funcs) {
    return funcs.reduce(function (promise, func) {
      return promise.then(function (result) {
        return func().then(function () {
          return Array.prototype.concat.bind(result);
        });
      });
    }, Promise.resolve([]));
  };

  var backupDocument = function backupDocument(document, backupPath, logPath) {
    console.log('Backing up Document \'' + logPath + document.id + '\'');
    try {
      _mkdirp2.default.sync(backupPath);
    } catch (error) {
      throw new Error('Unable to create backup path for Document \'' + document.id + '\': ' + error);
    }

    var fileContents = void 0;
    try {
      if (prettyPrintJSON === true) {
        fileContents = JSON.stringify(document.data(), null, 2);
      } else {
        fileContents = JSON.stringify(document.data());
      }
    } catch (error) {
      throw new Error('Unable to serialize Document \'' + document.id + '\': ' + error);
    }
    try {
      _fs2.default.writeFileSync(backupPath + '/' + document.id + '.json', fileContents);
    } catch (error) {
      throw new Error('Unable to write Document \'' + document.id + '\': ' + error);
    }

    return document.ref.getCollections().then(function (collections) {
      return promiseSerial(collections.map(function (collection) {
        return function () {
          return backupCollection(collection, backupPath + '/' + collection.id, logPath + document.id + '/');
        };
      }));
    });
  };

  var backupCollection = function backupCollection(collection, backupPath, logPath) {
    console.log('Backing up Collection \'' + logPath + collection.id + '\'');
    try {
      _mkdirp2.default.sync(backupPath);
    } catch (error) {
      throw new Error('Unable to create backup path for Collection \'' + collection.id + '\': ' + error);
    }

    return collection.get().then(function (documentSnapshots) {
      var backupFunctions = [];
      documentSnapshots.forEach(function (document) {
        backupFunctions.push(function () {
          return backupDocument(document, backupPath + '/' + document.id, logPath + collection.id + '/');
        });
      });
      return promiseSerial(backupFunctions);
    });
  };

  var backupRootCollections = function backupRootCollections(database) {
    return database.getCollections().then(function (collections) {
      return promiseSerial(collections.map(function (collection) {
        return function () {
          return backupCollection(collection, backupPath + '/' + collection.id, '/');
        };
      }));
    });
  };

  var accountCredentialsContents = void 0;
  if (typeof accountCredentials === 'string') {
    try {
      var accountCredentialsBuffer = _fs2.default.readFileSync(accountCredentials);
      accountCredentialsContents = JSON.parse(accountCredentialsBuffer.toString());
    } catch (error) {
      throw new Error('Unable to read account credential file \'' + accountCredentials + '\': ' + error);
    }
  } else if ((typeof accountCredentials === 'undefined' ? 'undefined' : _typeof(accountCredentials)) === 'object') {
    accountCredentialsContents = accountCredentials;
  } else {
    throw new Error('No account credentials provided');
  }

  _firebaseAdmin2.default.initializeApp({
    credential: _firebaseAdmin2.default.credential.cert(accountCredentialsContents)
  });

  try {
    _mkdirp2.default.sync(backupPath);
  } catch (error) {
    throw new Error('Unable to create backup path \'' + backupPath + '\': ' + error);
  }

  var database = _firebaseAdmin2.default.firestore();
  return backupRootCollections(database);
};

var _firebaseAdmin = require('firebase-admin');

var _firebaseAdmin2 = _interopRequireDefault(_firebaseAdmin);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }