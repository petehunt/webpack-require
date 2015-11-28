'use strict';

var webpackRequire = require('../lib/webpackRequire');

describe('webpackRequire', function() {
  it('works', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      function(err, mod) {
        var text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('webpack')).toBeGreaterThan(-1);
        done();
      }
    );
  });

  it('supports caching', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      function(err, originalMod) {
        var serialized = JSON.stringify(originalMod.serialize());
        var mod = webpackRequire.requireSerialized(JSON.parse(serialized));
        var text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('webpack')).toBeGreaterThan(-1);
        done();
      }
    );
  });

  it('has sick stack traces', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/throwError'),
      function(err, mod) {
        expect(err).toBe(null);
        var e = null;
        try {
          mod();
        } catch (_e) {
          e = _e;
        }

        expect(e.stack.indexOf('webpack-require/spec/app/throwError.js:1:1)')).toBeGreaterThan(-1);
        done();
      }
    );
  });

  it('shims', function(done) {
    var stateful = require('./app/stateful');
    stateful.value = 'node';

    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      [require.resolve('./app/stateful')],
      function(err, mod) {
        var text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('node')).toBeGreaterThan(-1);
        done();
      }
    );
  });
});
