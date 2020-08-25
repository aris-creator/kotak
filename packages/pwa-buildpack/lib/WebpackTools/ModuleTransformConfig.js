const path = require('path');
const buildpackName = require('../../package.json').name;

/**
 * @typedef {function(TransformRequest)} addTransform
 * Add a request to transform a file in the build. This function is passed as
 * the first argument to an interceptor of the `transformModules` target.
 *
 * @param {TransformRequest} req - Instruction object for the requested
 * transform, including the transform to apply, the target source code, and
 * other options.
 *
 * @returns null
 */

/** @enum {string} */
const TransformType = {
    /**
     * Process the _source code_ of `fileToTransform` through the
     * `transformModule` as text. When applying a `source` TransformRequest,
     * Buildpack will use the `transformModule` as a [Webpack
     * loader](https://v4.webpack.js.org/api/loaders/), so it must implement
     * that interface. Any Webpack loader can be used as a `transformModule`
     * for `source` TransformRequests.
     *
     * `source` transforms are fast and can run on source code of any language,
     * but they aren't as precise and safe as AST-type transforms when modifying
     * code.
     */
    source: 'source',
    /**
     * Process the _abstract syntax tree_ of the ES module specified by
     * `fileToTransform` through the `transformModule` as a [Babel
     * AST](https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md).
     * When applying a `babel` TransformRequest, Buildpack will use the
     * `transformModule` as a [Babel
     * plugin](https://github.com/jamiebuilds/babel-handbook), so it must
     * implement that interface. Any Babel plugin can be used as a
     * `transformModule` for `babel` TransformRequests.
     *
     * `babel` transforms are powerful and versatile, giving the transformer
     * much more insight into the structure of the source code to modify.
     * However, they are slower than `source` transforms, and they can only
     * work on ES Modules.
     */
    babel: 'babel',
    /**
     * Replace the module(s) specified by `fileToTransform` with the the module
     * specified by `transformModule`. In this case, `transformModule` does not
     * run as a Node module which processes the source code. Instead, the
     * contents of `fileToTransform` are simply replaced in the build with the
     * contents of `transformModule`.
     *
     * This transform uses the
     * [alias](https://v4.webpack.js.org/configuration/resolve/#resolvealias)
     * functionality of Webpack configuration.
     *
     * When an interceptor adds a `replace` TransformRequest, it immediately
     * updates the resolver algorithm for future TransformRequests. If the next
     * TransformRequest cites the replaced module as its `fileToTransform`,
     * then that transform _will_ take effect on the replacement file.
     */
    replace: 'replace',
    /**
     * Declare that for the `fileToTransform` to work properly, a Webpack
     * plugin must be applied to the compilation. In this case,
     * `transformModule` runs as a Node module which must return an instance of
     * a Webpack plugin. The plugin will be applied to the entire compilation,
     * as Webpack plugins always are, but the function exported by
     * `transformModule` will receive a mapping of filenames to options objects
     * to use as configuration.
     */
    plugin: 'plugin'
};

/**
 * @typedef {Object} TransformRequest
 * Instruction for configuring Webpack to apply custom transformations to one
 * particular file. The [`configureWebpack()` function]{@link /pwa-buildpack/reference/configure-webpack/}
 * gathers TransformRequests from all interceptors of the `transformModules`
 * target and turns them into a configuration of Webpack [module
 * rules](https://v4.webpack.js.org/configuration/module/#modulerules).
 *
 * @prop {TransformType} type - The type of transformation to apply.
 * @prop {string} fileToTransform - Resolvable path to the file to be transformed itself, the same path that you'd use in `import` or `require()`.
 * @prop {string} transformModule - Absolute path to the Node module that will actually be doing the transforming. This path may be resolved using different
 * rules at different times, so it's best for this path to always be absolute.
 * @prop {object} [options] - Config values to send to the transform function.
 *   _Note: Options should be serializable to JSON as Webpack loader options
 *   and/or Babel plugin options.._
 */

/**
 * Configuration builder for module transforms. Accepts TransformRequests
 * and emits loader config objects for Buildpack's custom transform loaders.
 */
