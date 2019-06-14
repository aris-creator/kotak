const debug = require('../../util/debug').makeFileLogger(__dirname);
const { readFile: fsReadFile } = require('fs');
const readFile = require('util').promisify(fsReadFile);
const { ProvidePlugin } = require('webpack');
const readdir = require('readdir-enhanced');
const directiveParser = require('@magento/directive-parser');
const VirtualModulePlugin = require('virtual-module-webpack-plugin');
const { isAbsolute, join, relative } = require('path');

const prettyLogger = require('../../util/pretty-logger');

const toRootComponentMapKey = (type, variant = 'default') =>
    `RootCmp_${type}__${variant}`;

/**
 * @description webpack plugin that creates chunks for each
 * individual RootComponent in a provided array of directories, and produces a
 * file which imports each one as a separate chunk.
 */
class RootComponentsPlugin {
    /**
     * @param {object} opts
     * @param {string[]} opts.rootComponentsDirs All directories to be searched for RootComponents
     */
    constructor(opts) {
        this.opts = opts;
    }

    apply(compiler) {
        // Provide `fetchRootComponent` as a global: Expose the source as a
        // module, and then use a ProvidePlugin to inline it.
        compiler.hooks.beforeRun.tapPromise(
            'RootComponentsPlugin',
            async () => {
                await this.buildFetchModule();
                new VirtualModulePlugin({
                    moduleName: 'FETCH_ROOT_COMPONENT',
                    contents: this.contents
                }).apply(compiler);
                new ProvidePlugin({
                    fetchRootComponent: 'FETCH_ROOT_COMPONENT'
                }).apply(compiler);
            }
        );
    }

    async buildFetchModule() {
        const { context, rootComponentsDirs } = this.opts;

        // Create a list of absolute paths for root components. When a
        // relative path is found, resolve it from the root context of
        // the webpack build
        const rootComponentsDirsAbs = rootComponentsDirs.map(dir =>
            isAbsolute(dir) ? dir : join(context, dir)
        );
        debug('absolute root component dirs: %J', rootComponentsDirsAbs);
        const rootComponentImporters = await rootComponentsDirsAbs.reduce(
            async (importersPromise, rootComponentDir) => {
                debug('gathering files from %s', rootComponentDir);
                const importerSources = await importersPromise;
                let rootComponentFiles;
                try {
                    rootComponentFiles = await readdir(rootComponentDir, {
                        basePath: rootComponentDir,
                        deep: true,
                        filter: /m?[jt]s$/
                    });
                } catch (e) {
                    debug(
                        'it did not work out to readdir("%s"), %s',
                        rootComponentDir,
                        e.message
                    );
                    if (e.code !== 'ENOENT') {
                        throw e;
                    }
                    return importersPromise;
                }
                debug(
                    'files from %s: %J',
                    rootComponentDir,
                    rootComponentFiles
                );
                await Promise.all(
                    rootComponentFiles.map(async rootComponentFile => {
                        debug('reading file %s', rootComponentFile);
                        const rootComponentSource = await readFile(
                            rootComponentFile,
                            'utf8'
                        );
                        debug(
                            'parsing %s source for directives',
                            rootComponentFile
                        );
                        const { directives = [], errors } = directiveParser(
                            rootComponentSource
                        );
                        debug(
                            'directive parse found in %s, %J and errors: %J',
                            rootComponentFile,
                            directives,
                            errors
                        );
                        if (errors.length) {
                            // for now, errors just mean no directive was found
                            return;
                        }
                        debug('filtering %J for RootComponents', directives);
                        const rootComponentDirectives = directives.filter(
                            d => d.type === 'RootComponent'
                        );
                        debug(
                            'found %s directives: %J',
                            rootComponentDirectives.length,
                            rootComponentDirectives
                        );
                        if (rootComponentDirectives.length === 0) {
                            return;
                        }

                        if (rootComponentDirectives.length > 1) {
                            console.warn(
                                `Found more than 1 RootComponent Directive in ${rootComponentFile}. Only the first will be used`
                            );
                        }

                        const {
                            pageTypes,
                            variant
                        } = rootComponentDirectives[0];

                        if (!pageTypes || pageTypes.length === 0) {
                            console.warn(
                                `No pageTypes specified for RootComponent ${rootComponentFile}. RootComponent will never be used.`
                            );
                        } else {
                            pageTypes.forEach(pageType => {
                                debug(
                                    'creating root component map key for %s',
                                    rootComponentFile,
                                    pageType
                                );
                                const key = toRootComponentMapKey(
                                    pageType,
                                    variant
                                );
                                importerSources[
                                    key
                                ] = `() => import(/* webpackChunkName: "${key}" */'${relative(
                                    context,
                                    rootComponentFile
                                )}')`;
                            });
                        }
                    })
                );
                return importerSources;
            },
            Promise.resolve({})
        );

        const rootComponentEntries = Object.entries(rootComponentImporters);

        if (rootComponentEntries.length === 0) {
            prettyLogger.error(
                `No RootComponents were found in any of these directories: \n - ${rootComponentsDirsAbs.join(
                    '\n - '
                )}.\n\nThe MagentoRouter will not be able to load SEO URLs.`
            );
        }

        this.contents = `
            const rootComponentsMap = {
            ${rootComponentEntries.map(entry => entry.join(':')).join(',\n')}
            };
            const key = ${toRootComponentMapKey.toString()};
            export default function fetchRootComponent(type, variant = 'default') {
                return rootComponentsMap[key(type, variant)]().then(m => m.default || m);
            };
        `;
    }
}

module.exports = RootComponentsPlugin;
