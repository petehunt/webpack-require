# webpack-require

**WARNING:** this is beta software.

This lets you `require()` a module in Node that needs to have a specific
webpack config. This is useful rendering a component that uses webpack
loaders server-side in Node.js.

## How to use it

```js
var webpackRequire = require('webpack-require');

webpackRequire(
  require('./path/to/webpack.config.js'),
  require.resolve('./path/to/yourmodule.js'),
  function(err, factory) {
    if (err) {
      console.error(err);
    }

    // Invoke factory() to actually get an instance of your module.
    // You can call it multiple times to get multiple independent copies
    // of your module (useful for multiple requests in a single process).
    var yourmodule = factory();
  }
);
```

## How does it work?

This bundles your app with webpack and evaluates the bundle in a `contextify`
sandbox. It also tweaks your webpack config to remove plugins that are
detrimental server-side (i.e. optimization plugins).