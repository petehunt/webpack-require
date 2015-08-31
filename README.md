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
  function(err, factory, stats, fs) {
    if (err) {
      console.error(err);
    }

    // Invoke factory() to actually get an instance of your module.
    // You can call it multiple times to get multiple independent copies
    // of your module (useful for multiple requests in a single process).
    // Note that this is fairly performant, since the file is only parsed
    // once even if you call factory() multiple times.
    var yourmodule = factory();

    // You can inspect the build process by looking at the stats object

    // fs can be used to read static assets from the bundle. They are mounted
    // in the root directory. This is useful for extracting a static CSS
    // stylesheet with ExtractTextPlugin by doing: fs.readFileSync('/style.css')
  }
);
```

## How does it work?

This bundles your app with webpack and evaluates the bundle in a `contextify`
sandbox. It also tweaks your webpack config to remove plugins that are
detrimental server-side (i.e. optimization plugins).

## API docs

`webpackRequire(webpackConfig, modulePath, [overrideModules], [globals], callback)`

  * `webpackConfig`: the webpack config as a JavaScript object.
  * `modulePath`: the absolute path to the module you want to `require()`
  * `overrideModules`: optional array of absolute paths to modules that you do NOT want bundled. Instead, when these modules are required inside of the webpack bundle, a reference to the module as required by Node.js will be returned instead. This is useful when you have a stateful module, and you want to share that state between your Node.js code and your webpacked code. If that module is not included in this array, then when that module is required you'll get a fresh copy without the shared state. This array is also useful for sharing native modules, like `fs` with your webpack bundle.
  * `globals`: optional object to serve as global scope
  * `callback(err, factory, stats, fs)`: callback that executes when the build process is complete. `factory` is a function that takes no arguments and returns a fresh copy of the required module. Multiple invocations of this function should be fairly inexpensive since parsing only happens once. `stats` is the webpack stats object and can return information about the build process (see the [webpack docs on stats](https://github.com/webpack/docs/wiki/node.js-api#stats)). `fs` is a mock file system module that you can use to read static assets like images from the bundle. All files are placed at the root (i.e. if your bundle outputs a `myImage.png` asset, you can use `fs.readFileSync('/myImage.png')` to read it).