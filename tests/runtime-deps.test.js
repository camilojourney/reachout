/**
 * Regression: clean install must provide the modules api-server.js requires.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('runtime dependencies', () => {
    it('resolves express so api-server.js can start', () => {
        assert.doesNotThrow(() => require.resolve('express'));
    });

    it('loads better-sqlite3 including its native binding', () => {
        assert.doesNotThrow(() => require('better-sqlite3'));
    });

    it('loads lib/research without OPENAI_API_KEY so the API server can start', () => {
        const previous = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        const modulePath = require.resolve('../lib/research');
        delete require.cache[modulePath];
        try {
            assert.doesNotThrow(() => require(modulePath));
        } finally {
            delete require.cache[modulePath];
            if (previous === undefined) {
                delete process.env.OPENAI_API_KEY;
            } else {
                process.env.OPENAI_API_KEY = previous;
            }
        }
    });
});