class ModuleTransformConfig {
    /**
     * @type TransformTypes
     * @readonly
     * @static
     * @memberof ModuleTransformConfig
     */
    static get types() {
        return TransformType;
    }
    /**
     * Construct a ModuleTransformConfig.
     * A ModuleTransformConfig is both an object with methods, and a function
     * that can be called (for compatibility with interceptors of
     * `transformModules` which expect an "addTransform"). Calling the instance
     * as a function is equivalent to calling `instance.add()`.
     *
     * This is for backwards compatibility with the original `transformModules`
     * target, which expects a function as its argument and not an instance of
     * TransformModulesConfig...yet it would be nice if it had one of the
     * latter for later fanciness.
     *
     * @static
     * @constructs
     * @param {MagentoResolver} resolver - Resolver to use when finding real paths of
     * modules requested.
     * @param {string} localProjectName - The name of the PWA project being built, taken from the package.json `name` field.
     */
    static create(resolver, localProjectName) {
        const instance = new ModuleTransformConfig(resolver, localProjectName);
        const addTransform = instance.add.bind(instance);
        const descriptors = Object.getOwnPropertyDescriptors(
            ModuleTransformConfig.prototype
        );
        // bind all methods
        for (const [member, descriptor] of Object.entries(descriptors)) {
            Object.defineProperty(
                addTransform,
                member,
                Object.entries(descriptor).reduce(
                    (newDescriptor, [prop, value]) => ({
                        ...newDescriptor,
                        [prop]:
                            typeof value === 'function'
                                ? value.bind(instance)
                                : value
                    }),
                    {}
                )
            );
        }
        return addTransform;
    }
    /** @hideconstructor */
    constructor(resolver, localProjectName) {
        this._resolver = resolver;
        this._localProjectName = localProjectName;
        this._reqs = [];
        this._currentRequestor = buildpackName;
    }
    /**
     * @borrows addTransform as add
     */
    add(request) {
        if (!TransformType.hasOwnProperty(request.type)) {
            throw this._traceableError(
                `Unknown request type '${
                    request.type
                }' in TransformRequest: ${JSON.stringify(request)}`
            );
        }
        switch (request.type) {
            case TransformType.replace:
                this._resolver.reconfigure(config => {
                    config.alias[request.fileToTransform] = this._resolveNode(
                        request,
                        'transformModule'
                    );
                });
                break;
            default:
                this._reqs.push(this._resolveOrdinary(request));
                break;
        }
    }
    /**
     * Resolve paths and emit as JSON.
     *
     * @returns {object} Configuration object
     */
    async groupByType() {
        const byType = Object.values(TransformType).reduce(
            (grouped, type) => ({
                ...grouped,
                [type]: {}
            }),
            {}
        );
        // Some reqs may still be outstanding!
        (await Promise.all(this._reqs)).map(req => {
            // Split them up by the transform module to use.
            // Several requests will share one transform instance.
            const { type, transformModule, fileToTransform } = req;
            const xformsForType = byType[type];
            if (!xformsForType) {
                throw new Error(`Unknown transform type "${type}"`);
            }
            const filesForXform =
                xformsForType[transformModule] ||
                (xformsForType[transformModule] = {});
            const requestsForFile =
                filesForXform[fileToTransform] ||
                (filesForXform[fileToTransform] = []);
            requestsForFile.push(req);
        });
        return JSON.parse(JSON.stringify(byType));
    }
    /**
     * Prevent modules from transforming files from other modules.
     * Preserves encapsulation and maintainability.
     * @private
     */
    _assertAllowedToTransform(requestPath) {
        if (
            !this._isLocal() && // Local project can modify anything
            !this._isBuiltin() && // Buildpack itself can modify anything
            (path.isAbsolute(requestPath) || // No paths outside requestor!
                !requestPath.startsWith(this._currentRequestor))
        ) {
            throw this._traceableError(
                `Invalid fileToTransform path "${requestPath}": Extensions are not allowed to provide fileToTransform paths outside their own codebase! This transform request from "${
                    this._currentRequestor
                }" must provide a path to one of its own modules, starting with "${
                    this._currentRequestor
                }/".`
            );
        }
    }
    _isBuiltin() {
        return this._currentRequestor === buildpackName;
    }
    _isLocal() {
        return this._currentRequestor === this._localProjectName;
    }
    /**
     * Set a new requestor, to enforce the encapsulation of module transform requests. Don't call this in interceptors, it's cheating.
     *
     * @protected
     * @param {string} requestor - New requestor which will henceforth be placing transform requests.
     * @memberof ModuleTransformConfig
     */
    _setRequestor(requestor) {
        this._currentRequestor = requestor;
    }
    _traceableError(msg) {
        const capturedError = new Error(`ModuleTransformConfig: ${msg}`);
        Error.captureStackTrace(capturedError, ModuleTransformConfig);
        return new Error(capturedError.stack);
    }
    async _resolveOrdinary(request) {
        return {
            ...request,
            fileToTransform: await this._resolveWebpack(
                request,
                'fileToTransform'
            ),
            transformModule: this._resolveNode(request, 'transformModule')
        };
    }
    async _resolveWebpack(request, prop) {
        const requestPath = request[prop];
        this._assertAllowedToTransform(requestPath);
        // make module-absolute if relative
        const toResolve = requestPath.startsWith('.')
            ? path.join(this._currentRequestor, requestPath)
            : requestPath;
        // Capturing in the sync phase so that a resolve failure is traceable.
        const resolveError = this._traceableError(
            `could not resolve ${prop} "${toResolve}" from requestor ${
                this._currentRequestor
            } using Webpack rules.`
        );
        try {
            const resolved = await this._resolver.resolve(toResolve);
            return resolved;
        } catch (e) {
            resolveError.originalErrors = [e];
            throw resolveError;
        }
    }
    _resolveNode(request, prop) {
        let nodeModule;
        try {
            nodeModule = require.resolve(request[prop]);
        } catch (e) {
            try {
                nodeModule = require.resolve(
                    path.join(this._currentRequestor, request[prop])
                );
            } catch (innerE) {
                const resolveError = this._traceableError(
                    `could not resolve ${prop} ${
                        request[prop]
                    } from requestor ${
                        this._currentRequestor
                    } using Node rules.`
                );
                resolveError.originalErrors = [e, innerE];
                throw resolveError;
            }
        }
        return nodeModule;
    }
}

module.exports = ModuleTransformConfig;
