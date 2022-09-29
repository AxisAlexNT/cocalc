/*
This module defines how webpack loads each type of file.


See https://github.com/iykekings/react-swc-loader-template for swc-loader configuration.
We use swc-loader as opposed to other options for consistency with next.js.

We do apply swc-loader to node_modules, since there are "bad" modules out there
(@jupyter-widgets/* I'm looking at you -- see https://github.com/sagemathinc/cocalc/issues/6128),
and weird surprises can pop up.  We have to exclude transpiling jquery since otherwise
we get an infinite recursion on startup, but of course jquery is fine.
*/

module.exports = function (PRODMODE) {
  // tuning generated filenames and the configs for the aux files loader.
  const hashname = PRODMODE
    ? "[sha256:hash:base62:33].cacheme.[ext]" // don't use base64, it's not recommended for some reason.
    : "[path][name].nocache.[ext]";

  return [
    {
      test: /\.(js|jsx|ts|tsx|mjs|cjs)$/,
      loader: "swc-loader",
      exclude: /.*node_modules\/jquery.*/,
    },
    { test: /\.coffee$/, loader: "coffee-loader" },
    {
      test: /\.cjsx$/,
      use: [{ loader: "coffee-loader" }, { loader: "cjsx-loader" }],
    },
    {
      test: /\.less$/,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            importLoaders: 2,
          },
        },
        {
          loader: "less-loader",
          options: { lessOptions: { javascriptEnabled: true } },
        }, // javascriptEnabled needed for antd.
      ],
    },
    {
      test: /\.scss$/i,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            importLoaders: 2,
          },
        },
        "sass-loader",
      ],
    },
    {
      test: /\.sass$/i,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            importLoaders: 2,
          },
        },
        "sass-loader",
      ],
    },
    {
      test: /\.png$/,
      type: "asset/resource",
    },
    {
      test: /\.ico$/,
      type: "asset/resource",
    },
    {
      test: /\.svg(\?[a-z0-9\.-=]+)?$/,
      type: "asset/resource",
    },
    {
      test: /\.(jpg|jpeg|gif)$/,
      type: "asset/resource",
    },
    {
      test: /\.html$/,
      use: [
        { loader: "raw-loader" },
        {
          loader: "html-minify-loader",
          options: { conservativeCollapse: true },
        },
      ],
    },
    { test: /\.hbs$/, loader: "handlebars-loader" },
    {
      test: /\.svg?$/,
      type: "asset/resource",
    },
    {
      test: /\.woff(2)?(\?[a-z0-9\.-=]+)?$/,
      type: "asset/resource",
    },
    {
      test: /\.ttf(\?[a-z0-9\.-=]+)?$/,
      type: "asset/resource",
    },
    {
      test: /\.eot(\?[a-z0-9\.-=]+)?$/,
      type: "asset/resource",
    },
    {
      test: /\.css$/i,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            importLoaders: 1,
          },
        },
      ],
    },
    {
      test: /\.worker\.(c|m)?js$/i,
      loader: "worker-loader",
      options: {
        filename: "[name].[contenthash].worker.js",
      },
    },
    {
      // This rule makes source maps compatible with other cocalc included modules like @cocalc/util.  Without this, you
      // get lots of warnings in the console, and lots of source maps don't work at all.
      // https://stackoverflow.com/questions/61767538/devtools-failed-to-load-sourcemap-for-webpack-node-modules-js-map-http-e
      test: /\.(j|t)s$/,
      enforce: "pre",
      use: ["source-map-loader"],
    },
    {
      resourceQuery: /raw/,
      type: "asset/source",
    },
    {
      test: /\.(glsl|txt)/,
      type: "asset/source",
    },
  ];
};
