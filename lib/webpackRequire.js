'use strict';

var MemoryFilesystem = require('memory-fs');

var assign = require('object-assign');
var contextify = require('contextify');
var invariant = require('invariant');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');
var webpack = require('webpack');

function webpackRequire(config, name, sharedModules, cb) {
  var globals = {console: console};
  if (!cb) {
    cb = sharedModules;
    sharedModules = [];
  }

  var sharedModulesMap = {};
  var seed = 1;
  sharedModules.forEach(function(path) {
    invariant(path[0] !== '.', 'You cannot share relative paths');
    var globalVariableName = '__webpackRequireModule_' + seed;
    sharedModulesMap[path] = globalVariableName;
    globals[globalVariableName] = require(path);
    seed++;
  });

  var originalExternals = config.externals || {};
  function externals(context, request, cb) {
    if (originalExternals.hasOwnProperty(request)) {
      cb(null, config.externals[request]);
    } else if (request[0] !== '.') {
      cb(null, sharedModulesMap[request]);
    } else {
      cb(null, sharedModulesMap[path.normalize(path.join(context, request) + '.js')]);
    }
  }

  invariant(
    pathIsAbsolute(name),
    'Module name must be an absolute path. Did you forget to require.resolve()?'
  );

  config = assign({}, config);
  config.externals = externals;
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias.ENTRYPOINT = name;
  config.entry = require.resolve('./webpackRequireEntrypoint');
  config.output = config.output || {};
  assign(config.output, {filename: 'bundle.js', path: '/'});

  var compiler = webpack(config);
  var fs = new MemoryFilesystem();
  compiler.outputFileSystem = fs;

  compiler.run(function(err, stats) {
    if (err) {
      cb(err, null, stats);
      return;
    }

    var statsJson = stats.toJson();

    if (statsJson.errors.length > 0) {
      cb(statsJson.errors, null, stats);
    }

    var data = fs.readFileSync('/bundle.js', 'utf8');
    var script = contextify.createScript(data);
    cb(null, function() {
      var context = contextify.createContext(globals);
      script.runInContext(context);
      return context.getGlobal().entrypoint;
    }, stats, fs);

  });
}

module.exports = webpackRequire;
