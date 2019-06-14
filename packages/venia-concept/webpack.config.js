const { configureWebpack } = require('@magento/pwa-buildpack');

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
        usesPeregrine: ['@magento/venia-library'],
        env
    });

    config.module.noParse = [/braintree\-web\-drop\-in/];

    return config;
};
