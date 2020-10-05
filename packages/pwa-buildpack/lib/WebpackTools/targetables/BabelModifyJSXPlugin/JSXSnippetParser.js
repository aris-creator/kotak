const parseMethodOpts = {
    plugins: ['syntax-jsx']
};
const elementPatterns = [
    /^<>.+<\/>$/, // React fragments: <>{...}</>
    /<.+\/\s*>$/, // Self-closing tags: <foo{...}/>
    /^<([^\s>]+).+<\/\1>$/ // Tags that open and close: <foo{...}>{...}</foo>
];
const openingElementPattern = /^<.+>$/;
class JSXSnippetParser {
    get config() {
        return {
            ...parseMethodOpts,
            filename: this._filename
        };
    }
    constructor(babelInstance, filename) {
        this._babel = babelInstance;
        this._filename = filename;
    }
    normalizeElement(jsxSnippet) {
        const formatted = jsxSnippet.trim();
        if (elementPatterns.some(pattern => pattern.test(formatted))) {
            return formatted;
        }
        // turn an opening element, like `<Foo>`, into a self-closing one
        if (openingElementPattern.test(formatted)) {
            return formatted.slice(0, formatted.length - 1) + ' />';
        }

        // or just make it a self-closing JSX element already!
        return `<${formatted} />`;
    }
    parseAttributes(attributesEntries) {
        const attrSources = [];
        // iteration instead of Array.map because we may receive any iterable
        for (const [name, value] of attributesEntries) {
            // boolean true just sets the attribute as present
            attrSources.push(value === true ? name : `${name}=${value}`);
        }
        return this.parseElement(`<X ${attrSources.join(' ')} />`)
            .openingElement.attributes;
    }
    parseElement(jsxSnippet) {
        try {
            const ast = this._babel.parseSync(jsxSnippet, this.config);
            const { body } = ast.program;
            if (!(body && body[0])) {
                throw new Error('No code found in program body');
            }
            const jsxNode = ast.program.body[0].expression;
            if (!this._babel.types.isJSXFragment(jsxNode)) {
                this._babel.types.assertJSXElement(jsxNode);
            }
            return jsxNode;
        } catch (e) {
            throw new Error(
                `Provided JSX fragment does not parse as a valid JSX Element: ${jsxSnippet}: ${e.toString()}`
            );
        }
    }
}

module.exports = JSXSnippetParser;
