/**
 * EV CHARGING & SWAP INTELLIGENCE DASHBOARD
 * PT Putra Perkasa Abadi - Site BIB
 *
 * Data source yang didukung secara otomatis:
 * order | vin | truck No | charger No | battery No | meter No |
 * Charging Start Time | Charging End Time | Charging Duration(h:m:s) |
 * Start SOC Percentage(%) | End SOC Percentage(%) |
 * Sum Of Fill Charging(%) | Start reading | End reading |
 * Charging Amount | LOKASI
 *
 * Sumber ketahanan battery (sheet kedua pada spreadsheet yang sama):
 * DATE | SHIFTT | CATEGORY | LOCATION | KODE UNIT | HM | BATTERY BEFORE |
 * JAM IN UNIT | BATTERY AFTER | JAM OUT UNIT | CHARGING TIME (MENIT) |
 * ENERGY (KWH) | REMARK | KETERANGAN
 *
 * Sumber Swab Cycle Time (sheet ketiga pada spreadsheet yang sama):
 * businessNo | vin | plate | stationName | timeDifference(s) |
 * downBatteryNo | downBatterySoc(%) | downBatteryCompartment |
 * upBatteryNo | upBatterySoc(%) | upBatteryCompartment |
 * changeResult(1 success, 2 fail, 3 cancel) | startTime | endTime |
 * socDifference | exchangePower(kw.h)
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1k63AKsRQ8WK1m37akbX9nxcEA2TVOJiKjRiQhj-4Phs', // Master Database CHARGING EV 1.2
  PREFERRED_DATA_SHEET_NAME: 'Durasi Charging',
  TIMEZONE: 'Asia/Makassar',
  REPORT_DATE_BASIS: 'END', // END = tanggal Charging End Time; ubah ke START bila diperlukan.
  TARGET_START_SOC: 20,
  TARGET_END_SOC: 95,
  MAX_REASONABLE_DURATION_HOURS: 6,
  HEADER_SCAN_ROWS: 15,
  MIN_IMPORT_COLUMNS: 12,
  MIN_SWAB_IMPORT_COLUMNS: 10,
  MIN_CYCLE_TIME_IMPORT_COLUMNS: 12,
  VALID_ENDURANCE_MIN_HOURS: 3,
  VALID_ENDURANCE_MAX_HOURS: 5,
  BATTERY_NOMINAL_CAPACITY_KWH: 400,
  SWAB_CYCLE_SLA_MINUTES: 6,
  SWAB_CYCLE_CRITICAL_MINUTES: 7,
  MIN_REASONABLE_SWAB_CYCLE_SECONDS: 60,
  MAX_REASONABLE_SWAB_CYCLE_MINUTES: 30,
  CACHE_SECONDS: 300,
  MAX_TABLE_ROWS: 80,
  MAX_BATTERY_TABLE_ROWS: 100,
  MAX_CYCLE_TIME_TABLE_ROWS: 100,
  APP_VERSION: '2026.09.20-enterprise-rom3-r2'
});

// Display choices only; this does not create, rename or write database rows.
const ROM_LOCATIONS = Object.freeze(['ROM A1', 'ROM A2 Swap 01', 'ROM A2 Swap 03']);

const HEADER_ALIASES = Object.freeze({
  order: ['order', 'order no', 'order number', 'id', 'session id'],
  vin: ['vin', 'vin no', 'vin number', 'chassis no'],
  truck: ['truck no', 'truck number', 'unit', 'unit no', 'unit number', 'dt no'],
  charger: ['charger no', 'charger number', 'charger'],
  battery: ['battery no', 'battery number', 'battery id', 'battery'],
  meter: ['meter no', 'meter number', 'meter', 'port', 'port no'],
  startTime: ['charging start time', 'start time', 'charging start', 'waktu mulai charging'],
  endTime: ['charging end time', 'end time', 'charging end', 'waktu selesai charging'],
  duration: ['charging duration h m s', 'charging duration', 'duration', 'durasi charging'],
  startSoc: ['start soc percentage', 'start soc', 'soc start', 'soc awal'],
  endSoc: ['end soc percentage', 'end soc', 'soc end', 'soc akhir'],
  socFill: ['sum of fill charging', 'fill charging', 'soc filled', 'soc gain', 'delta soc'],
  startReading: ['start reading', 'meter start', 'reading start'],
  endReading: ['end reading', 'meter end', 'reading end'],
  kwh: ['charging amount', 'charging energy', 'energy kwh', 'total kwh', 'kwh'],
  location: ['lokasi', 'location', 'rom', 'area', 'site location']
});

const DB_KEYS = Object.freeze({
  spreadsheetId: 'EVDB_SPREADSHEET_ID',
  sheetId: 'EVDB_SHEET_ID',
  sheetName: 'EVDB_SHEET_NAME',
  headerRow: 'EVDB_HEADER_ROW',
  headerSignature: 'EVDB_HEADER_SIGNATURE',
  setupVersion: 'EVDB_SETUP_VERSION',
  configuredAt: 'EVDB_CONFIGURED_AT',
  mode: 'EVDB_MODE'
});

const REQUIRED_FIELDS = Object.freeze([
  'order', 'startTime', 'endTime', 'startSoc', 'endSoc', 'location'
]);

const SWAB_HEADER_ALIASES = Object.freeze({
  date: ['date', 'tanggal', 'swab date', 'tanggal swab'],
  shift: ['shiftt', 'shift', 'shift kerja'],
  category: ['category', 'kategori', 'activity', 'aktivitas'],
  location: ['location', 'lokasi', 'room', 'rom', 'swap room'],
  unit: ['kode unit', 'unit', 'unit no', 'unit number', 'truck no', 'dt no'],
  hm: ['hm', 'hour meter', 'hourmeter', 'hm unit'],
  socBefore: ['battery before', 'soc before', 'soc awal', 'battery soc before'],
  timeIn: ['jam in swap', 'jam in unit', 'time in unit', 'jam masuk', 'jam in', 'time in', 'swap start time'],
  socAfter: ['battery after', 'soc after', 'soc selesai', 'battery soc after'],
  timeOut: ['jam out swap', 'jam out unit', 'time out unit', 'jam keluar', 'jam out', 'time out', 'swap end time'],
  swapMinutes: ['charging time menit', 'swap time menit', 'swap duration', 'durasi swab'],
  energy: ['energy kwh', 'energy', 'charging amount', 'kwh'],
  remark: ['remark', 'status', 'ketepatan waktu'],
  note: ['keterangan', 'description', 'note', 'notes']
});

const SWAB_REQUIRED_FIELDS = Object.freeze([
  'date', 'shift', 'category', 'location', 'unit', 'hm', 'socBefore', 'timeIn', 'socAfter'
]);

const SWAB_DB_KEYS = Object.freeze({
  sheetId: 'EVSWAB_SHEET_ID',
  sheetName: 'EVSWAB_SHEET_NAME',
  headerRow: 'EVSWAB_HEADER_ROW',
  headerSignature: 'EVSWAB_HEADER_SIGNATURE',
  configuredAt: 'EVSWAB_CONFIGURED_AT'
});

const CYCLE_TIME_HEADER_ALIASES = Object.freeze({
  businessNo: ['businessno', 'business no', 'business number', 'order', 'order no', 'swap order'],
  vin: ['vin', 'vin no', 'vin number'],
  unit: ['plate', 'plate no', 'truck no', 'unit', 'unit no', 'dt no'],
  station: ['stationname', 'station name', 'station', 'swap station', 'location', 'lokasi', 'rom'],
  durationSeconds: ['timedifference s', 'time difference s', 'time difference seconds', 'timedifference', 'duration s', 'cycle time seconds'],
  downBattery: ['downbatteryno', 'down battery no', 'down battery', 'battery down'],
  downSoc: ['downbatterysoc', 'down battery soc', 'down battery soc percentage', 'soc before', 'down soc'],
  downCompartment: ['downbatterycompartment', 'down battery compartment', 'down compartment'],
  upBattery: ['upbatteryno', 'up battery no', 'up battery', 'battery up'],
  upSoc: ['upbatterysoc', 'up battery soc', 'up battery soc percentage', 'soc after', 'up soc'],
  upCompartment: ['upbatterycompartment', 'up battery compartment', 'up compartment'],
  result: ['changeresult 1 success 2 fail 3 cancel', 'change result', 'swap result', 'result', 'status'],
  startTime: ['starttime', 'start time', 'swap start time', 'cycle start time'],
  endTime: ['endtime', 'end time', 'swap end time', 'cycle end time'],
  socDifference: ['socdifference', 'soc difference', 'soc delta', 'delta soc'],
  energy: ['exchangepower kw h', 'exchange power kw h', 'exchange energy', 'energy kwh', 'kwh'],
  electricityFee: ['electricityfeeunitprice cny', 'electricity fee unit price'],
  serviceFee: ['servicefeeunitprice cny', 'service fee unit price'],
  swapFee: ['batteryswapfee cny', 'battery swap fee']
});

const CYCLE_TIME_REQUIRED_FIELDS = Object.freeze([
  'businessNo', 'vin', 'unit', 'station', 'durationSeconds',
  'downSoc', 'upSoc', 'result', 'startTime', 'endTime'
]);

const CYCLE_TIME_DB_KEYS = Object.freeze({
  sheetId: 'EVCYCLE_SHEET_ID',
  sheetName: 'EVCYCLE_SHEET_NAME',
  headerRow: 'EVCYCLE_HEADER_ROW',
  headerSignature: 'EVCYCLE_HEADER_SIGNATURE',
  configuredAt: 'EVCYCLE_CONFIGURED_AT'
});

const DATABASE_SETUP_VERSION = '3';

// doGet and onOpen are handled by Code.gs
function addEvDashboardMenuToUi_(ui) {
  if (!ui) {
    try { ui = SpreadsheetApp.getUi(); } catch(e) { return; }
  }
  ui.createMenu('⚡ EV Intelligence')
    .addItem('Setup / deteksi database', 'setupDatabaseFromMenu_')
    .addItem('Validasi koneksi database', 'validateDatabaseFromMenu_')
    .addSeparator()
    .addItem('Refresh data & cache', 'clearDashboardCacheFromMenu_')
    .addToUi();
}

function addDashboardMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('EV Dashboard')
    .addItem('Setup / deteksi database', 'setupDatabaseFromMenu_')
    .addItem('Validasi koneksi database', 'validateDatabaseFromMenu_')
    .addSeparator()
    .addItem('Buka dashboard', 'showDashboardLink_')
    .addItem('Refresh data & cache', 'clearDashboardCacheFromMenu_')
    .addToUi();
}

/** Cache otomatis dibatalkan saat sheet sumber diedit manual. */
function handleEvDashboardEdit_(event) {
  try {
    if (!event || !event.range) return;
    const config = loadDatabaseConfig_();
    const swabConfig = loadSwabDatabaseConfig_();
    const cycleConfig = loadCycleTimeDatabaseConfig_();
    const sheet = event.range.getSheet();
    const spreadsheetId = event.source && event.source.getId ? event.source.getId() : '';
    if (config.spreadsheetId && spreadsheetId && spreadsheetId !== config.spreadsheetId) return;
    const editedSheetId = String(sheet.getSheetId());
    const sourceSheetIds = [config.sheetId, swabConfig.sheetId, cycleConfig.sheetId]
      .filter(Boolean).map(String);
    if (sourceSheetIds.length && sourceSheetIds.indexOf(editedSheetId) === -1) {
      // Saat salah satu sumber belum pernah dikunci, tetap kenali edit pada tab import baru.
      const chargingCandidate = validateHeaderMap_(detectHeader_(sheet).map).valid;
      const swabCandidate = validateSwabHeaderMap_(detectSwabHeader_(sheet).map).valid;
      const cycleCandidate = validateCycleTimeHeaderMap_(detectCycleTimeHeader_(sheet).map).valid;
      if (!chargingCandidate && !swabCandidate && !cycleCandidate) return;
    }
    if (!sourceSheetIds.length) {
      const isRecognizedSource = validateHeaderMap_(detectHeader_(sheet).map).valid ||
        validateSwabHeaderMap_(detectSwabHeader_(sheet).map).valid ||
        validateCycleTimeHeaderMap_(detectCycleTimeHeader_(sheet).map).valid;
      if (!isRecognizedSource) return;
    }
    touchDashboardVersion_();
  } catch (error) {
    console.log('Cache invalidation skipped: ' + error.message);
  }
}

function showDashboardLink_() {
  const url = ScriptApp.getService().getUrl();
  const message = url
    ? 'Dashboard Web App: ' + url
    : 'Deploy terlebih dahulu melalui Deploy > New deployment > Web app.';
  SpreadsheetApp.getUi().alert(message);
}

/**
 * Setup database tanpa parameter agar tidak dapat diarahkan ulang dari web client.
 * Prioritas: spreadsheet aktif/bound, konfigurasi tersimpan, properti lama, lalu CONFIG.
 * Jalankan sekali dari menu EV Dashboard. Sufiks underscore mencegah pemanggilan
 * oleh viewer Web App melalui google.script.run.
 */
function setupDatabase_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = resolveSetupSpreadsheet_();
    const candidate = detectImportSheet_(context.spreadsheet);
    const validation = validateHeaderMap_(candidate.headerInfo.map);
    if (!validation.valid) throw schemaError_(candidate, validation);
    const swabCandidate = detectSwabImportSheet_(context.spreadsheet);
    const swabValidation = validateSwabHeaderMap_(swabCandidate.headerInfo.map);
    if (!swabValidation.valid) throw swabSchemaError_(swabCandidate, swabValidation);
    const cycleCandidate = detectCycleTimeImportSheet_(context.spreadsheet);
    const cycleValidation = validateCycleTimeHeaderMap_(cycleCandidate.headerInfo.map);
    if (!cycleValidation.valid) throw cycleTimeSchemaError_(cycleCandidate, cycleValidation);
    const sourceIds = [candidate, swabCandidate, cycleCandidate].map(function (item) {
      return String(item.sheet.getSheetId());
    });
    if (uniqueSorted_(sourceIds).length !== 3) {
      throw new Error(
        'Sumber Charging Station, DATA SWAB, dan Swab Cycle Time harus berada pada tiga tab berbeda ' +
        'di spreadsheet yang sama.'
      );
    }

    persistDatabaseConfig_(context, candidate, swabCandidate, cycleCandidate);
    touchDashboardVersion_();
    return {
      success: true,
      spreadsheetName: context.spreadsheet.getName(),
      sheetName: candidate.sheet.getName(),
      sheetId: candidate.sheet.getSheetId(),
      headerRow: candidate.headerInfo.row,
      matchedColumns: validation.matched,
      sourceRows: Math.max(0, candidate.sheet.getLastRow() - candidate.headerInfo.row),
      swabSheetName: swabCandidate.sheet.getName(),
      swabSheetId: swabCandidate.sheet.getSheetId(),
      swabHeaderRow: swabCandidate.headerInfo.row,
      swabMatchedColumns: swabValidation.matched,
      swabSourceRows: Math.max(0, swabCandidate.sheet.getLastRow() - swabCandidate.headerInfo.row),
      cycleTimeSheetName: cycleCandidate.sheet.getName(),
      cycleTimeSheetId: cycleCandidate.sheet.getSheetId(),
      cycleTimeHeaderRow: cycleCandidate.headerInfo.row,
      cycleTimeMatchedColumns: cycleValidation.matched,
      cycleTimeSourceRows: Math.max(0, cycleCandidate.sheet.getLastRow() - cycleCandidate.headerInfo.row),
      mode: context.mode,
      message: 'Database charging, ketahanan battery, dan swab cycle time terhubung.'
    };
  } finally {
    lock.releaseLock();
  }
}

/** Alias kompatibilitas untuk versi lama. */
function setupDashboard_() {
  return setupDatabase_();
}

