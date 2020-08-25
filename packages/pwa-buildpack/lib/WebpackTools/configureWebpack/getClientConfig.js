/**
 * @module Buildpack/WebpackTools
 */
const debug = require('debug')('pwa-buildpack:createClientConfig');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const getModuleRules = require('./getModuleRules');
const getPlugins = require('./getPlugins');
const getResolveLoader = require('./getResolveLoader');

function isDevServer() {
    return process.argv.find(v => v.includes('webpack-dev-server'));
}

/**
 * Create a Webpack configuration object for the browser bundle.
 *
 * @param {Buildpack/WebpackTools~WebpackConfigHelper} opts
 * @returns {Object} A Webpack configuration for the main app.
 */
async function getClientConfig(opts) {
    const {
        mode,
        context,
        paths,
        vendor,
        projectConfig,
        stats,
        resolver
    } = opts;

    let vendorTest = '[\\/]node_modules[\\/]';

    if (vendor.length > 0) {
        vendorTest += `(${vendor.join('|')})[\\\/]`;
    }

    debug('Creating client config');

    const config = {
        mode,
        context, // Node global for the running script's directory
        stats,
        entry: {
            client: path.resolve(paths.src, 'index.js')
        },
        output: {
            path: paths.output,
            publicPath: '/',
            filename:
                mode === 'production' ? '[name].[contenthash].js' : '[name].js',
            strictModuleExceptionHandling: true,
            chunkFilename: '[name].[chunkhash].js'
        },
        module: {
            rules: await getModuleRules(opts)
        },
        resolve: resolver.config,
        resolveLoader: getResolveLoader(),
        plugins: await getPlugins(opts),
        devtool: 'source-map',
        optimization: {
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: new RegExp(vendorTest),
                        chunks: 'all'
                    }
                }
            }
        }
    };

    if (mode === 'development') {
        debug('Modifying client config for development environment');
        Object.assign(config.optimization, {
            moduleIds: 'named',
            nodeEnv: 'development',
            minimize: false,
            occurrenceOrder: true,
            usedExports: true,
            concatenateModules: true,
            sideEffects: true
        });
        if (isDevServer()) {
            // Using eval-source-map shows original source (non-transpiled) as
            // well as comments.
            // See https://webpack.js.org/configuration/devtool/
            config.devtool = 'eval-source-map';
            debug('Configuring Dev Server');
            const PWADevServer = require('../PWADevServer');
            await PWADevServer.configure(
                {
                    graphqlPlayground: true,
                    ...projectConfig.sections(
                        'devServer',
                        'imageOptimizing',
                        'imageService',
                        'customOrigin'
                    ),
                    upwardPath: projectConfig.section('upwardJs').upwardPath
                },
                config
            );
        }
    } else if (mode === 'production') {
        let versionBanner = '';
        try {
            versionBanner = projectConfig.section('staging').buildId;
            if (!versionBanner || versionBanner.trim().length === 0) {
                throw new Error('invalid build id');
            }
        } catch (error) {
            try {
                versionBanner = require('child_process')
                    .execSync('git describe --long --always --dirty=-dev')
                    .toString();
            } catch (e) {
                versionBanner = `${
                    require(path.resolve(context, './package.json')).version
                }-[hash]`;
            }
        }

        debug('Modifying client config for production environment');
        config.performance = {
            hints: 'warning'
        };
        config.devtool = false;
        config.optimization = {
            ...config.optimization,
            moduleIds: 'hashed',
            /**
             * This will move the runtime configuration to
             * its own bundle. Since runtime config tends to
             * change on each compile even though the app logic
             * doesn't, if not separated the whole client bundle
             * needs to be downloaded. Separating them will only
             * download runtime bundle and use the cached client code.
             */
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    /**
                     * Creating the vendors bundle. This bundle
                     * will have all the packages that the app
                     * needs to render. Since these dont change
                     * often, it is advantageous to bundle them
                     * separately and cache them on the client.
                     */
                    vendor: {
                        test: new RegExp(vendorTest),
                        name: 'vendors',
                        chunks: 'all'
                    }
                }
            },
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    cache: true,
                    terserOptions: {
                        ecma: 8,
                        parse: {
                            ecma: 8
                        },
                        compress: {
                            drop_console: true
                        },
                        output: {
                            ecma: 7,
                            semicolons: false
                        },
                        keep_fnames: true
                    }
                }),
                new webpack.BannerPlugin({
                    banner: `@version ${versionBanner}`
                })
            ]
        };
    } else {
        debug(
            `Unable to verify environment. Cancelling client config creation. Received mode: ${mode}`
        );
        throw Error(`Unsupported environment mode in webpack config: ${mode}`);
    }
    debug('Client config created');
    return config;
}

module.exports = getClientConfig;
