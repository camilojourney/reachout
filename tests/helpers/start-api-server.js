/**
 * Spawn api-server.js for integration tests and fail fast if it never becomes ready.
 */

'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

/**
 * Start the API server as a child process.
 * Resolves with the child once stdout reports that the server is running.
 * Rejects if the process exits, fails to spawn, or does not become ready in time.
 *
 * @param {object} options
 * @param {number|string} options.port
 * @param {string} options.dbPath
 * @param {number} [options.timeoutMs=10000]
 * @param {string} [options.command='node']
 * @param {string[]} [options.args]
 * @param {string} [options.cwd]
 * @returns {Promise<import('node:child_process').ChildProcess>}
 */
function startApiServer({
    port,
    dbPath,
    timeoutMs = 10000,
    command = 'node',
    args = ['api-server.js'],
    cwd = ROOT
} = {}) {
    const child = spawn(command, args, {
        cwd,
        env: { ...process.env, PORT: String(port), DB_PATH: dbPath }
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            fail(new Error(
                `API server failed to start within ${timeoutMs}ms.\nstdout:\n${stdout}\nstderr:\n${stderr}`
            ));
        }, timeoutMs);

        function succeed() {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            resolve(child);
        }

        function fail(err) {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            child.kill();
            reject(err);
        }

        child.stdout.on('data', (data) => {
            stdout += data.toString();
            if (stdout.includes('running')) {
                succeed();
            }
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
            if (!settled) {
                return;
            }
            process.stderr.write(`Server error: ${data}`);
        });

        child.on('error', (err) => {
            fail(err);
        });

        child.on('exit', (code, signal) => {
            if (settled) {
                return;
            }
            fail(new Error(
                `API server exited before becoming ready (code ${code}, signal ${signal}).\nstdout:\n${stdout}\nstderr:\n${stderr}`
            ));
        });
    });
}

module.exports = { startApiServer };
