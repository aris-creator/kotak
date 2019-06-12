const { promisify } = require('util');
const stat = promisify(require('fs').stat);
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackAssetsManifest = require('webpack-assets-manifest');

const loadEnvironment = require('../Utilities/loadEnvironment');
const makeMagentoRootComponentsPlugin = require('./plugins/makeMagentoRootComponentsPlugin');
const ServiceWorkerPlugin = require('./plugins/ServiceWorkerPlugin');
const UpwardPlugin = require('./plugins/UpwardPlugin');
const PWADevServer = require('./PWADevServer');
const MagentoResolver = require('./MagentoResolver');

/**
 * We need a root directory for the app in order to build all paths relative to
 * that app root. It's not safe to use process.cwd() here because that depends
 * on what directory Node is run in. The project root should be the dir of the
 * webpack.config.js which called this function.
 *
 * There is no safe way to get the path of this function's caller, so instead we
 * expect that the webpack.config.js will do:
 *
 *     configureWebpack(__dirname);
 */
async function validateRoot(appRoot) {
    if (!appRoot) {
        throw new Error(
            'Must provide the root directory of the PWA to as the first parameter to `configureWebpack()`. In webpack.config.js, the recommended code is `configureWebpack(__dirname)`.'
        );
    }
    // If root doesn't exist, an ENOENT will throw here and log to stderr.
    const dirStat = await stat(appRoot);
    if (!dirStat.isDirectory()) {
        throw new Error(
            `Provided application root "${appRoot}" is not a directory.`
        );
    }
}

async function checkForBabelConfig(appRoot) {
    try {
        await stat(path.resolve(appRoot, 'babel.config.js'));
        return true;
    } catch (e) {
        return false;
    }
}

async function configureWebpack({ context, rootComponentPaths, env }) {
    await validateRoot(context);
    const babelConfigPresent = await checkForBabelConfig(context);

    const projectConfig = loadEnvironment(context);

    const paths = {
        src: path.resolve(context, 'src'),
        output: path.resolve(context, 'dist')
    };

    const libs = [
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
    ];

    const mode =
        env.mode || (projectConfig.isProd ? 'production' : 'development');

    const config = {
        mode,
        context, // Node global for the running script's directory
        entry: {
            client: path.resolve(paths.src, 'index.js')
        },
        output: {
            path: paths.output,
            publicPath: '/',
            filename: 'js/[name].js',
            strictModuleExceptionHandling: true,
            chunkFilename: 'js/[name]-[chunkhash].js'
        },
        module: {
            rules: [
                {
                    test: /\.graphql$/,
                    exclude: () => false,
                    use: [
                        {
                            loader: 'graphql-tag/loader'
                        }
                    ]
                },
                {
                    test: /\.(mjs|js)$/,
                    include: [paths.src, /(peregrine|venia)/],
                    sideEffects: false,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                envName: mode,
                                rootMode: babelConfigPresent ? 'root' : 'upward'
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    exclude: /node_modules/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                localIdentName:
                                    '[name]-[local]-[hash:base64:3]',
                                modules: true
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    include: /node_modules/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                modules: false
                            }
                        }
                    ]
                },
                {
                    test: /\.(jpg|svg)$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {}
                        }
                    ]
                }
            ]
        },
        resolve: await MagentoResolver.configure({
            paths: {
                root: context
            }
        }),
        plugins: [
            await makeMagentoRootComponentsPlugin({
                rootComponentsDirs: rootComponentPaths,
                context
            }),
            new webpack.EnvironmentPlugin(projectConfig.env),
            new ServiceWorkerPlugin({
                mode,
                paths,
                injectManifest: true,
                injectManifestConfig: {
                    include: [/\.js$/],
                    swSrc: './src/sw.js',
                    swDest: 'sw.js'
                }
            }),
            new WebpackAssetsManifest({
                output: 'asset-manifest.json',
                entrypoints: true,
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
                        if (name.startsWith('RootCmp')) {
                            const filenames = Array.isArray(value)
                                ? value
                                : [value];
                            assets.bundles.prefetch.push(...filenames);
                        }
                    });
                }
            })
        ],
        optimization: {
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: new RegExp(
                            `[\\\/]node_modules[\\\/](${libs.join('|')})[\\\/]`
                        ),
                        chunks: 'all'
                    }
                }
            }
        }
    };
    if (mode === 'development') {
        config.devtool = 'eval-source-map';

        config.devServer = await PWADevServer.configure({
            publicPath: config.output.publicPath,
            graphqlPlayground: true,
            ...projectConfig.sections(
                'devServer',
                'imageService',
                'customOrigin'
            ),
            ...projectConfig.section('magento')
        });
        // A DevServer generates its own unique output path at startup. It needs
        // to assign the main outputPath to this value as well.

        config.output.publicPath = config.devServer.publicPath;

        config.plugins.push(
            new webpack.HotModuleReplacementPlugin(),
            new UpwardPlugin(
                config.devServer,
                projectConfig.env,
                path.resolve(
                    context,
                    projectConfig.section('upwardJs').upwardPath
                )
            )
        );
    } else if (mode === 'production') {
        config.performance = {
            hints: 'warning'
        };
        config.devtool = 'source-map';
        if (!process.env.DEBUG_BEAUTIFY) {
            config.optimization.minimizer = [
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
                })
            ];
        } else {
            config.optimization.minimizer = [
                new TerserPlugin({
                    parallel: true,
                    sourceMap: true,
                    terserOptions: {
                        ecma: 8,
                        parse: {
                            ecma: 8
                        },
                        compress: false,
                        mangle: false,
                        output: {
                            beautify: true,
                            comments: false,
                            ecma: 8,
                            indent_level: 2
                        }
                    }
                })
            ];
        }
    } else {
        throw Error(`Unsupported environment mode in webpack config: ${mode}`);
    }
    return config;
}

module.exports = configureWebpack;
