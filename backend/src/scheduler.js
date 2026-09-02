import cron from 'node-cron';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

function runPipeline() {
    console.log('Running scheduled FIRMS fetch...');
    exec(`node ${path.join(SCRIPTS_DIR, 'fetchFirms.js')}`, (err, stdout, stderr) => {
        if (err) { console.error('fetchFirms error:', stderr); return; }
        console.log(stdout);
        exec(`node ${path.join(SCRIPTS_DIR, 'linkFacilities.js')}`, (err2, stdout2, stderr2) => {
            if (err2) console.error('linkFacilities error:', stderr2);
            else console.log(stdout2);
        });
    });
}

cron.schedule('0 */6 * * *', runPipeline);
console.log('Scheduler active: FIRMS fetch + facility link every 6h');