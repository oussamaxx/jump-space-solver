const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';
  return {
  context: path.resolve(__dirname, './src'),
  entry: {
    app: './app.js',
  },
  devtool: isProd ? false : 'source-map',
  output: {
    // Content hashes in production so each deploy busts the browser cache
    filename: isProd ? '[name].[contenthash:8].bundle.js' : '[name].bundle.js',
    path: path.resolve(__dirname, './dist'),
    clean: true,
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
            compilerOptions: { dev: !isProd },
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
          { loader: 'css-loader', options: { sourceMap: !isProd } },
          { loader: 'postcss-loader', options: { sourceMap: !isProd } },
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
    new MiniCssExtractPlugin({ filename: isProd ? 'styles.[contenthash:8].css' : 'styles.css' }),
    new HtmlWebpackPlugin({ template: './index.html', inject: 'body', scriptLoading: 'blocking' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './wasm/z3w.wasm', to: './z3w.wasm' },
        { from: './wasm/z3w.js', to: './z3w.js' },
        { from: './assets/favicon.webp', to: './favicon.webp' },
      ],
    }),
  ],
  };
};
