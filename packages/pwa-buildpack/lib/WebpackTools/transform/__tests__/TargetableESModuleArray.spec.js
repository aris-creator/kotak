const TargetableESModuleArray = require('../TargetableESModuleArray');
const ESMCollectionLoader = require('../../loaders/export-esm-collection-loader');
const testWebpackLoader = require('../../../TestHelpers/testWebpackLoader');

test('builds a module which exports an array of its imports', async () => {
    const moduleArray = new TargetableESModuleArray(
        './module-array.js',
        () => {}
    );
    moduleArray.add('import first from "first"', '{ second } from "second";');
    moduleArray.append('{ third as second } from "third"');
    moduleArray.push('{ fourth as third } from "fourth"');
    moduleArray.prepend('* as first from "elsewhere"');
    moduleArray.unshift('{ second as silver } from "second"');
    const transform = moduleArray.flush();
    expect(transform).toHaveLength(1);
    expect(transform[0]).toMatchSnapshot();
    const { output } = await testWebpackLoader.runLoader(
        ESMCollectionLoader,
        'export default [];',
        {
            query: [transform[0].options]
        }
    );
    expect(output).toMatchSnapshot();
});
