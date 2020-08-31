const JestEnvJSDom = require('jest-environment-jsdom');
// Unhandled-exception-logging jsdom environment.
// The `./jest-decorate-env` file returns a function that extends any Jest
// environment class with unhandled rejection handling.
const decorate = require('./jest-decorate-env');

// Add some properties that are still unimplemented in JSDOM,
// but should not throw a NotImplementedException.
class JestEnvJsDomPatched extends JestEnvJSDom {
    async setup() {
        Object.assign(this.global, {
            scroll() {},
            scrollBy() {},
            scrollTo() {}
        });
    }
}

module.exports = decorate(JestEnvJsDomPatched);
