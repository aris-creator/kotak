const util = require('util');
const acorn = require('acorn');
const figures = require('figures');

class SingleImportError extends Error {
    constructor(statement, details) {
        const msg = `Bad import statement: ${util.inspect(
            statement
        )}. SingleImportStatement must be an ES Module static import statement of the form specified at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import, which imports exactly one binding.`;
        super(details ? `${msg} ${details}` : msg);
        Error.captureStackTrace(this, SingleImportStatement);
    }
}

class SingleImportStatement {
    constructor(statement) {
        this.originalStatement = statement;
        this.statement = this._normalizeStatement(statement);
        this.node = this._parse();
        this.binding = this._getBinding();
        this.source = this._getSource();
        this.imported = this._getImported(); // must come after this._getBinding
    }
    changeBinding(newBinding) {
        const { imported, local } = this.node.specifiers[0];
        let loc;
        let binding;

        const localLoc = local.loc || local;
        const importedLoc = (imported && imported.loc) || imported;

        const mustAlias = imported && importedLoc.start === localLoc.start;
        if (mustAlias) {
            // looks like we're exporting the imported identifier as local, so
            // amend it to alias to the new binding
            loc = {
                start: importedLoc.end,
                end: importedLoc.end
            };
            binding = ` as ${newBinding}`;
        } else {
            // otherwise, the local identifier can be directly replaced, since
            // it's either a default, namespace, or aliased import
            loc = localLoc;
            binding = newBinding;
        }

        const start = this.statement.slice(0, loc.start);
        const end = this.statement.slice(loc.end);
        return new SingleImportStatement(start + binding + end);
    }
    _normalizeStatement(statementArg) {
        let statement = statementArg; // it feels bad to modify arguments

        if (typeof statement !== 'string') {
            throw new SingleImportError(statement);
        }

        // semicolons because line breaks are no guarantee in a bundler
        if (!statement.endsWith(';')) {
            statement += ';';
        }

        // affordance to add "import" so that you can say
        // `new ImportStatement('* from "x"')` which is less redundant than
        // `new ImportStatement('import * from "x"')`
        if (!statement.startsWith('import')) {
            statement = `import ${statement}`;
        }

        return statement;
    }
    _parse() {
        let node;
        try {
            node = acorn.parse(this.statement, {
                ecmaVersion: 2020,
                sourceType: 'module'
            }).body[0];
        } catch (e) {
            let msg = e.message;
            let indicator = '\n\t';
            for (let index = 0; index < e.pos; index++) {
                indicator += figures.line;
            }
            msg += `${indicator}v\n\t${this.statement}`;
            throw new SingleImportError(this.originalStatement, msg);
        }
        if (node.type !== 'ImportDeclaration') {
            throw new SingleImportError(this.originalStatement);
        }
        return node;
    }
    _getBinding() {
        const bindings = this.node.specifiers.map(({ local }) => local.name);
        if (bindings.length !== 1) {
            throw new SingleImportError(
                this.originalStatement,
                `Import ${bindings.length} bindings: ${bindings.join(
                    ', '
                )}. Imports for these targets must have exactly one binding, which will be used in generated code.`
            );
        }
        return bindings[0];
    }
    _getSource() {
        return this.node.source.value;
    }
    _getImported() {
        const { type, imported } = this.node.specifiers[0];
        switch (type) {
            case 'ImportNamespaceSpecifier':
                return '*';
            case 'ImportDefaultSpecifier':
                return 'default';
            default:
                return imported.name;
        }
    }
}

module.exports = SingleImportStatement;
