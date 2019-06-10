module.exports = [
    {
        target: 'peregrine/lib/Price/Price.js'
    },
    {
        target: 'peregrine/lib/List/list.js',
        overrides: {
            items: {
                required: true
            },
            render: {
                required: true
            }
        }
    }
];
