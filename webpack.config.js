var path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  output: {
    filename: 'zlplayer.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'zlplayer',
    libraryTarget: 'umd',
  },

  resolve: {
    extensions: ['.ts', '.js', '.json']
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          { loader: 'babel-loader' },
          { loader: 'ts-loader' },
        ],
      },
    ]
  }
}