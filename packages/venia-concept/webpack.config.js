const { configureWebpack } = require('@magento/pwa-buildpack');

const path = require('path');
const veniaLibRoot = path.dirname(require.resolve('@magento/venia-library'));

module.exports = env => {
    const config = configureWebpack({
        context: __dirname,
        rootComponentPaths: [path.resolve(veniaLibRoot, 'RootComponents')],
        env
    });

    return config;
};
