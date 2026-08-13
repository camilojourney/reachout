/**
 * Regression: API server helper must fail fast instead of hanging on startup errors.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const { startApiServer } = require('./helpers/start-api-server');

describe('startApiServer', () => {
    it('rejects quickly when the child exits before becoming ready', async () => {
        const started = Date.now();
        await assert.rejects(
            () => startApiServer({
                port: 3999,
                dbPath: path.join(os.tmpdir(), 'reachout-start-helper.db'),
                timeoutMs: 5000,
                args: ['-e', "require('this-module-does-not-exist-xyz')"]
            }),
            (err) => {
                assert.match(err.message, /exited before becoming ready/);
                assert.match(err.message, /Cannot find module/);
                return true;
            }
        );
        assert.ok(Date.now() - started < 4000, 'startup failure should not hang the test suite');
    });

    it('rejects when the child stays alive but never becomes ready', async () => {
        const started = Date.now();
        await assert.rejects(
            () => startApiServer({
                port: 3998,
                dbPath: path.join(os.tmpdir(), 'reachout-start-helper.db'),
                timeoutMs: 400,
                args: ['-e', 'setInterval(() => {}, 1000)']
            }),
            /failed to start within/
        );
        assert.ok(Date.now() - started < 3000, 'readiness timeout should not hang the test suite');
    });
});
