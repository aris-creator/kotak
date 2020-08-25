const WebpackVirtualModulesPlugin = require('webpack-virtual-modules');

/**
 * Wrapper plugin for `webpack-virtual-modules` which converts the data object
 * fed to a "plugin" transform into the config object for
 * `webpack-virtual-modules`.
 *
 * @param {*} virtualModuleConfig - The denormalized transform requests,
 * arranged by originating filename.
 */
function BuildpackVirtualModulesPlugin(virtualModuleConfig) {
    const webpackVirtualModulesConfig = {};
    for (const [{ options }] of Object.values(virtualModuleConfig)) {
        webpackVirtualModulesConfig[options.virtualFilePath] = options.contents;
    }
    return new WebpackVirtualModulesPlugin(webpackVirtualModulesConfig);
}

module.exports = BuildpackVirtualModulesPlugin;