function setupDatabaseFromMenu_() {
  try {
    const result = setupDatabase_();
    SpreadsheetApp.getUi().alert(
      'Setup Database Berhasil',
      result.spreadsheetName + '\n\n' +
        'Charging Station: ' + result.sheetName + '\n' +
        result.matchedColumns + ' kolom · ' + result.sourceRows + ' baris\n\n' +
        'Ketahanan Battery: ' + result.swabSheetName + '\n' +
        result.swabMatchedColumns + ' kolom · ' + result.swabSourceRows + ' baris\n\n' +
        'Swab Cycle Time: ' + result.cycleTimeSheetName + '\n' +
        result.cycleTimeMatchedColumns + ' kolom · ' + result.cycleTimeSourceRows + ' baris',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Setup Database Gagal', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function validateDatabaseFromMenu_() {
  const result = validateDatabase_();
  const title = result.valid ? 'Koneksi Database Valid' : 'Koneksi Database Bermasalah';
  const detail = result.valid
    ? result.spreadsheetName + '\n\n' +
      'Charging Station: ' + result.sheetName + '\n' +
      result.matchedColumns + ' kolom · ' + result.sourceRows + ' baris\n\n' +
      'Ketahanan Battery: ' + result.swabSheetName + '\n' +
      result.swabMatchedColumns + ' kolom · ' + result.swabSourceRows + ' baris\n\n' +
      'Swab Cycle Time: ' + result.cycleTimeSheetName + '\n' +
      result.cycleTimeMatchedColumns + ' kolom · ' + result.cycleTimeSourceRows + ' baris' +
      (result.warnings.length ? '\n\nCatatan: ' + result.warnings.join(' · ') : '')
    : result.message;
  SpreadsheetApp.getUi().alert(title, detail, SpreadsheetApp.getUi().ButtonSet.OK);
}

function clearDashboardCacheFromMenu_() {
  const result = clearDashboardCache_();
  SpreadsheetApp.getUi().alert(result.message);
}

function clearDashboardCache_() {
  touchDashboardVersion_();
  return { success: true, message: 'Cache dashboard berhasil direset.' };
}

function touchDashboardVersion_() {
  PropertiesService.getScriptProperties()
    .setProperty('DASHBOARD_CACHE_BUSTER', String(Date.now()));
}

/**
 * Endpoint utama untuk Index.html.
 * @param {Object} filters Filter tanggal, ROM, charger, port, unit, dan battery.
 */
function getDashboardData(filters) {
  const startedAt = Date.now();
  const ss = getSpreadsheet_();
  const sourceRef = resolveConfiguredSource_(ss);
  const sheet = sourceRef.sheet;
  const rawFilters = filters || {};
  if (rawFilters.forceRefresh) touchDashboardVersion_();
  const cacheKey = buildCacheKey_(sheet, rawFilters, sourceRef.headerInfo);
  const cache = CacheService.getScriptCache();
  const cacheEnabled = loadDatabaseConfig_().mode !== 'STANDALONE';

  const cached = cacheEnabled && !rawFilters.forceRefresh ? cache.get(cacheKey) : null;
  if (cached) {
    const payload = JSON.parse(cached);
    payload.runtime = payload.runtime || {};
    payload.runtime.cacheHit = true;
    payload.runtime.responseMs = Date.now() - startedAt;
    return payload;
  }

  const source = readNormalizedRecords_(sheet, sourceRef.headerInfo);
  const options = buildFilterOptions_(source.records, source.meta);
  const appliedFilters = normalizeFilters_(rawFilters, options);
  const filtered = applyFilters_(source.records, appliedFilters);
  const payload = buildDashboardPayload_(filtered, source.meta, options, appliedFilters);
  if (sourceRef.warning) payload.source.databaseWarning = sourceRef.warning;

  payload.generatedAt = formatDateTime_(new Date());
  payload.runtime = {
    cacheHit: false,
    responseMs: Date.now() - startedAt,
    appVersion: CONFIG.APP_VERSION
  };

  if (cacheEnabled) {
    const serialized = JSON.stringify(payload);
    // CacheService membatasi item 100 KB; ukur byte UTF-8 dan jangan gagalkan respons.
    try {
      if (Utilities.newBlob(serialized).getBytes().length < 95000) {
        cache.put(cacheKey, serialized, CONFIG.CACHE_SECONDS);
      }
    } catch (error) {
      console.log('Cache skipped: ' + error.message);
    }
  }
  return payload;
}

function testDashboardData_() {
  const data = getDashboardData({});
  console.log(JSON.stringify({
    source: data.source,
    kpis: data.kpis,
    quality: data.quality,
    dailyPoints: data.trends.daily.length
  }, null, 2));
  return data;
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const config = loadDatabaseConfig_();
  const legacyId = properties.getProperty('SPREADSHEET_ID');
  const rawId = config.spreadsheetId || legacyId || CONFIG.SPREADSHEET_ID;
  const id = extractSpreadsheetId_(rawId);
  if (rawId && !id) throw new Error('Format Spreadsheet ID/URL database tidak valid.');
  if (id) return openSpreadsheetById_(id);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error(
    'Database belum dikonfigurasi. Jalankan Setup / deteksi database dari menu EV Dashboard ' +
    'pada Google Sheet sumber, atau isi CONFIG.SPREADSHEET_ID untuk project standalone.'
  );
}

function resolveSetupSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return { spreadsheet: active, mode: 'BOUND' };

  const properties = PropertiesService.getScriptProperties();
  const config = loadDatabaseConfig_();
  const rawId = config.spreadsheetId ||
    properties.getProperty('SPREADSHEET_ID') ||
    CONFIG.SPREADSHEET_ID;
  const id = extractSpreadsheetId_(rawId);
  if (!id) {
    throw new Error(
      'Spreadsheet aktif tidak tersedia. Untuk project standalone, isi CONFIG.SPREADSHEET_ID ' +
      'dengan URL/ID Google Sheet lalu jalankan setupDatabase_() dari editor.'
    );
  }
  return { spreadsheet: openSpreadsheetById_(id), mode: 'STANDALONE' };
}

function openSpreadsheetById_(id) {
  try {
    return SpreadsheetApp.openById(id);
  } catch (error) {
    throw new Error(
      'Database Google Sheet tidak dapat dibuka. Periksa ID, izin akses, dan akun pemilik deployment. ' +
      'Detail: ' + error.message
    );
  }
}

function extractSpreadsheetId_(value) {
  const text = cleanText_(value);
  if (!text) return '';
  const urlMatch = text.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (urlMatch) return urlMatch[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(text) ? text : '';
}

function loadDatabaseConfig_() {
  const values = PropertiesService.getScriptProperties().getProperties();
  return {
    spreadsheetId: cleanText_(values[DB_KEYS.spreadsheetId]),
    sheetId: cleanText_(values[DB_KEYS.sheetId]),
    sheetName: cleanText_(values[DB_KEYS.sheetName]),
    headerRow: Number(values[DB_KEYS.headerRow] || 0),
    headerSignature: cleanText_(values[DB_KEYS.headerSignature]),
    setupVersion: cleanText_(values[DB_KEYS.setupVersion]),
    configuredAt: cleanText_(values[DB_KEYS.configuredAt]),
    mode: cleanText_(values[DB_KEYS.mode])
  };
}

function loadSwabDatabaseConfig_() {
  const values = PropertiesService.getScriptProperties().getProperties();
  return {
    sheetId: cleanText_(values[SWAB_DB_KEYS.sheetId]),
    sheetName: cleanText_(values[SWAB_DB_KEYS.sheetName]),
    headerRow: Number(values[SWAB_DB_KEYS.headerRow] || 0),
    headerSignature: cleanText_(values[SWAB_DB_KEYS.headerSignature]),
    configuredAt: cleanText_(values[SWAB_DB_KEYS.configuredAt])
  };
}

function loadCycleTimeDatabaseConfig_() {
  const values = PropertiesService.getScriptProperties().getProperties();
  return {
    sheetId: cleanText_(values[CYCLE_TIME_DB_KEYS.sheetId]),
    sheetName: cleanText_(values[CYCLE_TIME_DB_KEYS.sheetName]),
    headerRow: Number(values[CYCLE_TIME_DB_KEYS.headerRow] || 0),
    headerSignature: cleanText_(values[CYCLE_TIME_DB_KEYS.headerSignature]),
    configuredAt: cleanText_(values[CYCLE_TIME_DB_KEYS.configuredAt])
  };
}

function persistDatabaseConfig_(context, candidate, swabCandidate, cycleCandidate) {
  const values = {};
  values[DB_KEYS.spreadsheetId] = context.spreadsheet.getId();
  values[DB_KEYS.sheetId] = String(candidate.sheet.getSheetId());
  values[DB_KEYS.sheetName] = candidate.sheet.getName();
  values[DB_KEYS.headerRow] = String(candidate.headerInfo.row);
  values[DB_KEYS.headerSignature] = buildHeaderSignature_(candidate.headerInfo);
  values[DB_KEYS.setupVersion] = DATABASE_SETUP_VERSION;
  values[DB_KEYS.configuredAt] = new Date().toISOString();
  values[DB_KEYS.mode] = context.mode;
  values[SWAB_DB_KEYS.sheetId] = String(swabCandidate.sheet.getSheetId());
  values[SWAB_DB_KEYS.sheetName] = swabCandidate.sheet.getName();
  values[SWAB_DB_KEYS.headerRow] = String(swabCandidate.headerInfo.row);
  values[SWAB_DB_KEYS.headerSignature] = buildHeaderSignature_(swabCandidate.headerInfo);
  values[SWAB_DB_KEYS.configuredAt] = new Date().toISOString();
  values[CYCLE_TIME_DB_KEYS.sheetId] = String(cycleCandidate.sheet.getSheetId());
  values[CYCLE_TIME_DB_KEYS.sheetName] = cycleCandidate.sheet.getName();
  values[CYCLE_TIME_DB_KEYS.headerRow] = String(cycleCandidate.headerInfo.row);
  values[CYCLE_TIME_DB_KEYS.headerSignature] = buildHeaderSignature_(cycleCandidate.headerInfo);
  values[CYCLE_TIME_DB_KEYS.configuredAt] = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperties(values, false);
}

function resolveConfiguredSource_(ss) {
  const config = loadDatabaseConfig_();
  const configBelongsHere = Boolean(config.spreadsheetId) && config.spreadsheetId === ss.getId();
  const warnings = [];
  if (config.sheetId && configBelongsHere) {
    const configuredSheet = getSheetById_(ss, config.sheetId);
    if (configuredSheet) {
      const configuredHeader = detectHeader_(configuredSheet);
      const configuredValidation = validateHeaderMap_(configuredHeader.map);
      if (configuredValidation.valid) {
        const signature = buildHeaderSignature_(configuredHeader);
        if (config.headerSignature && signature !== config.headerSignature) {
          warnings.push('Struktur header berubah; jalankan Setup / deteksi database untuk memperbarui konfigurasi.');
        }
        if (config.headerRow && configuredHeader.row !== config.headerRow) {
          warnings.push('Posisi baris header berubah dari konfigurasi awal.');
        }
        return {
          sheet: configuredSheet,
          headerInfo: configuredHeader,
          warning: warnings.join(' ')
        };
      }
      throw new Error(
        'Sheet database tersimpan tidak lagi memenuhi struktur import. ' +
        'Jalankan Setup / deteksi database dari menu EV Dashboard.'
      );
    } else {
      throw new Error(
        'Sheet database tersimpan tidak ditemukan atau telah dihapus. ' +
        'Jalankan Setup / deteksi database dari menu EV Dashboard.'
      );
    }
  } else if (config.sheetId && !configBelongsHere) {
    warnings.push('Konfigurasi database tersimpan berasal dari spreadsheet lain dan diabaikan.');
  }

  const detected = detectImportSheet_(ss);
  if (warnings.length || !config.sheetId) {
    detected.warning = (warnings.join(' ') + ' Database dideteksi otomatis; jalankan Setup / deteksi database untuk mengunci koneksi.').trim();
  }
  return detected;
}

function getSheetById_(ss, sheetId) {
  const target = String(sheetId || '');
  return ss.getSheets().find(function (sheet) {
    return String(sheet.getSheetId()) === target;
  }) || null;
}

function findDataSheet_(ss) {
  return detectImportSheet_(ss);
}

function detectImportSheet_(ss) {
  const config = loadDatabaseConfig_();
  const configBelongsHere = Boolean(config.spreadsheetId) && config.spreadsheetId === ss.getId();
  const preferredName = cleanText_(
    configBelongsHere ? config.sheetName : CONFIG.PREFERRED_DATA_SHEET_NAME
  ).toLowerCase();
  const candidates = ss.getSheets().map(function (sheet) {
    const normalizedName = normalizeKey_(sheet.getName());
    const headerInfo = detectHeader_(sheet);
    const validation = validateHeaderMap_(headerInfo.map);
    return {
      sheet: sheet,
      headerInfo: headerInfo,
      validation: validation,
      dataRows: Math.max(0, sheet.getLastRow() - headerInfo.row),
      configured: configBelongsHere && config.sheetId && String(sheet.getSheetId()) === String(config.sheetId),
      preferred: sheet.getName().toLowerCase() === preferredName || /durasi charging|charging duration|charging/.test(normalizedName)
    };
  });

  const valid = candidates.filter(function (candidate) { return candidate.validation.valid; });
  valid.sort(function (a, b) {
    return Number(b.configured) - Number(a.configured) ||
      Number(b.preferred) - Number(a.preferred) ||
      b.validation.matched - a.validation.matched ||
      Number(b.dataRows > 0) - Number(a.dataRows > 0) ||
      b.dataRows - a.dataRows ||
      a.headerInfo.row - b.headerInfo.row ||
      a.sheet.getSheetId() - b.sheet.getSheetId();
  });

  if (valid.length) {
    return {
      sheet: valid[0].sheet,
      headerInfo: valid[0].headerInfo,
      validation: valid[0].validation
    };
  }

  candidates.sort(function (a, b) { return b.validation.matched - a.validation.matched; });
  const candidateSummary = candidates.slice(0, 3).map(function (candidate) {
    const missing = candidate.validation.missing.length
      ? candidate.validation.missing.join(', ')
      : 'struktur inti tidak dikenali';
    return candidate.sheet.getName() + ' (kurang: ' + missing + ')';
  }).join('; ');
  throw new Error(
    'Sheet import charging yang valid tidak ditemukan. Struktur wajib: order, waktu mulai/selesai, ' +
    'SOC awal/akhir, lokasi, serta Charging Amount atau pasangan Start/End reading. ' +
    (candidateSummary ? 'Kandidat: ' + candidateSummary : 'Spreadsheet tidak memiliki sheet berisi data.')
  );
}

function resolveSwabConfiguredSource_(ss) {
  const databaseConfig = loadDatabaseConfig_();
  const config = loadSwabDatabaseConfig_();
  const configBelongsHere = Boolean(databaseConfig.spreadsheetId) && databaseConfig.spreadsheetId === ss.getId();
  const warnings = [];

  if (config.sheetId && configBelongsHere) {
    const sheet = getSheetById_(ss, config.sheetId);
    if (!sheet) {
      throw new Error(
        'Sheet data ketahanan battery tersimpan tidak ditemukan. ' +
        'Import DATA SWAB sebagai tab pada spreadsheet yang sama lalu jalankan Setup / deteksi database.'
      );
    }
    const headerInfo = detectSwabHeader_(sheet);
    const validation = validateSwabHeaderMap_(headerInfo.map);
    if (!validation.valid) throw swabSchemaError_({ sheet: sheet }, validation);
    const signature = buildHeaderSignature_(headerInfo);
    if (config.headerSignature && config.headerSignature !== signature) {
      warnings.push('Struktur header data swab berubah sejak setup terakhir.');
    }
    if (config.headerRow && config.headerRow !== headerInfo.row) {
      warnings.push('Posisi header data swab berubah sejak setup terakhir.');
    }
    return { sheet: sheet, headerInfo: headerInfo, validation: validation, warning: warnings.join(' ') };
  }

  const detected = detectSwabImportSheet_(ss);
  detected.warning = 'Data ketahanan battery dideteksi otomatis; jalankan Setup / deteksi database untuk mengunci koneksi.';
  return detected;
}

function detectSwabImportSheet_(ss) {
  const databaseConfig = loadDatabaseConfig_();
  const config = loadSwabDatabaseConfig_();
  const configBelongsHere = Boolean(databaseConfig.spreadsheetId) && databaseConfig.spreadsheetId === ss.getId();
  const preferredName = cleanText_(configBelongsHere && config.sheetName ? config.sheetName : 'DATA INPUT').toLowerCase();
  const candidates = ss.getSheets().map(function (sheet) {
    const headerInfo = detectSwabHeader_(sheet);
    const validation = validateSwabHeaderMap_(headerInfo.map);
    const normalizedName = normalizeKey_(sheet.getName());
    return {
      sheet: sheet,
      headerInfo: headerInfo,
      validation: validation,
      dataRows: Math.max(0, sheet.getLastRow() - headerInfo.row),
      configured: configBelongsHere && config.sheetId && String(sheet.getSheetId()) === String(config.sheetId),
      preferred: sheet.getName().toLowerCase() === preferredName || /(^| )data swab($| )|ketahanan battery|battery endurance|data input|transaksi/.test(normalizedName)
    };
  });

  const valid = candidates.filter(function (candidate) { return candidate.validation.valid; });
  valid.sort(function (a, b) {
    return Number(b.configured) - Number(a.configured) ||
      Number(b.preferred) - Number(a.preferred) ||
      b.validation.matched - a.validation.matched ||
      Number(b.dataRows > 0) - Number(a.dataRows > 0) ||
      b.dataRows - a.dataRows ||
      a.headerInfo.row - b.headerInfo.row ||
      a.sheet.getSheetId() - b.sheet.getSheetId();
  });

  if (valid.length) {
    return {
      sheet: valid[0].sheet,
      headerInfo: valid[0].headerInfo,
      validation: valid[0].validation
    };
  }

  candidates.sort(function (a, b) { return b.validation.matched - a.validation.matched; });
  const summary = candidates.slice(0, 3).map(function (candidate) {
    return candidate.sheet.getName() + ' (dikenali ' + candidate.validation.matched + '/14 kolom)';
  }).join('; ');
  throw new Error(
    'Sheet DATA SWAB yang valid belum ditemukan pada spreadsheet yang sama. ' +
    'Struktur wajib minimal: DATE, LOCATION, KODE UNIT, HM, BATTERY BEFORE, BATTERY AFTER. ' +
    (summary ? 'Kandidat: ' + summary : '')
  );
}

function detectSwabHeader_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (!lastRow || !lastColumn) return { row: 1, map: {}, score: 0, headers: [], valid: false };

  const rowCount = Math.min(lastRow, CONFIG.HEADER_SCAN_ROWS);
  const colCount = Math.min(lastColumn, 60);
  const values = sheet.getRange(1, 1, rowCount, colCount).getDisplayValues();
  let best = { row: 1, map: {}, score: 0, headers: [], valid: false };
  values.forEach(function (row, index) {
    const map = resolveHeaderMapWithAliases_(row, SWAB_HEADER_ALIASES);
    const validation = validateSwabHeaderMap_(map);
    if (Number(validation.valid) > Number(best.valid) ||
        (validation.valid === best.valid && validation.matched > best.score)) {
      best = {
        row: index + 1,
        map: map,
        score: validation.matched,
        headers: row,
        valid: validation.valid
      };
    }
  });
  return best;
}

function validateSwabHeaderMap_(map) {
  const matched = Object.keys(map).length;
  const labels = {
    date: 'DATE', shift: 'SHIFTT', category: 'CATEGORY', location: 'LOCATION',
    unit: 'KODE UNIT', hm: 'HM', socBefore: 'BATTERY BEFORE',
    timeIn: 'JAM IN UNIT', socAfter: 'BATTERY AFTER'
  };
  const missing = SWAB_REQUIRED_FIELDS.filter(function (field) {
    return map[field] === undefined;
  }).map(function (field) { return labels[field] || field; });
  if (matched < CONFIG.MIN_SWAB_IMPORT_COLUMNS) {
    missing.push('minimal ' + CONFIG.MIN_SWAB_IMPORT_COLUMNS + ' dari 14 kolom template DATA SWAB');
  }
  return { valid: missing.length === 0, missing: missing, matched: matched };
}

function swabSchemaError_(candidate, validation) {
  return new Error(
    'Struktur sheet data swab ' + candidate.sheet.getName() + ' belum sesuai. Kolom belum ditemukan: ' +
    validation.missing.join(', ') + '.'
  );
}

function resolveCycleTimeConfiguredSource_(ss) {
  const databaseConfig = loadDatabaseConfig_();
  const config = loadCycleTimeDatabaseConfig_();
  const configBelongsHere = Boolean(databaseConfig.spreadsheetId) && databaseConfig.spreadsheetId === ss.getId();
  const warnings = [];

  if (config.sheetId && configBelongsHere) {
    const sheet = getSheetById_(ss, config.sheetId);
    if (!sheet) {
      throw new Error(
        'Sheet Swab Cycle Time tersimpan tidak ditemukan. Import exchangeOrders sebagai tab ' +
        'pada spreadsheet yang sama lalu jalankan Setup / deteksi database.'
      );
    }
    const headerInfo = detectCycleTimeHeader_(sheet);
    const validation = validateCycleTimeHeaderMap_(headerInfo.map);
    if (!validation.valid) throw cycleTimeSchemaError_({ sheet: sheet }, validation);
    const signature = buildHeaderSignature_(headerInfo);
    if (config.headerSignature && config.headerSignature !== signature) {
      warnings.push('Struktur header Swab Cycle Time berubah sejak setup terakhir.');
    }
    if (config.headerRow && config.headerRow !== headerInfo.row) {
      warnings.push('Posisi header Swab Cycle Time berubah sejak setup terakhir.');
    }
    return { sheet: sheet, headerInfo: headerInfo, validation: validation, warning: warnings.join(' ') };
  }

  const detected = detectCycleTimeImportSheet_(ss);
  detected.warning = 'Data Swab Cycle Time dideteksi otomatis; jalankan Setup / deteksi database untuk mengunci koneksi.';
  return detected;
}

function detectCycleTimeImportSheet_(ss) {
  const databaseConfig = loadDatabaseConfig_();
  const config = loadCycleTimeDatabaseConfig_();
  const configBelongsHere = Boolean(databaseConfig.spreadsheetId) && databaseConfig.spreadsheetId === ss.getId();
  const preferredName = cleanText_(configBelongsHere && config.sheetName ? config.sheetName : 'Swab Time').toLowerCase();
  const candidates = ss.getSheets().map(function (sheet) {
    const headerInfo = detectCycleTimeHeader_(sheet);
    const validation = validateCycleTimeHeaderMap_(headerInfo.map);
    const normalizedName = normalizeKey_(sheet.getName());
    return {
      sheet: sheet,
      headerInfo: headerInfo,
      validation: validation,
      dataRows: Math.max(0, sheet.getLastRow() - headerInfo.row),
      configured: configBelongsHere && config.sheetId && String(sheet.getSheetId()) === String(config.sheetId),
      preferred: sheet.getName().toLowerCase() === preferredName ||
        /exchange orders|exchangeorders|swab cycle|swap cycle|cycle time|swab time|swap time/.test(normalizedName)
    };
  });

  const valid = candidates.filter(function (candidate) { return candidate.validation.valid; });
  valid.sort(function (a, b) {
    return Number(b.configured) - Number(a.configured) ||
      Number(b.preferred) - Number(a.preferred) ||
      b.validation.matched - a.validation.matched ||
      Number(b.dataRows > 0) - Number(a.dataRows > 0) ||
      b.dataRows - a.dataRows ||
      a.headerInfo.row - b.headerInfo.row ||
      a.sheet.getSheetId() - b.sheet.getSheetId();
  });
  if (valid.length) {
    return {
      sheet: valid[0].sheet,
      headerInfo: valid[0].headerInfo,
      validation: valid[0].validation
    };
  }

  candidates.sort(function (a, b) { return b.validation.matched - a.validation.matched; });
  const summary = candidates.slice(0, 3).map(function (candidate) {
    return candidate.sheet.getName() + ' (dikenali ' + candidate.validation.matched + '/19 kolom)';
  }).join('; ');
  throw new Error(
    'Sheet exchangeOrders / Swab Cycle Time yang valid belum ditemukan. Struktur wajib minimal: ' +
    'businessNo, vin, plate, stationName, timeDifference(s), down/up SOC, result, startTime, endTime. ' +
    (summary ? 'Kandidat: ' + summary : '')
  );
}

function detectCycleTimeHeader_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (!lastRow || !lastColumn) return { row: 1, map: {}, score: 0, headers: [], valid: false };

  const rowCount = Math.min(lastRow, CONFIG.HEADER_SCAN_ROWS);
  const colCount = Math.min(lastColumn, 60);
  const values = sheet.getRange(1, 1, rowCount, colCount).getDisplayValues();
  let best = { row: 1, map: {}, score: 0, headers: [], valid: false };
  values.forEach(function (row, index) {
    const map = resolveHeaderMapWithAliases_(row, CYCLE_TIME_HEADER_ALIASES);
    const validation = validateCycleTimeHeaderMap_(map);
    if (Number(validation.valid) > Number(best.valid) ||
        (validation.valid === best.valid && validation.matched > best.score)) {
      best = {
        row: index + 1,
        map: map,
        score: validation.matched,
        headers: row,
        valid: validation.valid
      };
    }
  });
  return best;
}

function validateCycleTimeHeaderMap_(map) {
  const matched = Object.keys(map).length;
  const labels = {
    businessNo: 'businessNo', vin: 'vin', unit: 'plate', station: 'stationName',
    durationSeconds: 'timeDifference(s)', downSoc: 'downBatterySoc(%)',
    upSoc: 'upBatterySoc(%)', result: 'changeResult', startTime: 'startTime', endTime: 'endTime'
  };
  const missing = CYCLE_TIME_REQUIRED_FIELDS.filter(function (field) {
    return map[field] === undefined;
  }).map(function (field) { return labels[field] || field; });
  if (matched < CONFIG.MIN_CYCLE_TIME_IMPORT_COLUMNS) {
    missing.push('minimal ' + CONFIG.MIN_CYCLE_TIME_IMPORT_COLUMNS + ' dari 19 kolom template exchangeOrders');
  }
  return { valid: missing.length === 0, missing: missing, matched: matched };
}

function cycleTimeSchemaError_(candidate, validation) {
  return new Error(
    'Struktur sheet Swab Cycle Time ' + candidate.sheet.getName() +
    ' belum sesuai. Kolom belum ditemukan: ' + validation.missing.join(', ') + '.'
  );
}

function validateHeaderMap_(map) {
  const matched = Object.keys(map).length;
  const labels = {
    order: 'order', startTime: 'Charging Start Time', endTime: 'Charging End Time',
    startSoc: 'Start SOC', endSoc: 'End SOC', location: 'LOKASI'
  };
  const missing = REQUIRED_FIELDS.filter(function (field) {
    return map[field] === undefined;
  }).map(function (field) { return labels[field] || field; });
  const hasEnergy = map.kwh !== undefined ||
    (map.startReading !== undefined && map.endReading !== undefined);
  if (!hasEnergy) missing.push('Charging Amount atau Start reading + End reading');
  if (matched < CONFIG.MIN_IMPORT_COLUMNS) {
    missing.push('minimal ' + CONFIG.MIN_IMPORT_COLUMNS + ' dari 16 kolom template import');
  }
  return {
    valid: missing.length === 0,
    missing: missing,
    matched: matched,
    hasEnergy: hasEnergy
  };
}

function schemaError_(candidate, validation) {
  return new Error(
    'Struktur sheet ' + candidate.sheet.getName() + ' belum sesuai. Kolom wajib yang belum ditemukan: ' +
    validation.missing.join(', ') + '.'
  );
}

function buildHeaderSignature_(headerInfo) {
  const signature = Object.keys(headerInfo.map).sort().map(function (field) {
    const index = headerInfo.map[field];
    return [field, index, normalizeKey_(headerInfo.headers[index])];
  });
  return digestHex_(Utilities.DigestAlgorithm.SHA_256, JSON.stringify({
    row: headerInfo.row,
    fields: signature
  }));
}

