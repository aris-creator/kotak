// We want to let developers know that whenever they add to or modify the file
// structure in the `lib/talons` and `lib/hooks` directories, they've changed
// the APIs for the talons and/or hooks targets. We'll do that with a special
// serializer with readable output.
const path = require('path');
const HookInterceptorSet = require('./HookInterceptorSet');
const TargetableHook = require('./TargetableHook');

const test = val =>
    val instanceof HookInterceptorSet || val instanceof TargetableHook;

const serializeTargetableHook = (
    val,
    config,
    indentation,
    depth,
    refs,
    printer
) =>
    `TargetableHook${printer(
        { file: val._talonModule.file },
        config,
        indentation,
        depth,
        refs
    )}`;

const serializeInterceptorSet = (
    val,
    config,
    indentation,
    depth,
    refs,
    printer
) => {
    const sanitized = {
        // display but relativize base directory
        'base dir': path.relative(process.cwd(), val._hookDir)
    };
    // omit private properties
    for (const [key, value] of Object.entries(val)) {
        if (!key.startsWith('_') && typeof value === 'object') {
            sanitized[key] = value;
        }
    }
    return `HookInterceptorSet${printer(
        sanitized,
        config,
        indentation,
        depth,
        refs
    )}`;
};

module.exports = {
    serialize(val, ...rest) {
        return val instanceof HookInterceptorSet
            ? serializeInterceptorSet(val, ...rest)
            : serializeTargetableHook(val, ...rest);
    },
    test
};
