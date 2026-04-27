

const { upsertLatestCurrency } = require('../controllers/frontend/configData/currency.controller');

const cron = require('node-cron');
const fs = require("fs");
const path = require('path');
const { exec } = require('child_process');

// every menute
//cron.schedule('* * * * *', () => {
// Schedule the cron job to run every day at 12 AM
//cron.schedule('0 0 * * *', () => {
cron.schedule('0 0 * * *', () => {

  try {

    console.log("Cron started");
    //upsertLatestCurrency();
  }
  catch (err) {
    console.log(err);
  }

});

 const DAYS_TO_KEEP = 7;
//const BACKUP_PATH = path.join(__dirname, 'db_backups');
const BACKUP_PATH = path.join(process.cwd(), 'db_backups');
const MONGO_URI = require('../config/mongoUri');

if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
} 
 //cron.schedule('0 4 * * 0', () => { // For weekly
  cron.schedule('0 0 * * *', () => {
  
  try {

    console.log('⏰ Weekly backup and cleanup starting...');

    // Step 1: Take backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = `${BACKUP_PATH}/backup-${timestamp}`;

    const command = `mongodump --uri="${MONGO_URI}" --out="${outputDir}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return console.error('❌ Backup failed:', error.message);
      }
      console.log('✅ Backup completed:', outputDir);

      // Step 2: Delete old backups
      fs.readdir(BACKUP_PATH, (err, files) => {
        if (err) return console.error('❌ Error reading backup folder:', err);

        files.forEach(file => {
          const fullPath = path.join(BACKUP_PATH, file);
          fs.stat(fullPath, (err, stats) => {
            if (err) return console.error(`❌ Failed to read stats of ${file}:`, err);

            const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageInDays > DAYS_TO_KEEP) {
              fs.rm(fullPath, { recursive: true, force: true }, err => {
                if (err) console.error(`❌ Failed to delete ${file}:`, err);
                else console.log(`🗑️ Deleted old backup: ${file}`);
              });
            }
          });
        });
      });
    });

  }
  catch (err) {
    console.error("❌ Weekly backup cron error:", err.message);
  }

}); 