function digestHex_(algorithm, text) {
  return Utilities.computeDigest(algorithm, text).map(function (byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
}

function validateDatabase_() {
  try {
    const ss = getSpreadsheet_();
    const config = loadDatabaseConfig_();
    const swabConfig = loadSwabDatabaseConfig_();
    const cycleConfig = loadCycleTimeDatabaseConfig_();
    const source = resolveConfiguredSource_(ss);
    const validation = validateHeaderMap_(source.headerInfo.map);
    const swabSource = resolveSwabConfiguredSource_(ss);
    const swabValidation = validateSwabHeaderMap_(swabSource.headerInfo.map);
    const cycleSource = resolveCycleTimeConfiguredSource_(ss);
    const cycleValidation = validateCycleTimeHeaderMap_(cycleSource.headerInfo.map);
    const warnings = [];
    if (!config.spreadsheetId || !config.sheetId || !swabConfig.sheetId || !cycleConfig.sheetId) {
      warnings.push('Salah satu sumber belum dikunci melalui menu Setup / deteksi database.');
    }
    if (source.warning) warnings.push(source.warning);
    if (swabSource.warning) warnings.push(swabSource.warning);
    if (cycleSource.warning) warnings.push(cycleSource.warning);
    if (config.headerSignature && buildHeaderSignature_(source.headerInfo) !== config.headerSignature) {
      warnings.push('Sidik header berubah sejak setup terakhir.');
    }
    if (swabConfig.headerSignature && buildHeaderSignature_(swabSource.headerInfo) !== swabConfig.headerSignature) {
      warnings.push('Sidik header DATA SWAB berubah sejak setup terakhir.');
    }
    if (cycleConfig.headerSignature && buildHeaderSignature_(cycleSource.headerInfo) !== cycleConfig.headerSignature) {
      warnings.push('Sidik header Swab Cycle Time berubah sejak setup terakhir.');
    }
    return {
      success: true,
      valid: validation.valid && swabValidation.valid && cycleValidation.valid,
      spreadsheetName: ss.getName(),
      sheetName: source.sheet.getName(),
      headerRow: source.headerInfo.row,
      matchedColumns: validation.matched,
      sourceRows: Math.max(0, source.sheet.getLastRow() - source.headerInfo.row),
      swabSheetName: swabSource.sheet.getName(),
      swabHeaderRow: swabSource.headerInfo.row,
      swabMatchedColumns: swabValidation.matched,
      swabSourceRows: Math.max(0, swabSource.sheet.getLastRow() - swabSource.headerInfo.row),
      cycleTimeSheetName: cycleSource.sheet.getName(),
      cycleTimeHeaderRow: cycleSource.headerInfo.row,
      cycleTimeMatchedColumns: cycleValidation.matched,
      cycleTimeSourceRows: Math.max(0, cycleSource.sheet.getLastRow() - cycleSource.headerInfo.row),
      missing: validation.missing,
      warnings: uniqueSorted_(warnings),
      message: validation.valid && swabValidation.valid && cycleValidation.valid
        ? 'Ketiga sumber database valid.'
        : 'Struktur database belum valid.'
    };
  } catch (error) {
    return {
      success: false,
      valid: false,
      spreadsheetName: '',
      sheetName: '',
      headerRow: 0,
      matchedColumns: 0,
      sourceRows: 0,
      swabSheetName: '',
      swabHeaderRow: 0,
      swabMatchedColumns: 0,
      swabSourceRows: 0,
      cycleTimeSheetName: '',
      cycleTimeHeaderRow: 0,
      cycleTimeMatchedColumns: 0,
      cycleTimeSourceRows: 0,
      missing: [],
      warnings: [],
      message: error.message
    };
  }
}

function detectHeader_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (!lastRow || !lastColumn) return { row: 1, map: {}, score: 0, headers: [] };

  const rowCount = Math.min(lastRow, CONFIG.HEADER_SCAN_ROWS);
  const colCount = Math.min(lastColumn, 60);
  const values = sheet.getRange(1, 1, rowCount, colCount).getDisplayValues();
  let best = { row: 1, map: {}, score: 0, headers: [], valid: false };

  values.forEach(function (row, index) {
    const map = resolveHeaderMap_(row);
    const score = Object.keys(map).length;
    const valid = validateHeaderMap_(map).valid;
    if (Number(valid) > Number(best.valid) || (valid === best.valid && score > best.score)) {
      best = { row: index + 1, map: map, score: score, headers: row, valid: valid };
    }
  });
  return best;
}

function resolveHeaderMap_(headers) {
  return resolveHeaderMapWithAliases_(headers, HEADER_ALIASES);
}

function resolveHeaderMapWithAliases_(headers, aliases) {
  const aliasLookup = {};
  Object.keys(aliases).forEach(function (field) {
    aliases[field].forEach(function (alias) {
      aliasLookup[normalizeKey_(alias)] = field;
    });
  });

  const map = {};
  headers.forEach(function (header, index) {
    const field = aliasLookup[normalizeKey_(header)];
    if (field && map[field] === undefined) map[field] = index;
  });
  return map;
}

function readNormalizedRecords_(sheet, headerInfo) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const dataRowCount = Math.max(0, lastRow - headerInfo.row);
  const records = [];
  let skippedWithoutDate = 0;
  let duplicateOrders = 0;
  const seenOrders = {};

  if (!dataRowCount) {
    return {
      records: [],
      meta: {
        sheetName: sheet.getName(),
        headerRow: headerInfo.row,
        sourceRows: 0,
        parsedRows: 0,
        skippedRows: 0,
        minDate: '',
        maxDate: ''
      }
    };
  }

  const dataRange = sheet.getRange(headerInfo.row + 1, 1, dataRowCount, lastColumn);
  const values = dataRange.getValues();
  // ID order dapat berisi 17–18 digit. Display value menjaga ID tetap sebagai string.
  const displayValues = dataRange.getDisplayValues();
  const map = headerInfo.map;

  values.forEach(function (row, offset) {
    if (row.every(function (value) { return value === '' || value === null; })) return;
    const displayRow = displayValues[offset];

    const startTime = parseDateValue_(valueAt_(row, map.startTime));
    const endTime = parseDateValue_(valueAt_(row, map.endTime));
    const eventTime = CONFIG.REPORT_DATE_BASIS === 'START'
      ? (startTime || endTime)
      : (endTime || startTime);

    if (!eventTime) {
      skippedWithoutDate++;
      return;
    }

    const calculatedDuration = startTime && endTime
      ? (endTime.getTime() - startTime.getTime()) / 3600000
      : null;
    const textDuration = parseDurationHours_(valueAt_(row, map.duration));
    const durationHours = isFinitePositive_(calculatedDuration)
      ? calculatedDuration
      : textDuration;
    const validDuration = isFinitePositive_(durationHours) &&
      durationHours <= CONFIG.MAX_REASONABLE_DURATION_HOURS;

    const startSoc = toNumber_(valueAt_(row, map.startSoc));
    const endSoc = toNumber_(valueAt_(row, map.endSoc));
    const startReading = toNumber_(valueAt_(row, map.startReading));
    const endReading = toNumber_(valueAt_(row, map.endReading));
    let kwh = toNumber_(valueAt_(row, map.kwh));
    if (!isFiniteNumber_(kwh) && isFiniteNumber_(startReading) && isFiniteNumber_(endReading)) {
      kwh = endReading - startReading;
    }

    const location = canonicalLocation_(valueAt_(displayRow, map.location));
    const charger = cleanText_(valueAt_(displayRow, map.charger)) || '-';
    const meter = cleanText_(valueAt_(displayRow, map.meter)) || '-';
    const truck = cleanText_(valueAt_(displayRow, map.truck)) || '-';
    const battery = cleanText_(valueAt_(displayRow, map.battery)) || '-';
    const order = cleanText_(valueAt_(displayRow, map.order)) ||
      ('ROW-' + (headerInfo.row + 1 + offset));
    if (seenOrders[order]) {
      duplicateOrders++;
      return;
    }
    seenOrders[order] = true;
    const socGain = isFiniteNumber_(startSoc) && isFiniteNumber_(endSoc)
      ? endSoc - startSoc
      : null;
    const validEnergy = isFiniteNumber_(kwh) && kwh >= 0;
    const validSoc = isSoc_(startSoc) && isSoc_(endSoc) && endSoc >= startSoc;
    const power = validEnergy && validDuration ? kwh / durationHours : null;
    const durationTextIssue = valueAt_(row, map.duration) !== '' &&
      valueAt_(row, map.duration) !== null &&
      (!isFinitePositive_(textDuration) ||
        (isFinitePositive_(calculatedDuration) && Math.abs(textDuration - calculatedDuration) > (2 / 3600)));

    records.push({
      sourceRow: headerInfo.row + 1 + offset,
      order: order,
      vin: cleanText_(valueAt_(displayRow, map.vin)) || '-',
      truck: truck,
      charger: charger,
      battery: battery,
      meter: meter,
      location: location,
      startTime: startTime,
      endTime: endTime,
      eventTime: eventTime,
      dateKey: formatDateKey_(eventTime),
      eventHour: Number(Utilities.formatDate(eventTime, CONFIG.TIMEZONE, 'H')),
      durationHours: validDuration ? durationHours : null,
      rawDurationHours: durationHours,
      startSoc: startSoc,
      endSoc: endSoc,
      socGain: socGain,
      kwh: validEnergy ? kwh : null,
      power: power,
      startReading: startReading,
      endReading: endReading,
      validDuration: validDuration,
      validEnergy: validEnergy,
      validSoc: validSoc,
      durationTextIssue: durationTextIssue,
      missingUnit: isMissingIdentifier_(truck),
      missingBattery: isMissingIdentifier_(battery),
      energyMismatch: validEnergy && isFiniteNumber_(startReading) && isFiniteNumber_(endReading)
        ? Math.abs((endReading - startReading) - kwh) > 0.05
        : false,
      socFillMismatch: validSoc && isFiniteNumber_(toNumber_(valueAt_(row, map.socFill)))
        ? Math.abs((endSoc - startSoc) - toNumber_(valueAt_(row, map.socFill))) > 0.1
        : false,
      portLabel: shortLocation_(location) + ' · C' + charger + '/P' + meter
    });
  });

  const dates = records.map(function (record) { return record.dateKey; }).sort();
  return {
    records: records,
    meta: {
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName(),
      headerRow: headerInfo.row,
      sourceRows: dataRowCount,
      parsedRows: records.length,
      skippedRows: skippedWithoutDate,
      duplicateOrders: duplicateOrders,
      minDate: dates.length ? dates[0] : '',
      maxDate: dates.length ? dates[dates.length - 1] : '',
      dateBasis: CONFIG.REPORT_DATE_BASIS,
      dateBasisLabel: CONFIG.REPORT_DATE_BASIS === 'START'
        ? 'Charging Start Time'
        : 'Charging End Time'
    }
  };
}

function buildFilterOptions_(records, meta) {
  return {
    minDate: meta.minDate,
    maxDate: meta.maxDate,
    locations: uniqueSorted_(ROM_LOCATIONS.concat(records.map(function (r) { return r.location; }))),
    chargers: uniqueSorted_(records.map(function (r) { return r.charger; })),
    meters: uniqueSorted_(records.map(function (r) { return r.meter; })),
    trucks: uniqueSorted_(records
      .filter(function (r) { return !r.missingUnit; })
      .map(function (r) { return r.truck; })),
    batteries: uniqueSorted_(records
      .filter(function (r) { return !isMissingIdentifier_(r.battery); })
      .map(function (r) { return r.battery; })),
    targetStartSoc: CONFIG.TARGET_START_SOC,
    targetEndSoc: CONFIG.TARGET_END_SOC,
    dateBasisLabel: meta.dateBasisLabel
  };
}

function normalizeFilters_(raw, options) {
  options = options || {};
  let s = validDateKey_(raw.startDate) ? raw.startDate : '';
  let e = validDateKey_(raw.endDate) ? raw.endDate : '';
  if (s && !e) {
    e = s;
  } else if (!s && e) {
    s = e;
  } else if (!s && !e) {
    s = options.minDate || '';
    e = options.maxDate || '';
  } else if (s && e && s > e) {
    const swap = s;
    s = e;
    e = swap;
  }

  return {
    startDate: s,
    endDate: e,
    location: normalizeOption_(raw.location),
    charger: normalizeOption_(raw.charger),
    meter: normalizeOption_(raw.meter),
    truck: normalizeOption_(raw.truck),
    battery: normalizeOption_(raw.battery)
  };
}

function applyFilters_(records, filters) {
  return records.filter(function (record) {
    if (filters.startDate && record.dateKey < filters.startDate) return false;
    if (filters.endDate && record.dateKey > filters.endDate) return false;
    if (filters.location && record.location !== filters.location) return false;
    if (filters.charger && record.charger !== filters.charger) return false;
    if (filters.meter && record.meter !== filters.meter) return false;
    if (filters.truck && record.truck !== filters.truck) return false;
    if (filters.battery && record.battery !== filters.battery) return false;
    return true;
  });
}

function buildDashboardPayload_(records, meta, options, appliedFilters) {
  const kpis = summarizeRecords_(records);
  const trends = {
    daily: aggregateTrend_(records, 'daily'),
    weekly: aggregateTrend_(records, 'weekly'),
    monthly: aggregateTrend_(records, 'monthly')
  };
  const romComparison = buildRomComparison_(records);
  const quality = buildQualitySummary_(records, meta);
  const rankings = {
    trucks: buildRanking_(records, 'truck', 8, true),
    batteries: buildRanking_(records, 'battery', 8, true)
  };
  const performance = {
    ports: buildPortPerformance_(records),
    hourly: buildHourlyProfile_(records),
    durationDistribution: buildDurationDistribution_(records),
    startSocDistribution: buildStartSocDistribution_(records)
  };

  return {
    success: true,
    empty: records.length === 0,
    source: {
      spreadsheetName: meta.spreadsheetName,
      sheetName: meta.sheetName,
      sourceRows: meta.sourceRows,
      parsedRows: meta.parsedRows,
      filteredRows: records.length,
      skippedRows: meta.skippedRows,
      duplicateOrders: meta.duplicateOrders,
      minDate: meta.minDate,
      maxDate: meta.maxDate,
      dateBasis: meta.dateBasis,
      dateBasisLabel: meta.dateBasisLabel
    },
    options: options,
    appliedFilters: appliedFilters,
    kpis: kpis,
    trends: trends,
    romComparison: romComparison,
    rankings: rankings,
    performance: performance,
    quality: quality,
    insights: buildInsights_(records, kpis, trends.daily, romComparison, performance.ports, quality),
    recentSessions: buildRecentSessions_(records)
  };
}

function summarizeRecords_(records) {
  const durationRows = records.filter(function (r) { return r.validDuration; });
  const energyRows = records.filter(function (r) { return r.validEnergy; });
  const powerRows = records.filter(function (r) {
    return r.validDuration && r.validEnergy;
  });
  const startSocValues = records.filter(function (r) { return isSoc_(r.startSoc); })
    .map(function (r) { return r.startSoc; });
  const endSocValues = records.filter(function (r) { return isSoc_(r.endSoc); })
    .map(function (r) { return r.endSoc; });
  const socGainValues = records.filter(function (r) {
    return r.validSoc && isFiniteNumber_(r.socGain);
  }).map(function (r) { return r.socGain; });

  const totalKwh = sum_(energyRows.map(function (r) { return r.kwh; }));
  const totalDurationHours = sum_(powerRows.map(function (r) { return r.durationHours; }));
  const powerEnergy = sum_(powerRows.map(function (r) { return r.kwh; }));
  const totalSocGain = sum_(socGainValues);
  const validEndSocCount = endSocValues.length;
  const targetCompletionCount = records.filter(function (r) {
    return isSoc_(r.endSoc) && r.endSoc >= CONFIG.TARGET_END_SOC;
  }).length;
  const uniqueDays = uniqueSorted_(records.map(function (r) { return r.dateKey; })).length;

  return {
    sessions: records.length,
    totalKwh: round_(totalKwh, 2),
    totalDurationHours: round_(sum_(durationRows.map(function (r) { return r.durationHours; })), 2),
    avgStartSoc: round_(mean_(startSocValues), 2),
    avgEndSoc: round_(mean_(endSocValues), 2),
    avgSocGain: round_(mean_(socGainValues), 2),
    avgDurationMinutes: round_(mean_(durationRows.map(function (r) { return r.durationHours * 60; })), 2),
    medianDurationMinutes: round_(median_(durationRows.map(function (r) { return r.durationHours * 60; })), 2),
    avgPower: round_(safeDivide_(powerEnergy, totalDurationHours), 2),
    avgKwhPerSession: round_(safeDivide_(totalKwh, energyRows.length), 2),
    kwhPerSocPoint: round_(safeDivide_(totalKwh, totalSocGain), 3),
    sessionsPerDay: round_(safeDivide_(records.length, uniqueDays), 2),
    completionRate: round_(safeDivide_(targetCompletionCount * 100, validEndSocCount), 2),
    belowTargetEndCount: Math.max(0, validEndSocCount - targetCompletionCount),
    lowStartSocRate: round_(safeDivide_(records.filter(function (r) {
      return isSoc_(r.startSoc) && r.startSoc < CONFIG.TARGET_START_SOC;
    }).length * 100, startSocValues.length), 2),
    activeDays: uniqueDays,
    targetStartSoc: CONFIG.TARGET_START_SOC,
    targetEndSoc: CONFIG.TARGET_END_SOC
  };
}

function aggregateTrend_(records, period) {
  const groups = {};
  records.forEach(function (record) {
    const descriptor = periodDescriptor_(record.dateKey, period);
    if (!groups[descriptor.key]) {
      groups[descriptor.key] = {
        key: descriptor.key,
        label: descriptor.label,
        records: [],
        romCounts: {}
      };
    }
    groups[descriptor.key].records.push(record);
    groups[descriptor.key].romCounts[record.location] =
      (groups[descriptor.key].romCounts[record.location] || 0) + 1;
  });

  return Object.keys(groups).sort().map(function (key) {
    const group = groups[key];
    const summary = summarizeRecords_(group.records);
    return {
      key: group.key,
      label: group.label,
      sessions: summary.sessions,
      totalKwh: summary.totalKwh,
      avgPower: summary.avgPower,
      avgDurationMinutes: summary.avgDurationMinutes,
      avgStartSoc: summary.avgStartSoc,
      avgEndSoc: summary.avgEndSoc,
      avgSocGain: summary.avgSocGain,
      avgKwhPerSession: summary.avgKwhPerSession,
      completionRate: summary.completionRate,
      romA1: group.romCounts['ROM A1'] || 0,
      // Retain the original aggregate fields for compatibility.
      romA2: Object.keys(group.romCounts).filter(function (location) {
        return location === 'ROM A2' || /^ROM A2 Swap \d+$/.test(location);
      }).reduce(function (total, location) { return total + group.romCounts[location]; }, 0),
      romCounts: Object.assign({}, group.romCounts),
      romA2Swap01: group.romCounts['ROM A2 Swap 01'] || 0,
      romA2Swap03: group.romCounts['ROM A2 Swap 03'] || 0
    };
  });
}

function buildRomComparison_(records) {
  const groups = groupBy_(records, function (r) { return r.location || 'UNKNOWN'; });
  return Object.keys(groups).sort(naturalSort_).map(function (location) {
    const rows = groups[location];
    const summary = summarizeRecords_(rows);
    return {
      location: location,
      sessions: summary.sessions,
      sharePct: round_(safeDivide_(summary.sessions * 100, records.length), 2),
      totalKwh: summary.totalKwh,
      avgKwhPerSession: summary.avgKwhPerSession,
      avgDurationMinutes: summary.avgDurationMinutes,
      avgPower: summary.avgPower,
      avgStartSoc: summary.avgStartSoc,
      avgEndSoc: summary.avgEndSoc,
      completionRate: summary.completionRate
    };
  });
}

function buildRanking_(records, field, limit, excludeMissing) {
  const eligible = records.filter(function (record) {
    return !excludeMissing || !isMissingIdentifier_(record[field]);
  });
  const groups = groupBy_(eligible, function (record) { return record[field]; });
  return Object.keys(groups).map(function (label) {
    const rows = groups[label];
    const summary = summarizeRecords_(rows);
    return {
      label: label,
      sessions: summary.sessions,
      totalKwh: summary.totalKwh,
      avgDurationMinutes: summary.avgDurationMinutes,
      avgPower: summary.avgPower,
      avgStartSoc: summary.avgStartSoc,
      avgEndSoc: summary.avgEndSoc
    };
  }).sort(function (a, b) {
    return b.sessions - a.sessions || b.totalKwh - a.totalKwh;
  }).slice(0, limit);
}

function buildPortPerformance_(records) {
  const groups = groupBy_(records, function (r) {
    return [r.location, r.charger, r.meter].join('|');
  });
  return Object.keys(groups).map(function (key) {
    const rows = groups[key];
    const summary = summarizeRecords_(rows);
    return {
      key: key,
      label: rows[0].portLabel,
      location: rows[0].location,
      charger: rows[0].charger,
      meter: rows[0].meter,
      sessions: summary.sessions,
      totalKwh: summary.totalKwh,
      avgDurationMinutes: summary.avgDurationMinutes,
      avgPower: summary.avgPower,
      completionRate: summary.completionRate
    };
  }).sort(function (a, b) {
    return naturalSort_(a.label, b.label);
  });
}

function buildHourlyProfile_(records) {
  const buckets = Array.from({ length: 24 }, function (_, hour) {
    return { hour: hour, label: pad2_(hour) + ':00', sessions: 0, totalKwh: 0, durationHours: 0 };
  });

  records.forEach(function (record) {
    const bucket = buckets[record.eventHour];
    if (!bucket) return;
    bucket.sessions++;
    if (record.validEnergy) bucket.totalKwh += record.kwh;
    if (record.validDuration && record.validEnergy) bucket.durationHours += record.durationHours;
  });

  return buckets.map(function (bucket) {
    return {
      hour: bucket.hour,
      label: bucket.label,
      sessions: bucket.sessions,
      totalKwh: round_(bucket.totalKwh, 2),
      avgPower: round_(safeDivide_(bucket.totalKwh, bucket.durationHours), 2)
    };
  });
}

function buildDurationDistribution_(records) {
  const buckets = [
    { label: '< 60 mnt', min: 0, max: 60, count: 0 },
    { label: '60–75 mnt', min: 60, max: 75, count: 0 },
    { label: '76–90 mnt', min: 75, max: 90, count: 0 },
    { label: '91–120 mnt', min: 90, max: 120, count: 0 },
    { label: '> 120 mnt', min: 120, max: Infinity, count: 0 }
  ];

  records.forEach(function (record) {
    if (!record.validDuration) return;
    const minutes = record.durationHours * 60;
    const bucket = buckets.find(function (item, index) {
      if (index === 0) return minutes < item.max;
      return minutes >= item.min && minutes <= item.max;
    });
    if (bucket) bucket.count++;
  });

  const validCount = sum_(buckets.map(function (b) { return b.count; }));
  return buckets.map(function (bucket) {
    return {
      label: bucket.label,
      count: bucket.count,
      percentage: round_(safeDivide_(bucket.count * 100, validCount), 2)
    };
  });
}

