// webpack.config.js
module.exports = {
  entry: './entrypoint.js',
  output: {
    filename: 'bundle.js',
    path: 'build',
  },
  module: {
    loaders: [
      {test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192'}
    ]
  }
};
