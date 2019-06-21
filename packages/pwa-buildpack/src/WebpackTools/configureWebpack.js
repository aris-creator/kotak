const { promisify } = require('util');
const stat = promisify(require('fs').stat);
const path = require('path');
const webpack = require('webpack');
const pkgDir = require('pkg-dir');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackAssetsManifest = require('webpack-assets-manifest');

const loadEnvironment = require('../Utilities/loadEnvironment');
const RootComponentsPlugin = require('./plugins/RootComponentsPlugin');
const ServiceWorkerPlugin = require('./plugins/ServiceWorkerPlugin');
const UpwardDevServerPlugin = require('./plugins/UpwardDevServerPlugin');
const UpwardIncludePlugin = require('./plugins/UpwardIncludePlugin');
const PWADevServer = require('./PWADevServer');
const MagentoResolver = require('./MagentoResolver');

const prettyLogger = require('../util/pretty-logger');

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

function getMode(cliEnv = {}, projectConfig) {
    if (cliEnv.mode) {
        return cliEnv.mode;
    }
    if (projectConfig.isProd) {
        return 'production';
    }
    return 'development';
}

async function configureWebpack({ context, vendor = [], special = {}, env }) {
    await validateRoot(context);

    const babelConfigPresent = await checkForBabelConfig(context);

    let projectConfig = loadEnvironment(context);

    const paths = {
        src: path.resolve(context, 'src'),
        output: path.resolve(context, 'dist')
    };

    const features = await Promise.all(
        Object.entries(special).map(async ([packageName, flags]) => [
            await pkgDir(path.dirname(require.resolve(packageName))),
            flags
        ])
    );

    const hasFlag = flag =>
        features.reduce(
            (hasIt, [packagePath, flags]) =>
                flags[flag] ? [...hasIt, packagePath] : hasIt,
            []
        );

    let mode = getMode(env, projectConfig);

    const { debugBundles } = projectConfig.section('developer');

    if (debugBundles) {
        prettyLogger.warn(
            'Debugging bundles. Large but readable files will be generated.'
        );
        projectConfig = loadEnvironment(
            Object.assign({}, projectConfig.env, {
                NODE_ENV: 'development'
            })
        );
        mode = 'development';
    }

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
                    include: hasFlag('graphQLQueries'),
                    use: [
                        {
                            loader: 'graphql-tag/loader'
                        }
                    ]
                },
                {
                    test: /\.(mjs|js)$/,
                    include: [paths.src, ...hasFlag('esModules')],
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
                    oneOf: [
                        {
                            test: [paths.src, ...hasFlag('cssModules')],
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
                            include: /node_modules/,
                            use: [
                                'style-loader',
                                {
                                    loader: 'css-loader',
                                    options: {
                                        modules: false
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    test: /\.(jpg|svg)$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: '[name]-[hash:base58:3].[ext]',
                                outputPath: 'static',
                                publicPath: '/'
                            }
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
            new RootComponentsPlugin({
                rootComponentsDirs: [...hasFlag('rootComponents'), context].reduce(
                    (searchPaths, moduleDir) => [
                        ...searchPaths,
                        path.join(moduleDir, 'RootComponents'),
                        path.join(moduleDir, 'src', 'RootComponents')
                    ],
                    []
                ),
                context
            }),
            new webpack.EnvironmentPlugin(projectConfig.env),
            new ServiceWorkerPlugin({
                mode,
                paths,
                injectManifest: true,
                injectManifestConfig: {
                    importsDirectory: 'js',
                    include: [/\.js$/],
                    swSrc: './src/sw.js',
                    swDest: './js/sw.js'
                }
            }),
            new UpwardIncludePlugin({
                upwardDirs: hasFlag('upward')
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
                        if (name.match(/^RootCmp.*\.js$/)) {
                            const filenames = Array.isArray(value)
                                ? value
                                : [value];
                            assets.bundles.prefetch.push(...filenames);
                        }
                    });
                }
            })
        ]
    };
    let vendorTest = '[\\/]node_modules[\\/]';
    if (vendor.length > 0) {
        vendorTest += `(${vendor.join('|')})[\\\/]`;
    }
    config.optimization = {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: new RegExp(vendorTest),
                    chunks: 'all'
                }
            }
        }
    };
    if (debugBundles) {
        Object.assign(config.optimization, {
            moduleIds: 'named',
            nodeEnv: 'development',
            minimize: false,
            occurrenceOrder: true,
            usedExports: true,
            concatenateModules: true,
            sideEffects: true
        });
    } else if (mode === 'development') {
        config.devtool = 'cheap-source-map';

        config.devServer = await PWADevServer.configure(context, {
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
            new UpwardDevServerPlugin(
                config.devServer,
                process.env,
                path.resolve(
                    config.output.path,
                    projectConfig.section('upwardJs').upwardPath
                )
            )
        );
    } else if (mode === 'production') {
        config.performance = {
            hints: 'warning'
        };
        config.devtool = false;
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
        throw Error(`Unsupported environment mode in webpack config: ${mode}`);
    }
    return config;
}

module.exports = configureWebpack;
