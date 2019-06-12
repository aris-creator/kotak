const { configureWebpack } = require('@magento/pwa-buildpack');

const path = require('path');
const veniaLibRoot = path.dirname(require.resolve('@magento/venia-library'));

module.exports = async env => {
    const config = await configureWebpack({
        context: __dirname,
        rootComponentPaths: [path.resolve(veniaLibRoot, 'RootComponents')],
        env
    });

    config.module.noParse = [/braintree\-web\-drop\-in/];

    return config;
};