function buildStartSocDistribution_(records) {
  const buckets = [
    { label: '< 20%', min: -Infinity, max: 20, count: 0 },
    { label: '20–29%', min: 20, max: 30, count: 0 },
    { label: '30–39%', min: 30, max: 40, count: 0 },
    { label: '≥ 40%', min: 40, max: Infinity, count: 0 }
  ];
  records.forEach(function (record) {
    if (!isSoc_(record.startSoc)) return;
    const bucket = buckets.find(function (item) {
      return record.startSoc >= item.min && record.startSoc < item.max;
    });
    if (bucket) bucket.count++;
  });
  const validCount = sum_(buckets.map(function (b) { return b.count; }));
  return buckets.map(function (bucket) {
    return {
      label: bucket.label,
      count: bucket.count,
      percentage: round_(safeDivide_(bucket.count * 100, validCount), 2)
    };
  });
}

function buildQualitySummary_(records, meta) {
  const invalidSoc = records.filter(function (r) { return !r.validSoc; }).length;
  const invalidDuration = records.filter(function (r) { return !r.validDuration; }).length;
  const invalidEnergy = records.filter(function (r) { return !r.validEnergy; }).length;
  const missingUnit = records.filter(function (r) { return r.missingUnit; }).length;
  const missingBattery = records.filter(function (r) { return r.missingBattery; }).length;
  const malformedDurationText = records.filter(function (r) { return r.durationTextIssue; }).length;
  const energyMismatch = records.filter(function (r) { return r.energyMismatch; }).length;
  const socFillMismatch = records.filter(function (r) { return r.socFillMismatch; }).length;
  const suspiciousShortSession = records.filter(function (r) {
    return r.validDuration && r.durationHours * 60 < 10;
  }).length;
  const nonPositiveSocGain = records.filter(function (r) {
    return isFiniteNumber_(r.socGain) && r.socGain <= 0;
  }).length;
  const coreValid = records.filter(function (r) {
    return r.validSoc && r.validDuration && r.validEnergy;
  }).length;

  return {
    score: round_(safeDivide_(coreValid * 100, records.length), 2),
    coreValidRows: coreValid,
    invalidSoc: invalidSoc,
    invalidDuration: invalidDuration,
    invalidEnergy: invalidEnergy,
    missingUnit: missingUnit,
    missingBattery: missingBattery,
    malformedDurationText: malformedDurationText,
    recoveredDurationRows: Math.max(0, malformedDurationText - invalidDuration),
    suspiciousShortSession: suspiciousShortSession,
    nonPositiveSocGain: nonPositiveSocGain,
    energyMismatch: energyMismatch,
    socFillMismatch: socFillMismatch,
    duplicateOrders: meta.duplicateOrders || 0,
    skippedRows: meta.skippedRows
  };
}

function buildInsights_(records, kpis, dailyTrend, romComparison, ports, quality) {
  if (!records.length) {
    return [{
      tone: 'warning',
      eyebrow: 'Filter',
      title: 'Tidak ada data pada kombinasi filter ini',
      text: 'Perluas rentang tanggal atau reset filter ROM, charger, port, unit, dan battery.'
    }];
  }

  const insights = [];
  const busiest = maxBy_(dailyTrend, 'sessions');
  if (busiest) {
    const lift = kpis.sessionsPerDay
      ? ((busiest.sessions / kpis.sessionsPerDay) - 1) * 100
      : 0;
    insights.push({
      tone: 'info',
      eyebrow: 'Peak operation',
      title: busiest.label + ' mencatat ' + formatNumberId_(busiest.sessions, 0) + ' swap',
      text: 'Hari tersibuk berada ' + formatNumberId_(Math.abs(lift), 1) + '% ' +
        (lift >= 0 ? 'di atas' : 'di bawah') + ' rata-rata ' +
        formatNumberId_(kpis.sessionsPerDay, 1) + ' swap per hari.'
    });
  }

  if (romComparison.length >= 2) {
    const sortedRom = romComparison.slice().sort(function (a, b) { return b.sessions - a.sessions; });
    const lead = sortedRom[0];
    const second = sortedRom[1];
    insights.push({
      tone: Math.abs(lead.sharePct - second.sharePct) <= 5 ? 'positive' : 'warning',
      eyebrow: 'ROM balance',
      title: lead.location + ' unggul ' + formatNumberId_(lead.sessions - second.sessions, 0) + ' swap',
      text: lead.location + ' berkontribusi ' + formatNumberId_(lead.sharePct, 1) +
        '% dan ' + second.location + ' ' + formatNumberId_(second.sharePct, 1) +
        '% dari total frekuensi.'
    });

    const powerLead = sortedRom.slice().sort(function (a, b) { return b.avgPower - a.avgPower; })[0];
    const powerOther = sortedRom.find(function (item) { return item.location !== powerLead.location; });
    const gapPct = powerOther && powerOther.avgPower
      ? ((powerLead.avgPower / powerOther.avgPower) - 1) * 100
      : 0;
    insights.push({
      tone: 'info',
      eyebrow: 'Charging performance',
      title: powerLead.location + ' memiliki power rata-rata tertinggi',
      text: formatNumberId_(powerLead.avgPower, 1) + ' kW, sekitar ' +
        formatNumberId_(Math.abs(gapPct), 1) + '% dibanding ROM lainnya.'
    });
  }

  insights.push({
    tone: kpis.completionRate >= 90 ? 'positive' : 'warning',
    eyebrow: 'SOC completion',
    title: formatNumberId_(kpis.completionRate, 1) + '% sesi selesai pada SOC ≥ ' + CONFIG.TARGET_END_SOC + '%',
    text: formatNumberId_(kpis.belowTargetEndCount, 0) +
      ' sesi masih selesai di bawah target, dengan rata-rata SOC akhir ' +
      formatNumberId_(kpis.avgEndSoc, 1) + '%.'
  });

  const bestPort = ports.filter(function (port) { return port.sessions >= 5; })
    .sort(function (a, b) { return b.avgPower - a.avgPower; })[0];
  if (bestPort) {
    insights.push({
      tone: 'neutral',
      eyebrow: 'Best port',
      title: bestPort.label + ' mencapai ' + formatNumberId_(bestPort.avgPower, 1) + ' kW',
      text: 'Dihitung dari ' + formatNumberId_(bestPort.sessions, 0) +
        ' sesi dengan durasi rata-rata ' + formatNumberId_(bestPort.avgDurationMinutes, 1) + ' menit.'
    });
  }

  if (quality.malformedDurationText > 0 || quality.missingUnit > 0) {
    insights.push({
      tone: 'warning',
      eyebrow: 'Data quality',
      title: formatNumberId_(quality.malformedDurationText, 0) + ' teks durasi diperbaiki dari timestamp',
      text: formatNumberId_(quality.missingUnit, 0) +
        ' sesi belum memiliki Truck No yang valid. KPI durasi menggunakan selisih waktu mulai dan selesai.'
    });
  }

  return insights.slice(0, 6);
}

function buildRecentSessions_(records) {
  return records.slice().sort(function (a, b) {
    return b.eventTime.getTime() - a.eventTime.getTime();
  }).slice(0, CONFIG.MAX_TABLE_ROWS).map(function (record) {
    return {
      order: record.order,
      eventTime: formatDateTime_(record.eventTime),
      location: record.location,
      truck: record.truck,
      battery: record.battery,
      port: 'C' + record.charger + '/P' + record.meter,
      startSoc: isSoc_(record.startSoc) ? round_(record.startSoc, 1) : null,
      endSoc: isSoc_(record.endSoc) ? round_(record.endSoc, 1) : null,
      socGain: isFiniteNumber_(record.socGain) ? round_(record.socGain, 1) : null,
      durationMinutes: record.validDuration ? round_(record.durationHours * 60, 1) : null,
      kwh: record.validEnergy ? round_(record.kwh, 2) : null,
      avgPower: isFiniteNumber_(record.power) ? round_(record.power, 2) : null,
      status: record.validSoc && record.validDuration && record.validEnergy ? 'Valid' : 'Check'
    };
  });
}

function periodDescriptor_(dateKey, period) {
  const parts = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

  if (period === 'monthly') {
    return {
      key: dateKey.slice(0, 7),
      label: monthShortId_(parts[1] - 1) + ' ' + parts[0]
    };
  }

  if (period === 'weekly') {
    const day = utcDate.getUTCDay();
    const distanceToMonday = (day + 6) % 7;
    const monday = new Date(utcDate.getTime() - distanceToMonday * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const key = [
      monday.getUTCFullYear(),
      pad2_(monday.getUTCMonth() + 1),
      pad2_(monday.getUTCDate())
    ].join('-');
    return {
      key: key,
      label: 'W' + isoWeekNumber_(utcDate) + ' · ' +
        pad2_(monday.getUTCDate()) + ' ' + monthShortId_(monday.getUTCMonth()) +
        '–' + pad2_(sunday.getUTCDate()) + ' ' + monthShortId_(sunday.getUTCMonth())
    };
  }

  return {
    key: dateKey,
    label: pad2_(parts[2]) + ' ' + monthShortId_(parts[1] - 1)
  };
}

function isoWeekNumber_(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function parseDateValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number' && isFinite(value)) {
    // Dukungan serial date Excel/Google Sheets.
    if (value > 20000 && value < 100000) {
      return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    }
    if (value > 100000000000) return new Date(value);
  }

  const text = cleanText_(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    return makeZonedDate_(
      Number(match[1]), Number(match[2]), Number(match[3]),
      Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)
    );
  }

  match = text.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    // Format lokal Indonesia: dd/MM/yyyy.
    return makeZonedDate_(
      Number(match[3]), Number(match[2]), Number(match[1]),
      Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)
    );
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function makeZonedDate_(year, month, day, hour, minute, second) {
  const text = [
    year + '-' + pad2_(month) + '-' + pad2_(day),
    pad2_(hour) + ':' + pad2_(minute) + ':' + pad2_(second)
  ].join(' ');
  try {
    return Utilities.parseDate(text, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    return null;
  }
}

function parseDurationHours_(value) {
  if (value === null || value === '') return null;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
  }
  if (typeof value === 'number' && isFinite(value)) {
    // Google Sheets menyimpan durasi sebagai fraksi hari.
    return value <= 10 ? value * 24 : value;
  }
  const text = cleanText_(value);
  const match = text.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return null;
  return hours + minutes / 60 + seconds / 3600;
}

function buildCacheKey_(sheet, filters, headerInfo) {
  const buster = PropertiesService.getScriptProperties().getProperty('DASHBOARD_CACHE_BUSTER') || '0';
  const signature = JSON.stringify(sanitizeCacheFilters_(filters));
  const digest = digestHex_(Utilities.DigestAlgorithm.MD5, signature);
  const spreadsheetDigest = digestHex_(
    Utilities.DigestAlgorithm.MD5,
    sheet.getParent().getId()
  ).slice(0, 12);
  const headerSignature = buildHeaderSignature_(headerInfo || detectHeader_(sheet));
  return [
    'evdash', CONFIG.APP_VERSION, buster,
    spreadsheetDigest, sheet.getSheetId(), headerSignature.slice(0, 16),
    sheet.getLastRow(), sheet.getLastColumn(), digest
  ].join(':');
}

