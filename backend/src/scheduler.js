import cron from 'node-cron';
import { exec } from 'node:child_process';

function runPipeline() {
    console.log('Running scheduled FIRMS fetch...');
    exec('node scripts/fetchFirms.js', (err, stdout, stderr) => {
        if (err) { console.error(stderr); return; }
        console.log(stdout);
        exec('node scripts/linkFacilities.js', (err2, stdout2, stderr2) => {
            if (err2) console.error(stderr2);
            else console.log(stdout2);
        });
    });
}

cron.schedule('0 */6 * * *', runPipeline);
console.log('Scheduler active: FIRMS fetch + facility link every 6h');