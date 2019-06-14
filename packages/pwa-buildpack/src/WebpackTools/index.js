module.exports = {
    configureWebpack: require('./configureWebpack'),
    RootComponentsPlugin: require('./plugins/RootComponentsPlugin'),
    ServiceWorkerPlugin: require('./plugins/ServiceWorkerPlugin'),
    MagentoResolver: require('./MagentoResolver'),
    PWADevServer: require('./PWADevServer'),
    UpwardPlugin: require('./plugins/UpwardPlugin')
};
