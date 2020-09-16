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
        return parseMethodOpts;
    }
    constructor(babelInstance) {
        this._babel = babelInstance;
    }
    normalizeElement(jsxSnippet) {
        const formatted = jsxSnippet.trim();
        if (elementPatterns.some(pattern => pattern.test(formatted))) {
            return formatted;
        }
        // turn an opening element, like `<Foo>`, into a self-closing one
        if (openingElementPattern.test(formatted)) {
            return formatted.slice(0, formatted.length - 2) + '/>';
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
        const ast = this._babel.parseSync(jsxSnippet, this.config);
        const jsxNode = ast.program.body[0].expression;
        if (!this._babel.types.isJSXFragment(jsxNode)) {
            try {
                this._babel.types.assertJSXElement(jsxNode);
            } catch (e) {
                throw new Error(
                    `Provided JSX fragment does not parse as a valid JSX Element: ${jsxSnippet}: ${e.toString()}`
                );
            }
        }
        return jsxNode;
    }
}

module.exports = JSXSnippetParser;
