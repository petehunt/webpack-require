'use strict';

var MemoryFilesystem = require('memory-fs');

var assign = require('object-assign');
var invariant = require('invariant');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');
var sourceMapSupport = require('./sourceMapSupport');
var vm = require('vm');
var webpack = require('webpack');

function webpackRequire(config, name, sharedModules, globals, cb) {
  if (!globals && !cb) {
    cb = sharedModules;
    sharedModules = [];
    globals = {console: console};
  } else if (!cb) {
    cb = globals;
    globals = {console: console};
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
  config.devtool = 'inline-source-map';
  config.output = assign({}, config.output, {
    filename: 'bundle.js',
    path: '/',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  });

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
    var script = new vm.Script(data, {filename: '/bundle.js'});

    cb(null, function() {
      var context = vm.createContext(globals);
      var sandboxedError = vm.runInContext('Error', context);
      sourceMapSupport(sandboxedError, function() {
        return data;
      });
      script.runInContext(context);
      return context.entrypoint;
    }, stats, fs);

  });
}

module.exports = webpackRequire;
