module.exports = api => {
    if (process.env.CODEBUILD_BUILD_ID) {
        api.cache.never();
    } else {
        api.cache.using(() => process.env.NODE_ENV);
    }
    // const env = api.env() || 'development';
    const config = { presets: ['@magento/peregrine'] };
    // Ignore everything with underscores except stories in dev mode
    if (api.env() === 'development') {
        config.exclude = [/\/__(tests?|mocks|fixtures|helpers|dist)__\//];
    }
    return config;
};
