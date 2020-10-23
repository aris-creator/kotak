/**
 * @module VeniaUI/Targets
 */
const { Targetables } = require('@magento/pwa-buildpack');
const RichContentRendererList = require('./RichContentRendererList');
const makeRoutesTarget = require('./makeRoutesTarget');

class PaymentMethodList {
    constructor(venia) {
        const registry = this;
        this._methods = venia.esModuleObject({
            module: '@magento/venia-ui/lib/foo.js',
            publish(targets) {
                targets.foo.call(registry);
            }
        });
    }

    add({ componentName, importPath }) {
        this._methods.add(`import ${componentName} from '${importPath}'`);
    }
}

module.exports = veniaTargets => {
    const venia = Targetables.using(veniaTargets);

    venia.setSpecialFeatures(
        'cssModules',
        'esModules',
        'graphqlQueries',
        'rootComponents',
        'upward',
        'i18n'
    );

    makeRoutesTarget(venia);

    const renderers = new RichContentRendererList(venia);

    renderers.add({
        componentName: 'PlainHtmlRenderer',
        importPath: './plainHtmlRenderer'
    });

    const methods = new PaymentMethodList(venia);

    methods.add({
        componentName: 'FooComponent',
        importPath: '@magento/venia-ui/lib/FooComponent.js'
    });
};
