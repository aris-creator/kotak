const ModuleTransformConfig = require('../ModuleTransformConfig');
const makeFakeResolver = () => {
    const config = { alias: {} };
    return {
        config,
        resolve: jest.fn().mockResolvedValue('/path/to/fileToTransform.js'),
        reconfigure: jest.fn().mockImplementation(callback => callback(config))
    };
};

test('has static create methods and types enum', () => {
    expect(typeof ModuleTransformConfig.create).toBe('function');
    expect(ModuleTransformConfig.types).toMatchSnapshot();
});

test('creates a ModuleTransformConfig that is also callable', async () => {
    const resolver = makeFakeResolver();
    const transformConfig = ModuleTransformConfig.create(
        resolver,
        'my-local-project'
    );
    expect(typeof transformConfig).toBe('function');
    expect(typeof transformConfig.add).toBe('function');
    expect(typeof transformConfig.addModule).toBe('function');
    expect(typeof transformConfig.addModules).toBe('function');
    expect(typeof transformConfig.collect).toBe('function');
    transformConfig({
        type: 'plugin',
        fileToTransform: 'fileToTransform.js',
        transformModule: 'util', // test fails unless require can resolve this
        options: 'none'
    });
    transformConfig.add({
        type: 'plugin',
        fileToTransform: 'anotherFileToTransform.js',
        transformModule: 'util', // test fails unless require can resolve this
        options: 'none'
    });
    await transformConfig.collect();
    expect(resolver.resolve).toHaveBeenCalledTimes(2);
    expect(resolver.resolve).toHaveBeenNthCalledWith(1, 'fileToTransform.js');
    expect(resolver.resolve).toHaveBeenNthCalledWith(
        2,
        'anotherFileToTransform.js'
    );
});

test('throws on unrecognized transform types', () => {
    expect(() =>
        ModuleTransformConfig.create(
            makeFakeResolver(),
            'my-local-project'
        ).add({})
    ).toThrow('Unknown request type');
    expect(() =>
        ModuleTransformConfig.create(
            makeFakeResolver(),
            'my-local-project'
        ).add({ type: 'weird' })
    ).toThrow('Unknown request type');
});

test('reconfigures resolver when a "replace" request comes in', async () => {
    const resolver = makeFakeResolver();
    const transformConfig = ModuleTransformConfig.create(
        resolver,
        'my-local-project'
    );
    transformConfig._setRequestor('jest');
    transformConfig.add({
        type: 'replace',
        fileToTransform: './my/file/to/transform',
        transformModule: 'build/jest'
    });
    await transformConfig.collect();
    expect(resolver.reconfigure).toHaveBeenCalled();
    expect(resolver.config.alias).toMatchObject({
        '/path/to/fileToTransform.js': require.resolve('jest/build/jest')
    });
});

test('disallows third-party requestors to add transforms for paths that do not begin at package root', () => {
    const transformConfig = ModuleTransformConfig.create(
        makeFakeResolver(),
        'my-local-project'
    );
    transformConfig._setRequestor('eve');
    expect(() =>
        transformConfig({
            type: 'source',
            fileToTransform: './alice',
            transformModule: 'bob'
        })
    ).toThrowError(/Invalid fileToTransform path.*starting with "eve"/im);
});

test('allows the local project and buildpack to transform anything', async () => {
    const transformConfig = ModuleTransformConfig.create(
        makeFakeResolver(),
        'my-local-project'
    );
    transformConfig._setRequestor('my-local-project');
    expect(() =>
        transformConfig({
            type: 'source',
            fileToTransform: './alice',
            transformModule: 'path'
        })
    ).not.toThrowError();
    transformConfig._setRequestor('@magento/pwa-buildpack');
    expect(() =>
        transformConfig({
            type: 'source',
            fileToTransform: './alice',
            transformModule: 'path'
        })
    ).not.toThrowError();
});

test('webpack resolve failure throws informative error at collect time', async () => {
    const resolver = makeFakeResolver();
    resolver.resolve.mockRejectedValueOnce(new Error('ENOENT'));
    const transformConfig = ModuleTransformConfig.create(
        resolver,
        'my-local-project'
    );
    transformConfig.add({
        type: 'babel',
        fileToTransform: './file-to-transform',
        transformModule: 'path'
    });
    await expect(transformConfig.collect()).rejects.toThrow(
        'could not resolve fileToTransform'
    );
});

test('node resolve failure throws informative error', () => {
    const transformConfig = ModuleTransformConfig.create(
        makeFakeResolver(),
        'my-local-project'
    );
    transformConfig._setRequestor('jest');
    expect(() =>
        transformConfig.add({
            type: 'source',
            fileToTransform: 'jest/fake-file',
            transformModule: 'nothing'
        })
    ).toThrow(/could not resolve.*using Node rules/im);
});
