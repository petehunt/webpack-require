'use strict';

var MemoryFilesystem = require('memory-fs');

var assign = require('object-assign');
var contextify = require('contextify');
var invariant = require('invariant');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');
var webpack = require('webpack');

function webpackRequire(config, name, cb) {
  invariant(
    pathIsAbsolute(name),
    'Module name must be an absolute path. Did you forget to require.resolve()?'
  );

  config = assign({}, config);
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias.ENTRYPOINT = name;
  config.entry = require.resolve('./webpackRequireEntrypoint');
  config.output = {filename: 'bundle.js', path: '/'};
  config.plugins = config.plugins || [];

  // Remove plugins known to be incompatible
  config.plugins = config.plugins.filter(function(plugin) {
    return !webpack.optimize.hasOwnProperty(plugin.constructor.name);
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
    var script = contextify.createScript(data);
    cb(null, function() {
      var context = contextify.createContext({});
      script.runInContext(context);
      return context.getGlobal().entrypoint;
    }, stats);

  });
}

module.exports = webpackRequire;
