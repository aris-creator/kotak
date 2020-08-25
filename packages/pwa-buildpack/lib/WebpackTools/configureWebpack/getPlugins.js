const path = require('path');
const webpack = require('webpack');

const WebpackAssetsManifest = require('webpack-assets-manifest');

const RootComponentsPlugin = require('../plugins/RootComponentsPlugin');
const ServiceWorkerPlugin = require('../plugins/ServiceWorkerPlugin');
const UpwardIncludePlugin = require('../plugins/UpwardIncludePlugin');
const LocalizationPlugin = require('../plugins/LocalizationPlugin');

async function getPlugins(helper) {
    // Even if not all of these methods are async, we should set up the API as
    // though they could be, so we don't break the contract down the road if
    // future performance concerns require us to make them async.
    return Promise.all([
        getPlugins.rootComponents(helper),
        getPlugins.environmentPlugin(helper),
        getPlugins.upwardInclude(helper),
        getPlugins.assetManifest(helper),
        getPlugins.serviceWorker(helper),
        getPlugins.localization(helper),
        ...getPlugins.transformModuleRequestedPlugins(helper)
    ]);
}

getPlugins.rootComponents = ({ context, hasFlag }) =>
    new RootComponentsPlugin({
        rootComponentsDirs: [...hasFlag('rootComponents'), context].reduce(
            (searchPaths, moduleDir) => [
                ...searchPaths,
                path.join(moduleDir, 'RootComponents'),
                path.join(moduleDir, 'src', 'RootComponents'),
                path.join(moduleDir, 'lib', 'RootComponents')
            ],
            []
        ),
        context
    });

getPlugins.environmentPlugin = ({ projectConfig }) =>
    new webpack.EnvironmentPlugin(projectConfig.env);

getPlugins.upwardInclude = ({ bus, hasFlag, context }) =>
    new UpwardIncludePlugin({
        bus,
        upwardDirs: [...hasFlag('upward'), context]
    });

getPlugins.assetManifest = () =>
    new WebpackAssetsManifest({
        output: 'asset-manifest.json',
        entrypoints: true,
        publicPath: '/',
        // Add explicit properties to the asset manifest for
        // upward.yml to use when evaluating app shell templates.
        transform(assets) {
            // All RootComponents go to prefetch, and all client scripts
            // go to load.
            assets.bundles = {
                load: assets.entrypoints.client.js,
                prefetch: []
            };
            Object.entries(assets).forEach(([name, value]) => {
                if (name.match(/^RootCmp.*\.js$/)) {
                    const filenames = Array.isArray(value) ? value : [value];
                    assets.bundles.prefetch.push(...filenames);
                }
                const ext = path.extname(name);
                const type = ext && ext.replace(/^\./, '');
                if (type) {
                    if (!assets[type]) {
                        assets[type] = {};
                    }
                    assets[type][path.basename(name, ext)] = value;
                }
            });
        }
    });

getPlugins.serviceWorker = ({ mode, paths, projectConfig }) =>
    new ServiceWorkerPlugin({
        mode,
        paths,
        injectManifest: true,
        enableServiceWorkerDebugging: !!projectConfig.section('devServer')
            .serviceWorkerEnabled,
        injectManifestConfig: {
            include: [/\.(?:css|js|html|svg)$/],
            swSrc: './src/ServiceWorker/sw.js',
            swDest: './sw.js'
        }
    });

getPlugins.localization = ({ context, hasFlag, virtualModules }) =>
    new LocalizationPlugin({
        virtualModules,
        context,
        dirs: [...hasFlag('i18n'), context] // Directories to search for i18n/*.json files
    });

getPlugins.transformModuleRequestedPlugins = ({ transformRequests }) => {
    const pluginRequests = Object.entries(transformRequests.plugin);
    return pluginRequests.map(([pluginPath, pluginConf]) => {
        const RequestedPlugin = require(pluginPath);
        return new RequestedPlugin(pluginConf);
    });
};

module.exports = getPlugins;
