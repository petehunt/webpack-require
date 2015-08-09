'use strict';

var webpackRequire = require('../lib/webpackRequire');

describe('webpackRequire', function() {
  it('works', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      function(err, mod) {
        expect(mod().indexOf('base64')).toBeGreaterThan(-1);
        done();
      }
    );
  });
});
