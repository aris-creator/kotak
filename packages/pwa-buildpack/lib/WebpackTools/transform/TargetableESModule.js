const TargetableModule = require('./TargetableModule');

/**
 * Presents a convenient API for consumers to add common transforms to ES
 * Modules in a semantic way.
 */
class TargetableESModule extends TargetableModule {
    /**
     * Pass exports of this module through a [wrapper module](#wrapper_modules).
     *
     * @param {string} [exportName] Name of export to wrap. If not provided, will wrap the default export.
     * @param {string} wrapperModule Import path to the wrapper module. Should be package-absolute.
     */
    wrapWithFile(name, wrapper) {
        return this._wrapWithFile(this._normalizeWrapParameters(name, wrapper));
    }

    /** @ignore */
    _normalizeWrapParameters(exportNameOrWrapperModule, wrapperModule) {
        return wrapperModule
            ? {
                  exportName: exportNameOrWrapperModule,
                  wrapperModule,
                  defaultExport: false
              }
            : {
                  wrapperModule: exportNameOrWrapperModule,
                  defaultExport: true
              };
    }

    /** @ignore */
    _wrapWithFile(opts) {
        return this.addTransform(
            'source',
            '@magento/pwa-buildpack/lib/WebpackTools/loaders/wrap-esm-loader',
            opts
        );
    }
}

module.exports = TargetableESModule;
