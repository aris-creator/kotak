const { inspect } = require('util');
const JSXSnippetParser = require('./JSXSnippetParser');
const OperationMatcher = require('./OperationMatcher');

function BabelModifyJsxPlugin(babel) {
    const parser = new JSXSnippetParser(babel);

    const parseJSXParam = params =>
        parser.parseElement(parser.normalizeElement(params.jsx));

    const methods = {
        append(params, path) {
            path.pushContainer('children', [parseJSXParam(params)]);
        },
        insertAfter(params, path) {
            path.insertAfter(parseJSXParam(params));
        },
        insertBefore(params, path) {
            path.insertBefore(parseJSXParam(params));
        },
        prepend(params, path) {
            path.unshiftContainer('children', [parseJSXParam(params)]);
        },
        remove(_, path) {
            path.remove();
        },
        removeProps({ props }, path) {
            const toRemove = new Set(props);
            path.get('openingElement.attributes').forEach(
                propPath =>
                    toRemove.has(propPath.node.name.name) && propPath.remove()
            );
        },
        replace(params, path) {
            path.replaceWith(parseJSXParam(params));
        },
        setProps({ props }, path) {
            const remainingToSet = new Map(Object.entries(props));
            const openingElement = path.get('openingElement');
            openingElement.get('attributes').forEach(propPath => {
                const { name } = propPath.node.name;
                const valuePath = propPath.get('value');
                if (remainingToSet.has(name)) {
                    const newValue = remainingToSet.get(name);
                    if (newValue === true) {
                        valuePath.remove(); // true just means present
                    } else {
                        valuePath.replaceWithSourceString(newValue);
                    }
                    remainingToSet.delete(name);
                }
            });
            // create remaining props that weren't present and therefore deleted
            const newProps = parser.parseAttributes(remainingToSet.entries());
            if (newProps.length > 0) {
                openingElement.node.attributes.push(...newProps);
            }
        },
        surround(params, path) {
            const wrapperAST = parseJSXParam(params);
            wrapperAST.children = [path.node];
            path.replaceWith(wrapperAST);
        }
    };

    const runOperation = (operation, path) => {
        if (methods.hasOwnProperty(operation.method)) {
            return methods[operation.method](operation.params, path, operation);
        }
        throw new Error(
            `Invalid operation ${inspect(operation)}: operation name "${
                operation.method
            }" unrecognized`
        );
    };

    const serializeRequest = ({ options }) => {
        const args = [options.element];
        if (options.params) {
            args.push(options.params);
        }
        let argsFormatted = inspect(args, { depth: 4, compact: false });
        // remove brackets because they're args
        argsFormatted = argsFormatted.slice(1, argsFormatted.length - 2);
        return `file.${options.method}JSX(${argsFormatted})`;
    };

    return {
        visitor: {
            Program: {
                enter(_, state) {
                    const { opts, filename } = this;
                    const requests = opts.requestsByFile[filename];
                    const operations = requests.map(
                        request => new OperationMatcher(request, parser)
                    );

                    state.modifyingJSX = {
                        operations,
                        unmatchedOperations: new Set(operations),
                        operationsByVisitedNode: new WeakMap(),
                        warnings: []
                    };
                },
                exit(_, { modifyingJSX }) {
                    for (const operation of modifyingJSX.unmatchedOperations) {
                        modifyingJSX.warnings.push(
                            `JSX operation:\n\n${serializeRequest(
                                operation.request
                            )}\n\nnever found an element matching '${
                                operation.matcher
                            }'`
                        );
                    }
                    this.file.metadata.warnings = modifyingJSX.warnings;
                }
            },
            JSXOpeningElement: {
                exit(openingPath, { modifyingJSX }) {
                    const path = openingPath.parentPath;
                    const {
                        operations,
                        operationsByVisitedNode,
                        unmatchedOperations
                    } = modifyingJSX;
                    for (const operation of operations) {
                        const hasAlreadyRun =
                            operationsByVisitedNode.get(path.node) || new Set();
                        if (
                            operation.matches(path) &&
                            !hasAlreadyRun.has(operation)
                        ) {
                            unmatchedOperations.delete(operation);
                            runOperation(operation, path);
                            hasAlreadyRun.add(operation);
                            if (path.removed) {
                                break;
                            }
                            operationsByVisitedNode.set(
                                path.node,
                                hasAlreadyRun
                            );
                        }
                    }
                }
            }
        }
    };
}

module.exports = BabelModifyJsxPlugin;