function sanitizeCacheFilters_(filters) {
  const source = filters && typeof filters === 'object' ? filters : {};
  return [
    'startDate', 'endDate', 'location', 'station', 'charger', 'meter', 'truck', 'plate',
    'battery', 'downBattery', 'unit', 'vin', 'shift', 'status', 'slaStatus', 'result',
    'downCompartment', 'upCompartment'
  ]
    .reduce(function (result, key) {
      const value = source[key];
      result[key] = (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ? String(value).slice(0, 120)
        : '';
      return result;
    }, {});
}

function canonicalLocation_(value) {
  const text = cleanText_(value).toUpperCase().replace(/\s+/g, ' ');
  if (!text) return 'UNKNOWN';
  const normalized = text.replace(/[_\-–—/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const area = normalized.match(/\b(?:ROM|ROOM)\s*A?\s*([12])(?=$|[^0-9])/) ||
    normalized.match(/^A\s*([12])(?=$|[^0-9])/);
  if (!area) return text;
  if (area[1] === '1') return 'ROM A1';
  const swap = normalized.match(/\bSWA[PB]\s*(?:STATION\s*)?(?:NO\.?\s*)?0*(\d+)\b/);
  if (swap) return 'ROM A2 Swap ' + String(Number(swap[1])).padStart(2, '0');
  // A2 without a station number remains a separate legacy bucket.
  // Never infer Swap 01/03 from a charger, battery or compartment number.
  return 'ROM A2';
}

function shortLocation_(location) {
  return cleanText_(location).replace(/^ROM\s+/i, '');
}

function normalizeKey_(value) {
  return cleanText_(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[%()_\-\/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeOption_(value) {
  const text = cleanText_(value);
  return !text || text === 'ALL' ? '' : text;
}

function valueAt_(row, index) {
  return index === undefined ? '' : row[index];
}

function cleanText_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (value === null || value === '') return null;
  let text = cleanText_(value).replace(/\s/g, '');
  if (!text) return null;

  // Mendukung 297.37, 297,37, dan pemisah ribuan yang umum.
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    text = text.replace(/,/g, '');
  } else if (/^-?\d+,\d+$/.test(text)) {
    text = text.replace(',', '.');
  }

  const number = Number(text);
  return isFinite(number) ? number : null;
}

function isSoc_(value) {
  return isFiniteNumber_(value) && value >= 0 && value <= 100;
}

function isFiniteNumber_(value) {
  return typeof value === 'number' && isFinite(value);
}

function isFinitePositive_(value) {
  return isFiniteNumber_(value) && value > 0;
}

function isMissingIdentifier_(value) {
  const text = cleanText_(value).toUpperCase();
  return !text || text === '-' || text === 'N/A' || text === 'NA' || text === 'NULL';
}

function validDateKey_(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(cleanText_(value));
}

function formatDateKey_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function formatDateTime_(date) {
  if (!date || isNaN(date.getTime())) return '-';
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
}

function monthShortId_(monthIndex) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][monthIndex];
}

function formatNumberId_(value, decimals) {
  if (!isFiniteNumber_(value)) return '0';
  const fixed = value.toFixed(decimals || 0).split('.');
  fixed[0] = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fixed.length > 1 ? fixed[0] + ',' + fixed[1] : fixed[0];
}

function uniqueSorted_(values) {
  const seen = {};
  values.forEach(function (value) {
    const text = cleanText_(value);
    if (text) seen[text] = true;
  });
  return Object.keys(seen).sort(naturalSort_);
}

function naturalSort_(a, b) {
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
}

function groupBy_(records, keyFunction) {
  return records.reduce(function (groups, record) {
    const key = String(keyFunction(record));
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {});
}

function maxBy_(items, field) {
  if (!items || !items.length) return null;
  return items.reduce(function (best, item) {
    return !best || Number(item[field]) > Number(best[field]) ? item : best;
  }, null);
}

function sum_(values) {
  return values.reduce(function (total, value) {
    return total + (isFiniteNumber_(value) ? value : 0);
  }, 0);
}

function mean_(values) {
  const valid = values.filter(isFiniteNumber_);
  return valid.length ? sum_(valid) / valid.length : 0;
}

function median_(values) {
  const valid = values.filter(isFiniteNumber_).sort(function (a, b) { return a - b; });
  if (!valid.length) return 0;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}

function safeDivide_(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function round_(value, decimals) {
  if (!isFiniteNumber_(value)) return 0;
  const factor = Math.pow(10, decimals || 0);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function pad2_(value) {
  return String(value).padStart(2, '0');
}

/**
 * Endpoint dashboard Ketahanan Battery.
 * Pairing HM selalu dibentuk pada seluruh histori sebelum filter diterapkan agar
 * event pertama pada rentang terpilih tetap dapat memakai HM sebelumnya.
 */
function getBatteryDashboardData(filters) {
  const startedAt = Date.now();
  const ss = getSpreadsheet_();
  const sourceRef = resolveSwabConfiguredSource_(ss);
  const sheet = sourceRef.sheet;
  const rawFilters = filters || {};
  const cacheKey = buildCacheKey_(sheet, rawFilters, sourceRef.headerInfo) + ':battery';
  const cache = CacheService.getScriptCache();
  const cacheEnabled = loadDatabaseConfig_().mode !== 'STANDALONE';
  const cached = cacheEnabled && !rawFilters.forceRefresh ? cache.get(cacheKey) : null;

  if (cached) {
    const cachedPayload = JSON.parse(cached);
    cachedPayload.runtime = cachedPayload.runtime || {};
    cachedPayload.runtime.cacheHit = true;
    cachedPayload.runtime.responseMs = Date.now() - startedAt;
    return cachedPayload;
  }

  const source = readBatteryEnduranceSource_(sheet, sourceRef.headerInfo);
  const options = buildBatteryFilterOptions_(source.records, source.cycles, source.meta);
  const appliedFilters = normalizeBatteryFilters_(rawFilters, options);
  const filteredRecords = applyBatteryRecordFilters_(source.records, appliedFilters);
  const filteredCycles = applyBatteryCycleFilters_(source.cycles, appliedFilters);
  const payload = buildBatteryPayload_(source, filteredRecords, filteredCycles, options, appliedFilters);

  if (sourceRef.warning) payload.source.databaseWarning = sourceRef.warning;
  payload.generatedAt = formatDateTime_(new Date());
  payload.runtime = {
    cacheHit: false,
    responseMs: Date.now() - startedAt,
    appVersion: CONFIG.APP_VERSION
  };

  if (cacheEnabled) {
    try {
      const serialized = JSON.stringify(payload);
      if (Utilities.newBlob(serialized).getBytes().length < 95000) {
        cache.put(cacheKey, serialized, CONFIG.CACHE_SECONDS);
      }
    } catch (error) {
      console.log('Battery cache skipped: ' + error.message);
    }
  }
  return payload;
}

/** Alias singkat untuk integrasi lama/eksternal. */
function getBatteryEnduranceData(filters) {
  return getBatteryDashboardData(filters);
}

function testBatteryDashboardData_() {
  const data = getBatteryDashboardData({});
  console.log(JSON.stringify({
    source: data.source,
    kpis: data.kpis,
    quality: data.quality,
    romComparison: data.romComparison
  }, null, 2));
  return data;
}

function readBatteryEnduranceSource_(sheet, headerInfo) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const dataRowCount = Math.max(0, lastRow - headerInfo.row);
  const emptyMeta = {
    spreadsheetName: sheet.getParent().getName(),
    sheetName: sheet.getName(),
    headerRow: headerInfo.row,
    sourceRows: dataRowCount,
    parsedRows: 0,
    uniqueEvents: 0,
    uniqueSwaps: 0,
    pileEvents: 0,
    duplicateEvents: 0,
    invalidDateRows: 0,
    invalidUnitRows: 0,
    invalidHmRows: 0,
    invalidSocRows: 0,
    otherCategoryEvents: 0,
    correctedDateRows: 0,
    firstUnitEvents: 0,
    chainBreaks: 0,
    minDate: '',
    maxDate: ''
  };
  if (!dataRowCount) return { records: [], cycles: [], meta: emptyMeta };

  const range = sheet.getRange(headerInfo.row + 1, 1, dataRowCount, lastColumn);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const map = headerInfo.map;
  const anchor = inferSwabDateAnchor_(values, displayValues, map.date);
  const parsed = [];
  let invalidDateRows = 0;
  let invalidUnitRows = 0;
  let invalidHmRows = 0;
  let correctedDateRows = 0;

  values.forEach(function (row, offset) {
    if (row.every(function (value) { return value === '' || value === null; })) return;
    const displayRow = displayValues[offset];
    const dateResult = parseSwabDate_(valueAt_(row, map.date), valueAt_(displayRow, map.date), anchor);
    const date = dateResult.date;
    if (!date) invalidDateRows++;
    if (dateResult.corrected) correctedDateRows++;

    const unit = canonicalSwabUnit_(valueAt_(displayRow, map.unit) || valueAt_(row, map.unit));
    const hm = toNumber_(valueAt_(row, map.hm));
    if (!unit) invalidUnitRows++;
    if (!isFiniteNumber_(hm)) invalidHmRows++;

    const shiftValue = toNumber_(valueAt_(row, map.shift));
    const shift = isFiniteNumber_(shiftValue)
      ? String(Math.round(shiftValue))
      : (cleanText_(valueAt_(displayRow, map.shift)) || '-');
    const clockMinutes = parseClockMinutes_(
      valueAt_(row, map.timeIn),
      valueAt_(displayRow, map.timeIn)
    );
    const adjustedMinutes = isFiniteNumber_(clockMinutes)
      ? clockMinutes + (shift === '2' && clockMinutes < 720 ? 1440 : 0)
      : null;
    const category = cleanText_(valueAt_(displayRow, map.category)).toUpperCase();
    const isSwap = /CHARGING\s*SWAP|SWAB/.test(category) && !/PILE/.test(category);
    const isPile = /CHARGING\s*PILE|\bPILE\b/.test(category);
    const location = canonicalLocation_(valueAt_(displayRow, map.location));

    parsed.push({
      sourceRow: headerInfo.row + 1 + offset,
      date: date,
      dateKey: date ? formatDateKey_(date) : '',
      dateCorrected: dateResult.corrected,
      shift: shift,
      shiftSort: isFiniteNumber_(shiftValue) ? shiftValue : 99,
      category: category || 'UNKNOWN',
      isSwap: isSwap,
      isPile: isPile,
      location: location,
      unit: unit || 'UNKNOWN',
      hm: hm,
      socBefore: parseSwabSoc_(valueAt_(row, map.socBefore), valueAt_(displayRow, map.socBefore)),
      socAfter: parseSwabSoc_(valueAt_(row, map.socAfter), valueAt_(displayRow, map.socAfter)),
      clockMinutes: clockMinutes,
      adjustedMinutes: adjustedMinutes,
      timeLabel: formatClockMinutes_(clockMinutes),
      swapMinutes: toNumber_(valueAt_(row, map.swapMinutes)),
      energy: toNumber_(valueAt_(row, map.energy)),
      remark: cleanText_(valueAt_(displayRow, map.remark)) || '-',
      note: cleanText_(valueAt_(displayRow, map.note)) || '-'
    });
  });

  const seen = {};
  let duplicateEvents = 0;
  const records = parsed.filter(function (record) {
    const key = [
      record.unit,
      record.dateKey,
      record.shift,
      isFiniteNumber_(record.adjustedMinutes) ? round_(record.adjustedMinutes, 4) : 'NO_TIME',
      isFiniteNumber_(record.hm) ? round_(record.hm, 6) : 'NO_HM',
      record.location,
      record.category
    ].join('|');
    if (seen[key]) {
      duplicateEvents++;
      return false;
    }
    seen[key] = true;
    return true;
  });

  const ordered = records.filter(function (record) {
    return record.unit !== 'UNKNOWN' && Boolean(record.dateKey);
  }).sort(compareBatteryRecords_);
  const previousByUnit = {};
  const everSwapByUnit = {};
  const cycles = [];
  let firstUnitEvents = 0;
  let chainBreaks = 0;

  ordered.forEach(function (current) {
    if (current.isPile) {
      previousByUnit[current.unit] = null;
      chainBreaks++;
      return;
    }
    // Kategori lain tetap diaudit, tetapi tidak dianggap swap maupun pemutus rantai.
    if (!current.isSwap) return;

    const previous = previousByUnit[current.unit];
    if (!previous) {
      if (!everSwapByUnit[current.unit]) firstUnitEvents++;
      everSwapByUnit[current.unit] = true;
      previousByUnit[current.unit] = current;
      return;
    }

    const rawEndurance = isFiniteNumber_(current.hm) && isFiniteNumber_(previous.hm)
      ? current.hm - previous.hm
      : null;
    const endurance = normalizeBatteryEndurance_(rawEndurance);
    const status = batteryCycleStatus_(endurance);
    const sourceSocValid = isSoc_(previous.socAfter) && isSoc_(current.socBefore);
    const socUsed = sourceSocValid ? previous.socAfter - current.socBefore : null;
    const physicalSocValid = isFiniteNumber_(socUsed) && socUsed >= 0;
    const socPerHour = status === 'VALID' && physicalSocValid && endurance > 0
      ? socUsed / endurance
      : null;
    const estimatedEnergyUsedKwh = status === 'VALID' && physicalSocValid
      ? socUsed / 100 * CONFIG.BATTERY_NOMINAL_CAPACITY_KWH
      : null;
    const ecrKwhPerHm = status === 'VALID' && isFiniteNumber_(estimatedEnergyUsedKwh) && endurance > 0
      ? estimatedEnergyUsedKwh / endurance
      : null;

    cycles.push({
      id: current.unit + '-' + current.sourceRow,
      sourceRow: current.sourceRow,
      previousSourceRow: previous.sourceRow,
      dateKey: current.dateKey,
      date: current.date,
      shift: current.shift,
      location: current.location,
      unit: current.unit,
      timeLabel: current.timeLabel,
      adjustedMinutes: current.adjustedMinutes,
      previousHm: previous.hm,
      currentHm: current.hm,
      rawEnduranceHours: rawEndurance,
      enduranceHours: endurance,
      status: status,
      statusLabel: batteryStatusLabel_(status),
      reason: batteryStatusReason_(status),
      previousSocAfter: previous.socAfter,
      currentSocBefore: current.socBefore,
      socUsed: physicalSocValid ? socUsed : null,
      socPerHour: socPerHour,
      estimatedEnergyUsedKwh: estimatedEnergyUsedKwh,
      ecrKwhPerHm: ecrKwhPerHm,
      socSourceValid: sourceSocValid,
      socPhysicalValid: physicalSocValid,
      remark: current.remark,
      note: current.note
    });
    previousByUnit[current.unit] = current;
    everSwapByUnit[current.unit] = true;
  });

  const swaps = records.filter(function (record) { return record.isSwap; });
  const dates = swaps.map(function (record) { return record.dateKey; }).filter(Boolean).sort();
  return {
    records: swaps,
    cycles: cycles,
    meta: {
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName(),
      headerRow: headerInfo.row,
      sourceRows: dataRowCount,
      parsedRows: parsed.length,
      uniqueEvents: records.length,
      uniqueSwaps: swaps.length,
      pileEvents: records.filter(function (record) { return record.isPile; }).length,
      otherCategoryEvents: records.filter(function (record) { return !record.isSwap && !record.isPile; }).length,
      duplicateEvents: duplicateEvents,
      invalidDateRows: invalidDateRows,
      invalidUnitRows: invalidUnitRows,
      invalidHmRows: invalidHmRows,
      invalidSocRows: swaps.filter(function (record) {
        return !isSoc_(record.socBefore) || !isSoc_(record.socAfter);
      }).length,
      correctedDateRows: correctedDateRows,
      firstUnitEvents: firstUnitEvents,
      chainBreaks: chainBreaks,
      minDate: dates.length ? dates[0] : '',
      maxDate: dates.length ? dates[dates.length - 1] : '',
      anchorMonth: anchor ? anchor.month : null,
      anchorYear: anchor ? anchor.year : null
    }
  };
}

function inferSwabDateAnchor_(values, displayValues, dateIndex) {
  const counts = {};
  const nativeDates = [];
  values.forEach(function (row, index) {
    const candidates = [valueAt_(row, dateIndex), valueAt_(displayValues[index], dateIndex)];
    candidates.forEach(function (value) {
      if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
        const nativeParts = Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy-M-d').split('-').map(Number);
        nativeDates.push({ year: nativeParts[0], month: nativeParts[1], day: nativeParts[2] });
        if (nativeParts[2] > 12) {
          const nativeKey = nativeParts[0] + '-' + nativeParts[1];
          counts[nativeKey] = (counts[nativeKey] || 0) + 1;
        }
        return;
      }
      const parts = extractDmyParts_(value);
      if (!parts || parts.day <= 12) return;
      const key = parts.year + '-' + parts.month;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  const best = Object.keys(counts).sort(function (a, b) {
    return counts[b] - counts[a] || a.localeCompare(b);
  })[0];
  if (best) {
    const values = best.split('-').map(Number);
    const transposedMonths = uniqueSorted_(nativeDates.filter(function (parts) {
      return parts.year === values[0] && parts.day === values[1];
    }).map(function (parts) { return String(parts.month); }));
    return {
      year: values[0],
      month: values[1],
      allowTranspose: transposedMonths.length >= 4
    };
  }
  return null;
}

function extractDmyParts_(value) {
  const text = cleanText_(value);
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (!match) return null;
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const result = { day: Number(match[1]), month: Number(match[2]), year: year };
  return result.day >= 1 && result.day <= 31 && result.month >= 1 && result.month <= 12
    ? result
    : null;
}

function parseSwabDate_(nativeValue, displayValue, anchor) {
  if (Object.prototype.toString.call(nativeValue) === '[object Date]' && !isNaN(nativeValue.getTime())) {
    const nativeKey = Utilities.formatDate(nativeValue, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const parts = nativeKey.split('-').map(Number);
    // File sumber 1–12 Agustus tersimpan sebagai 8 Jan, 8 Feb, ... 8 Des.
    if (anchor && anchor.allowTranspose && parts[0] === anchor.year &&
        parts[2] === anchor.month && parts[1] <= 12) {
      const corrected = makeZonedDate_(anchor.year, anchor.month, parts[1], 0, 0, 0);
      return {
        date: corrected,
        corrected: Boolean(corrected && formatDateKey_(corrected) !== nativeKey)
      };
    }
    return { date: new Date(nativeValue.getTime()), corrected: false };
  }

  const rawParts = extractDmyParts_(nativeValue) || extractDmyParts_(displayValue);
  if (rawParts) {
    return {
      date: makeZonedDate_(rawParts.year, rawParts.month, rawParts.day, 0, 0, 0),
      corrected: false
    };
  }
  return { date: parseDateValue_(nativeValue || displayValue), corrected: false };
}

function parseClockMinutes_(nativeValue, displayValue) {
  const text = cleanText_(displayValue || nativeValue).toUpperCase();
  let match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    if (match[4]) {
      if (hour === 12) hour = 0;
      if (match[4] === 'PM') hour += 12;
    }
    if (hour <= 23 && minute <= 59 && second <= 59) {
      return hour * 60 + minute + second / 60;
    }
  }
  if (typeof nativeValue === 'number' && isFinite(nativeValue)) {
    return ((nativeValue % 1) + 1) % 1 * 1440;
  }
  if (Object.prototype.toString.call(nativeValue) === '[object Date]' && !isNaN(nativeValue.getTime())) {
    const formatted = Utilities.formatDate(nativeValue, CONFIG.TIMEZONE, 'H:mm:ss');
    match = formatted.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (match) return Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 60;
  }
  return null;
}

function formatClockMinutes_(minutes) {
  if (!isFiniteNumber_(minutes)) return '-';
  const totalSeconds = Math.round(minutes * 60);
  return pad2_(Math.floor(totalSeconds / 3600) % 24) + ':' +
    pad2_(Math.floor(totalSeconds / 60) % 60);
}

function parseSwabSoc_(nativeValue, displayValue) {
  const display = cleanText_(displayValue);
  if (/%/.test(display)) return toNumber_(display.replace('%', ''));
  const number = toNumber_(nativeValue !== '' && nativeValue !== null ? nativeValue : displayValue);
  if (!isFiniteNumber_(number)) return null;
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function canonicalSwabUnit_(value) {
  const text = cleanText_(value).toUpperCase().replace(/\.0+$/, '').replace(/\s+/g, ' ');
  if (!text || text === '-' || text === 'N/A') return '';
  const match = text.match(/(?:DT\s*)?(\d{3,5})/);
  return match ? 'DT ' + match[1] : text;
}

function compareBatteryRecords_(a, b) {
  return naturalSort_(a.unit, b.unit) ||
    a.dateKey.localeCompare(b.dateKey) ||
    a.shiftSort - b.shiftSort ||
    (isFiniteNumber_(a.adjustedMinutes) ? a.adjustedMinutes : 9999) -
      (isFiniteNumber_(b.adjustedMinutes) ? b.adjustedMinutes : 9999) ||
    a.sourceRow - b.sourceRow;
}

function batteryCycleStatus_(endurance) {
  if (!isFiniteNumber_(endurance)) return 'DATA_INVALID';
  if (endurance < CONFIG.VALID_ENDURANCE_MIN_HOURS) return 'TAKEOUT_LOW';
  if (endurance > CONFIG.VALID_ENDURANCE_MAX_HOURS) return 'TAKEOUT_HIGH';
  return 'VALID';
}

function normalizeBatteryEndurance_(rawEndurance) {
  if (!isFiniteNumber_(rawEndurance)) return null;
  return Math.abs(rawEndurance - 5) < 1e-9 ? 4.5 : rawEndurance;
}

function batteryStatusLabel_(status) {
  return {
    VALID: 'Valid 3–5 HM',
    TAKEOUT_LOW: 'Takeout <3 HM',
    TAKEOUT_HIGH: 'Takeout >5 HM',
    DATA_INVALID: 'Data invalid'
  }[status] || status;
}

function batteryStatusReason_(status) {
  return {
    VALID: 'Masuk perhitungan KPI ketahanan',
    TAKEOUT_LOW: 'ΔHM kurang dari 3 jam; dikeluarkan dari rata-rata',
    TAKEOUT_HIGH: 'ΔHM lebih dari 5 jam; dikeluarkan dari rata-rata',
    DATA_INVALID: 'HM sekarang/sebelumnya tidak dapat dihitung'
  }[status] || '-';
}

function buildBatteryFilterOptions_(records, cycles, meta) {
  return {
    minDate: meta.minDate,
    maxDate: meta.maxDate,
    locations: uniqueSorted_(ROM_LOCATIONS.concat(records.map(function (record) { return record.location; }))),
    units: uniqueSorted_(records.map(function (record) { return record.unit; })),
    shifts: uniqueSorted_(records.map(function (record) { return record.shift; })),
    statuses: [
      { value: 'VALID', label: 'Valid 3–5 HM' },
      { value: 'TAKEOUT_LOW', label: 'Takeout <3 HM' },
      { value: 'TAKEOUT_HIGH', label: 'Takeout >5 HM' },
      { value: 'DATA_INVALID', label: 'Data invalid' }
    ],
    validMinHours: CONFIG.VALID_ENDURANCE_MIN_HOURS,
    validMaxHours: CONFIG.VALID_ENDURANCE_MAX_HOURS
  };
}

function normalizeBatteryFilters_(raw, options) {
  options = options || {};
  let s = validDateKey_(raw.startDate) ? raw.startDate : '';
  let e = validDateKey_(raw.endDate) ? raw.endDate : '';
  if (s && !e) {
    e = s;
  } else if (!s && e) {
    s = e;
  } else if (!s && !e) {
    s = options.minDate || '';
    e = options.maxDate || '';
  } else if (s && e && s > e) {
    const swap = s;
    s = e;
    e = swap;
  }
  return {
    startDate: s,
    endDate: e,
    location: normalizeOption_(raw.location),
    unit: normalizeOption_(raw.unit || raw.truck),
    shift: normalizeOption_(raw.shift),
    status: normalizeOption_(raw.status)
  };
}

function applyBatteryRecordFilters_(records, filters) {
  return records.filter(function (record) {
    if (filters.startDate && record.dateKey < filters.startDate) return false;
    if (filters.endDate && record.dateKey > filters.endDate) return false;
    if (filters.location && record.location !== filters.location) return false;
    if (filters.unit && record.unit !== filters.unit) return false;
    if (filters.shift && record.shift !== filters.shift) return false;
    return true;
  });
}

function applyBatteryCycleFilters_(cycles, filters) {
  return cycles.filter(function (cycle) {
    if (filters.startDate && cycle.dateKey < filters.startDate) return false;
    if (filters.endDate && cycle.dateKey > filters.endDate) return false;
    if (filters.location && cycle.location !== filters.location) return false;
    if (filters.unit && cycle.unit !== filters.unit) return false;
    if (filters.shift && cycle.shift !== filters.shift) return false;
    if (filters.status && cycle.status !== filters.status) return false;
    return true;
  });
}

function buildBatteryPayload_(source, records, cycles, options, appliedFilters) {
  const kpis = buildBatteryKpis_(records, cycles);
  const trends = {
    daily: aggregateBatteryTrend_(records, cycles, 'daily'),
    weekly: aggregateBatteryTrend_(records, cycles, 'weekly'),
    monthly: aggregateBatteryTrend_(records, cycles, 'monthly')
  };
  const romComparison = buildBatteryGroupSummary_(records, cycles, 'location');
  const unitRanking = buildBatteryGroupSummary_(records, cycles, 'unit').sort(function (a, b) {
    return b.validRate - a.validRate || b.validCycles - a.validCycles || naturalSort_(a.key, b.key);
  });
  const statusBreakdown = buildBatteryStatusBreakdown_(cycles);
  const distribution = buildBatteryDistribution_(cycles);
  const quality = buildBatteryQuality_(source.meta, cycles, kpis);

  return {
    success: true,
    empty: records.length === 0 || cycles.length === 0,
    emptyCycles: cycles.length === 0,
    emptyReason: records.length === 0
      ? 'Tidak ada event swab pada filter terpilih.'
      : (cycles.length === 0 ? 'Tidak ada pasangan HM yang dapat dievaluasi pada filter terpilih.' : ''),
    source: {
      spreadsheetName: source.meta.spreadsheetName,
      sheetName: source.meta.sheetName,
      sourceRows: source.meta.sourceRows,
      parsedRows: source.meta.parsedRows,
      uniqueEvents: source.meta.uniqueEvents,
      uniqueSwaps: source.meta.uniqueSwaps,
      filteredRows: records.length,
      filteredCycles: cycles.length,
      minDate: source.meta.minDate,
      maxDate: source.meta.maxDate
    },
    options: options,
    appliedFilters: appliedFilters,
    thresholds: {
      minHours: CONFIG.VALID_ENDURANCE_MIN_HOURS,
      maxHours: CONFIG.VALID_ENDURANCE_MAX_HOURS,
      nominalBatteryCapacityKwh: CONFIG.BATTERY_NOMINAL_CAPACITY_KWH,
      rule: 'Valid jika 3 ≤ ΔHM ≤ 5 jam'
    },
    kpis: kpis,
    trends: trends,
    romComparison: romComparison,
    unitRanking: unitRanking,
    unitPerformance: unitRanking,
    statusBreakdown: statusBreakdown,
    distribution: distribution,
    distributions: { endurance: distribution, status: statusBreakdown },
    insights: buildBatteryInsights_(kpis, romComparison, unitRanking, quality),
    recentCycles: buildRecentBatteryCycles_(cycles),
    quality: quality
  };
}

function buildBatteryKpis_(records, cycles) {
  const valid = cycles.filter(function (cycle) { return cycle.status === 'VALID'; });
  const evaluated = cycles.filter(function (cycle) { return cycle.status !== 'DATA_INVALID'; });
  const socEligible = valid.filter(function (cycle) { return isFiniteNumber_(cycle.socPerHour); });
  const enduranceValues = valid.map(function (cycle) { return cycle.enduranceHours; });
  const socUsedTotal = sum_(socEligible.map(function (cycle) { return cycle.socUsed; }));
  const socHmTotal = sum_(socEligible.map(function (cycle) { return cycle.enduranceHours; }));
  const estimatedEnergyUsedTotal = sum_(socEligible.map(function (cycle) {
    return cycle.estimatedEnergyUsedKwh;
  }));
  const hasValid = valid.length > 0;
  const hasSoc = socEligible.length > 0 && socHmTotal > 0;
  const avgEndurance = hasValid ? mean_(enduranceValues) : null;
  const medianEndurance = hasValid ? median_(enduranceValues) : null;
  const weightedSoc = hasSoc ? safeDivide_(socUsedTotal, socHmTotal) : null;
  const weightedEcr = hasSoc ? safeDivide_(estimatedEnergyUsedTotal, socHmTotal) : null;
  const meanSoc = hasSoc
    ? mean_(socEligible.map(function (cycle) { return cycle.socPerHour; }))
    : null;
  const validRate = safeDivide_(valid.length * 100, evaluated.length);

  return {
    totalSwaps: records.length,
    totalCycles: cycles.length,
    evaluatedCycles: evaluated.length,
    validCycles: valid.length,
    takeoutLow: cycles.filter(function (cycle) { return cycle.status === 'TAKEOUT_LOW'; }).length,
    takeoutHigh: cycles.filter(function (cycle) { return cycle.status === 'TAKEOUT_HIGH'; }).length,
    dataInvalid: cycles.filter(function (cycle) { return cycle.status === 'DATA_INVALID'; }).length,
    validRate: round_(validRate, 2),
    validRatePct: round_(validRate, 2),
    avgEndurance: hasValid ? round_(avgEndurance, 3) : null,
    avgEnduranceHm: hasValid ? round_(avgEndurance, 3) : null,
    avgEnduranceHours: hasValid ? round_(avgEndurance, 3) : null,
    medianEndurance: hasValid ? round_(medianEndurance, 3) : null,
    medianEnduranceHm: hasValid ? round_(medianEndurance, 3) : null,
    weightedSocPerHour: hasSoc ? round_(weightedSoc, 3) : null,
    avgSocPerHour: hasSoc ? round_(weightedSoc, 3) : null,
    meanSessionSocPerHour: hasSoc ? round_(meanSoc, 3) : null,
    weightedEcrKwhPerHm: hasSoc ? round_(weightedEcr, 3) : null,
    energyConsumptionRate: hasSoc ? round_(weightedEcr, 3) : null,
    ecrKwhPerHour: hasSoc ? round_(weightedEcr, 3) : null,
    ecrSamples: socEligible.length,
    totalEstimatedEnergyUsedKwh: hasSoc ? round_(estimatedEnergyUsedTotal, 2) : null,
    nominalBatteryCapacityKwh: CONFIG.BATTERY_NOMINAL_CAPACITY_KWH,
    socRateSamples: socEligible.length,
    socCoveragePct: round_(safeDivide_(socEligible.length * 100, valid.length), 2),
    avgSocUsed: hasSoc
      ? round_(mean_(socEligible.map(function (cycle) { return cycle.socUsed; })), 2)
      : null,
    units: uniqueSorted_(records.map(function (record) { return record.unit; })).length,
    unitCount: uniqueSorted_(records.map(function (record) { return record.unit; })).length,
    roms: uniqueSorted_(records.map(function (record) { return record.location; })).length,
    romCount: uniqueSorted_(records.map(function (record) { return record.location; })).length
  };
}

function aggregateBatteryTrend_(records, cycles, period) {
  const groups = {};
  records.forEach(function (record) {
    if (!record.dateKey) return;
    const descriptor = periodDescriptor_(record.dateKey, period);
    if (!groups[descriptor.key]) groups[descriptor.key] = { descriptor: descriptor, records: [], cycles: [] };
    groups[descriptor.key].records.push(record);
  });
  cycles.forEach(function (cycle) {
    const descriptor = periodDescriptor_(cycle.dateKey, period);
    if (!groups[descriptor.key]) groups[descriptor.key] = { descriptor: descriptor, records: [], cycles: [] };
    groups[descriptor.key].cycles.push(cycle);
  });
  return Object.keys(groups).sort().map(function (key) {
    const group = groups[key];
    const summary = buildBatteryKpis_(group.records, group.cycles);
    return {
      key: key,
      label: group.descriptor.label,
      swaps: summary.totalSwaps,
      totalCycles: summary.totalCycles,
      evaluatedCycles: summary.evaluatedCycles,
      validCycles: summary.validCycles,
      takeoutLow: summary.takeoutLow,
      takeoutHigh: summary.takeoutHigh,
      avgEndurance: summary.avgEndurance,
      avgEnduranceHm: summary.avgEndurance,
      medianEndurance: summary.medianEndurance,
      validRate: summary.validRate,
      weightedSocPerHour: summary.weightedSocPerHour,
      avgSocPerHour: summary.weightedSocPerHour,
      weightedEcrKwhPerHm: summary.weightedEcrKwhPerHm,
      energyConsumptionRate: summary.weightedEcrKwhPerHm,
      socRateSamples: summary.socRateSamples
    };
  });
}

function buildBatteryGroupSummary_(records, cycles, field) {
  const recordGroups = groupBy_(records, function (record) { return record[field]; });
  const cycleGroups = groupBy_(cycles, function (cycle) { return cycle[field]; });
  const keys = uniqueSorted_(Object.keys(recordGroups).concat(Object.keys(cycleGroups)));
  return keys.map(function (key) {
    const groupRecords = recordGroups[key] || [];
    const groupCycles = cycleGroups[key] || [];
    const kpis = buildBatteryKpis_(groupRecords, groupCycles);
    const locationCounts = {};
    groupRecords.forEach(function (record) {
      locationCounts[record.location] = (locationCounts[record.location] || 0) + 1;
    });
    const dominantRom = Object.keys(locationCounts).sort(function (a, b) {
      return locationCounts[b] - locationCounts[a] || naturalSort_(a, b);
    })[0] || '-';
    let grade = 'Monitor';
    if (kpis.evaluatedCycles >= 10 && kpis.validRate >= 75) grade = 'Strong';
    if (kpis.evaluatedCycles >= 10 && kpis.validRate < 55) grade = 'Attention';
    return {
      key: key,
      label: key,
      location: field === 'location' ? key : undefined,
      unit: field === 'unit' ? key : undefined,
      totalSwaps: kpis.totalSwaps,
      totalCycles: kpis.totalCycles,
      evaluatedCycles: kpis.evaluatedCycles,
      validCycles: kpis.validCycles,
      takeoutLow: kpis.takeoutLow,
      takeoutHigh: kpis.takeoutHigh,
      takeoutCycles: kpis.takeoutLow + kpis.takeoutHigh,
      validRate: kpis.validRate,
      avgEndurance: kpis.avgEndurance,
      avgEnduranceHm: kpis.avgEndurance,
      medianEndurance: kpis.medianEndurance,
      weightedSocPerHour: kpis.weightedSocPerHour,
      avgSocPerHour: kpis.weightedSocPerHour,
      weightedEcrKwhPerHm: kpis.weightedEcrKwhPerHm,
      energyConsumptionRate: kpis.weightedEcrKwhPerHm,
      socRateSamples: kpis.socRateSamples,
      dominantRom: dominantRom,
      grade: grade
    };
  });
}

function buildBatteryStatusBreakdown_(cycles) {
  const order = ['VALID', 'TAKEOUT_LOW', 'TAKEOUT_HIGH', 'DATA_INVALID'];
  return order.map(function (status) {
    const count = cycles.filter(function (cycle) { return cycle.status === status; }).length;
    return {
      status: status,
      label: batteryStatusLabel_(status),
      count: count,
      percentage: round_(safeDivide_(count * 100, cycles.length), 2)
    };
  });
}

function buildBatteryDistribution_(cycles) {
  const buckets = [
    { key: 'LT3', label: '<3', min: -Infinity, max: 3, includeMax: false },
    { key: '3_35', label: '3–<3,5', min: 3, max: 3.5, includeMax: false },
    { key: '35_4', label: '3,5–<4', min: 3.5, max: 4, includeMax: false },
    { key: '4_45', label: '4–<4,5', min: 4, max: 4.5, includeMax: false },
    { key: '45_5', label: '4,5–5', min: 4.5, max: 5, includeMax: true },
    { key: 'GT5', label: '>5', min: 5, max: Infinity, includeMax: true, strictMin: true }
  ];
  return buckets.map(function (bucket) {
    const count = cycles.filter(function (cycle) {
      const value = cycle.enduranceHours;
      if (!isFiniteNumber_(value)) return false;
      const minOk = bucket.strictMin ? value > bucket.min : value >= bucket.min;
      const maxOk = bucket.includeMax ? value <= bucket.max : value < bucket.max;
      return minOk && maxOk;
    }).length;
    return { key: bucket.key, label: bucket.label, count: count };
  });
}

function buildBatteryQuality_(meta, cycles, kpis) {
  const duplicateRate = safeDivide_(meta.duplicateEvents * 100, meta.sourceRows);
  const invalidCoreRate = safeDivide_(
    (meta.invalidDateRows + meta.invalidUnitRows + meta.invalidHmRows) * 100,
    meta.sourceRows
  );
  const socGapRate = safeDivide_(Math.max(0, kpis.validCycles - kpis.socRateSamples) * 100, kpis.validCycles);
  const score = Math.max(0, Math.min(100, 100 - duplicateRate - invalidCoreRate - socGapRate * 0.25));
  return {
    score: round_(score, 1),
    qualityScore: round_(score, 1),
    sourceRows: meta.sourceRows,
    parsedRows: meta.parsedRows,
    uniqueEvents: meta.uniqueEvents,
    uniqueSwaps: meta.uniqueSwaps,
    duplicateEvents: meta.duplicateEvents,
    pileEvents: meta.pileEvents,
    otherCategoryEvents: meta.otherCategoryEvents,
    firstUnitEvents: meta.firstUnitEvents,
    missingPreviousHm: meta.firstUnitEvents,
    firstCycleRows: meta.firstUnitEvents,
    chainBreaks: meta.chainBreaks,
    invalidDateRows: meta.invalidDateRows,
    invalidUnitRows: meta.invalidUnitRows,
    invalidHmRows: meta.invalidHmRows,
    correctedDateRows: meta.correctedDateRows,
    normalizedDates: meta.correctedDateRows,
    normalizedDateRows: meta.correctedDateRows,
    takeoutLow: kpis.takeoutLow,
    takeoutHigh: kpis.takeoutHigh,
    socValidCycles: kpis.socRateSamples,
    socExcludedValidCycles: Math.max(0, kpis.validCycles - kpis.socRateSamples),
    invalidSoc: meta.invalidSocRows,
    invalidSocRows: meta.invalidSocRows,
    validHmCycles: kpis.validCycles,
    excludedNonSwap: meta.pileEvents,
    nonSwapRows: meta.pileEvents,
    source: {
      rows: meta.sourceRows,
      duplicateEvents: meta.duplicateEvents,
      invalidDateRows: meta.invalidDateRows,
      invalidUnitRows: meta.invalidUnitRows,
      invalidHmRows: meta.invalidHmRows,
      invalidSocRows: meta.invalidSocRows,
      correctedDateRows: meta.correctedDateRows,
      pileEvents: meta.pileEvents,
      otherCategoryEvents: meta.otherCategoryEvents
    },
    filtered: {
      cycles: kpis.totalCycles,
      validCycles: kpis.validCycles,
      takeoutLow: kpis.takeoutLow,
      takeoutHigh: kpis.takeoutHigh,
      socRateSamples: kpis.socRateSamples,
      socExcludedValidCycles: Math.max(0, kpis.validCycles - kpis.socRateSamples)
    },
    pairingRule: 'Unit yang sama · seluruh histori · urutan tanggal/shift/jam masuk',
    socRule: 'BATTERY AFTER sebelumnya − BATTERY BEFORE sekarang, dibagi ΔHM valid'
  };
}

function buildBatteryInsights_(kpis, romComparison, unitRanking, quality) {
  const insights = [];
  insights.push({
    tone: kpis.validRate >= 70 ? 'positive' : (kpis.validRate >= 55 ? 'neutral' : 'warning'),
    eyebrow: 'Validitas cycle',
    title: formatNumberId_(kpis.validRate, 1) + '% cycle berada pada 3–5 HM',
    text: formatNumberId_(kpis.validCycles, 0) + ' dari ' +
      formatNumberId_(kpis.evaluatedCycles, 0) + ' cycle terukur masuk KPI ketahanan.'
  });
  if (kpis.socRateSamples) {
    insights.push({
      tone: 'electric',
      eyebrow: 'Consumption rate',
      title: formatNumberId_(kpis.weightedEcrKwhPerHm, 2) + ' kWh/HM ECR',
      text: formatNumberId_(kpis.weightedSocPerHour, 2) + '% SOC/HM dari ' +
        formatNumberId_(kpis.socRateSamples, 0) +
        ' cycle valid; ECR diturunkan dari SOC dan kapasitas nominal 400 kWh.'
    });
  }
  const validRoms = romComparison.filter(function (item) { return item.validCycles > 0; });
  if (validRoms.length >= 2) {
    const strongest = validRoms.slice().sort(function (a, b) {
      return b.avgEndurance - a.avgEndurance;
    })[0];
    const mostEfficient = validRoms.filter(function (item) { return item.socRateSamples > 0; })
      .sort(function (a, b) { return a.weightedSocPerHour - b.weightedSocPerHour; })[0];
    insights.push({
      tone: 'neutral',
      eyebrow: 'Benchmark ROM',
      title: strongest.label + ' mencatat ' + formatNumberId_(strongest.avgEndurance, 2) + ' HM valid',
      text: mostEfficient
        ? mostEfficient.label + ' memiliki konsumsi terendah ' +
          formatNumberId_(mostEfficient.weightedSocPerHour, 2) + '% SOC/HM.'
        : 'Perbandingan SOC/HM belum memiliki sampel yang cukup.'
    });
  }
  const eligibleUnits = unitRanking.filter(function (item) { return item.validCycles >= 10; });
  if (eligibleUnits.length) {
    const best = eligibleUnits.slice().sort(function (a, b) {
      return b.validRate - a.validRate || b.avgEndurance - a.avgEndurance;
    })[0];
    insights.push({
      tone: 'positive',
      eyebrow: 'Unit consistency',
      title: best.label + ' unggul dengan validitas ' + formatNumberId_(best.validRate, 1) + '%',
      text: formatNumberId_(best.validCycles, 0) + ' cycle valid · rata-rata ' +
        formatNumberId_(best.avgEndurance, 2) + ' HM.'
    });
  }
  insights.push({
    tone: quality.duplicateEvents || quality.correctedDateRows ? 'warning' : 'neutral',
    eyebrow: 'Audit data',
    title: formatNumberId_(quality.duplicateEvents, 0) + ' duplikat dihapus · ' +
      formatNumberId_(quality.correctedDateRows, 0) + ' tanggal dinormalisasi',
    text: formatNumberId_(quality.pileEvents, 0) +
      ' event CHARGING PILE memutus rantai pairing dan tidak dihitung sebagai cycle.'
  });
  return insights.slice(0, 6);
}

function buildRecentBatteryCycles_(cycles) {
  return cycles.slice().sort(function (a, b) {
    return b.dateKey.localeCompare(a.dateKey) ||
      Number(b.shift) - Number(a.shift) ||
      (isFiniteNumber_(b.adjustedMinutes) ? b.adjustedMinutes : -1) -
        (isFiniteNumber_(a.adjustedMinutes) ? a.adjustedMinutes : -1) ||
      b.sourceRow - a.sourceRow;
  }).slice(0, CONFIG.MAX_BATTERY_TABLE_ROWS).map(function (cycle) {
    return {
      id: cycle.id,
      eventTime: cycle.dateKey.split('-').reverse().join('/') + ' · S' + cycle.shift + ' · ' + cycle.timeLabel,
      dateKey: cycle.dateKey,
      shift: cycle.shift,
      location: cycle.location,
      unit: cycle.unit,
      previousHm: isFiniteNumber_(cycle.previousHm) ? round_(cycle.previousHm, 2) : null,
      currentHm: isFiniteNumber_(cycle.currentHm) ? round_(cycle.currentHm, 2) : null,
      enduranceHours: isFiniteNumber_(cycle.enduranceHours) ? round_(cycle.enduranceHours, 3) : null,
      socStart: isSoc_(cycle.previousSocAfter) ? round_(cycle.previousSocAfter, 1) : null,
      socEnd: isSoc_(cycle.currentSocBefore) ? round_(cycle.currentSocBefore, 1) : null,
      socUsed: isFiniteNumber_(cycle.socUsed) ? round_(cycle.socUsed, 1) : null,
      socPerHour: isFiniteNumber_(cycle.socPerHour) ? round_(cycle.socPerHour, 3) : null,
      estimatedEnergyUsedKwh: isFiniteNumber_(cycle.estimatedEnergyUsedKwh)
        ? round_(cycle.estimatedEnergyUsedKwh, 2)
        : null,
      ecrKwhPerHm: isFiniteNumber_(cycle.ecrKwhPerHm) ? round_(cycle.ecrKwhPerHm, 3) : null,
      status: cycle.status,
      statusLabel: cycle.statusLabel,
      reason: cycle.reason,
      remark: cycle.remark
    };
  });
}

/**
 * Endpoint dashboard Swab Cycle Time dari template exchangeOrders.
 * SLA default 6 menit dapat diubah melalui CONFIG.SWAB_CYCLE_SLA_MINUTES.
 */
function getSwabCycleDashboardData(filters) {
  const startedAt = Date.now();
  const ss = getSpreadsheet_();
  const sourceRef = resolveCycleTimeConfiguredSource_(ss);
  const sheet = sourceRef.sheet;
  const rawFilters = filters || {};
  const cacheKey = buildCacheKey_(sheet, rawFilters, sourceRef.headerInfo) + ':cycle-time';
  const cache = CacheService.getScriptCache();
  const cacheEnabled = loadDatabaseConfig_().mode !== 'STANDALONE';
  const cached = cacheEnabled && !rawFilters.forceRefresh ? cache.get(cacheKey) : null;

  if (cached) {
    const cachedPayload = JSON.parse(cached);
    cachedPayload.runtime = cachedPayload.runtime || {};
    cachedPayload.runtime.cacheHit = true;
    cachedPayload.runtime.responseMs = Date.now() - startedAt;
    return cachedPayload;
  }

  const source = readSwabCycleTimeSource_(sheet, sourceRef.headerInfo);
  const options = buildCycleTimeFilterOptions_(source.records, source.meta);
  const appliedFilters = normalizeCycleTimeFilters_(rawFilters, options);
  const filtered = applyCycleTimeFilters_(source.records, appliedFilters);
  const payload = buildCycleTimePayload_(source, filtered, options, appliedFilters);
  if (sourceRef.warning) payload.source.databaseWarning = sourceRef.warning;
  payload.generatedAt = formatDateTime_(new Date());
  payload.runtime = {
    cacheHit: false,
    responseMs: Date.now() - startedAt,
    appVersion: CONFIG.APP_VERSION
  };

  if (cacheEnabled) {
    try {
      const serialized = JSON.stringify(payload);
      if (Utilities.newBlob(serialized).getBytes().length < 95000) {
        cache.put(cacheKey, serialized, CONFIG.CACHE_SECONDS);
      }
    } catch (error) {
      console.log('Swab cycle time cache skipped: ' + error.message);
    }
  }
  return payload;
}

function getSwabCycleTimeData(filters) {
  return getSwabCycleDashboardData(filters);
}

function getCycleTimeDashboardData(filters) {
  return getSwabCycleDashboardData(filters);
}

function testSwabCycleDashboardData_() {
  const data = getSwabCycleDashboardData({});
  console.log(JSON.stringify({
    source: data.source,
    kpis: data.kpis,
    quality: data.quality,
    stations: data.stationComparison,
    shifts: data.shiftComparison
  }, null, 2));
  return data;
}

function readSwabCycleTimeSource_(sheet, headerInfo) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const dataRowCount = Math.max(0, lastRow - headerInfo.row);
  const emptyMeta = {
    spreadsheetName: sheet.getParent().getName(),
    sheetName: sheet.getName(),
    headerRow: headerInfo.row,
    sourceRows: dataRowCount,
    parsedRows: 0,
    uniqueCycles: 0,
    duplicateBusinessNo: 0,
    invalidDateRows: 0,
    invalidDurationRows: 0,
    durationMismatchRows: 0,
    missingPlateRows: 0,
    missingVinRows: 0,
    missingDownBatteryRows: 0,
    missingUpBatteryRows: 0,
    invalidSocRows: 0,
    invalidResultRows: 0,
    minDate: '',
    maxDate: ''
  };
  if (!dataRowCount) return { records: [], meta: emptyMeta };

  const range = sheet.getRange(headerInfo.row + 1, 1, dataRowCount, lastColumn);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const map = headerInfo.map;
  const parsed = [];
  const seenBusiness = {};
  let duplicateBusinessNo = 0;
  let invalidDateRows = 0;
  let invalidDurationRows = 0;
  let durationMismatchRows = 0;
  let missingPlateRows = 0;
  let missingVinRows = 0;
  let missingDownBatteryRows = 0;
  let missingUpBatteryRows = 0;
  let invalidSocRows = 0;
  let invalidResultRows = 0;

  values.forEach(function (row, offset) {
    if (row.every(function (value) { return value === '' || value === null; })) return;
    const displayRow = displayValues[offset];
    const businessNo = cleanText_(valueAt_(displayRow, map.businessNo)) ||
      cleanText_(valueAt_(row, map.businessNo)) || ('ROW-' + (headerInfo.row + 1 + offset));
    if (seenBusiness[businessNo]) {
      duplicateBusinessNo++;
      return;
    }
    seenBusiness[businessNo] = true;

    const startTime = parseDateValue_(valueAt_(row, map.startTime) || valueAt_(displayRow, map.startTime));
    const endTime = parseDateValue_(valueAt_(row, map.endTime) || valueAt_(displayRow, map.endTime));
    const eventTime = endTime || startTime;
    if (!eventTime) invalidDateRows++;

    const sourceSeconds = toNumber_(valueAt_(row, map.durationSeconds));
    const calculatedSeconds = startTime && endTime
      ? (endTime.getTime() - startTime.getTime()) / 1000
      : null;
    const durationSeconds = isFinitePositive_(sourceSeconds) ? sourceSeconds : calculatedSeconds;
    const durationMinutes = isFinitePositive_(durationSeconds) ? durationSeconds / 60 : null;
    const validDuration = isFinitePositive_(durationMinutes) &&
      durationSeconds >= CONFIG.MIN_REASONABLE_SWAB_CYCLE_SECONDS &&
      durationMinutes <= CONFIG.MAX_REASONABLE_SWAB_CYCLE_MINUTES;
    if (!validDuration) invalidDurationRows++;
    const durationMismatch = isFinitePositive_(sourceSeconds) && isFinitePositive_(calculatedSeconds) &&
      Math.abs(sourceSeconds - calculatedSeconds) > 1;
    if (durationMismatch) durationMismatchRows++;

    const vin = cleanText_(valueAt_(displayRow, map.vin)) || cleanText_(valueAt_(row, map.vin));
    const plate = cleanText_(valueAt_(displayRow, map.unit)) || cleanText_(valueAt_(row, map.unit));
    if (isMissingIdentifier_(plate)) missingPlateRows++;
    if (isMissingIdentifier_(vin)) missingVinRows++;
    const unit = canonicalCycleTimeUnit_(plate, vin);
    const station = canonicalCycleTimeStation_(valueAt_(displayRow, map.station) || valueAt_(row, map.station));
    const downBattery = cleanText_(valueAt_(displayRow, map.downBattery)) ||
      cleanText_(valueAt_(row, map.downBattery));
    const upBattery = cleanText_(valueAt_(displayRow, map.upBattery)) ||
      cleanText_(valueAt_(row, map.upBattery));
    if (isMissingIdentifier_(downBattery)) missingDownBatteryRows++;
    if (isMissingIdentifier_(upBattery)) missingUpBatteryRows++;

    const downSoc = parseSwabSoc_(valueAt_(row, map.downSoc), valueAt_(displayRow, map.downSoc));
    const upSoc = parseSwabSoc_(valueAt_(row, map.upSoc), valueAt_(displayRow, map.upSoc));
    let socDifference = toNumber_(valueAt_(row, map.socDifference));
    if (!isFiniteNumber_(socDifference) && isSoc_(downSoc) && isSoc_(upSoc)) {
      socDifference = upSoc - downSoc;
    }
    if (!isSoc_(downSoc) || !isSoc_(upSoc) || !isFiniteNumber_(socDifference)) invalidSocRows++;

    const resultValue = toNumber_(valueAt_(row, map.result));
    const resultCode = isFiniteNumber_(resultValue) ? Math.round(resultValue) : null;
    if ([1, 2, 3].indexOf(resultCode) === -1) invalidResultRows++;
    const status = cycleTimeStatus_(resultCode, validDuration, durationMinutes, Boolean(eventTime));
    const shift = deriveCycleTimeShift_(startTime || eventTime);

    parsed.push({
      id: businessNo,
      businessNo: businessNo,
      sourceRow: headerInfo.row + 1 + offset,
      vin: vin || '-',
      plate: plate || '-',
      unit: unit,
      unitSource: isMissingIdentifier_(plate) ? 'VIN_FALLBACK' : 'PLATE',
      station: station,
      location: station,
      startTime: startTime,
      endTime: endTime,
      eventTime: eventTime,
      dateKey: eventTime ? formatDateKey_(eventTime) : '',
      eventHour: eventTime ? Number(Utilities.formatDate(eventTime, CONFIG.TIMEZONE, 'H')) : null,
      shift: shift,
      durationSeconds: validDuration ? durationSeconds : null,
      durationMinutes: validDuration ? durationMinutes : null,
      rawDurationSeconds: durationSeconds,
      validDuration: validDuration,
      durationMismatch: durationMismatch,
      downBattery: downBattery || '-',
      downSoc: downSoc,
      downCompartment: cleanText_(valueAt_(displayRow, map.downCompartment)) || '-',
      upBattery: upBattery || '-',
      upSoc: upSoc,
      upCompartment: cleanText_(valueAt_(displayRow, map.upCompartment)) || '-',
      socDifference: socDifference,
      exchangeEnergyKwh: toNumber_(valueAt_(row, map.energy)),
      resultCode: resultCode,
      resultLabel: cycleTimeResultLabel_(resultCode),
      status: status,
      statusLabel: cycleTimeStatusLabel_(status),
      withinSla: status === 'ON_TARGET',
      successful: ['ON_TARGET', 'DELAY', 'CRITICAL_DELAY'].indexOf(status) !== -1
    });
  });

  const dates = parsed.map(function (record) { return record.dateKey; }).filter(Boolean).sort();
  return {
    records: parsed,
    meta: {
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName(),
      headerRow: headerInfo.row,
      sourceRows: dataRowCount,
      parsedRows: parsed.length,
      uniqueCycles: parsed.length,
      duplicateBusinessNo: duplicateBusinessNo,
      invalidDateRows: invalidDateRows,
      invalidDurationRows: invalidDurationRows,
      durationMismatchRows: durationMismatchRows,
      missingPlateRows: missingPlateRows,
      missingVinRows: missingVinRows,
      missingDownBatteryRows: missingDownBatteryRows,
      missingUpBatteryRows: missingUpBatteryRows,
      invalidSocRows: invalidSocRows,
      invalidResultRows: invalidResultRows,
      minDate: dates.length ? dates[0] : '',
      maxDate: dates.length ? dates[dates.length - 1] : ''
    }
  };
}

function canonicalCycleTimeUnit_(plate, vin) {
  const plateUnit = canonicalSwabUnit_(plate);
  if (plateUnit) return plateUnit;
  const vinText = cleanText_(vin).toUpperCase();
  return vinText ? 'VIN ' + vinText.slice(-5) : 'UNKNOWN';
}

function canonicalCycleTimeStation_(value) {
  const text = cleanText_(value).replace(/\s+/g, ' ');
  if (!text) return 'UNKNOWN';
  const location = canonicalLocation_(text);
  return /^ROM A[12](?: Swap \d+)?$/.test(location) ? location : text;
}

function deriveCycleTimeShift_(date) {
  if (!date || isNaN(date.getTime())) return '-';
  const hour = Number(Utilities.formatDate(date, CONFIG.TIMEZONE, 'H'));
  return hour >= 6 && hour < 18 ? '1' : '2';
}

function cycleTimeStatus_(resultCode, validDuration, durationMinutes, validDate) {
  if (!validDate || [1, 2, 3].indexOf(resultCode) === -1) return 'DATA_ANOMALY';
  if (resultCode === 2) return 'FAILED';
  if (resultCode === 3) return 'CANCELLED';
  if (!validDuration) return 'DATA_ANOMALY';
  if (durationMinutes <= CONFIG.SWAB_CYCLE_SLA_MINUTES) return 'ON_TARGET';
  if (durationMinutes <= CONFIG.SWAB_CYCLE_CRITICAL_MINUTES) return 'DELAY';
  return 'CRITICAL_DELAY';
}

function cycleTimeResultLabel_(resultCode) {
  return { 1: 'Success', 2: 'Fail', 3: 'Cancel' }[resultCode] || 'Invalid';
}

function cycleTimeStatusLabel_(status) {
  return {
    ON_TARGET: 'On target ≤' + CONFIG.SWAB_CYCLE_SLA_MINUTES + ' menit',
    DELAY: 'Delay >' + CONFIG.SWAB_CYCLE_SLA_MINUTES + '–' +
      CONFIG.SWAB_CYCLE_CRITICAL_MINUTES + ' menit',
    CRITICAL_DELAY: 'Critical delay >' + CONFIG.SWAB_CYCLE_CRITICAL_MINUTES + ' menit',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    DATA_ANOMALY: 'Data anomaly / takeout'
  }[status] || status;
}

function buildCycleTimeFilterOptions_(records, meta) {
  return {
    minDate: meta.minDate,
    maxDate: meta.maxDate,
    locations: uniqueSorted_(ROM_LOCATIONS.concat(records.map(function (record) { return record.location; }))),
    stations: uniqueSorted_(ROM_LOCATIONS.concat(records.map(function (record) { return record.station; }))),
    units: uniqueSorted_(records.filter(function (record) { return record.unit !== 'UNKNOWN'; })
      .map(function (record) { return record.unit; })),
    vins: uniqueSorted_(records.filter(function (record) { return !isMissingIdentifier_(record.vin); })
      .map(function (record) { return record.vin; })),
    batteries: uniqueSorted_(records.filter(function (record) { return !isMissingIdentifier_(record.downBattery); })
      .map(function (record) { return record.downBattery; })),
    downCompartments: uniqueSorted_(records.map(function (record) { return record.downCompartment; })),
    upCompartments: uniqueSorted_(records.map(function (record) { return record.upCompartment; })),
    shifts: uniqueSorted_(records.map(function (record) { return record.shift; })),
    statuses: ['ON_TARGET', 'DELAY', 'CRITICAL_DELAY', 'FAILED', 'CANCELLED', 'DATA_ANOMALY'],
    statusOptions: ['ON_TARGET', 'DELAY', 'CRITICAL_DELAY', 'FAILED', 'CANCELLED', 'DATA_ANOMALY']
      .map(function (status) { return { value: status, label: cycleTimeStatusLabel_(status) }; }),
    slaMinutes: CONFIG.SWAB_CYCLE_SLA_MINUTES,
    criticalMinutes: CONFIG.SWAB_CYCLE_CRITICAL_MINUTES
  };
}

function normalizeCycleTimeFilters_(raw, options) {
  options = options || {};
  let s = validDateKey_(raw.startDate) ? raw.startDate : '';
  let e = validDateKey_(raw.endDate) ? raw.endDate : '';
  if (s && !e) {
    e = s;
  } else if (!s && e) {
    s = e;
  } else if (!s && !e) {
    s = options.minDate || '';
    e = options.maxDate || '';
  } else if (s && e && s > e) {
    const swap = s;
    s = e;
    e = swap;
  }
  return {
    startDate: s,
    endDate: e,
    location: normalizeOption_(raw.location || raw.station),
    unit: normalizeOption_(raw.unit || raw.plate || raw.truck),
    vin: normalizeOption_(raw.vin),
    battery: normalizeOption_(raw.battery || raw.downBattery),
    downCompartment: normalizeOption_(raw.downCompartment),
    upCompartment: normalizeOption_(raw.upCompartment),
    shift: normalizeOption_(raw.shift),
    status: normalizeOption_(raw.status || raw.slaStatus),
    result: normalizeOption_(raw.result)
  };
}

function applyCycleTimeFilters_(records, filters) {
  return records.filter(function (record) {
    if (filters.startDate && record.dateKey < filters.startDate) return false;
    if (filters.endDate && record.dateKey > filters.endDate) return false;
    if (filters.location && record.location !== filters.location) return false;
    if (filters.unit && record.unit !== filters.unit) return false;
    if (filters.vin && record.vin !== filters.vin) return false;
    if (filters.battery && record.downBattery !== filters.battery) return false;
    if (filters.downCompartment && record.downCompartment !== filters.downCompartment) return false;
    if (filters.upCompartment && record.upCompartment !== filters.upCompartment) return false;
    if (filters.shift && record.shift !== filters.shift) return false;
    if (filters.status) {
      if (filters.status === 'OVER_SLA' && ['DELAY', 'CRITICAL_DELAY'].indexOf(record.status) === -1) return false;
      if (filters.status !== 'OVER_SLA' && record.status !== filters.status) return false;
    }
    if (filters.result && String(record.resultCode) !== String(filters.result)) return false;
    return true;
  });
}

function buildCycleTimePayload_(source, records, options, appliedFilters) {
  const kpis = buildCycleTimeKpis_(records);
  const trends = {
    daily: aggregateCycleTimeTrend_(records, 'daily'),
    weekly: aggregateCycleTimeTrend_(records, 'weekly'),
    monthly: aggregateCycleTimeTrend_(records, 'monthly')
  };
  const stationComparison = buildCycleTimeGroupSummary_(records, 'station');
  const unitRanking = buildCycleTimeGroupSummary_(records, 'unit').sort(function (a, b) {
    return b.slaCompliancePct - a.slaCompliancePct ||
      a.avgCycleMinutes - b.avgCycleMinutes || b.totalCycles - a.totalCycles ||
      naturalSort_(a.key, b.key);
  });
  const shiftComparison = buildCycleTimeGroupSummary_(records, 'shift');
  const hourlyProfile = buildCycleTimeHourlyProfile_(records);
  const compartmentComparison = buildCycleTimeCompartmentComparison_(records);
  const quality = buildCycleTimeQuality_(source.meta, records, kpis);
  return {
    success: true,
    empty: records.length === 0,
    emptyReason: records.length ? '' : 'Tidak ada cycle swab pada filter terpilih.',
    source: {
      spreadsheetName: source.meta.spreadsheetName,
      sheetName: source.meta.sheetName,
      sourceRows: source.meta.sourceRows,
      parsedRows: source.meta.parsedRows,
      uniqueCycles: source.meta.uniqueCycles,
      filteredRows: records.length,
      minDate: source.meta.minDate,
      maxDate: source.meta.maxDate
    },
    options: options,
    appliedFilters: appliedFilters,
    thresholds: {
      slaMinutes: CONFIG.SWAB_CYCLE_SLA_MINUTES,
      criticalMinutes: CONFIG.SWAB_CYCLE_CRITICAL_MINUTES,
      minReasonableSeconds: CONFIG.MIN_REASONABLE_SWAB_CYCLE_SECONDS,
      maxReasonableMinutes: CONFIG.MAX_REASONABLE_SWAB_CYCLE_MINUTES
    },
    kpis: kpis,
    trends: trends,
    stationComparison: stationComparison,
    romComparison: stationComparison,
    unitRanking: unitRanking,
    unitPerformance: unitRanking,
    shiftComparison: shiftComparison,
    hourlyProfile: hourlyProfile,
    hourly: hourlyProfile,
    compartmentComparison: compartmentComparison,
    compartments: compartmentComparison,
    statusBreakdown: buildCycleTimeStatusBreakdown_(records),
    durationDistribution: buildCycleTimeDurationDistribution_(records),
    distributions: {
      duration: buildCycleTimeDurationDistribution_(records),
      status: buildCycleTimeStatusBreakdown_(records)
    },
    insights: buildCycleTimeInsights_(kpis, stationComparison, unitRanking, quality),
    recentCycles: buildRecentCycleTimeRows_(records),
    quality: quality
  };
}

function buildCycleTimeKpis_(records) {
  const successful = records.filter(function (record) { return record.successful && record.validDuration; });
  const durations = successful.map(function (record) { return record.durationMinutes; });
  const withinSla = successful.filter(function (record) { return record.withinSla; });
  const socRows = successful.filter(function (record) {
    return isSoc_(record.downSoc) && isSoc_(record.upSoc) && isFiniteNumber_(record.socDifference);
  });
  const energyRows = successful.filter(function (record) {
    return isFiniteNumber_(record.exchangeEnergyKwh) && record.exchangeEnergyKwh >= 0;
  });
  const uniqueDays = uniqueSorted_(records.map(function (record) { return record.dateKey; })).length;
  const avgCycle = durations.length ? mean_(durations) : null;
  const successCount = successful.length;
  return {
    totalCycles: records.length,
    totalSwaps: records.length,
    successfulCycles: successCount,
    validCycles: successCount,
    performanceCycles: successCount,
    successRatePct: round_(safeDivide_(successCount * 100, records.length), 2),
    avgCycleMinutes: durations.length ? round_(avgCycle, 3) : null,
    averageCycleTimeMinutes: durations.length ? round_(avgCycle, 3) : null,
    medianCycleMinutes: durations.length ? round_(median_(durations), 3) : null,
    p90CycleMinutes: durations.length ? round_(percentile_(durations, 0.90), 3) : null,
    p95CycleMinutes: durations.length ? round_(percentile_(durations, 0.95), 3) : null,
    minCycleMinutes: durations.length ? round_(Math.min.apply(null, durations), 3) : null,
    maxCycleMinutes: durations.length ? round_(Math.max.apply(null, durations), 3) : null,
    withinSla: withinSla.length,
    onTargetCycles: withinSla.length,
    overSla: successful.filter(function (record) {
      return record.status === 'DELAY' || record.status === 'CRITICAL_DELAY';
    }).length,
    delayedCycles: successful.filter(function (record) { return record.status === 'DELAY'; }).length,
    criticalDelayCycles: successful.filter(function (record) { return record.status === 'CRITICAL_DELAY'; }).length,
    slaCompliancePct: round_(safeDivide_(withinSla.length * 100, successCount), 2),
    slaTargetMinutes: CONFIG.SWAB_CYCLE_SLA_MINUTES,
    throughputPerHour: durations.length ? round_(safeDivide_(60, avgCycle), 2) : null,
    avgDownSoc: socRows.length ? round_(mean_(socRows.map(function (record) { return record.downSoc; })), 2) : null,
    avgUpSoc: socRows.length ? round_(mean_(socRows.map(function (record) { return record.upSoc; })), 2) : null,
    avgSocDifference: socRows.length
      ? round_(mean_(socRows.map(function (record) { return record.socDifference; })), 2)
      : null,
    totalEnergyKwh: energyRows.length
      ? round_(sum_(energyRows.map(function (record) { return record.exchangeEnergyKwh; })), 2)
      : null,
    avgEnergyKwh: energyRows.length
      ? round_(mean_(energyRows.map(function (record) { return record.exchangeEnergyKwh; })), 2)
      : null,
    failedCycles: records.filter(function (record) { return record.status === 'FAILED'; }).length,
    cancelledCycles: records.filter(function (record) { return record.status === 'CANCELLED'; }).length,
    dataInvalid: records.filter(function (record) { return record.status === 'DATA_ANOMALY'; }).length,
    dataAnomaly: records.filter(function (record) { return record.status === 'DATA_ANOMALY'; }).length,
    takeoutCycles: records.filter(function (record) { return record.status === 'DATA_ANOMALY'; }).length,
    units: uniqueSorted_(records.filter(function (record) { return record.unit !== 'UNKNOWN'; })
      .map(function (record) { return record.unit; })).length,
    unitCount: uniqueSorted_(records.filter(function (record) { return record.unit !== 'UNKNOWN'; })
      .map(function (record) { return record.unit; })).length,
    stations: uniqueSorted_(records.map(function (record) { return record.station; })).length,
    stationCount: uniqueSorted_(records.map(function (record) { return record.station; })).length,
    activeDays: uniqueDays,
    cyclesPerDay: round_(safeDivide_(records.length, uniqueDays), 2)
  };
}

function percentile_(values, probability) {
  const valid = values.filter(isFiniteNumber_).sort(function (a, b) { return a - b; });
  if (!valid.length) return 0;
  if (valid.length === 1) return valid[0];
  const position = Math.max(0, Math.min(1, probability)) * (valid.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return valid[lower];
  return valid[lower] + (valid[upper] - valid[lower]) * (position - lower);
}

function aggregateCycleTimeTrend_(records, period) {
  const groups = {};
  records.forEach(function (record) {
    if (!record.dateKey) return;
    const descriptor = periodDescriptor_(record.dateKey, period);
    if (!groups[descriptor.key]) groups[descriptor.key] = { descriptor: descriptor, records: [] };
    groups[descriptor.key].records.push(record);
  });
  return Object.keys(groups).sort().map(function (key) {
    const group = groups[key];
    const kpis = buildCycleTimeKpis_(group.records);
    return {
      key: key,
      label: group.descriptor.label,
      totalCycles: kpis.totalCycles,
      successfulCycles: kpis.successfulCycles,
      avgCycleMinutes: kpis.avgCycleMinutes,
      medianCycleMinutes: kpis.medianCycleMinutes,
      p90CycleMinutes: kpis.p90CycleMinutes,
      slaCompliancePct: kpis.slaCompliancePct,
      withinSla: kpis.withinSla,
      overSla: kpis.overSla,
      throughputPerHour: kpis.throughputPerHour,
      avgDownSoc: kpis.avgDownSoc,
      avgUpSoc: kpis.avgUpSoc,
      avgSocDifference: kpis.avgSocDifference,
      totalEnergyKwh: kpis.totalEnergyKwh
    };
  });
}

function buildCycleTimeGroupSummary_(records, field) {
  const groups = groupBy_(records, function (record) { return record[field] || 'UNKNOWN'; });
  return Object.keys(groups).sort(naturalSort_).map(function (key) {
    const kpis = buildCycleTimeKpis_(groups[key]);
    return {
      key: key,
      label: field === 'shift' ? 'Shift ' + key : key,
      station: field === 'station' ? key : undefined,
      location: field === 'station' ? key : undefined,
      unit: field === 'unit' ? key : undefined,
      shift: field === 'shift' ? key : undefined,
      totalCycles: kpis.totalCycles,
      successfulCycles: kpis.successfulCycles,
      successRatePct: kpis.successRatePct,
      avgCycleMinutes: kpis.avgCycleMinutes,
      medianCycleMinutes: kpis.medianCycleMinutes,
      p90CycleMinutes: kpis.p90CycleMinutes,
      slaCompliancePct: kpis.slaCompliancePct,
      withinSla: kpis.withinSla,
      overSla: kpis.overSla,
      throughputPerHour: kpis.throughputPerHour,
      avgDownSoc: kpis.avgDownSoc,
      avgUpSoc: kpis.avgUpSoc,
      avgSocDifference: kpis.avgSocDifference,
      totalEnergyKwh: kpis.totalEnergyKwh,
      avgEnergyKwh: kpis.avgEnergyKwh
    };
  });
}

function buildCycleTimeStatusBreakdown_(records) {
  const order = ['ON_TARGET', 'DELAY', 'CRITICAL_DELAY', 'FAILED', 'CANCELLED', 'DATA_ANOMALY'];
  return order.map(function (status) {
    const count = records.filter(function (record) { return record.status === status; }).length;
    return {
      status: status,
      label: cycleTimeStatusLabel_(status),
      count: count,
      percentage: round_(safeDivide_(count * 100, records.length), 2)
    };
  });
}

function buildCycleTimeHourlyProfile_(records) {
  const groups = {};
  records.forEach(function (record) {
    if (!isFiniteNumber_(record.eventHour)) return;
    const hour = Math.max(0, Math.min(23, Math.floor(record.eventHour)));
    if (!groups[hour]) groups[hour] = [];
    groups[hour].push(record);
  });
  return Array.from({ length: 24 }, function (_, hour) {
    const rows = groups[hour] || [];
    const kpis = buildCycleTimeKpis_(rows);
    return {
      hour: hour,
      key: pad2_(hour),
      label: pad2_(hour) + ':00',
      totalCycles: kpis.totalCycles,
      successfulCycles: kpis.successfulCycles,
      validCycles: kpis.validCycles,
      avgCycleMinutes: kpis.avgCycleMinutes,
      medianCycleMinutes: kpis.medianCycleMinutes,
      p90CycleMinutes: kpis.p90CycleMinutes,
      slaCompliancePct: kpis.slaCompliancePct,
      withinSla: kpis.withinSla,
      overSla: kpis.overSla,
      throughputPerHour: kpis.throughputPerHour
    };
  });
}

function buildCycleTimeCompartmentComparison_(records) {
  const keys = uniqueSorted_(records.map(function (record) { return record.downCompartment; })
    .concat(records.map(function (record) { return record.upCompartment; })));
  return keys.filter(function (key) { return !isMissingIdentifier_(key); }).map(function (compartment) {
    const downRows = records.filter(function (record) { return record.downCompartment === compartment; });
    const upRows = records.filter(function (record) { return record.upCompartment === compartment; });
    const allRowsById = {};
    downRows.concat(upRows).forEach(function (record) { allRowsById[record.id] = record; });
    const combined = Object.keys(allRowsById).map(function (id) { return allRowsById[id]; });
    const kpis = buildCycleTimeKpis_(combined);
    return {
      key: compartment,
      compartment: compartment,
      label: 'Compartment ' + compartment,
      downCycles: downRows.length,
      upCycles: upRows.length,
      totalCycles: combined.length,
      successfulCycles: kpis.successfulCycles,
      avgCycleMinutes: kpis.avgCycleMinutes,
      p90CycleMinutes: kpis.p90CycleMinutes,
      slaCompliancePct: kpis.slaCompliancePct
    };
  }).sort(function (a, b) { return naturalSort_(a.compartment, b.compartment); });
}

function buildCycleTimeDurationDistribution_(records) {
  const buckets = [
    { key: 'LE5', label: '≤5', min: -Infinity, max: 5, includeMax: true },
    { key: '5_55', label: '>5–5,5', min: 5, max: 5.5, strictMin: true, includeMax: true },
    { key: '55_6', label: '>5,5–6', min: 5.5, max: 6, strictMin: true, includeMax: true },
    { key: '6_7', label: '>6–7', min: 6, max: 7, strictMin: true, includeMax: true },
    { key: 'GT7', label: '>7', min: 7, max: Infinity, strictMin: true, includeMax: true }
  ];
  return buckets.map(function (bucket) {
    const count = records.filter(function (record) {
      const value = record.durationMinutes;
      if (!isFiniteNumber_(value)) return false;
      const minOk = bucket.strictMin ? value > bucket.min : value >= bucket.min;
      const maxOk = bucket.includeMax ? value <= bucket.max : value < bucket.max;
      return minOk && maxOk;
    }).length;
    return { key: bucket.key, label: bucket.label, count: count };
  });
}

function buildCycleTimeQuality_(meta, records, kpis) {
  const criticalIssues = meta.invalidDateRows + meta.invalidDurationRows +
    meta.durationMismatchRows + meta.invalidResultRows + meta.duplicateBusinessNo;
  const issueRate = safeDivide_(criticalIssues * 100, Math.max(1, meta.sourceRows));
  const score = Math.max(0, Math.min(100, 100 - issueRate));
  return {
    score: round_(score, 1),
    qualityScore: round_(score, 1),
    sourceRows: meta.sourceRows,
    parsedRows: meta.parsedRows,
    filteredRows: records.length,
    duplicateBusinessNo: meta.duplicateBusinessNo,
    invalidDateRows: meta.invalidDateRows,
    invalidDurationRows: meta.invalidDurationRows,
    durationTakeoutRows: meta.invalidDurationRows,
    durationMismatchRows: meta.durationMismatchRows,
    missingPlateRows: meta.missingPlateRows,
    vinFallbackRows: meta.missingPlateRows,
    missingVinRows: meta.missingVinRows,
    missingDownBatteryRows: meta.missingDownBatteryRows,
    missingUpBatteryRows: meta.missingUpBatteryRows,
    invalidSocRows: meta.invalidSocRows,
    invalidResultRows: meta.invalidResultRows,
    successfulCycles: kpis.successfulCycles,
    withinSla: kpis.withinSla,
    overSla: kpis.overSla,
    slaRule: 'Performance cycle: result sukses, durasi ≥' +
      CONFIG.MIN_REASONABLE_SWAB_CYCLE_SECONDS + ' detik dan ≤' +
      CONFIG.MAX_REASONABLE_SWAB_CYCLE_MINUTES + ' menit; on target jika ≤' +
      CONFIG.SWAB_CYCLE_SLA_MINUTES + ' menit',
    shiftRule: 'Shift 1 06:00–17:59 · Shift 2 18:00–05:59'
  };
}

function buildCycleTimeInsights_(kpis, stationComparison, unitRanking, quality) {
  const insights = [];
  insights.push({
    tone: kpis.slaCompliancePct >= 90 ? 'positive' : (kpis.slaCompliancePct >= 80 ? 'neutral' : 'warning'),
    eyebrow: 'SLA compliance',
    title: formatNumberId_(kpis.slaCompliancePct, 1) + '% cycle selesai ≤' +
      CONFIG.SWAB_CYCLE_SLA_MINUTES + ' menit',
    text: formatNumberId_(kpis.withinSla, 0) + ' dari ' +
      formatNumberId_(kpis.successfulCycles, 0) + ' cycle sukses berada di dalam target.'
  });
  if (isFiniteNumber_(kpis.avgCycleMinutes)) {
    insights.push({
      tone: 'electric',
      eyebrow: 'Cycle velocity',
      title: formatNumberId_(kpis.avgCycleMinutes, 2) + ' menit average · P90 ' +
        formatNumberId_(kpis.p90CycleMinutes, 2) + ' menit',
      text: 'Kapasitas teoritis ' + formatNumberId_(kpis.throughputPerHour, 2) +
        ' cycle per jam berdasarkan durasi rata-rata.'
    });
  }
  const eligibleUnits = unitRanking.filter(function (item) { return item.successfulCycles >= 10; });
  if (eligibleUnits.length) {
    const best = eligibleUnits.slice().sort(function (a, b) {
      return b.slaCompliancePct - a.slaCompliancePct || a.avgCycleMinutes - b.avgCycleMinutes;
    })[0];
    insights.push({
      tone: 'positive',
      eyebrow: 'Unit benchmark',
      title: best.label + ' mencatat SLA ' + formatNumberId_(best.slaCompliancePct, 1) + '%',
      text: formatNumberId_(best.successfulCycles, 0) + ' cycle sukses · rata-rata ' +
        formatNumberId_(best.avgCycleMinutes, 2) + ' menit.'
    });
  }
  if (stationComparison.length) {
    const station = stationComparison.slice().sort(function (a, b) {
      return b.totalCycles - a.totalCycles;
    })[0];
    insights.push({
      tone: 'neutral',
      eyebrow: 'Station activity',
      title: station.label + ' memproses ' + formatNumberId_(station.totalCycles, 0) + ' cycle',
      text: 'Rata-rata ' + formatNumberId_(station.avgCycleMinutes, 2) +
        ' menit dengan SLA ' + formatNumberId_(station.slaCompliancePct, 1) + '%.'
    });
  }
  insights.push({
    tone: quality.score >= 98 ? 'neutral' : 'warning',
    eyebrow: 'Data quality',
    title: 'Quality score ' + formatNumberId_(quality.score, 1) + '%',
    text: formatNumberId_(quality.duplicateBusinessNo, 0) + ' duplikat · ' +
      formatNumberId_(quality.durationMismatchRows, 0) + ' mismatch timestamp · ' +
      formatNumberId_(quality.vinFallbackRows, 0) + ' unit memakai fallback VIN.'
  });
  return insights.slice(0, 6);
}

function buildRecentCycleTimeRows_(records) {
  return records.slice().sort(function (a, b) {
    const aTime = a.eventTime ? a.eventTime.getTime() : 0;
    const bTime = b.eventTime ? b.eventTime.getTime() : 0;
    return bTime - aTime || b.sourceRow - a.sourceRow;
  }).slice(0, CONFIG.MAX_CYCLE_TIME_TABLE_ROWS).map(function (record) {
    return {
      id: record.id,
      businessNo: record.businessNo,
      eventTime: record.eventTime ? formatDateTime_(record.eventTime) : '-',
      startTime: record.startTime ? formatDateTime_(record.startTime) : '-',
      endTime: record.endTime ? formatDateTime_(record.endTime) : '-',
      dateKey: record.dateKey,
      station: record.station,
      location: record.location,
      unit: record.unit,
      vin: record.vin,
      shift: record.shift,
      rawDurationSeconds: isFiniteNumber_(record.rawDurationSeconds) ? round_(record.rawDurationSeconds, 1) : null,
      rawDurationMinutes: isFiniteNumber_(record.rawDurationSeconds)
        ? round_(record.rawDurationSeconds / 60, 3)
        : null,
      durationSeconds: isFiniteNumber_(record.durationSeconds) ? round_(record.durationSeconds, 1) : null,
      durationMinutes: isFiniteNumber_(record.durationMinutes) ? round_(record.durationMinutes, 3) : null,
      downBattery: record.downBattery,
      downSoc: isSoc_(record.downSoc) ? round_(record.downSoc, 1) : null,
      downCompartment: record.downCompartment,
      upBattery: record.upBattery,
      upSoc: isSoc_(record.upSoc) ? round_(record.upSoc, 1) : null,
      upCompartment: record.upCompartment,
      socDifference: isFiniteNumber_(record.socDifference) ? round_(record.socDifference, 1) : null,
      energyKwh: isFiniteNumber_(record.exchangeEnergyKwh) ? round_(record.exchangeEnergyKwh, 2) : null,
      resultCode: record.resultCode,
      resultLabel: record.resultLabel,
      status: record.status,
      statusLabel: record.statusLabel
    };
  });
}

/**
 * Export workbook Excel asli (.xlsx) untuk ketiga dashboard.
 * @param {Object} request {view: charging|battery|cycleTime, filters: {...}}
 * @return {Object} Base64 workbook untuk diunduh oleh browser.
 */
function exportDashboardExcel(request) {
  const input = typeof request === 'string'
    ? { view: request }
    : (request && typeof request === 'object' ? request : {});
  const rawView = normalizeKey_(input.view || input.menu || input.dashboard || 'charging');
  const filters = input.filters && typeof input.filters === 'object' ? input.filters : input;
  if (/battery|ketahanan|endurance/.test(rawView)) return exportBatteryWorkbook_(filters);
  if (/cycle|swab cycle|swap cycle/.test(rawView)) return exportCycleTimeWorkbook_(filters);
  return exportChargingWorkbook_(filters);
}

function exportChargingExcel(filters) {
  return exportChargingWorkbook_(filters || {});
}

function exportBatteryExcel(filters) {
  return exportBatteryWorkbook_(filters || {});
}

function exportSwabCycleExcel(filters) {
  return exportCycleTimeWorkbook_(filters || {});
}

function exportChargingWorkbook_(rawFilters) {
  const ss = getSpreadsheet_();
  const sourceRef = resolveConfiguredSource_(ss);
  const source = readNormalizedRecords_(sourceRef.sheet, sourceRef.headerInfo);
  const options = buildFilterOptions_(source.records, source.meta);
  const filters = normalizeFilters_(rawFilters || {}, options);
  const records = applyFilters_(source.records, filters);
  const kpis = summarizeRecords_(records);
  const headers = [
    'No', 'Order', 'Source Row', 'Date', 'Charging Start', 'Charging End',
    'Location', 'Charger', 'Port/Meter', 'Port Label', 'Truck/Unit', 'Battery ID', 'VIN',
    'Start SOC (%)', 'End SOC (%)', 'SOC Gain (%)', 'Duration (minutes)',
    'Energy (kWh)', 'Average Power (kW)', 'kWh per 1% SOC', 'SOC per Hour (%)',
    'Minutes per 1% SOC', 'Start Reading', 'End Reading', 'Status'
  ];
  const rows = records.slice().sort(function (a, b) {
    return a.eventTime.getTime() - b.eventTime.getTime() || a.sourceRow - b.sourceRow;
  }).map(function (record, index) {
    return [
      index + 1,
      record.order,
      record.sourceRow,
      record.dateKey,
      record.startTime ? formatDateTime_(record.startTime) : '',
      record.endTime ? formatDateTime_(record.endTime) : '',
      record.location,
      record.charger,
      record.meter,
      record.portLabel,
      record.truck,
      record.battery,
      record.vin,
      isSoc_(record.startSoc) ? round_(record.startSoc, 2) : null,
      isSoc_(record.endSoc) ? round_(record.endSoc, 2) : null,
      isFiniteNumber_(record.socGain) ? round_(record.socGain, 2) : null,
      record.validDuration ? round_(record.durationHours * 60, 3) : null,
      record.validEnergy ? round_(record.kwh, 3) : null,
      isFiniteNumber_(record.power) ? round_(record.power, 3) : null,
      record.validEnergy && isFinitePositive_(record.socGain)
        ? round_(record.kwh / record.socGain, 4)
        : null,
      record.validDuration && isFinitePositive_(record.socGain)
        ? round_(record.socGain / record.durationHours, 3)
        : null,
      record.validDuration && isFinitePositive_(record.socGain)
        ? round_(record.durationHours * 60 / record.socGain, 4)
        : null,
      isFiniteNumber_(record.startReading) ? record.startReading : null,
      isFiniteNumber_(record.endReading) ? record.endReading : null,
      record.validSoc && record.validDuration && record.validEnergy ? 'Valid' : 'Check'
    ];
  });
  const summary = [
    ['Dashboard', 'Charging Station'],
    ['Source Sheet', source.meta.sheetName],
    ['Filter Period', exportFilterPeriod_(filters)],
    ['Sessions', kpis.sessions],
    ['Average Start SOC (%)', kpis.avgStartSoc],
    ['Average End SOC (%)', kpis.avgEndSoc],
    ['Average Duration (minutes)', kpis.avgDurationMinutes],
    ['Total Energy (kWh)', kpis.totalKwh],
    ['Average Power (kW)', kpis.avgPower],
    ['Generated At', formatDateTime_(new Date())]
  ];
  return buildXlsxExportResponse_('PPA_Charging_Station', summary, headers, rows);
}

function exportBatteryWorkbook_(rawFilters) {
  const ss = getSpreadsheet_();
  const sourceRef = resolveSwabConfiguredSource_(ss);
  const source = readBatteryEnduranceSource_(sourceRef.sheet, sourceRef.headerInfo);
  const options = buildBatteryFilterOptions_(source.records, source.cycles, source.meta);
  const filters = normalizeBatteryFilters_(rawFilters || {}, options);
  const records = applyBatteryRecordFilters_(source.records, filters);
  const cycles = applyBatteryCycleFilters_(source.cycles, filters);
  const kpis = buildBatteryKpis_(records, cycles);
  const headers = [
    'No', 'Date', 'Shift', 'ROM/Location', 'Unit', 'Event Time',
    'Previous Source Row', 'Current Source Row', 'Previous HM', 'Current HM',
    'Endurance (HM)', 'Status', 'SOC Start (%)', 'SOC End (%)', 'SOC Used (%)',
    'SOC per HM (%)', 'Estimated Energy Used (kWh)', 'ECR (kWh/HM)', 'Remark', 'Note'
  ];
  const rows = cycles.slice().sort(function (a, b) {
    return a.dateKey.localeCompare(b.dateKey) || naturalSort_(a.unit, b.unit) ||
      a.sourceRow - b.sourceRow;
  }).map(function (cycle, index) {
    return [
      index + 1,
      cycle.dateKey,
      cycle.shift,
      cycle.location,
      cycle.unit,
      cycle.timeLabel,
      cycle.previousSourceRow,
      cycle.sourceRow,
      isFiniteNumber_(cycle.previousHm) ? round_(cycle.previousHm, 3) : null,
      isFiniteNumber_(cycle.currentHm) ? round_(cycle.currentHm, 3) : null,
      isFiniteNumber_(cycle.enduranceHours) ? round_(cycle.enduranceHours, 3) : null,
      cycle.statusLabel,
      isSoc_(cycle.previousSocAfter) ? round_(cycle.previousSocAfter, 2) : null,
      isSoc_(cycle.currentSocBefore) ? round_(cycle.currentSocBefore, 2) : null,
      isFiniteNumber_(cycle.socUsed) ? round_(cycle.socUsed, 2) : null,
      isFiniteNumber_(cycle.socPerHour) ? round_(cycle.socPerHour, 3) : null,
      isFiniteNumber_(cycle.estimatedEnergyUsedKwh) ? round_(cycle.estimatedEnergyUsedKwh, 3) : null,
      isFiniteNumber_(cycle.ecrKwhPerHm) ? round_(cycle.ecrKwhPerHm, 3) : null,
      cycle.remark,
      cycle.note
    ];
  });
  const summary = [
    ['Dashboard', 'Ketahanan Battery'],
    ['Source Sheet', source.meta.sheetName],
    ['Filter Period', exportFilterPeriod_(filters)],
    ['Filtered Cycle', cycles.length],
    ['Valid Cycle', kpis.validCycles],
    ['Average Endurance (HM)', kpis.avgEndurance],
    ['Median Endurance (HM)', kpis.medianEndurance],
    ['Valid Rate (%)', kpis.validRate],
    ['SOC Consumption (%/HM)', kpis.weightedSocPerHour],
    ['Energy Consumption Rate (kWh/HM)', kpis.weightedEcrKwhPerHm],
    ['Estimated Energy Used (kWh)', kpis.totalEstimatedEnergyUsedKwh],
    ['Generated At', formatDateTime_(new Date())]
  ];
  return buildXlsxExportResponse_('PPA_Battery_Endurance', summary, headers, rows);
}

function exportCycleTimeWorkbook_(rawFilters) {
  const ss = getSpreadsheet_();
  const sourceRef = resolveCycleTimeConfiguredSource_(ss);
  const source = readSwabCycleTimeSource_(sourceRef.sheet, sourceRef.headerInfo);
  const options = buildCycleTimeFilterOptions_(source.records, source.meta);
  const filters = normalizeCycleTimeFilters_(rawFilters || {}, options);
  const records = applyCycleTimeFilters_(source.records, filters);
  const kpis = buildCycleTimeKpis_(records);
  const headers = [
    'No', 'Business No', 'Source Row', 'Date', 'Start Time', 'End Time',
    'Station/Location', 'Unit', 'Unit Source', 'Plate', 'VIN', 'Shift',
    'Raw Duration (seconds)', 'Raw Duration (minutes)',
    'Performance Duration (seconds)', 'Performance Duration (minutes)',
    'SLA Status', 'Result Code', 'Result',
    'Down Battery', 'Down SOC (%)', 'Down Compartment', 'Up Battery', 'Up SOC (%)',
    'Up Compartment', 'SOC Difference (%)', 'Exchange Energy (kWh)'
  ];
  const rows = records.slice().sort(function (a, b) {
    const aTime = a.eventTime ? a.eventTime.getTime() : 0;
    const bTime = b.eventTime ? b.eventTime.getTime() : 0;
    return aTime - bTime || a.sourceRow - b.sourceRow;
  }).map(function (record, index) {
    return [
      index + 1,
      record.businessNo,
      record.sourceRow,
      record.dateKey,
      record.startTime ? formatDateTime_(record.startTime) : '',
      record.endTime ? formatDateTime_(record.endTime) : '',
      record.station,
      record.unit,
      record.unitSource,
      record.plate,
      record.vin,
      record.shift,
      isFiniteNumber_(record.rawDurationSeconds) ? round_(record.rawDurationSeconds, 2) : null,
      isFiniteNumber_(record.rawDurationSeconds) ? round_(record.rawDurationSeconds / 60, 3) : null,
      isFiniteNumber_(record.durationSeconds) ? round_(record.durationSeconds, 2) : null,
      isFiniteNumber_(record.durationMinutes) ? round_(record.durationMinutes, 3) : null,
      record.statusLabel,
      record.resultCode,
      record.resultLabel,
      record.downBattery,
      isSoc_(record.downSoc) ? round_(record.downSoc, 2) : null,
      record.downCompartment,
      record.upBattery,
      isSoc_(record.upSoc) ? round_(record.upSoc, 2) : null,
      record.upCompartment,
      isFiniteNumber_(record.socDifference) ? round_(record.socDifference, 2) : null,
      isFiniteNumber_(record.exchangeEnergyKwh) ? round_(record.exchangeEnergyKwh, 3) : null
    ];
  });
  const summary = [
    ['Dashboard', 'Swab Cycle Time'],
    ['Source Sheet', source.meta.sheetName],
    ['Filter Period', exportFilterPeriod_(filters)],
    ['Raw Cycle', kpis.totalCycles],
    ['Valid Performance Cycle', kpis.validCycles],
    ['Cycle Takeout', kpis.takeoutCycles],
    ['Average Cycle Time (minutes)', kpis.avgCycleMinutes],
    ['Median Cycle Time (minutes)', kpis.medianCycleMinutes],
    ['P90 Cycle Time (minutes)', kpis.p90CycleMinutes],
    ['SLA Target (minutes)', kpis.slaTargetMinutes],
    ['SLA Compliance (%)', kpis.slaCompliancePct],
    ['Throughput (cycle/hour)', kpis.throughputPerHour],
    ['Average Down SOC (%)', kpis.avgDownSoc],
    ['Average Up SOC (%)', kpis.avgUpSoc],
    ['Total Exchange Energy (kWh)', kpis.totalEnergyKwh],
    ['Generated At', formatDateTime_(new Date())]
  ];
  return buildXlsxExportResponse_('PPA_Swab_Cycle_Time', summary, headers, rows);
}

function exportFilterPeriod_(filters) {
  const start = filters && filters.startDate ? filters.startDate : 'ALL';
  const end = filters && filters.endDate ? filters.endDate : 'ALL';
  return start + ' — ' + end;
}

function buildXlsxExportResponse_(baseName, summaryRows, headers, rows) {
  const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
  const fileName = baseName + '_' + timestamp + '.xlsx';
  const workbookBlob = buildMinimalXlsxBlob_(fileName, summaryRows, headers, rows);
  const base64 = Utilities.base64Encode(workbookBlob.getBytes());
  return {
    success: true,
    fileName: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: base64,
    data: base64,
    rowCount: rows.length,
    generatedAt: formatDateTime_(new Date())
  };
}

function buildMinimalXlsxBlob_(fileName, summaryRows, headers, rows) {
  const createdAt = new Date().toISOString();
  const summaryHeaders = ['Metric', 'Value'];
  const summaryXml = buildXlsxWorksheetXml_(summaryHeaders, summaryRows);
  const dataXml = buildXlsxWorksheetXml_(headers, rows);
  const blobs = [
    xlsxPartBlob_('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>'),
    xlsxPartBlob_('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>'),
    xlsxPartBlob_('docProps/core.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:creator>PT Putra Perkasa Abadi - Site BIB</dc:creator>' +
      '<dc:title>EV Intelligence Processed Data</dc:title>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + xlsxXmlEscape_(createdAt) + '</dcterms:created>' +
      '</cp:coreProperties>'),
    xlsxPartBlob_('docProps/app.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
      'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>Google Apps Script EV Intelligence</Application>' +
      '<TitlesOfParts><vt:vector size="2" baseType="lpstr"><vt:lpstr>Summary</vt:lpstr>' +
      '<vt:lpstr>Processed Data</vt:lpstr></vt:vector></TitlesOfParts></Properties>'),
    xlsxPartBlob_('xl/workbook.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="1"/></bookViews><sheets>' +
      '<sheet name="Summary" sheetId="1" r:id="rId1"/>' +
      '<sheet name="Processed Data" sheetId="2" r:id="rId2"/>' +
      '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'),
    xlsxPartBlob_('xl/_rels/workbook.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>'),
    xlsxPartBlob_('xl/styles.xml', buildXlsxStylesXml_()),
    xlsxPartBlob_('xl/worksheets/sheet1.xml', summaryXml),
    xlsxPartBlob_('xl/worksheets/sheet2.xml', dataXml)
  ];
  return Utilities.zip(blobs, fileName)
    .setName(fileName)
    .setContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function xlsxPartBlob_(name, content) {
  return Utilities.newBlob(content, 'application/xml', name);
}

function buildXlsxWorksheetXml_(headers, rows) {
  const allRows = [headers].concat(rows || []);
  const lastColumn = xlsxColumnName_(Math.max(1, headers.length));
  const lastRow = Math.max(1, allRows.length);
  const widths = headers.map(function (header, columnIndex) {
    let maxLength = cleanText_(header).length;
    (rows || []).slice(0, 300).forEach(function (row) {
      const value = row[columnIndex];
      maxLength = Math.max(maxLength, cleanText_(value).length);
    });
    return Math.max(10, Math.min(34, maxLength + 2));
  });
  const columnsXml = widths.map(function (width, index) {
    return '<col min="' + (index + 1) + '" max="' + (index + 1) +
      '" width="' + width + '" customWidth="1"/>';
  }).join('');
  const sheetRows = allRows.map(function (row, rowIndex) {
    const excelRow = rowIndex + 1;
    const cells = headers.map(function (_, columnIndex) {
      return buildXlsxCellXml_(xlsxColumnName_(columnIndex + 1) + excelRow, row[columnIndex], rowIndex === 0);
    }).join('');
    return '<row r="' + excelRow + '"' + (rowIndex === 0 ? ' ht="24" customHeight="1"' : '') +
      '>' + cells + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" ' +
    'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="18"/>' +
    '<cols>' + columnsXml + '</cols><sheetData>' + sheetRows + '</sheetData>' +
    '<autoFilter ref="A1:' + lastColumn + lastRow + '"/>' +
    '</worksheet>';
}

function buildXlsxCellXml_(reference, value, isHeader) {
  if (isHeader) {
    return '<c r="' + reference + '" s="1" t="inlineStr"><is><t xml:space="preserve">' +
      xlsxXmlEscape_(value) + '</t></is></c>';
  }
  if (isFiniteNumber_(value)) {
    return '<c r="' + reference + '" s="2"><v>' + value + '</v></c>';
  }
  const text = value === null || value === undefined ? '' : String(value);
  return '<c r="' + reference + '" t="inlineStr"><is><t xml:space="preserve">' +
    xlsxXmlEscape_(text) + '</t></is></c>';
}

function xlsxColumnName_(index) {
  let value = Math.max(1, Number(index) || 1);
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function xlsxXmlEscape_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function buildXlsxStylesXml_() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="10"/><name val="Aptos"/><family val="2"/></font>' +
    '<font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos Display"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0B2633"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFB9D7E5"/></left>' +
    '<right style="thin"><color rgb="FFB9D7E5"/></right>' +
    '<top style="thin"><color rgb="FFB9D7E5"/></top>' +
    '<bottom style="thin"><color rgb="FFB9D7E5"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
    '</styleSheet>';
}
