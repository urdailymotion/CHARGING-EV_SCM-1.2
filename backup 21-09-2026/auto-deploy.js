/**
 * PPA Charging EV - Auto Deploy Script
 * Otomatis melakukan push dan deployment versi terbaru ke Google Apps Script.
 * 
 * Penggunaan:
 *   node auto-deploy.js          -> Sekali deploy
 *   node auto-deploy.js --watch  -> Otomatis deploy setiap kali Code.gs atau Index.html disimpan
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_ID = '1tUo8EHKFnFhKD25J-0HKSHAbw5dfudvByQ-brT9bG86EMEqJeLyffaTH';
const DEPLOYMENT_ID = 'AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q';
const WEB_APP_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

function getTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function deployNow() {
  console.log('\n' + '='.repeat(65));
  console.log(`🚀 [${getTimestamp()}] Memulai Auto Deploy ke Google Apps Script...`);
  console.log('='.repeat(65));

  try {
    // 1. Clasp Push
    console.log('📤 Mengunggah berkas (clasp push -f)...');
    const pushOutput = execSync('clasp push -f', { encoding: 'utf8' });
    console.log(pushOutput.trim());

    // 2. Clasp Deploy
    const desc = `Auto Deploy ${getTimestamp()}`;
    console.log(`🌐 Melakukan deployment versi (${desc})...`);
    const deployCmd = `clasp deploy -i ${DEPLOYMENT_ID} -d "${desc}"`;
    const deployOutput = execSync(deployCmd, { encoding: 'utf8' });
    console.log(deployOutput.trim());

    console.log('\n' + '⭐'.repeat(30));
    console.log('✅ DEPLOYMENT BERHASIL 100%!');
    console.log(`🔗 Web App URL: ${WEB_APP_URL}`);
    console.log('⭐'.repeat(30) + '\n');
    return true;
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat deploy:', err.message);
    return false;
  }
}

// Mode Watch atau Sekali Deploy
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

if (isWatchMode) {
  console.log('👀 MODE WATCH AKTIF: Memantau perubahan file Code.gs & Index.html...');
  console.log('💡 Setiap kali Anda menyimpan file (Ctrl + S), skrip akan otomatis deploy!');
  deployNow();

  let debounceTimer = null;
  const filesToWatch = ['Code.gs', 'index.html', 'Index.html', 'intelligence.html', 'appsscript.json'];

  filesToWatch.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      fs.watch(fullPath, (eventType) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`\n🔔 Perubahan terdeteksi pada: ${file}`);
          deployNow();
        }, 1200);
      });
    }
  });
} else {
  deployNow();
}
