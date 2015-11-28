'use strict';

var MemoryFilesystem = require('memory-fs');

var assign = require('object-assign');
var invariant = require('invariant');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');
var sourceMapSupport = require('./sourceMapSupport');
var vm = require('vm');
var webpack = require('webpack');

function buildFactory(source, globals) {
  var script = new vm.Script(source, {filename: '/bundle.js'});
  var factory = function() {
    var context = vm.createContext(globals);
    var sandboxedError = vm.runInContext('Error', context);
    sourceMapSupport(sandboxedError, function() {
      return source;
    });
    script.runInContext(context);
    return context.entrypoint;
  };

  factory.serialize = function() {
    return source;
  };

  return factory;
}

function compile(config, name, sharedModulesMap, globals, cb) {
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

    cb(null, data, stats, fs);
  });
}

function buildGlobalsAndSharedModulesMap(sharedModules, globals) {
  var rv = {
    sharedModulesMap: {},
    globals: assign({}, globals),
  };

  sharedModules.forEach(function(path, i) {
    invariant(path[0] !== '.', 'You cannot share relative paths');
    var globalVariableName = '__webpackRequireModule_' + i;
    rv.sharedModulesMap[path] = globalVariableName;
    rv.globals[globalVariableName] = require(path);
  });

  return rv;
}

function webpackRequire(config, name, sharedModules, globals, cb) {
  if (!globals && !cb) {
    cb = sharedModules;
    sharedModules = [];
    globals = {console: console};
  } else if (!cb) {
    cb = globals;
    globals = {console: console};
  }

  var globalsAndSharedModulesMap = buildGlobalsAndSharedModulesMap(sharedModules, globals);

  compile(
    config,
    name,
    globalsAndSharedModulesMap.sharedModulesMap,
    globalsAndSharedModulesMap.globals, function(err, data, stats, fs) {
      if (err) {
        cb(err, null, stats, fs);
        return;
      }
      cb(null, buildFactory(data, globalsAndSharedModulesMap.globals), stats, fs);
    }
  );
}

webpackRequire.requireSerialized = function(source, sharedModules, globals) {
  if (!globals) {
    globals = {console: console};
  }

  if (!sharedModules) {
    sharedModules = [];
  }

  var globalsAndSharedModulesMap = buildGlobalsAndSharedModulesMap(sharedModules, globals);

  return buildFactory(source, globalsAndSharedModulesMap.globals);
}

module.exports = webpackRequire;
