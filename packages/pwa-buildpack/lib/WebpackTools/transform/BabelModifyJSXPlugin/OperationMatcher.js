class OperationMatcher {
    constructor(request, parser) {
        this.request = request;
        this.method = request.options.method;
        this.params = request.options.params;

        this._parser = parser;
        this.matcher = this._parser.normalizeElement(request.options.element);
        const matcherAST = (this._matcher = this._parser.parseElement(
            this.matcher
        ));
        this._matcherName = this._getSource(matcherAST.openingElement.name);
        this._attributeMap = new Map();
        for (const { name, value } of matcherAST.openingElement.attributes) {
            this._attributeMap.set(
                this._getSource(name),
                this._getSource(value)
            );
        }
    }
    _getSource(node) {
        return this.matcher.slice(node.start, node.end);
    }
    matches(path) {
        return (
            this.shouldEnterElement(path) &&
            this.matchesAttributes(path.get('openingElement.attributes'))
        );
    }
    shouldEnterElement(path) {
        const tag = path.get('openingElement');
        const elementName = tag.get('name').toString();
        if (elementName !== this._matcherName) {
            return false;
        }

        const numAttributesPresent = tag.node.attributes.length;

        const numAttributesRequired = this._attributeMap.size;

        if (numAttributesPresent < numAttributesRequired) {
            // even if one matches, it won't be enough!
            return false;
        }
        return true;
    }
    matchesAttributes(attributePaths) {
        const matchMap = new Map(this._attributeMap);
        for (const attr of attributePaths) {
            const attributeName = attr.get('name').toString();
            if (!matchMap.has(attributeName)) {
                // no requirement for this attribute, ignore
                continue;
            }
            const expected = matchMap.get(attributeName);
            const actual = attr.get('value').toString();
            if (expected === actual) {
                matchMap.delete(attributeName);
                continue;
            } else {
                return false; // explicitly a rejection
            }
        }
        const allRequiredAttributesMatch = matchMap.size === 0;
        return allRequiredAttributesMatch;
    }
}

module.exports = OperationMatcher;
