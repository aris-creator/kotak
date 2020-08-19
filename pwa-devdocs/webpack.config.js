const path = require('path');

module.exports = {
    entry: path.join(__dirname, './src/_js/index.js'),
    output: {
        path: path.join(__dirname, './src/builds/js/'),
        filename: 'index.bundle.js',
        publicPath: '/builds/js/'
    },
};
