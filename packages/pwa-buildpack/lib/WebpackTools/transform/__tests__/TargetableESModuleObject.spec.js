const TargetableESModuleObject = require('../TargetableESModuleObject');
const ESMCollectionLoader = require('../../loaders/export-esm-collection-loader');
const testWebpackLoader = require('../../../TestHelpers/testWebpackLoader');

test('builds a module which exports an array of its imports', async () => {
    const moduleObject = new TargetableESModuleObject(
        './module-object.js',
        () => {}
    );
    moduleObject.set('import first from "first"', '{ second } from "second";');
    moduleObject.set('{ third as second } from "third"');
    moduleObject.set('{ fourth as third } from "fourth"');
    moduleObject.set('* as first from "elsewhere"');
    moduleObject.set('{ second as silver } from "second"');
    const transform = moduleObject.flush();
    expect(transform).toHaveLength(1);
    expect(transform[0]).toMatchSnapshot();
    const { output } = await testWebpackLoader.runLoader(
        ESMCollectionLoader,
        '/** this-un exports an object with mappings */\nexport default {};',
        {
            query: [transform[0].options]
        }
    );
    expect(output).toMatchSnapshot();
});
