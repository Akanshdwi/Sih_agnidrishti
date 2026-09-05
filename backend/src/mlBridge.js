import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(backendDir, '..');
const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';

export function predictWithModel(record) {
  return new Promise((resolvePrediction, rejectPrediction) => {
    const python = spawn(pythonCommand, ['-m', 'backend.app.ml.predict_cli'], {
      cwd: projectRoot,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => { stdout += chunk; });
    python.stderr.on('data', (chunk) => { stderr += chunk; });
    python.on('error', rejectPrediction);
    python.on('close', (code) => {
      if (code !== 0) {
        rejectPrediction(new Error(stderr.trim() || `Python predictor exited with code ${code}`));
        return;
      }
      try {
        resolvePrediction(JSON.parse(stdout));
      } catch {
        rejectPrediction(new Error('Python predictor returned invalid JSON'));
      }
    });

    python.stdin.end(JSON.stringify(record));
  });
}