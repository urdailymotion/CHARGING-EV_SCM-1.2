const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://script.google.com/macros/s/AKfycbys18CO-bbRbaCL0V8VIrhpnHpZqQ1Mw9yY_z6nLr45bC3_E7YdeqUEo0xPz1Rjl_xLQA/exec';
const PORT = 9222;

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  URL
]);

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Starting Chrome and waiting for targets...');
  await wait(3500);

  let targets;
  for (let i = 0; i < 15; i++) {
    try {
      targets = await getJson(`http://localhost:${PORT}/json`);
      if (targets && targets.length > 0) break;
    } catch (e) {
      await wait(1000);
    }
  }

  if (!targets) {
    console.error('Could not connect to Chrome CDP');
    chrome.kill();
    return;
  }

  // Find all targets
  console.log('\nAll targets from /json:');
  targets.forEach(t => console.log(t.type, t.title, t.url));

  const iframeTarget = targets.find(t => t.type === 'iframe' || (t.url && t.url.includes('googleusercontent.com')));
  if (!iframeTarget || !iframeTarget.webSocketDebuggerUrl) {
    console.error('No iframe target found yet, waiting 5 seconds...');
    await wait(5000);
  }

  const freshTargets = await getJson(`http://localhost:${PORT}/json`);
  const userIframe = freshTargets.find(t => t.type === 'iframe' || (t.url && t.url.includes('googleusercontent.com')));

  if (!userIframe) {
    console.error('Still no iframe target found!');
    chrome.kill();
    return;
  }

  console.log('\nConnecting to user iframe target:', userIframe.webSocketDebuggerUrl);
  const ws = new WebSocket(userIframe.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onopen = async () => {
    console.log('WebSocket connected to iframe.');
    await send('Runtime.enable');
    await send('Log.enable');

    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && callbacks.has(m.id)) {
        const resolve = callbacks.get(m.id);
        callbacks.delete(m.id);
        resolve(m);
        return;
      }
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = m.params.args.map(a => a.value || a.description).join(' ');
        console.log(`[IFRAME CONSOLE ${m.params.type.toUpperCase()}]`, text);
      } else if (m.method === 'Runtime.exceptionThrown') {
        console.error('[IFRAME EXCEPTION!]', m.params.exceptionDetails.text, m.params.exceptionDetails.exception);
      }
    };

    console.log('Waiting 10 seconds for Google Sheets data to sync and views to render...');
    await wait(10000);

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const f = document.getElementById('userHtmlFrame');
        const doc = f ? (f.contentDocument || f.contentWindow.document) : document;
        const win = f ? f.contentWindow : window;

        // Try triggering sync if not yet loaded
        if (win.gasSync && !win._gasDataLoaded) {
          win.gasSync.loadAll();
        }

        const mainRows = doc.getElementById('mainTableBody') ? doc.getElementById('mainTableBody').rows.length : -1;
        const unitRows = doc.getElementById('unitTableBody') ? doc.getElementById('unitTableBody').rows.length : -1;
        const dailyRows = doc.getElementById('dailyTableBody') ? doc.getElementById('dailyTableBody').rows.length : -1;
        const probRows = doc.getElementById('problemTableBody') ? doc.getElementById('problemTableBody').rows.length : -1;
        const schRows = doc.getElementById('scheduleTableBody') ? doc.getElementById('scheduleTableBody').rows.length : -1;

        const tableInfo = doc.getElementById('tableRecordInfo') ? doc.getElementById('tableRecordInfo').textContent : '';
        const unitInfo = doc.getElementById('unitRecordInfo') ? doc.getElementById('unitRecordInfo').textContent : '';
        const dailyInfo = doc.getElementById('dailyRecordInfo') ? doc.getElementById('dailyRecordInfo').textContent : '';
        const probInfo = doc.getElementById('probRecordInfo') ? doc.getElementById('probRecordInfo').textContent : '';
        const schInfo = doc.getElementById('scheduleRecordInfo') ? doc.getElementById('scheduleRecordInfo').textContent : '';

        // Dropdown unit count
        const dedUnitSelect = doc.getElementById('dedSwapUnit');
        const unitDropdownList = doc.getElementById('unitDropdownList');
        const unitListItems = unitDropdownList ? unitDropdownList.children.length : 0;

        return {
          swapsDataLength: win.swapsData ? win.swapsData.length : 'undefined',
          fleetUnitsLength: win.fleetUnits ? win.fleetUnits.length : 'undefined',
          problemsDataLength: win.problemsData ? win.problemsData.length : 'undefined',
          schedulesDataLength: win.schedulesData ? win.schedulesData.length : 'undefined',
          gasDataLoaded: win._gasDataLoaded,
          hasGasSync: typeof win.gasSync !== 'undefined',
          hasRenderMainTable: typeof win.renderMainTable !== 'undefined',
          hasRenderUnitTable: typeof win.renderUnitTable !== 'undefined',
          hasSyncAndRenderAllViews: typeof win.syncAndRenderAllViews !== 'undefined',
          mainRows,
          unitRows,
          dailyRows,
          probRows,
          schRows,
          tableInfo,
          unitInfo,
          dailyInfo,
          probInfo,
          schInfo,
          unitListItems
        };
      })()`,
      returnByValue: true
    });

    console.log('\n================ LIVE APP STATE ================');
    console.log(JSON.stringify(evalRes.result ? evalRes.result.value : evalRes, null, 2));
    console.log('================================================\n');

    // Wait a bit more and close
    await wait(3000);
    ws.close();
    chrome.kill();
  };

  ws.onerror = (e) => {
    console.error('WS error:', e.message);
    chrome.kill();
  };
}

run().catch(e => {
  console.error('Run error:', e);
  chrome.kill();
});
