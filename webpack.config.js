module.exports = {
    entry: './src/index.js',
    output: {
        path: __dirname + '/lib',
        filename: 'metolib-bundle-'+(require("./package.json").version)+'.js',
        libraryTarget: 'var',
        library: 'Metolib'
    },
    module: {
      rules: [
        {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
        }]
    },
    devtool: "#inline-source-map"
}
