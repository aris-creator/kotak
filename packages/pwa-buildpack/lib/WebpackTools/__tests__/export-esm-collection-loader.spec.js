const ESMCollectionLoader = require('../loaders/export-esm-collection-loader');
const { runLoader } = require('../../TestHelpers/testWebpackLoader');

test('exports arrays of modules', async () => {
    expect(
        (await runLoader(ESMCollectionLoader, 'export default []', {
            query: [
                {
                    items: [
                        ['import indexZero from "index-zero"', 'indexZero'],
                        ['import { indexOne } from "./index-one"', 'indexOne']
                    ],
                    warnings: ['A warning.']
                }
            ]
        })).output
    ).toMatchSnapshot();
});

test('exports arrays of modules', async () => {
    expect(
        (await runLoader(ESMCollectionLoader, 'export default []', {
            query: [
                {
                    items: [
                        ['import indexZero from "index-zero"', 'indexZero'],
                        ['import { indexOne } from "./index-one"', 'indexOne']
                    ],
                    warnings: ['A warning.']
                }
            ]
        })).output
    ).toMatchSnapshot();
});

test('fails informatively if template module does not export the right kind of empty collection', async () => {
    const { context, output } = await runLoader(
        ESMCollectionLoader,
        'export default {}',
        {
            query: [
                {
                    items: [
                        ['import indexZero from "index-zero"', 'indexZero'],
                        ['import { indexOne } from "./index-one"', 'indexOne']
                    ],
                    warnings: ['A warning.']
                }
            ]
        }
    );
    expect(context.getCalls('emitError')).toMatchSnapshot();
    expect(output).toBe('export default {}');
});

test('warns if nothing was added', async () => {
    const { context, output } = await runLoader(
        ESMCollectionLoader,
        'export default []',
        {
            query: [
                {
                    items: [],
                    warnings: []
                }
            ]
        }
    );
    expect(context.getCalls('emitWarning')).toMatchSnapshot();
    expect(output).toBe('export default []');
});
