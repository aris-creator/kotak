const TargetableESModuleArray = require('@magento/pwa-buildpack/lib/WebpackTools/transform/TargetableESModuleArray');

const renderersListPath =
    '@magento/venia-ui/lib/components/RichContent/richContentRenderers.js';

/**
 * A registry of rich content renderering strategies used by the Venia
 * RichContent component. An instance of this class is made available when you
 * use VeniaUI's `richContentRenderers` target.
 */
class RichContentRendererList {
    /** @hideconstructor */
    constructor(transformModulesTarget) {
        this._list = new TargetableESModuleArray(
            renderersListPath,
            transformModulesTarget
        );
        this.transformModulesTarget = transformModulesTarget;
    }
    /**
     * Add a rendering strategy to the RichContent component.
     *
     * @param {Object} strategy - Describes the rich content renderer to include
     * @param {string} strategy.importPath - Import path to the RichContentRenderer module. Should be package-absolute.
     * @param {string} strategy.componentName - Name that will be given to the imported renderer in generated code. This is used for debugging purposes.
     */
    add(renderer) {
        if (
            typeof renderer.componentName !== 'string' ||
            !renderer.componentName ||
            typeof renderer.importPath !== 'string' ||
            !renderer.importPath
        ) {
            throw new Error(
                `richContentRenderers target: Argument is not a valid rich content renderer strategy. A valid strategy must have a JSX element name as "componentName" and a resolvable path to the renderer module as "importPath".`
            );
        }
        this._list.prepend(
            `import * as ${renderer.componentName} from '${
                renderer.importPath
            }';`
        );
    }
    useTarget(target) {
        this.transformModulesTarget.tapPromise(async transformConfig => {
            await target.promise(this);
            transformConfig.addModule(this._list);
            this._destroy();
        });
    }
    _destroy() {
        this.add = () => {
            throw new Error(
                'Cannot add renderer: builtins.transformModules has already been called and its interceptors have already run.'
            );
        };
    }
}

module.exports = RichContentRendererList;
