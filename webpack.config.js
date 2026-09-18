const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  context: path.resolve(__dirname, './src'),
  entry: {
    app: './app.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './dist')
  },
  resolve: {
    conditionNames: ['svelte', 'browser', 'import'],
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(svelte|svelte\.js)$/,
        use: {
          loader: 'svelte-loader',
          options: {
            emitCss: true,
            onwarn: (warning, handleWarning) => {
              if (warning.filename && warning.filename.includes('node_modules')) return;
              handleWarning(warning);
            },
          },
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        type: 'asset/inline',
      },
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader',
      },
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'styles.css' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './wasm/z3w.wasm', to: './z3w.wasm' },
        { from: './wasm/z3w.js', to: './z3w.js' },
        { from: './index.html', to: './index.html' },
        { from: './assets/favicon.png', to: './favicon.png' },
      ],
    }),
  ],
};
