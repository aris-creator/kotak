const { configureWebpack } = require('@magento/pwa-buildpack');

const path = require('path');
const veniaLibRoot = path.dirname(require.resolve('@magento/venia-library'));
const veniaRootComponents = path.resolve(veniaLibRoot, 'RootComponents');

module.exports = async env => {
    process.env.NODE_ENV = 'development';
    const config = await configureWebpack({
        context: __dirname,
        common: [
            'apollo-cache-inmemory',
            'apollo-cache-persist',
            'apollo-client',
            'apollo-link-context',
            'apollo-link-http',
            'informed',
            'react',
            'react-apollo',
            'react-dom',
            'react-feather',
            'react-redux',
            'react-router-dom',
            'redux',
            'redux-actions',
            'redux-thunk'
        ],
        usesPeregrine: ['/venia-library/'],
        env,
        rootComponentPaths: [veniaRootComponents]
    });

    console.log(require('util').inspect(config.module.rules));

    config.module.noParse = [/braintree\-web\-drop\-in/];

    return config;
};
