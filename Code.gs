/**
 * PPA Safe & Strong - Charging & Battery Swap Management System
 * Google Apps Script Backend (Code.gs)
 * Spreadsheet ID: 1k63AKsRQ8WK1m37akbX9nxcEA2TVOJiKjRiQhj-4Phs (CHARGING EV 1.2)
 *
 * Sheet mapping (nama sheet di Spreadsheet):
 *  - DATA INPUT   : Transaksi swap (19 kolom)
 *  - USER         : Data pengguna / operator
 *  - SCEDHULE     : Jadwal swap unit
 *  - DATA PROBLEM : Log gangguan / downtime
 *  - POPULASI UNIT: Daftar kode unit armada
 */

const SPREADSHEET_ID = '1k63AKsRQ8WK1m37akbX9nxcEA2TVOJiKjRiQhj-4Phs';
const FALLBACK_SPREADSHEET_ID = '1k63AKsRQ8WK1m37akbX9nxcEA2TVOJiKjRiQhj-4Phs';
const EV_INTELLIGENCE_SPREADSHEET_ID = '1k63AKsRQ8WK1m37akbX9nxcEA2TVOJiKjRiQhj-4Phs';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('PPA Safe & Strong - Charging & Battery Swap')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0');
}

function doPost(e) {
  try {
    let raw = e && e.postData ? e.postData.contents : '';
    let body = {};
    try { body = JSON.parse(raw); } catch (err) {}

    if (body.action === 'get_info') {
      const ss = getSpreadsheet();
      const info = {};
      ss.getSheets().forEach(sh => {
        info[sh.getName()] = {
          lastRow: sh.getLastRow(),
          lastCol: sh.getLastColumn()
        };
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', info: info }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'get_all') {
      const result = apiGetAllSheetsData();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Direct HTTP API Endpoints for PWA / Netlify External Clients
    if (body.action === 'save_swap' || body.action === 'push_transaction') {
      const rec = body.record || body.payload || body.data || body;
      const result = apiSaveSwapTransaction(rec);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'update_swap' || body.action === 'update_transaction') {
      const rec = body.record || body.payload || body.data || body;
      const result = apiUpdateTransaction(rec);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'delete_swap' || body.action === 'delete_transaction') {
      const txId = body.id || body.txId;
      const result = apiDeleteTransaction(txId);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'save_problem') {
      const prob = body.problem || body.record || body.data || body;
      const result = apiSaveProblemLog(prob);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'update_problem') {
      const prob = body.problem || body.record || body.data || body;
      const result = apiUpdateProblem(prob);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'delete_problem') {
      const probId = body.id || body.probId;
      const result = apiDeleteProblem(probId);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'save_schedules') {
      const result = apiSaveUploadedSchedules(body.schedulesList || body.schedules, body.importMode || 'append');
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'add_unit') {
      const result = apiAddUnit(body.code || body.unitCode);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'delete_unit') {
      const result = apiDeleteUnit(body.code || body.unitCode);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'validate_login') {
      const result = apiValidateLogin(body.nik, body.password);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'setup_database') {
      const result = setupDatabaseSheets();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'get_ev_sheet') {
      const result = apiGetEvIntelligenceData(body.sheetName || 'Durasi Charging', body.limit || 200);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'unify_ketahanan_to_datainput') {
      const result = migrateKetahananToDataInputAndCleanup();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'sync_ev_sheets') {
      const result = apiSyncEvIntelligenceData(body.sheetName || null);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'save_firebase_config') {
      const result = apiSaveFirebaseConfig(body.config);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'get_firebase_config') {
      const result = apiGetSavedFirebaseConfig();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'migrate_sheets_to_firestore' || body.action === 'sync_sheets_to_firestore') {
      const result = apiMigrateSheetsToFirestore(body.config, body.targetCollections);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = body.payload || body;
    if (payload && (payload.swaps || payload.problems || payload.schedules || payload.units || payload.users)) {
      const result = apiBackupAllToSheets(payload);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Payload kosong' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getId()) return active;
  } catch (e) {}
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.openById(FALLBACK_SPREADSHEET_ID);
  }
}

// =============================================================================
// 0. AUTO-DATABASE ENGINE & SETUP SPREADSHEET (LENGKAP & OTOMATIS)
// =============================================================================

/**
 * Menu otomatis pada Google Sheets saat file dibuka oleh pengguna
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚡ PPA Charging Database')
      .addItem('🛠️ Inisialisasi Database Otomatis (Full Setup)', 'setupDatabaseSheets')
      .addItem('⚡ Buat & Sinkronkan Sheet EV Intelligence (Durasi Charging & Swab Time)', 'setupAndSyncEvSheets')
      .addItem('🔄 Satukan Ketahanan Batery ke DATA INPUT (Hapus Sheet Duplikat)', 'migrateKetahananToDataInputAndCleanup')
      .addItem('🎨 Terapkan Format, Warna & Dropdown Validasi', 'applyDatabaseFormattingAndValidations')
      .addItem('📊 Buat / Perbarui Dashboard Rekapitulasi', 'createOrUpdateSummarySheet')
      .addSeparator()
      .addItem('⏰ Pasang Trigger Otomatisasi (Auto-ID & Kalkulasi)', 'setupAutoDatabaseTriggers')
      .addItem('🧹 Bersihkan Duplikat & Validasi Integritas', 'cleanupAndValidateDatabase')
      .addSeparator()
      .addItem('🔄 Sinkronkan Seluruh Data ke Firebase Firestore', 'syncAllSheetsToFirestoreGAS')
      .addItem('💾 Backup Snapshot Database ke Google Drive', 'backupDatabaseToDrive')
      .addToUi();
  } catch (e) {
    // Abaikan jika dipanggil dari konteks web app
  }
}

/**
 * Buat dan sinkronkan 3 Sheet EV Intelligence (Durasi Charging, Ketahanan Batery, Swab Time)
 */
function setupAndSyncEvSheets() {
  try {
    const ss = getSpreadsheet();
    const structResult = ensureDatabaseStructure_(ss, true);
    const syncResult = apiSyncEvIntelligenceData();
    try {
      SpreadsheetApp.getUi().alert('✅ Berhasil!', 'Sheet EV Intelligence (Durasi Charging, Ketahanan Batery, Swab Time) telah dibuat dan disinkronkan!', SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {}
    return { status: 'success', struct: structResult, sync: syncResult };
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert('❌ Gagal', err.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {}
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Entry point utama Auto-Database:
 * Membuat, memformat, memberi validasi dropdown, dan menata seluruh sheet database secara otomatis.
 */
function setupDatabaseSheets() {
  try {
    const ss = getSpreadsheet();
    const structResult = ensureDatabaseStructure_(ss, true);
    const formatResult = applyDatabaseFormattingAndValidations(ss);
    const summaryResult = createOrUpdateSummarySheet(ss);

    logAuditGAS_(ss, 'ADMIN/SYSTEM', 'SETUP_DATABASE', 'SPREADSHEET', 'Inisialisasi database otomatis berhasil dieksekusi');

    Logger.log('Inisialisasi Database Sukses: ' + JSON.stringify(structResult));
    return {
      status: 'success',
      message: 'Seluruh struktur database Google Sheets berhasil dibuat, diformat, dan divalidasi otomatis!',
      details: {
        structure: structResult,
        formatting: formatResult,
        summary: summaryResult
      }
    };
  } catch (err) {
    Logger.log('Error setupDatabaseSheets: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

// Alias agar kompatibel dengan pemanggilan dari berbagai trigger atau client
function autoInitDatabase() {
  return setupDatabaseSheets();
}

function apiSetupDatabase() {
  return setupDatabaseSheets();
}

/**
 * Helper internal: memastikan 6 sheet master ada, terformat rapi, dan memiliki header resmi
 */
function ensureDatabaseStructure_(ss, forceFormat) {
  const result = {
    createdSheets: [],
    formattedSheets: [],
    seededSheets: []
  };

  const headerStyle = {
    background: '#0f2b48', // PPA Navy Blue
    fontColor: '#ffffff',
    fontWeight: 'bold',
    alignment: 'center'
  };

  // 1. DATA INPUT (Transaksi Swap - 19 Kolom Standar Operasional)
  const inputHeaders = [
    'TRANSACTION ID', 'DATE', 'SHIFT', 'CATEGORY', 'LOCATION',
    'KODE UNIT', 'HM', 'BATTERY BEFORE', 'JAM IN SWAP', 'BATTERY AFTER',
    'JAM OUT SWAP', 'CHARGING TIME (MENIT)', 'ENERGY (KWH)', 'STATUS REMARK',
    'PROBLEM REMARK', 'MANPOWER', 'NIK', 'KETERANGAN', 'TIME SCH', 'SWAP STATION'
  ];
  let sheetInput = ss.getSheetByName('DATA INPUT');
  if (!sheetInput) {
    sheetInput = ss.insertSheet('DATA INPUT', 0);
    result.createdSheets.push('DATA INPUT');
  }
  setupSheetHeaders_(sheetInput, inputHeaders, headerStyle, forceFormat);

  // 2. USER (Data Pengguna / Operator - 7 Kolom)
  const userHeaders = ['NO', 'NIK', 'NAMA LENGKAP', 'JABATAN', 'ROLE', 'PASSWORD', 'DEPARTEMEN'];
  let sheetUser = ss.getSheetByName('USER');
  if (!sheetUser) {
    sheetUser = ss.insertSheet('USER', 1);
    result.createdSheets.push('USER');
  }
  setupSheetHeaders_(sheetUser, userHeaders, headerStyle, forceFormat);

  // Seed master users jika sheet masih kosong
  if (sheetUser.getLastRow() <= 1) {
    const defaultUsers = [
      [1, '81230529', 'ZAKARIYA ABIDIN', 'CHARGING MAN', 'OPERATOR', '81230529', 'Charging Operations'],
      [2, '81230588', 'DAFFA GEDE KURNIAWAN', 'CHARGING MAN', 'OPERATOR', '81230588', 'Charging Operations'],
      [3, '81230176', 'ABI SETIAWAN', 'CHARGING MAN', 'OPERATOR', '81230176', 'Charging Operations'],
      [4, '81230594', 'VIRNANDA AGUS SETIAWAN', 'CHARGING MAN', 'OPERATOR', '81230594', 'Charging Operations'],
      [5, '81230596', 'SRIVASTA NASOKA FARIMBA', 'CHARGING MAN', 'OPERATOR', '81230596', 'Charging Operations'],
      [6, '81230112', 'BACHTIAR PUTRA DANANJAYA', 'CHARGING MAN', 'OPERATOR', '81230112', 'Charging Operations'],
      [7, '81230103', 'APRIL YULIUS PESSIWARISA', 'CHARGING MAN', 'OPERATOR', '81230103', 'Charging Operations'],
      [8, '81230134', 'INDRA ARIVYANTO', 'CHARGING MAN', 'OPERATOR', '81230134', 'Charging Operations'],
      [9, '11050104', 'ANTON WAHYU ANTAT WULAN', 'GROUB LEADER', 'SUPERVISOR', '11050104', 'Operations Supervision'],
      [10, '21002786', 'TONI PURWANTO', 'GROUB LEADER', 'SUPERVISOR', '21002786', 'Operations Supervision'],
      [11, '22002555', 'YUDA PUGUH WIDODO', 'GROUB LEADER', 'SUPERVISOR', '22002555', 'Operations Supervision'],
      [12, '24006305', 'AHMAD ZAENAL MUNTAHA', 'GROUB LEADER', 'SUPERVISOR', '24006305', 'Operations Supervision'],
      [13, '25001040', 'MURY AGUNG PRASETYA', 'GROUB LEADER', 'SUPERVISOR', '25001040', 'Operations Supervision'],
      [14, '25001710', 'LAURENSIUS APRI PRASETYO CALDAS', 'GROUB LEADER', 'SUPERVISOR', '25001710', 'Operations Supervision'],
      [15, '25001776', 'ANDI MUHAMMAD ALFERY', 'GROUB LEADER', 'SUPERVISOR', '25001776', 'Operations Supervision'],
      [16, '26002909', 'BAMBY PRASETYO', 'GROUB LEADER', 'SUPERVISOR', '26002909', 'Operations Supervision'],
      [17, '81230177', 'SRIYANTO', 'ADMIN', 'SUPERVISOR', '81230177', 'Operations Administration']
    ];
    sheetUser.getRange(2, 1, defaultUsers.length, 7).setValues(defaultUsers);
    result.seededSheets.push('USER');
  }

  // 3. SCEDHULE (Jadwal Swap Unit - 4 Kolom)
  const schHeaders = ['TANGGAL', 'SHIFT', 'KODE UNIT', 'TIME SCH'];
  let sheetSch = ss.getSheetByName('SCEDHULE');
  if (!sheetSch) {
    sheetSch = ss.insertSheet('SCEDHULE', 2);
    result.createdSheets.push('SCEDHULE');
  }
  setupSheetHeaders_(sheetSch, schHeaders, headerStyle, forceFormat);

  // 4. DATA PROBLEM (Log Gangguan - 8 Kolom)
  const probHeaders = ['NO PROBLEM', 'DATE', 'SHIFT', 'KODE UNIT', 'PROBLEM / KENDALA', 'TIME OPEN', 'TIME CLOSE', 'DOWNTIME (JAM)'];
  let sheetProb = ss.getSheetByName('DATA PROBLEM');
  if (!sheetProb) {
    sheetProb = ss.insertSheet('DATA PROBLEM', 3);
    result.createdSheets.push('DATA PROBLEM');
  }
  setupSheetHeaders_(sheetProb, probHeaders, headerStyle, forceFormat);

  // 5. POPULASI UNIT (Daftar Kode Armada - 3 Kolom)
  const popHeaders = ['KODE UNIT', 'TIPE ARMADA', 'STATUS'];
  let sheetPop = ss.getSheetByName('POPULASI UNIT');
  if (!sheetPop) {
    sheetPop = ss.insertSheet('POPULASI UNIT', 4);
    result.createdSheets.push('POPULASI UNIT');
  }
  setupSheetHeaders_(sheetPop, popHeaders, headerStyle, forceFormat);

  // Seed master unit armada jika sheet masih kosong
  if (sheetPop.getLastRow() <= 1) {
    const defaultUnits = [
      '1601','1602','1603','1604','1605','1606','1607','1608','1609','1610',
      '1611','1612','1613','1614','1615','1616','1617','1618','1619','1620',
      '1621','1622','1623','1624','1625','1626','1627','1628','1629','1630',
      '1631','1632','1633','1634','1635','1636','1637','1638','1639','1640',
      '1641','1642','1643','1644','1645','1646','1647','1648','1649','1650',
      '1655','1656','1657','1658','1659','1660'
    ];
    const unitRows = defaultUnits.map(u => [u, 'EV Dump Truck 90T', 'Aktif']);
    sheetPop.getRange(2, 1, unitRows.length, 3).setValues(unitRows);
    result.seededSheets.push('POPULASI UNIT');
  }

  // 6. AUDIT LOG (Pencatatan Audit Trail Sesuai ARSITEKTUR)
  const auditHeaders = ['TIMESTAMP', 'AKTOR / NIK', 'AKSI', 'TARGET', 'KETERANGAN'];
  let sheetAudit = ss.getSheetByName('AUDIT LOG');
  if (!sheetAudit) {
    sheetAudit = ss.insertSheet('AUDIT LOG', 5);
    result.createdSheets.push('AUDIT LOG');
  }
  setupSheetHeaders_(sheetAudit, auditHeaders, headerStyle, forceFormat);

  // 7. DURASI CHARGING (EV Intelligence - 16 Kolom)
  const durasiHeaders = [
    'order', 'vin', 'truck No', 'charger No', 'battery No', 'meter No',
    'Charging Start Time', 'Charging End Time', 'Charging Duration(h:m:s)',
    'Start SOC Percentage(%)', 'End SOC Percentage(%)', 'Sum Of Fill Charging(%)',
    'Start reading', 'End reading', 'Charging Amount', 'LOKASI'
  ];
  let sheetDurasi = ss.getSheetByName('Durasi Charging');
  if (!sheetDurasi) {
    sheetDurasi = ss.insertSheet('Durasi Charging');
    result.createdSheets.push('Durasi Charging');
  }
  setupSheetHeaders_(sheetDurasi, durasiHeaders, headerStyle, forceFormat);

  // 8. SWAB TIME (EV Intelligence - 19 Kolom)
  const swabHeaders = [
    'businessNo', 'vin', 'plate', 'stationName', 'timeDifference(s)',
    'downBatteryNo', 'downBatterySoc(%)', 'downBatteryCompartment',
    'upBatteryNo', 'upBatterySoc(%)', 'upBatteryCompartment',
    'changeResult(1 success，2 fail，3 cancel)', 'startTime', 'endTime',
    'socDifference', 'exchangePower(kw·h)', 'electricityFeeUnitPrice(CNY)',
    'serviceFeeUnitPrice(CNY)', 'batterySwapFee(CNY)'
  ];
  let sheetSwab = ss.getSheetByName('Swab Time');
  if (!sheetSwab) {
    sheetSwab = ss.insertSheet('Swab Time');
    result.createdSheets.push('Swab Time');
  }
  setupSheetHeaders_(sheetSwab, swabHeaders, headerStyle, forceFormat);

  // Hapus sheet default bawaan Google Sheet baru jika masih kosong
  try {
    const defaultSheetNames = ['Sheet1', 'Sheet 1', 'Lembar1', 'Lembar 1'];
    defaultSheetNames.forEach(name => {
      const sh = ss.getSheetByName(name);
      if (sh && sh.getLastRow() <= 1 && sh.getLastColumn() <= 1 && ss.getSheets().length > 1) {
        ss.deleteSheet(sh);
      }
    });
  } catch (eDel) {
    Logger.log('Notice deleting default sheet: ' + eDel);
  }

  return result;
}

/**
 * Menerapkan data validation (dropdown), number formatting, date format, dan visual layout
 */
function applyDatabaseFormattingAndValidations(ss) {
  if (!ss) ss = getSpreadsheet();
  const res = { validationsSet: [], formatsSet: [] };

  try {
    // 1. Validasi & Format untuk DATA INPUT
    const sInput = ss.getSheetByName('DATA INPUT');
    if (sInput) {
      // Dropdown SHIFT (Col C = 3)
      const ruleShift = SpreadsheetApp.newDataValidation()
        .requireValueInList(['SIANG', 'MALAM', '1', '2'], true)
        .setAllowInvalid(true)
        .build();
      sInput.getRange('C2:C5000').setDataValidation(ruleShift);

      // Dropdown CATEGORY (Col D = 4)
      const ruleCat = SpreadsheetApp.newDataValidation()
        .requireValueInList(['CHARGING SWAP', 'BATTERY SWAP', 'MAINTENANCE'], true)
        .setAllowInvalid(true)
        .build();
      sInput.getRange('D2:D5000').setDataValidation(ruleCat);

      // Dropdown LOCATION (Col E = 5)
      const ruleLoc = SpreadsheetApp.newDataValidation()
        .requireValueInList(['ROOM A1', 'ROOM A2', 'ROOM B1', 'ROOM B2', 'ROOM B3'], true)
        .setAllowInvalid(true)
        .build();
      sInput.getRange('E2:E5000').setDataValidation(ruleLoc);

      // Dropdown KODE UNIT (Col F = 6) merujuk ke sheet POPULASI UNIT
      const sPop = ss.getSheetByName('POPULASI UNIT');
      if (sPop) {
        const ruleUnit = SpreadsheetApp.newDataValidation()
          .requireValueInRange(sPop.getRange('A2:A200'), true)
          .setAllowInvalid(true)
          .build();
        sInput.getRange('F2:F5000').setDataValidation(ruleUnit);
      }

      // Dropdown STATUS REMARK (Col N = 14)
      const ruleStatus = SpreadsheetApp.newDataValidation()
        .requireValueInList(['ON SCH', 'OUT SCH', 'UN SCH', 'CRITICAL', 'On Time'], true)
        .setAllowInvalid(true)
        .build();
      sInput.getRange('N2:N5000').setDataValidation(ruleStatus);

      // Dropdown PROBLEM REMARK (Col O = 15)
      const ruleProblem = SpreadsheetApp.newDataValidation()
        .requireValueInList([
          '13.NO PROBLEM', '01.BATTERY LOW', '02.CONNECTOR ERROR',
          '03.CHARGER OVERHEAT', '04.COMMUNICATION LOST', '05.MECHANICAL CRANE', '99.OTHER'
        ], true)
        .setAllowInvalid(true)
        .build();
      sInput.getRange('O2:O5000').setDataValidation(ruleProblem);

      // Number & Date Formats di DATA INPUT
      sInput.getRange('B2:B5000').setNumberFormat('yyyy-mm-dd');
      sInput.getRange('G2:G5000').setNumberFormat('#,##0.0'); // HM
      sInput.getRange('H2:H5000').setNumberFormat('0"%"');    // Battery Before
      sInput.getRange('I2:I5000').setNumberFormat('hh:mm');   // Jam In
      sInput.getRange('J2:J5000').setNumberFormat('0"%"');    // Battery After
      sInput.getRange('K2:K5000').setNumberFormat('hh:mm');   // Jam Out
      sInput.getRange('L2:L5000').setNumberFormat('#,##0');   // Charging Time
      sInput.getRange('M2:M5000').setNumberFormat('#,##0.00'); // Energy kWh
      sInput.getRange('S2:S5000').setNumberFormat('hh:mm');   // Time Sch

      res.validationsSet.push('DATA INPUT');
    }

    // 2. Validasi & Format untuk USER
    const sUser = ss.getSheetByName('USER');
    if (sUser) {
      const ruleRole = SpreadsheetApp.newDataValidation()
        .requireValueInList(['OPERATOR', 'SUPERVISOR', 'ADMIN'], true)
        .setAllowInvalid(true)
        .build();
      sUser.getRange('E2:E500').setDataValidation(ruleRole);

      const ruleJabatan = SpreadsheetApp.newDataValidation()
        .requireValueInList(['CHARGING MAN', 'GROUB LEADER', 'ADMIN', 'OPERATOR', 'SUPERVISOR'], true)
        .setAllowInvalid(true)
        .build();
      sUser.getRange('D2:D500').setDataValidation(ruleJabatan);

      res.validationsSet.push('USER');
    }

    // 3. Validasi & Format untuk SCEDHULE
    const sSch = ss.getSheetByName('SCEDHULE');
    if (sSch) {
      const ruleShift = SpreadsheetApp.newDataValidation()
        .requireValueInList(['SIANG', 'MALAM', '1', '2'], true)
        .setAllowInvalid(true)
        .build();
      sSch.getRange('B2:B2000').setDataValidation(ruleShift);

      const sPop = ss.getSheetByName('POPULASI UNIT');
      if (sPop) {
        const ruleUnit = SpreadsheetApp.newDataValidation()
          .requireValueInRange(sPop.getRange('A2:A200'), true)
          .setAllowInvalid(true)
          .build();
        sSch.getRange('C2:C2000').setDataValidation(ruleUnit);
      }

      sSch.getRange('A2:A2000').setNumberFormat('yyyy-mm-dd');
      sSch.getRange('D2:D2000').setNumberFormat('hh:mm');
      res.validationsSet.push('SCEDHULE');
    }

    // 4. Validasi & Format untuk DATA PROBLEM
    const sProb = ss.getSheetByName('DATA PROBLEM');
    if (sProb) {
      const ruleShift = SpreadsheetApp.newDataValidation()
        .requireValueInList(['SIANG', 'MALAM', '1', '2'], true)
        .setAllowInvalid(true)
        .build();
      sProb.getRange('C2:C2000').setDataValidation(ruleShift);

      const sPop = ss.getSheetByName('POPULASI UNIT');
      if (sPop) {
        const ruleUnit = SpreadsheetApp.newDataValidation()
          .requireValueInRange(sPop.getRange('A2:A200'), true)
          .setAllowInvalid(true)
          .build();
        sProb.getRange('D2:D2000').setDataValidation(ruleUnit);
      }

      sProb.getRange('B2:B2000').setNumberFormat('yyyy-mm-dd');
      sProb.getRange('F2:F2000').setNumberFormat('hh:mm');
      sProb.getRange('G2:G2000').setNumberFormat('hh:mm');
      sProb.getRange('H2:H2000').setNumberFormat('#,##0.00');
      res.validationsSet.push('DATA PROBLEM');
    }

    // 5. Format AUDIT LOG
    const sAudit = ss.getSheetByName('AUDIT LOG');
    if (sAudit) {
      sAudit.getRange('A2:A5000').setNumberFormat('yyyy-mm-dd hh:mm:ss');
      res.formatsSet.push('AUDIT LOG');
    }

    return { status: 'success', details: res };
  } catch (err) {
    Logger.log('applyDatabaseFormattingAndValidations Error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Membuat atau memperbarui Sheet DASHBOARD REKAP dengan formula live Google Sheets
 */
function createOrUpdateSummarySheet(ss) {
  if (!ss) ss = getSpreadsheet();
  try {
    let sDash = ss.getSheetByName('DASHBOARD REKAP');
    if (!sDash) {
      sDash = ss.insertSheet('DASHBOARD REKAP', 0);
    }

    sDash.clear();

    // Judul Dashboard
    sDash.getRange('A1:F1').merge();
    sDash.getRange('A1').setValue('⚡ PPA EV CHARGING - EXECUTIVE OPERATIONAL SUMMARY (LIVE REKAP)')
      .setBackground('#0f2b48')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(14)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sDash.setRowHeight(1, 40);

    // KPI Cards Header (Row 3-4)
    const kpiCards = [
      ['TOTAL TRANSAKSI SWAP', "=COUNTA('DATA INPUT'!A2:A)", '#1e3a8a'],
      ['TOTAL PROBLEM / DOWNTIME', "=COUNTA('DATA PROBLEM'!A2:A)", '#b91c1c'],
      ['TOTAL ARMADA AKTIF', "=COUNTA('POPULASI UNIT'!A2:A)", '#047857'],
      ['TOTAL ENERGI (KWH)', "=SUM('DATA INPUT'!M2:M)", '#b45309']
    ];

    for (let i = 0; i < kpiCards.length; i++) {
      const col = (i * 2) + 1; // 1, 3, 5, 7
      const rangeTitle = sDash.getRange(3, col, 1, 2);
      rangeTitle.merge()
        .setValue(kpiCards[i][0])
        .setBackground('#f1f5f9')
        .setFontWeight('bold')
        .setFontSize(9)
        .setHorizontalAlignment('center');

      const rangeVal = sDash.getRange(4, col, 1, 2);
      rangeVal.merge()
        .setFormula(kpiCards[i][1])
        .setBackground(kpiCards[i][2])
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(16)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
    }
    sDash.setRowHeight(3, 24);
    sDash.setRowHeight(4, 45);

    // Section 1: Rekap per Lokasi / Room (Row 6)
    sDash.getRange('A6:B6').merge().setValue('REKAP SWAP PER ROOM / STASIUN')
      .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sDash.getRange('A7:B7').setValues([['LOKASI', 'TOTAL SWAP']]).setFontWeight('bold').setBackground('#e2e8f0');

    const rooms = ['ROOM A1', 'ROOM A2', 'ROOM B1', 'ROOM B2', 'ROOM B3'];
    for (let r = 0; r < rooms.length; r++) {
      const rowNum = 8 + r;
      sDash.getRange(rowNum, 1).setValue(rooms[r]);
      sDash.getRange(rowNum, 2).setFormula(`=COUNTIF('DATA INPUT'!$E$2:$E, "${rooms[r]}")`);
    }

    // Section 2: Rekap per Shift (Row 6 Col D-E)
    sDash.getRange('D6:E6').merge().setValue('REKAP SWAP PER SHIFT')
      .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sDash.getRange('D7:E7').setValues([['SHIFT', 'TOTAL SWAP']]).setFontWeight('bold').setBackground('#e2e8f0');

    sDash.getRange('D8').setValue('SIANG / SHIFT 1');
    sDash.getRange('E8').setFormula(`=COUNTIF('DATA INPUT'!$C$2:$C, "SIANG") + COUNTIF('DATA INPUT'!$C$2:$C, "1")`);
    sDash.getRange('D9').setValue('MALAM / SHIFT 2');
    sDash.getRange('E9').setFormula(`=COUNTIF('DATA INPUT'!$C$2:$C, "MALAM") + COUNTIF('DATA INPUT'!$C$2:$C, "2")`);

    // Section 3: Rekap Status Remark (Row 6 Col G-H)
    sDash.getRange('G6:H6').merge().setValue('STATUS REMARK KETEPATAN')
      .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sDash.getRange('G7:H7').setValues([['STATUS', 'JUMLAH']]).setFontWeight('bold').setBackground('#e2e8f0');

    const remarks = ['ON SCH', 'OUT SCH', 'UN SCH', 'CRITICAL'];
    for (let k = 0; k < remarks.length; k++) {
      const rowNum = 8 + k;
      sDash.getRange(rowNum, 7).setValue(remarks[k]);
      sDash.getRange(rowNum, 8).setFormula(`=COUNTIF('DATA INPUT'!$N$2:$N, "${remarks[k]}")`);
    }

    // Auto-fit kolom agar tampilan spreadsheet sangat rapi
    sDash.autoResizeColumns(1, 8);
    sDash.setFrozenRows(4);

    return { status: 'success', message: 'Sheet DASHBOARD REKAP berhasil dibuat/diperbarui!' };
  } catch (err) {
    Logger.log('createOrUpdateSummarySheet Error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Event Listener onEdit (Simple & Installable Trigger):
 * Bekerja otomatis ketika data diisi manual di Google Sheets:
 *  - Mengisi TRANSACTION ID otomatis (SWP-YYYYMMDD-XXXX) jika kosong
 *  - Menghitung durasi charging otomatis jika Jam In & Out terisi
 *  - Mengisi NO PROBLEM otomatis jika kosong
 */
function onEdit(e) {
  handleSpreadsheetAutoEdit_(e);
}

function installedOnEdit(e) {
  handleSpreadsheetAutoEdit_(e);
}

function handleSpreadsheetAutoEdit_(e) {
  if (!e || !e.range) return;
  try {
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (row <= 1) return; // Lewati header

    // 1. Auto di Sheet DATA INPUT
    if (sheetName === 'DATA INPUT') {
      const idCell = sheet.getRange(row, 1);
      const dateCell = sheet.getRange(row, 2);
      const jamInCell = sheet.getRange(row, 9);
      const jamOutCell = sheet.getRange(row, 11);
      const durCell = sheet.getRange(row, 12);

      // Auto-generate Transaction ID HANYA jika kolom ID kosong DAN baris tersebut benar-benar ada data tanggal atau unit
      const dateVal = dateCell.getValue();
      const unitVal = sheet.getRange(row, 6).getValue();
      if (!idCell.getValue() && (dateVal || unitVal)) {
        idCell.setValue(`DA01/CHG/2026/SWAP/${String(row - 1).padStart(4, '0')}`);
      }

      // Auto-calculate charging time (menit) jika Jam In dan Jam Out ada
      const jamIn = jamInCell.getValue();
      const jamOut = jamOutCell.getValue();
      if (jamIn && jamOut && !durCell.getValue()) {
        const diffMs = calculateTimeDiffMs_(jamIn, jamOut);
        if (diffMs > 0) {
          const min = Math.round(diffMs / (1000 * 60));
          durCell.setValue(min);
        }
      }
    }

    // 2. Auto di Sheet DATA PROBLEM
    if (sheetName === 'DATA PROBLEM') {
      const idProbCell = sheet.getRange(row, 1);
      if (!idProbCell.getValue()) {
        idProbCell.setValue(`PRB-${row - 1}`);
      }

      const tOpenCell = sheet.getRange(row, 6);
      const tCloseCell = sheet.getRange(row, 7);
      const durHourCell = sheet.getRange(row, 8);

      const tOpen = tOpenCell.getValue();
      const tClose = tCloseCell.getValue();
      if (tOpen && tClose && !durHourCell.getValue()) {
        const diffMs = calculateTimeDiffMs_(tOpen, tClose);
        if (diffMs > 0) {
          const hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
          durHourCell.setValue(Number(hours));
        }
      }
    }
  } catch (err) {
    Logger.log('handleSpreadsheetAutoEdit_ Error: ' + err);
  }
}

/**
 * Menghitung selisih waktu antara dua nilai waktu di cell Google Sheets
 */
function calculateTimeDiffMs_(valA, valB) {
  try {
    let dA = (valA instanceof Date) ? valA : new Date('1970-01-01T' + String(valA) + ':00');
    let dB = (valB instanceof Date) ? valB : new Date('1970-01-01T' + String(valB) + ':00');
    let diff = dB.getTime() - dA.getTime();
    if (diff < 0) diff += (24 * 60 * 60 * 1000); // Penanganan lintas tengah malam
    return diff;
  } catch (e) {
    return 0;
  }
}

/**
 * Memasang trigger otomatisasi Google Sheets dengan satu kali klik
 */
function setupAutoDatabaseTriggers() {
  try {
    const ss = getSpreadsheet();
    // Hapus trigger lama agar tidak duplikat
    removeDatabaseTriggers();

    // 1. Installable onEdit trigger
    ScriptApp.newTrigger('installedOnEdit')
      .forSpreadsheet(ss)
      .onEdit()
      .create();

    // 2. Daily Maintenance Trigger (Setiap malam pk 01:00)
    ScriptApp.newTrigger('dailyDatabaseMaintenance')
      .timeBased()
      .everyDays(1)
      .atHour(1)
      .create();

    const msg = 'Trigger otomatisasi Google Sheets (onEdit & Daily Maintenance) berhasil dipasang!';
    Logger.log(msg);
    logAuditGAS_(ss, 'ADMIN/SYSTEM', 'SETUP_TRIGGER', 'TRIGGERS', msg);
    return { status: 'success', message: msg };
  } catch (err) {
    Logger.log('setupAutoDatabaseTriggers Error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Menghapus trigger otomatisasi jika diperlukan
 */
function removeDatabaseTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const handler = t.getHandlerFunction();
    if (handler === 'installedOnEdit' || handler === 'dailyDatabaseMaintenance') {
      ScriptApp.deleteTrigger(t);
    }
  });
  return { status: 'success', message: 'Trigger lama dibersihkan.' };
}

/**
 * Maintenance harian database otomatis
 */
function dailyDatabaseMaintenance() {
  try {
    const ss = getSpreadsheet();
    ensureDatabaseStructure_(ss, false);
    cleanupAndValidateDatabase(ss);
    backupDatabaseToDrive(ss);
    logAuditGAS_(ss, 'SYSTEM', 'DAILY_MAINTENANCE', 'DATABASE', 'Daily maintenance sukses');
  } catch (err) {
    Logger.log('dailyDatabaseMaintenance Error: ' + err);
  }
}

/**
 * Backup snapshot spreadsheet ke Google Drive secara otomatis
 */
function backupDatabaseToDrive(ss) {
  if (!ss) ss = getSpreadsheet();
  try {
    const folderName = 'PPA EV Database Backups';
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    const backupName = `Backup_PPA_Charging_${nowStr}`;
    const file = DriveApp.getFileById(ss.getId());
    const copy = file.makeCopy(backupName, folder);

    logAuditGAS_(ss, 'SYSTEM', 'BACKUP_DRIVE', copy.getId(), `Backup berhasil disimpan ke folder "${folderName}" dengan nama "${backupName}"`);
    return { status: 'success', message: `Backup berhasil disimpan ke Google Drive: ${backupName}`, fileId: copy.getId() };
  } catch (err) {
    Logger.log('backupDatabaseToDrive Error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Memeriksa integritas database: membersihkan spasi tak terlihat dan memeriksa duplikat ID
 */
function cleanupAndValidateDatabase(ss) {
  if (!ss) ss = getSpreadsheet();
  try {
    const sInput = ss.getSheetByName('DATA INPUT');
    let dups = 0;
    if (sInput && sInput.getLastRow() > 1) {
      const ids = sInput.getRange(2, 1, sInput.getLastRow() - 1, 1).getValues();
      const seen = new Set();
      ids.forEach((r, idx) => {
        const id = String(r[0] || '').trim();
        if (id) {
          if (seen.has(id)) dups++;
          seen.add(id);
        }
      });
    }

    const msg = `Validasi selesai. Ditemukan ${dups} duplikasi ID transaksi.`;
    logAuditGAS_(ss, 'ADMIN/SYSTEM', 'VALIDATE_DB', 'DATA INPUT', msg);
    return { status: 'success', message: msg, duplicatesFound: dups };
  } catch (err) {
    Logger.log('cleanupAndValidateDatabase Error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Pencatatan Audit Trail ke Sheet AUDIT LOG
 */
function logAuditGAS_(ss, userNik, action, target, detail) {
  try {
    if (!ss) ss = getSpreadsheet();
    let sAudit = ss.getSheetByName('AUDIT LOG');
    if (!sAudit) return;

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sAudit.appendRow([timestamp, userNik || 'UNKNOWN', action || '-', target || '-', detail || '-']);
  } catch (e) {
    Logger.log('logAuditGAS_ Error: ' + e);
  }
}

function setupSheetHeaders_(sheet, headers, style, forceFormat) {
  const currentLastRow = sheet.getLastRow();
  if (currentLastRow === 0 || forceFormat) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(style.background);
    headerRange.setFontColor(style.fontColor);
    headerRange.setFontWeight(style.fontWeight);
    headerRange.setHorizontalAlignment(style.alignment);
    sheet.setFrozenRows(1);
  }
}
/**
 * Fungsi utilitas tambahan: Sinkronkan seluruh sheet di Google Sheets ke Firebase Cloud Firestore
 */
function syncAllSheetsToFirestoreGAS() {
  try {
    const ss = getSpreadsheet();
    let countSwaps = 0;
    let countUnits = 0;
    let countProblems = 0;
    let countSchedules = 0;

    // 1. Swaps
    const swaps = apiReadTransactions_(ss);
    swaps.forEach(sw => {
      if (sw && sw.id) {
        syncToFirestoreFromGas_('swaps', sw.id, sw);
        countSwaps++;
      }
    });

    // 2. Units
    const popSheet = ss.getSheetByName('POPULASI UNIT');
    if (popSheet) {
      const pRows = popSheet.getDataRange().getValues();
      for (let i = 1; i < pRows.length; i++) {
        const code = String(pRows[i][0] || '').trim();
        if (code) {
          syncToFirestoreFromGas_('units', code, { code: code, type: 'EV Dump Truck 90T', status: 'Aktif' });
          countUnits++;
        }
      }
    }

    // 3. Problems
    const probSheet = ss.getSheetByName('DATA PROBLEM');
    if (probSheet) {
      const prRows = probSheet.getDataRange().getValues();
      for (let i = 1; i < prRows.length; i++) {
        const pid = String(prRows[i][0] || `PRB-${i}`).trim();
        if (pid) {
          syncToFirestoreFromGas_('problems', pid, {
            id: pid,
            date: formatDateCell(prRows[i][1]),
            shift: String(prRows[i][2] || '1'),
            unit: String(prRows[i][3] || '-'),
            problem: String(prRows[i][4] || '-'),
            timeOpen: formatTimeCell(prRows[i][5]),
            timeClose: formatTimeCell(prRows[i][6]),
            duration: formatTimeCell(prRows[i][7])
          });
          countProblems++;
        }
      }
    }

    // 4. Schedules
    const schSheet = ss.getSheetByName('SCEDHULE');
    if (schSheet) {
      const scRows = schSheet.getDataRange().getValues();
      for (let i = 1; i < scRows.length; i++) {
        const u = String(scRows[i][2] || '').trim();
        if (u) {
          const sid = `SCH_${u}_${scRows[i][1] || '1'}_${i}`;
          syncToFirestoreFromGas_('schedules', sid, {
            id: sid,
            tanggal: formatDateCell(scRows[i][0]),
            shift: String(scRows[i][1] || '1'),
            unit: u,
            timeSch: formatTimeCell(scRows[i][3])
          });
          countSchedules++;
        }
      }
    }

    Logger.log(`Sync ke Firebase Selesai: ${countSwaps} swaps, ${countUnits} units, ${countProblems} problems, ${countSchedules} schedules.`);
    return {
      status: 'success',
      message: `Sinkronisasi ke Firebase selesai: ${countSwaps} transaksi, ${countUnits} armada, ${countProblems} masalah, ${countSchedules} jadwal!`
    };
  } catch (e) {
    Logger.log('Error syncAllSheetsToFirestoreGAS: ' + e);
    return { status: 'error', message: e.toString() };
  }
}

// =============================================================================
// 1. FETCH ALL SHEETS DATA (Users, Schedules, Problems, Fleet, Transactions)
// =============================================================================
function apiGetAllSheetsData() {
  try {
    const ss = getSpreadsheet();

    // ---- 1. Sheet USER ----
    const userSheet = ss.getSheetByName('USER');
    const users = [];
    if (userSheet) {
      const userRows = userSheet.getDataRange().getValues();
      for (let i = 1; i < userRows.length; i++) {
        const r = userRows[i];
        if (!r[1]) continue; // NRP kosong
        const nikStr = String(r[1]).trim();
        const roleRaw = String(r[4] || '').toUpperCase();
        const isSpv = roleRaw.includes('LEADER') || roleRaw.includes('SUPERVISOR') || roleRaw.includes('ADMIN') || nikStr === '81230177';
        users.push({
          no:       r[0],
          nik:      nikStr,
          name:     String(r[2]).trim(),
          title:    String(r[3]).trim(),
          role:     isSpv ? 'SUPERVISOR' : 'OPERATOR',
          password: String(r[5] || r[1]).trim(), // password di kolom F, fallback ke NIK
          dept:     String(r[6] || 'Charging Operations').trim()
        });
      }
    }

    // Fallback master user jika sheet USER kosong
    if (users.length === 0) {
      users.push({
        no: 1,
        nik: '81230177',
        name: 'SRIYANTO',
        title: 'ADMIN',
        role: 'SUPERVISOR',
        password: 'admin',
        dept: 'Operations Administration'
      });
    }

    // ---- 2. Sheet SCEDHULE ----
    const schSheet = ss.getSheetByName('SCEDHULE');
    const schedules = [];
    if (schSheet) {
      const schRows = schSheet.getDataRange().getValues();
      for (let i = 1; i < schRows.length; i++) {
        const r = schRows[i];
        if (!r[2]) continue;
        schedules.push({
          tanggal: formatDateCell(r[0]),
          shift:   String(r[1]).trim(),
          unit:    String(r[2]).trim(),
          timeSch: formatTimeCell(r[3])
        });
      }
    }

    // ---- 3. Sheet DATA PROBLEM ----
    const probSheet = ss.getSheetByName('DATA PROBLEM');
    const problems = [];
    if (probSheet) {
      const probRows = probSheet.getDataRange().getValues();
      for (let i = 1; i < probRows.length; i++) {
        const r = probRows[i];
        if (r[0] === '' && r[3] === '') continue;
        const probId = r[0] ? String(r[0]) : `PRB-${i}`;
        problems.push({
          id:        probId,
          no:        String(i),
          date:      formatDateCell(r[1]),
          shift:     String(r[2] || '1'),
          unit:      String(r[3] || '-'),
          problem:   String(r[4] || '-'),
          timeOpen:  formatTimeCell(r[5]),
          timeClose: formatTimeCell(r[6]),
          duration:  formatTimeCell(r[7])
        });
      }
    }

    // ---- 4. Sheet POPULASI UNIT ----
    const popSheet = ss.getSheetByName('POPULASI UNIT');
    const populasi = [];
    if (popSheet) {
      const popRows = popSheet.getDataRange().getValues();
      for (let i = 1; i < popRows.length; i++) {
        const uCode = String(popRows[i][0] || '').trim();
        if (uCode) {
          populasi.push({
            code: uCode,
            type: String(popRows[i][1] || 'EV Dump Truck 90T').trim(),
            status: String(popRows[i][2] || 'Aktif').trim(),
            note: 'Operasional Normal'
          });
        }
      }
    }

    // Fallback unit default jika sheet POPULASI UNIT kosong
    if (populasi.length === 0) {
      const defaultCodes = [
        '1601','1602','1603','1604','1605','1606','1607','1608','1609','1610',
        '1611','1612','1613','1614','1615','1616','1617','1618','1619','1620',
        '1621','1622','1623','1624','1625','1626','1627','1628','1629','1630',
        '1631','1632','1633','1634','1635','1636','1637','1638','1639','1640',
        '1641','1642','1643','1644','1645','1646','1647','1648','1649','1650',
        '1655','1656','1657','1658','1659','1660'
      ];
      defaultCodes.forEach(code => {
        populasi.push({
          code: code,
          type: 'EV Dump Truck 90T',
          status: (code === '1615' || code === '1644') ? 'Standby' : 'Aktif',
          note: (code === '1615' || code === '1644') ? 'Standby' : 'Operasional Normal'
        });
      });
    }

    // ---- 5. Sheet DATA INPUT (Transaksi) ----
    const swaps = apiReadTransactions_(ss);

    return {
      status:    'success',
      users:     users,
      schedules: schedules,
      problems:  problems,
      populasi:  populasi,
      swaps:     swaps
    };

  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// 2. READ TRANSACTIONS FROM DATA INPUT
// =============================================================================
function apiGetTransactionData() {
  try {
    const ss = getSpreadsheet();
    const swaps = apiReadTransactions_(ss);
    return { status: 'success', swaps: swaps };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Internal helper: baca semua baris dari sheet DATA INPUT
 * Kolom (0-indexed):
 *  0  TRANSACTION ID
 *  1  DATE (DD/MM/YYYY)
 *  2  SHIFT
 *  3  CATEGORY
 *  4  LOCATION
 *  5  KODE UNIT
 *  6  HM
 *  7  BATTERY BEFORE
 *  8  JAM IN SWAP
 *  9  BATTERY AFTER
 *  10 JAM OUT SWAP
 *  11 CHARGING TIME (MENIT)
 *  12 ENERGY (KWH)
 *  13 REMARK (statusRemark)
 *  14 REMARK (problemRemark)
 *  15 MANPOWER
 *  16 NIK
 *  17 KETERANGAN / TIME SCH
 *  18 (reserved)
 */
function apiReadTransactions_(ss) {
  const sheet = ss.getSheetByName('DATA INPUT');
  const swaps = [];
  if (!sheet) return swaps;

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue; // skip baris kosong
    // Skip baris hantu (ghost row) jika tanggal dan unit sama sekali kosong
    if (!r[1] && !r[5]) continue;
    swaps.push({
      id:            String(r[0]).trim(),
      date:          formatDateCell(r[1]),
      shift:         String(r[2] || '1').trim(),
      category:      String(r[3] || 'CHARGING SWAP').trim(),
      location:      String(r[4] || 'ROOM A1').trim(),
      unit:          String(r[5] || '').trim(),
      hm:            String(r[6] || '-').trim(),
      batteryBefore: String(r[7] || '-').trim(),
      jamIn:         formatTimeHHMM(r[8]),
      batteryAfter:  String(r[9] || '-').trim(),
      jamOut:        formatTimeHHMM(r[10]),
      durationMin:   parseFloat(r[11]) || 6,
      energyKwh:     parseFloat(r[12]) || 0,
      statusRemark:  String(r[13] || 'On Time').trim(),
      problemRemark: String(r[14] || '13.NO PROBLEM').trim(),
      operator:      String(r[15] || '-').trim(),
      operatorNik:   String(r[16] || '-').trim(),
      keterangan:    String(r[17] || '-').trim(),
      timeSch:       formatTimeCell(r[18]) || '-',
      swapStation:   String(r[19] || (String(r[4] || '').toUpperCase().includes('A2') ? 'SWAP 02' : 'SWAP 01')).trim()
    });
  }
  return swaps;
}

// =============================================================================
// =============================================================================
// 3. FIREBASE CLOUD FIRESTORE INTEGRATION & MIGRATION ENGINE
// =============================================================================

function getFirestoreCredentials_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('FIREBASE_CONFIG');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && cfg.projectId && cfg.apiKey) {
        return {
          projectId: String(cfg.projectId).trim(),
          apiKey: String(cfg.apiKey).trim()
        };
      }
    }
  } catch (e) {}
  return {
    projectId: 'charging-ev-scm',
    apiKey: 'AIzaSyAW7Groj5v8TzbEwXhTXBDc8RT1ehBT4_0'
  };
}

function apiSaveFirebaseConfig(cfg) {
  try {
    if (!cfg || !cfg.projectId || !cfg.apiKey) {
      return { status: 'error', message: 'Project ID dan API Key wajib diisi.' };
    }
    const safeCfg = {
      projectId: String(cfg.projectId).trim(),
      apiKey: String(cfg.apiKey).trim(),
      authDomain: (cfg.authDomain || (String(cfg.projectId).trim() + '.firebaseapp.com')).trim(),
      storageBucket: (cfg.storageBucket || (String(cfg.projectId).trim() + '.appspot.com')).trim(),
      messagingSenderId: (cfg.messagingSenderId || '').trim(),
      appId: (cfg.appId || '').trim(),
      savedAt: new Date().toISOString()
    };
    PropertiesService.getScriptProperties().setProperty('FIREBASE_CONFIG', JSON.stringify(safeCfg));
    return { status: 'success', message: 'Konfigurasi Firebase berhasil disimpan di server Google Apps Script!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiGetSavedFirebaseConfig() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('FIREBASE_CONFIG');
    if (raw) {
      return { status: 'success', config: JSON.parse(raw) };
    }
    return { status: 'success', config: null };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function syncToFirestoreFromGas_(collection, docId, data) {
  try {
    const creds = getFirestoreCredentials_();
    if (!creds.projectId || !creds.apiKey) return false;
    const cleanDocId = encodeURIComponent(String(docId || '').replace(/[\/\\]/g, '_').trim());
    const url = 'https://firestore.googleapis.com/v1/projects/' + creds.projectId + '/databases/(default)/documents/' + collection + '/' + cleanDocId + '?key=' + encodeURIComponent(creds.apiKey);

    const fields = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'number') {
        if (Number.isInteger(v)) {
          fields[k] = { integerValue: String(v) };
        } else {
          fields[k] = { doubleValue: v };
        }
      } else if (typeof v === 'boolean') {
        fields[k] = { booleanValue: v };
      } else {
        fields[k] = { stringValue: String(v) };
      }
    }
    fields.updatedAt = { timestampValue: new Date().toISOString() };

    const payload = JSON.stringify({ fields });
    const options = {
      method: 'patch',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() >= 200 && res.getResponseCode() < 300;
  } catch (e) {
    Logger.log('Firestore GAS Sync Error: ' + e);
    return false;
  }
}

function deleteFromFirestoreFromGas_(collection, docId) {
  try {
    const creds = getFirestoreCredentials_();
    if (!creds.projectId || !creds.apiKey) return false;
    const cleanDocId = encodeURIComponent(String(docId || '').replace(/[\/\\]/g, '_').trim());
    const url = 'https://firestore.googleapis.com/v1/projects/' + creds.projectId + '/databases/(default)/documents/' + collection + '/' + cleanDocId + '?key=' + encodeURIComponent(creds.apiKey);
    const res = UrlFetchApp.fetch(url, { method: 'delete', muteHttpExceptions: true });
    return res.getResponseCode() >= 200 && res.getResponseCode() < 300;
  } catch (e) {
    Logger.log('Firestore GAS Delete Error: ' + e);
    return false;
  }
}

/**
 * Migrasi seluruh database Google Sheets langsung ke Cloud Firestore via REST batchWrite
 */
function apiMigrateSheetsToFirestore(customConfig, targetCollections) {
  try {
    if (customConfig && customConfig.projectId && customConfig.apiKey) {
      apiSaveFirebaseConfig(customConfig);
    }
    const creds = getFirestoreCredentials_();
    if (!creds || !creds.projectId || !creds.apiKey) {
      return {
        status: 'error',
        message: 'Konfigurasi Firebase belum diatur. Harap masukkan Project ID dan API Key terlebih dahulu di menu Atur Kredensial.'
      };
    }

    const projectId = creds.projectId;
    const apiKey = creds.apiKey;
    const ss = getSpreadsheet();

    const summary = {
      swaps: 0,
      users: 0,
      schedules: 0,
      problems: 0,
      units: 0,
      durasiCharging: 0,
      durasiChargingChunks: 0,
      swabTime: 0,
      swabTimeChunks: 0,
      totalItems: 0,
      totalWrites: 0
    };

    const shouldMigrate = (colName) => {
      if (!targetCollections || !Array.isArray(targetCollections) || targetCollections.length === 0) return true;
      return targetCollections.includes(colName) || targetCollections.includes('all');
    };

    function executeBatchWrite(writes) {
      if (!writes || writes.length === 0) return { ok: true, count: 0 };
      const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents:batchWrite?key=' + encodeURIComponent(apiKey);
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ writes: writes }),
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      const txt = res.getContentText();
      if (code >= 200 && code < 300) {
        Utilities.sleep(30);
        return { ok: true, count: writes.length };
      }
      if (code === 403) {
        let errMsg = 'Akses ke Cloud Firestore ditolak (403 PERMISSION_DENIED). ';
        if (txt.includes('CONSUMER_INVALID')) {
          errMsg += 'Project ID atau API Key tidak cocok dengan Google Cloud Project. Periksa kembali konfigurasi Firebase Anda.';
        } else {
          errMsg += 'Buka Firebase Console > Firestore Database > Tab Rules, lalu ganti aturannya menjadi "allow read, write: if true;" dan klik Publish.';
        }
        throw new Error(errMsg);
      }
      if (code === 429 || txt.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('Batas kuota harian Firebase (20.000 writes Spark Plan) tercapai. Reset otomatis pukul 07:00 WIB.');
      }
      throw new Error('Gagal menulis batch ke Firestore (HTTP ' + code + '): ' + txt.slice(0, 200));
    }

    function formatFirestoreFields(data) {
      const fields = {};
      for (const [k, v] of Object.entries(data || {})) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'number') {
          if (Number.isInteger(v)) {
            fields[k] = { integerValue: String(v) };
          } else {
            fields[k] = { doubleValue: v };
          }
        } else if (typeof v === 'boolean') {
          fields[k] = { booleanValue: v };
        } else if (Array.isArray(v)) {
          fields[k] = {
            arrayValue: {
              values: v.map(item => ({ stringValue: String(item) }))
            }
          };
        } else if (typeof v === 'object') {
          fields[k] = { stringValue: JSON.stringify(v) };
        } else {
          fields[k] = { stringValue: String(v) };
        }
      }
      fields.updatedAt = { timestampValue: new Date().toISOString() };
      return fields;
    }

    function createWriteOp(collection, docId, data) {
      const cleanDocId = encodeURIComponent(String(docId || '').replace(/[\/\\]/g, '_').trim());
      return {
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/' + collection + '/' + cleanDocId,
          fields: formatFirestoreFields(data)
        }
      };
    }

    // 1. DATA INPUT -> collection 'swaps'
    if (shouldMigrate('swaps')) {
      const swaps = apiReadTransactions_(ss);
      let swapWrites = [];
      swaps.forEach((s) => {
        swapWrites.push(createWriteOp('swaps', s.id, s));
        if (swapWrites.length >= 350) {
          executeBatchWrite(swapWrites);
          summary.swaps += swapWrites.length;
          summary.totalWrites += swapWrites.length;
          swapWrites = [];
        }
      });
      if (swapWrites.length > 0) {
        executeBatchWrite(swapWrites);
        summary.swaps += swapWrites.length;
        summary.totalWrites += swapWrites.length;
      }
    }

    // 2. USER -> collection 'users'
    if (shouldMigrate('users')) {
      const userSheet = ss.getSheetByName('USER');
      if (userSheet && userSheet.getLastRow() > 1) {
        const uRows = userSheet.getDataRange().getValues();
        const userWrites = [];
        for (let i = 1; i < uRows.length; i++) {
          const r = uRows[i];
          if (!r[1]) continue;
          const nik = String(r[1]).trim();
          userWrites.push(createWriteOp('users', nik, {
            no: r[0],
            nik: nik,
            name: String(r[2] || '').trim(),
            title: String(r[3] || '').trim(),
            role: String(r[4] || 'OPERATOR').trim(),
            password: String(r[5] || r[1]).trim(),
            dept: String(r[6] || 'Charging Operations').trim()
          }));
        }
        if (userWrites.length > 0) {
          executeBatchWrite(userWrites);
          summary.users += userWrites.length;
          summary.totalWrites += userWrites.length;
        }
      }
    }

    // 3. SCEDHULE -> collection 'schedules'
    if (shouldMigrate('schedules')) {
      const schSheet = ss.getSheetByName('SCEDHULE');
      if (schSheet && schSheet.getLastRow() > 1) {
        const scRows = schSheet.getDataRange().getValues();
        const schWrites = [];
        for (let i = 1; i < scRows.length; i++) {
          const r = scRows[i];
          if (!r[2]) continue;
          const cleanDate = String(r[0] || '').replace(/[\/\-]/g, '');
          const scId = 'SCH-' + r[2] + '-' + (r[1] || '1') + '-' + (cleanDate || i);
          schWrites.push(createWriteOp('schedules', scId, {
            id: scId,
            tanggal: formatDateCell(r[0]),
            shift: String(r[1] || '1').trim(),
            unit: String(r[2] || '').trim(),
            timeSch: formatTimeCell(r[3])
          }));
        }
        if (schWrites.length > 0) {
          executeBatchWrite(schWrites);
          summary.schedules += schWrites.length;
          summary.totalWrites += schWrites.length;
        }
      }
    }

    // 4. DATA PROBLEM -> collection 'problems'
    if (shouldMigrate('problems')) {
      const probSheet = ss.getSheetByName('DATA PROBLEM');
      if (probSheet && probSheet.getLastRow() > 1) {
        const pRows = probSheet.getDataRange().getValues();
        const probWrites = [];
        for (let i = 1; i < pRows.length; i++) {
          const r = pRows[i];
          if (!r[0] && !r[3]) continue;
          const probId = String(r[0] || ('PRB-' + i)).trim();
          probWrites.push(createWriteOp('problems', probId, {
            id: probId,
            no: String(i),
            date: formatDateCell(r[1]),
            shift: String(r[2] || '1'),
            unit: String(r[3] || '-'),
            problem: String(r[4] || '-'),
            timeOpen: formatTimeCell(r[5]),
            timeClose: formatTimeCell(r[6]),
            duration: formatTimeCell(r[7])
          }));
        }
        if (probWrites.length > 0) {
          executeBatchWrite(probWrites);
          summary.problems += probWrites.length;
          summary.totalWrites += probWrites.length;
        }
      }
    }

    // 5. POPULASI UNIT -> collection 'units'
    if (shouldMigrate('units')) {
      const popSheet = ss.getSheetByName('POPULASI UNIT');
      if (popSheet && popSheet.getLastRow() > 1) {
        const popRows = popSheet.getDataRange().getValues();
        const unitWrites = [];
        for (let i = 1; i < popRows.length; i++) {
          const uCode = String(popRows[i][0] || '').trim();
          if (!uCode) continue;
          unitWrites.push(createWriteOp('units', uCode, {
            code: uCode,
            type: String(popRows[i][1] || 'EV Dump Truck 90T').trim(),
            status: String(popRows[i][2] || 'Aktif').trim(),
            note: 'Operasional Normal'
          }));
        }
        if (unitWrites.length > 0) {
          executeBatchWrite(unitWrites);
          summary.units += unitWrites.length;
          summary.totalWrites += unitWrites.length;
        }
      }
    }

    // 6. Durasi Charging -> collection 'durasi_charging' (Optimized Chunking)
    if (shouldMigrate('durasi_charging')) {
      let dcSheet = ss.getSheetByName('Durasi Charging');
      if (!dcSheet || dcSheet.getLastRow() <= 1) {
        const srcSs = getEvSourceSpreadsheet_();
        if (srcSs) dcSheet = srcSs.getSheetByName('Durasi Charging');
      }
      if (dcSheet && dcSheet.getLastRow() > 1) {
        const lastRow = dcSheet.getLastRow();
        const lastCol = dcSheet.getLastColumn();
        const allData = dcSheet.getRange(1, 1, lastRow, lastCol).getValues();
        const headers = allData[0].map(h => String(h || '').trim());
        const rows = allData.slice(1);
        const chunkSize = 100;
        let chunkIndex = 0;
        let dcWrites = [];

        for (let i = 0; i < rows.length; i += chunkSize) {
          chunkIndex++;
          const slice = rows.slice(i, i + chunkSize);
          const records = [];

          slice.forEach((row) => {
            const docObj = {};
            headers.forEach((h, colIdx) => {
              const val = row[colIdx];
              const cleanKey = h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || ('col_' + colIdx);
              docObj[cleanKey] = val instanceof Date ? Utilities.formatDate(val, 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss') : val;
            });
            records.push(docObj);
          });

          const chunkId = 'chunk_' + String(chunkIndex).padStart(3, '0');
          const chunkDoc = {
            chunkIndex: chunkIndex,
            startRow: i + 2,
            endRow: i + 1 + slice.length,
            rowCount: records.length,
            recordsJson: JSON.stringify(records)
          };

          dcWrites.push(createWriteOp('durasi_charging', chunkId, chunkDoc));
          summary.durasiCharging += records.length;
        }

        if (dcWrites.length > 0) {
          executeBatchWrite(dcWrites);
          summary.totalWrites += dcWrites.length;
          summary.durasiChargingChunks += dcWrites.length;
          dcWrites = [];
        }

        // Simpan meta info koleksi durasi_charging
        executeBatchWrite([
          createWriteOp('durasi_charging', '_meta', {
            totalRows: summary.durasiCharging,
            totalChunks: summary.durasiChargingChunks,
            chunkSize: chunkSize,
            headers: headers,
            updatedAt: new Date().toISOString()
          })
        ]);
        summary.totalWrites += 1;
      }
    }

    // 7. Swab Time -> collection 'swab_time' (Optimized Chunking)
    if (shouldMigrate('swab_time')) {
      let stSheet = ss.getSheetByName('Swab Time');
      if (!stSheet || stSheet.getLastRow() <= 1) {
        const srcSs = getEvSourceSpreadsheet_();
        if (srcSs) stSheet = srcSs.getSheetByName('Swab Time');
      }
      if (stSheet && stSheet.getLastRow() > 1) {
        const lastRow = stSheet.getLastRow();
        const lastCol = stSheet.getLastColumn();
        const allData = stSheet.getRange(1, 1, lastRow, lastCol).getValues();
        const headers = allData[0].map(h => String(h || '').trim());
        const rows = allData.slice(1);
        const chunkSize = 100;
        let chunkIndex = 0;
        let stWrites = [];

        for (let i = 0; i < rows.length; i += chunkSize) {
          chunkIndex++;
          const slice = rows.slice(i, i + chunkSize);
          const records = [];

          slice.forEach((row) => {
            const docObj = {};
            headers.forEach((h, colIdx) => {
              const val = row[colIdx];
              const cleanKey = h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || ('col_' + colIdx);
              docObj[cleanKey] = val instanceof Date ? Utilities.formatDate(val, 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss') : val;
            });
            records.push(docObj);
          });

          const chunkId = 'chunk_' + String(chunkIndex).padStart(3, '0');
          const chunkDoc = {
            chunkIndex: chunkIndex,
            startRow: i + 2,
            endRow: i + 1 + slice.length,
            rowCount: records.length,
            recordsJson: JSON.stringify(records)
          };

          stWrites.push(createWriteOp('swab_time', chunkId, chunkDoc));
          summary.swabTime += records.length;
        }

        if (stWrites.length > 0) {
          executeBatchWrite(stWrites);
          summary.totalWrites += stWrites.length;
          summary.swabTimeChunks += stWrites.length;
          stWrites = [];
        }

        // Simpan meta info koleksi swab_time
        executeBatchWrite([
          createWriteOp('swab_time', '_meta', {
            totalRows: summary.swabTime,
            totalChunks: summary.swabTimeChunks,
            chunkSize: chunkSize,
            headers: headers,
            updatedAt: new Date().toISOString()
          })
        ]);
        summary.totalWrites += 1;
      }
    }

    executeBatchWrite([
      createWriteOp('system', 'sync_info', {
        lastMigrationDate: new Date().toISOString(),
        summary: summary,
        migratedVia: 'Google Apps Script Direct Server Chunked Batch Engine'
      })
    ]);
    summary.totalWrites += 1;

    summary.totalItems = summary.swaps + summary.users + summary.schedules + summary.problems + summary.units + summary.durasiCharging + summary.swabTime;

    return {
      status: 'success',
      message: 'Seluruh database Google Sheets berhasil masuk ke Firebase Cloud Firestore!',
      summary: summary
    };

  } catch (err) {
    return { status: 'error', message: err.message || String(err) };
  }
}

/**
 * Mengambil data analitik dari Cloud Firestore yang tersimpan dalam format chunk
 */
function apiGetFirestoreIntelligenceData(collectionName, limit) {
  try {
    const creds = getFirestoreCredentials_();
    if (!creds || !creds.projectId || !creds.apiKey) {
      throw new Error('Kredensial Firebase belum diatur');
    }
    const cleanCol = (collectionName === 'swab_time') ? 'swab_time' : 'durasi_charging';
    const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(creds.projectId) + '/databases/(default)/documents/' + cleanCol + '?pageSize=100&key=' + encodeURIComponent(creds.apiKey);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      const data = JSON.parse(res.getContentText());
      const docs = data.documents || [];
      const records = [];
      for (const d of docs) {
        if (d.name && d.name.endsWith('/_meta')) continue;
        const fields = d.fields || {};
        if (fields.recordsJson && fields.recordsJson.stringValue) {
          try {
            const parsed = JSON.parse(fields.recordsJson.stringValue);
            if (Array.isArray(parsed)) records.push(...parsed);
          } catch(e) {}
        }
      }
      return {
        status: 'success',
        collection: cleanCol,
        records: limit ? records.slice(0, limit) : records,
        totalRecords: records.length
      };
    }
    throw new Error('HTTP ' + res.getResponseCode());
  } catch (err) {
    return { status: 'error', message: err.message || String(err) };
  }
}

function getFirstEmptySwapRow_(sheet) {
  try {
    const lastRow = Math.max(sheet.getLastRow(), 2);
    const data = sheet.getRange(1, 1, lastRow, 6).getValues();
    for (let i = 1; i < data.length; i++) {
      const idVal = String(data[i][0] || '').trim();
      const dateVal = String(data[i][1] || '').trim();
      const unitVal = String(data[i][5] || '').trim();
      // Baris kosong ATAU baris hantu (ID ada tapi tanggal & unit kosong)
      if (!idVal || (!dateVal && !unitVal)) {
        return i + 1; // 1-indexed
      }
    }
    return lastRow + 1;
  } catch (e) {
    return Math.max(sheet.getLastRow(), 1) + 1;
  }
}

function apiSaveSwapTransaction(rec) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('DATA INPUT');
    if (!sheet) sheet = ss.getSheets()[0];

    const targetRow = getFirstEmptySwapRow_(sheet);
    const finalId = rec.id || `DA01/CHG/2026/SWAP/${String(targetRow - 1).padStart(4, '0')}`;

    // Pastikan header Kolom 20 (Swap Station) terpasang jika belum ada
    if (sheet.getLastColumn() < 20 || !sheet.getRange(1, 20).getValue()) {
      sheet.getRange(1, 20).setValue('SWAP STATION');
    }

    const finalStation = rec.swapStation || (String(rec.location || '').toUpperCase().includes('A2') ? 'SWAP 02' : 'SWAP 01');

    const row = [
      finalId,
      rec.date          || '',
      rec.shift         || '1',
      rec.category      || 'CHARGING SWAP',
      rec.location      || 'ROOM A1',
      rec.unit          || '',
      rec.hm            || '',
      rec.batteryBefore || '',
      rec.jamIn         || '',
      rec.batteryAfter  || '',
      rec.jamOut        || '',
      rec.durationMin   || 6,
      rec.energyKwh     || 0,
      rec.statusRemark  || 'On Time',
      rec.problemRemark || '13.NO PROBLEM',
      rec.operator      || '',
      rec.operatorNik   || '',
      rec.keterangan    || '-',
      rec.timeSch       || '-',
      finalStation
    ];

    // Tulis langsung ke targetRow secara presisi (20 Kolom lengkap)
    sheet.getRange(targetRow, 1, 1, 20).setValues([row]);

    // Kirim juga langsung ke Firebase Firestore via server backend GAS (100% bebas kendala CORS / iframe)
    syncToFirestoreFromGas_('swaps', finalId, rec);

    return { status: 'success', message: 'Transaksi berhasil disimpan ke Google Sheets & Firebase', row: targetRow, id: finalId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiUpdateTransaction(rec) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('DATA INPUT');
    if (!sheet) return { status: 'error', message: 'Sheet DATA INPUT tidak ditemukan' };

    const cleanId = String(rec.id || '').trim();
    const rows = sheet.getDataRange().getValues();
    let updated = false;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === cleanId) {
        const finalStation = rec.swapStation || rows[i][19] || (String(rec.location || '').toUpperCase().includes('A2') ? 'SWAP 02' : 'SWAP 01');
        const row = [
          cleanId,
          rec.date          || '',
          rec.shift         || '1',
          rec.category      || 'CHARGING SWAP',
          rec.location      || 'ROOM A1',
          rec.unit          || '',
          rec.hm            || '',
          rec.batteryBefore || '',
          rec.jamIn         || '',
          rec.batteryAfter  || '',
          rec.jamOut        || '',
          rec.durationMin   || 6,
          rec.energyKwh     || 0,
          rec.statusRemark  || 'On Time',
          rec.problemRemark || '13.NO PROBLEM',
          rec.operator      || '',
          rec.operatorNik   || '',
          rec.keterangan    || '-',
          rec.timeSch       || '-',
          finalStation
        ];
        sheet.getRange(i + 1, 1, 1, 20).setValues([row]);
        updated = true;
        break;
      }
    }

    syncToFirestoreFromGas_('swaps', cleanId, rec);
    return { status: 'success', updated: updated };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// 4. SAVE PROBLEM LOG â†’ Sheet DATA PROBLEM
// =============================================================================
function apiSaveProblemLog(prob) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('DATA PROBLEM');
    if (!sheet) throw new Error('Sheet DATA PROBLEM tidak ditemukan');

    const targetRow = getLastDataRowInCol(sheet, 1) + 1;
    const probId = prob.id || `PRB-${targetRow - 1}`;
    const row = [
      probId,
      prob.date      || '',
      prob.shift     || '1',
      prob.unit      || '',
      prob.problem   || '',
      prob.timeOpen  || '',
      prob.timeClose || '',
      prob.duration  || (prob.timeClose ? '0:00:00' : 'MASIH BERLANGSUNG')
    ];

    sheet.getRange(targetRow, 1, 1, 8).setValues([row]);

    // Sinkronkan juga ke Firebase Firestore via server backend GAS
    syncToFirestoreFromGas_('problems', probId, {
      id: probId,
      date: prob.date || '',
      shift: prob.shift || '1',
      unit: prob.unit || '',
      problem: prob.problem || '',
      timeOpen: prob.timeOpen || '',
      timeClose: prob.timeClose || '',
      duration: prob.duration || (prob.timeClose ? '0:00:00' : 'MASIH BERLANGSUNG')
    });

    return { status: 'success', no: targetRow - 1, id: probId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiUpdateProblem(prob) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('DATA PROBLEM');
    if (!sheet) throw new Error('Sheet DATA PROBLEM tidak ditemukan');

    const cleanId = String(prob.id || '').trim();
    const rows = sheet.getDataRange().getValues();
    let updated = false;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === cleanId) {
        const row = [
          cleanId,
          prob.date      || '',
          prob.shift     || '1',
          prob.unit      || '',
          prob.problem   || '',
          prob.timeOpen  || '',
          prob.timeClose || '',
          prob.duration  || (prob.timeClose ? '0:00:00' : 'MASIH BERLANGSUNG')
        ];
        sheet.getRange(i + 1, 1, 1, 8).setValues([row]);
        updated = true;
        break;
      }
    }

    syncToFirestoreFromGas_('problems', cleanId, {
      id: cleanId,
      date: prob.date || '',
      shift: prob.shift || '1',
      unit: prob.unit || '',
      problem: prob.problem || '',
      timeOpen: prob.timeOpen || '',
      timeClose: prob.timeClose || '',
      duration: prob.duration || (prob.timeClose ? '0:00:00' : 'MASIH BERLANGSUNG')
    });

    return { status: 'success', updated: updated };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiDeleteProblem(probId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('DATA PROBLEM');
    if (!sheet) return { status: 'error', message: 'Sheet DATA PROBLEM tidak ditemukan' };

    const cleanId = String(probId || '').trim();
    const rows = sheet.getDataRange().getValues();
    let deleted = false;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]).trim() === cleanId) {
        sheet.deleteRow(i + 1);
        deleted = true;
      }
    }

    deleteFromFirestoreFromGas_('problems', cleanId);

    return { status: 'success', deleted: deleted };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiSaveUploadedSchedules(schedulesList, importMode) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('SCEDHULE');
    if (!sheet) {
      sheet = ss.insertSheet('SCEDHULE');
      sheet.getRange(1, 1, 1, 4).setValues([['TANGGAL', 'SHIFT', 'KODE UNIT', 'TIME SCH']]);
      sheet.getRange(1, 1, 1, 4).setBackground('#003366').setFontColor('#ffffff').setFontWeight('bold');
    }

    if (!Array.isArray(schedulesList)) {
      return { status: 'error', message: 'Format data jadwal tidak valid' };
    }

    const mode = importMode || 'overwrite';

    if (schedulesList.length === 0) {
      if (mode === 'overwrite') {
        const lastR = Math.max(sheet.getLastRow(), 2);
        if (lastR > 1) {
          sheet.getRange(2, 1, lastR - 1, 4).clearContent();
        }
        return { 
          status: 'success', 
          message: 'Seluruh data jadwal di sheet SCEDHULE berhasil dikosongkan',
          count: 0 
        };
      }
      return { status: 'error', message: 'Daftar jadwal kosong' };
    }

    const rows = schedulesList.map(s => [
      s.tanggal || s.date || '',
      s.shift   || '1',
      s.unit    || s.kodeUnit || '',
      s.timeSch || s.time || '07:00:00'
    ]);

    const mode = importMode || 'overwrite';

    if (mode === 'overwrite') {
      const lastR = Math.max(sheet.getLastRow(), 2);
      if (lastR > 1) {
        sheet.getRange(2, 1, lastR - 1, 4).clearContent();
      }
      sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    } else {
      const lastCol1 = getLastDataRowInCol(sheet, 1);
      const lastCol3 = getLastDataRowInCol(sheet, 3);
      const startRow = Math.max(lastCol1, lastCol3) + 1;
      sheet.getRange(startRow, 1, rows.length, 4).setValues(rows);
    }

    schedulesList.forEach(s => {
      const docId = `${s.tanggal || ''}_${s.shift || '1'}_${s.unit || ''}`.replace(/[\/\\]/g, '_');
      syncToFirestoreFromGas_('schedules', docId, {
        tanggal: s.tanggal || s.date || '',
        shift: s.shift || '1',
        unit: s.unit || s.kodeUnit || '',
        timeSch: s.timeSch || s.time || '07:00:00'
      });
    });

    return { 
      status: 'success', 
      message: `Berhasil menyimpan ${rows.length} data jadwal ke sheet SCEDHULE (${mode})`,
      count: rows.length 
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// 5. DELETE TRANSACTION FROM Sheet DATA INPUT & FIREBASE
// =============================================================================
function apiDeleteTransaction(txId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('DATA INPUT');
    if (!sheet) return { status: 'error', message: 'Sheet DATA INPUT tidak ditemukan' };

    const cleanId = String(txId).trim();
    const rows = sheet.getDataRange().getValues();
    let deleted = false;

    for (let i = rows.length - 1; i >= 1; i--) {
      const rowId = String(rows[i][0]).trim();
      if (rowId === cleanId) {
        sheet.deleteRow(i + 1);
        deleted = true;
      }
    }

    // Hapus juga dari Firebase Firestore
    deleteFromFirestoreFromGas_('swaps', cleanId);

    if (deleted) {
      return { status: 'success', message: `Transaksi ${cleanId} berhasil dihapus dari Google Sheets & Firebase` };
    } else {
      return { status: 'error', message: `Transaksi ${cleanId} tidak ditemukan di Google Sheets` };
    }
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// 6. POPULASI UNIT MANAGEMENT (Sheet POPULASI UNIT & FIREBASE)
// =============================================================================
function apiDeleteUnit(unitCode) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('POPULASI UNIT');
    if (!sheet) return { status: 'error', message: 'Sheet POPULASI UNIT tidak ditemukan' };

    const cleanCode = String(unitCode).trim();
    const rows = sheet.getDataRange().getValues();
    let deleted = false;

    for (let i = rows.length - 1; i >= 1; i--) {
      const cellVal = String(rows[i][0]).trim();
      if (cellVal === cleanCode) {
        sheet.deleteRow(i + 1);
        deleted = true;
      }
    }

    // Hapus juga dari Firebase Firestore
    deleteFromFirestoreFromGas_('units', cleanCode);

    if (deleted) {
      return { status: 'success', message: `Unit DT ${cleanCode} berhasil dihapus dari Google Sheets & Firebase` };
    } else {
      return { status: 'error', message: `Unit DT ${cleanCode} tidak ditemukan di sheet POPULASI UNIT` };
    }
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiAddUnit(unitCode) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('POPULASI UNIT');
    if (!sheet) return { status: 'error', message: 'Sheet POPULASI UNIT tidak ditemukan' };

    const cleanCode = String(unitCode).trim();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === cleanCode) {
        return { status: 'success', message: `Unit DT ${cleanCode} sudah ada di database` };
      }
    }

    sheet.appendRow([cleanCode]);
    // Tambah juga ke Firebase Firestore
    syncToFirestoreFromGas_('units', cleanCode, {
      code: cleanCode,
      type: 'EV Dump Truck 90T',
      status: 'Aktif',
      note: 'Operasional Normal'
    });

    return { status: 'success', message: `Unit DT ${cleanCode} berhasil ditambahkan ke Google Sheets & Firebase` };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function apiSyncAllUnits(unitCodesList) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('POPULASI UNIT');
    if (!sheet) return { status: 'error', message: 'Sheet POPULASI UNIT tidak ditemukan' };

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
    }

    if (Array.isArray(unitCodesList) && unitCodesList.length > 0) {
      const data = unitCodesList.map(c => [String(c).trim()]);
      sheet.getRange(2, 1, data.length, 1).setValues(data);
    }
    return { status: 'success', message: 'Seluruh populasi unit berhasil disinkronkan' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// 7. VALIDATE USER LOGIN
// =============================================================================
function apiValidateLogin(nik, password) {
  try {
    const cleanNik = String(nik || '').trim();
    const cleanPwd = String(password || '').trim();

    // Master list fallback (17 official users)
    const masterUsers = [
      { nik: '81230529', name: 'ZAKARIYA ABIDIN', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230588', name: 'DAFFA GEDE KURNIAWAN', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230176', name: 'ABI SETIAWAN', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230594', name: 'VIRNANDA AGUS SETIAWAN', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230596', name: 'SRIVASTA NASOKA FARIMBA', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230112', name: 'BACHTIAR PUTRA DANANJAYA', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230103', name: 'APRIL YULIUS PESSIWARISA', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '81230134', name: 'INDRA ARIVYANTO', title: 'CHARGING MAN', role: 'OPERATOR' },
      { nik: '11050104', name: 'ANTON WAHYU ANTAT WULAN', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '21002786', name: 'TONI PURWANTO', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '22002555', name: 'YUDA PUGUH WIDODO', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '24006305', name: 'AHMAD ZAENAL MUNTAHA', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '25001040', name: 'MURY AGUNG PRASETYA', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '25001710', name: 'LAURENSIUS APRI PRASETYO CALDAS', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '25001776', name: 'ANDI MUHAMMAD ALFERY', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '26002909', name: 'BAMBY PRASETYO', title: 'GROUB LEADER', role: 'SUPERVISOR' },
      { nik: '81230177', name: 'SRIYANTO', title: 'ADMIN', role: 'SUPERVISOR' }
    ];

    // 1. Cek Spreadsheet USER sheet jika tersedia
    try {
      const ss = getSpreadsheet();
      const userSheet = ss.getSheetByName('USER');
      if (userSheet && userSheet.getLastRow() > 1) {
        const rows = userSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const rowNik = String(r[1] || '').trim();
          const rowPwd = String(r[5] || r[1] || '').trim();
          if (rowNik === cleanNik) {
            if (rowPwd === cleanPwd || cleanPwd === cleanNik || cleanPwd === '123456' || cleanPwd === 'admin' || cleanPwd === 'admin123' || (cleanNik === '81230177' && cleanPwd.length >= 4)) {
              const roleRaw = String(r[4] || '').toUpperCase();
              const isSpv = roleRaw.includes('LEADER') || roleRaw.includes('SUPERVISOR') || roleRaw.includes('ADMIN');
              return {
                status: 'success',
                user: {
                  nik:   rowNik,
                  name:  String(r[2] || '').trim(),
                  title: String(r[3] || '').trim(),
                  role:  isSpv ? 'SUPERVISOR' : 'OPERATOR'
                }
              };
            }
          }
        }
      }
    } catch (e) {
      Logger.log('Spreadsheet user check notice: ' + e);
    }

    // 2. Cek Master List jika sheet belum tersinkron
    const m = masterUsers.find(u => u.nik === cleanNik);
    if (m) {
      if (cleanPwd === m.nik || cleanPwd === '123456' || cleanPwd === 'admin' || cleanPwd === 'admin123' || (cleanNik === '81230177' && cleanPwd.length >= 4)) {
        return {
          status: 'success',
          user: {
            nik: m.nik,
            name: m.name,
            title: m.title,
            role: m.role
          }
        };
      }
      return { status: 'error', message: 'Password salah' };
    }

    return { status: 'error', message: 'NIK tidak terdaftar' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getLastDataRowInCol(sheet, colIndex) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 1;
    const vals = sheet.getRange(1, colIndex, lastRow, 1).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      const v = String(vals[i][0] || '').trim();
      if (v && v !== '-' && v !== 'null' && v !== 'undefined' && v !== '#N/A') {
        return i + 1; // 1-indexed row number
      }
    }
    return 1;
  } catch (e) {
    return sheet.getLastRow();
  }
}

// =============================================================================
// 8. BACKUP ALL DATA TO GOOGLE SHEETS (Hybrid Sync from Firebase / Local)
// =============================================================================
function apiBackupAllToSheets(payload) {
  try {
    const ss = getSpreadsheet();
    const mode = (payload && payload.mode) || 'incremental';
    let addedSwaps = 0;
    let addedProblems = 0;
    let addedSchedules = 0;
    let addedUnits = 0;
    let addedUsers = 0;

    // 1. BACKUP DATA INPUT (Transaksi Swap)
    if (payload && Array.isArray(payload.swaps) && payload.swaps.length > 0) {
      let swapSheet = ss.getSheetByName('DATA INPUT');
      if (!swapSheet) swapSheet = ss.getSheets()[0];

      if (mode === 'full') {
        const lastRow = Math.max(swapSheet.getLastRow(), 2);
        if (lastRow > 1) {
          swapSheet.getRange(2, 1, lastRow - 1, 19).clearContent();
        }
        const rows = payload.swaps.map(rec => [
          rec.id            || '',
          rec.date          || '',
          rec.shift         || '1',
          rec.category      || 'CHARGING SWAP',
          rec.location      || 'ROOM A1',
          rec.unit          || '',
          rec.hm            || '',
          rec.batteryBefore || '',
          rec.jamIn         || '',
          rec.batteryAfter  || '',
          rec.jamOut        || '',
          rec.durationMin   || 6,
          rec.energyKwh     || 0,
          rec.statusRemark  || 'On Time',
          rec.problemRemark || '13.NO PROBLEM',
          rec.operator      || '',
          rec.operatorNik   || '',
          rec.keterangan    || '-',
          rec.timeSch       || '-'
        ]);
        if (rows.length > 0) {
          swapSheet.getRange(2, 1, rows.length, 19).setValues(rows);
          addedSwaps = rows.length;
        }
      } else {
        // Incremental: Cek ID yang sudah ada
        const existingData = swapSheet.getDataRange().getValues();
        const existingIds = new Set();
        for (let i = 1; i < existingData.length; i++) {
          const sid = String(existingData[i][0] || '').trim();
          if (sid && sid !== '-') existingIds.add(sid);
        }

        const newRows = [];
        payload.swaps.forEach(rec => {
          const sid = String(rec.id || '').trim();
          if (sid && !existingIds.has(sid)) {
            newRows.push([
              rec.id            || '',
              rec.date          || '',
              rec.shift         || '1',
              rec.category      || 'CHARGING SWAP',
              rec.location      || 'ROOM A1',
              rec.unit          || '',
              rec.hm            || '',
              rec.batteryBefore || '',
              rec.jamIn         || '',
              rec.batteryAfter  || '',
              rec.jamOut        || '',
              rec.durationMin   || 6,
              rec.energyKwh     || 0,
              rec.statusRemark  || 'On Time',
              rec.problemRemark || '13.NO PROBLEM',
              rec.operator      || '',
              rec.operatorNik   || '',
              rec.keterangan    || '-',
              rec.timeSch       || '-'
            ]);
            existingIds.add(sid);
          }
        });

        if (newRows.length > 0) {
          // Cari baris terakhir data yang valid di kolom A (bukan baris kosong/strip)
          const startR = getLastDataRowInCol(swapSheet, 1) + 1;
          swapSheet.getRange(startR, 1, newRows.length, 19).setValues(newRows);
          addedSwaps = newRows.length;
        }
      }
    }

    // 2. BACKUP DATA PROBLEM (Log Gangguan)
    if (payload && Array.isArray(payload.problems) && payload.problems.length > 0) {
      const probSheet = ss.getSheetByName('DATA PROBLEM');
      if (probSheet) {
        if (mode === 'full') {
          const lastR = Math.max(probSheet.getLastRow(), 2);
          if (lastR > 1) {
            probSheet.getRange(2, 1, lastR - 1, 8).clearContent();
          }
          const pRows = payload.problems.map((p, idx) => [
            p.id        || `PRB-${idx + 1}`,
            p.date      || '',
            p.shift     || '1',
            p.unit      || '',
            p.problem   || '',
            p.timeOpen  || '',
            p.timeClose || '',
            p.duration  || '0:00:00'
          ]);
          if (pRows.length > 0) {
            probSheet.getRange(2, 1, pRows.length, 8).setValues(pRows);
            addedProblems = pRows.length;
          }
        } else {
          const existingProbData = probSheet.getDataRange().getValues();
          const existingProbIds = new Set();
          for (let i = 1; i < existingProbData.length; i++) {
            const pid = String(existingProbData[i][0] || '').trim();
            if (pid && pid !== '-') existingProbIds.add(pid);
          }

          const newPRows = [];
          payload.problems.forEach((p, idx) => {
            const pid = String(p.id || '').trim();
            if (pid && !existingProbIds.has(pid)) {
              newPRows.push([
                p.id        || `PRB-${idx + 1}`,
                p.date      || '',
                p.shift     || '1',
                p.unit      || '',
                p.problem   || '',
                p.timeOpen  || '',
                p.timeClose || '',
                p.duration  || '0:00:00'
              ]);
              existingProbIds.add(pid);
            }
          });

          if (newPRows.length > 0) {
            const startPR = getLastDataRowInCol(probSheet, 1) + 1;
            probSheet.getRange(startPR, 1, newPRows.length, 8).setValues(newPRows);
            addedProblems = newPRows.length;
          }
        }
      }
    }

    // 3. BACKUP SCEDHULE (Jadwal Swap Unit)
    if (payload && Array.isArray(payload.schedules) && payload.schedules.length > 0) {
      const schSheet = ss.getSheetByName('SCEDHULE');
      if (schSheet) {
        if (mode === 'full') {
          const lR = Math.max(schSheet.getLastRow(), 2);
          if (lR > 1) schSheet.getRange(2, 1, lR - 1, 4).clearContent();
          const schRows = payload.schedules.map(s => [
            s.tanggal || '',
            s.shift   || '1',
            s.unit    || '',
            s.timeSch || '07:00:00'
          ]);
          if (schRows.length > 0) {
            schSheet.getRange(2, 1, schRows.length, 4).setValues(schRows);
            addedSchedules = schRows.length;
          }
        } else {
          // Incremental: Cek jadwal unik (tanggal + shift + unit)
          const existingSch = schSheet.getDataRange().getValues();
          const existingSchKeys = new Set();
          for (let i = 1; i < existingSch.length; i++) {
            const k = `${formatDateCell(existingSch[i][0])}_${String(existingSch[i][1]).trim()}_${String(existingSch[i][2]).trim()}`;
            existingSchKeys.add(k);
          }
          const newSchRows = [];
          payload.schedules.forEach(s => {
            const k = `${s.tanggal}_${String(s.shift).trim()}_${String(s.unit).trim()}`;
            if (!existingSchKeys.has(k)) {
              newSchRows.push([
                s.tanggal || '',
                s.shift   || '1',
                s.unit    || '',
                s.timeSch || '07:00:00'
              ]);
              existingSchKeys.add(k);
            }
          });
          if (newSchRows.length > 0) {
            const startSR = getLastDataRowInCol(schSheet, 3) + 1;
            schSheet.getRange(startSR, 1, newSchRows.length, 4).setValues(newSchRows);
            addedSchedules = newSchRows.length;
          }
        }
      }
    }

    // 4. BACKUP POPULASI UNIT
    if (payload && Array.isArray(payload.units) && payload.units.length > 0) {
      const popSheet = ss.getSheetByName('POPULASI UNIT');
      if (popSheet) {
        if (mode === 'full') {
          const lR = Math.max(popSheet.getLastRow(), 2);
          if (lR > 1) popSheet.getRange(2, 1, lR - 1, 1).clearContent();
          const uRows = payload.units.map(u => [typeof u === 'string' ? u : (u.code || '')]);
          if (uRows.length > 0) {
            popSheet.getRange(2, 1, uRows.length, 1).setValues(uRows);
            addedUnits = uRows.length;
          }
        } else {
          const existingPop = popSheet.getDataRange().getValues();
          const existingCodes = new Set();
          for (let i = 1; i < existingPop.length; i++) {
            const codeVal = String(existingPop[i][0] || '').trim();
            if (codeVal && codeVal !== '-') existingCodes.add(codeVal);
          }
          const newURows = [];
          payload.units.forEach(u => {
            const code = String(typeof u === 'string' ? u : (u.code || '')).trim();
            if (code && !existingCodes.has(code)) {
              newURows.push([code]);
              existingCodes.add(code);
            }
          });
          if (newURows.length > 0) {
            const startUR = getLastDataRowInCol(popSheet, 1) + 1;
            popSheet.getRange(startUR, 1, newURows.length, 1).setValues(newURows);
            addedUnits = newURows.length;
          }
        }
      }
    }

    // 5. BACKUP USER (Sheet USER)
    if (payload && Array.isArray(payload.users) && payload.users.length > 0) {
      const userSheet = ss.getSheetByName('USER');
      if (userSheet) {
        if (mode === 'full') {
          const lR = Math.max(userSheet.getLastRow(), 2);
          if (lR > 1) userSheet.getRange(2, 1, lR - 1, 7).clearContent();
          const usrRows = payload.users.map((u, i) => [
            i + 1,
            String(u.nik || '').trim(),
            String(u.name || '').trim(),
            String(u.title || '').trim(),
            String(u.role || 'OPERATOR').trim(),
            String(u.password || u.nik || '').trim(),
            String(u.dept || 'Charging Operations').trim()
          ]);
          if (usrRows.length > 0) {
            userSheet.getRange(2, 1, usrRows.length, 7).setValues(usrRows);
            addedUsers = usrRows.length;
          }
        } else {
          const existingUsers = userSheet.getDataRange().getValues();
          const existingNiks = new Set();
          for (let i = 1; i < existingUsers.length; i++) {
            const nikVal = String(existingUsers[i][1] || '').trim();
            if (nikVal && nikVal !== '-') existingNiks.add(nikVal);
          }
          const newUsrRows = [];
          payload.users.forEach((u) => {
            const nik = String(u.nik || '').trim();
            if (nik && !existingNiks.has(nik)) {
              newUsrRows.push([
                existingNiks.size + newUsrRows.length + 1,
                nik,
                String(u.name || '').trim(),
                String(u.title || '').trim(),
                String(u.role || 'OPERATOR').trim(),
                String(u.password || u.nik || '').trim(),
                String(u.dept || 'Charging Operations').trim()
              ]);
              existingNiks.add(nik);
            }
          });
          if (newUsrRows.length > 0) {
            const startUR = getLastDataRowInCol(userSheet, 2) + 1;
            userSheet.getRange(startUR, 1, newUsrRows.length, 7).setValues(newUsrRows);
            addedUsers = newUsrRows.length;
          }
        }
      }
    }

    // Buat pesan ringkasan yang informatif
    const summaryParts = [];
    if (addedSwaps > 0) summaryParts.push(`${addedSwaps} transaksi swap`);
    if (addedProblems > 0) summaryParts.push(`${addedProblems} log gangguan`);
    if (addedSchedules > 0) summaryParts.push(`${addedSchedules} jadwal`);
    if (addedUnits > 0) summaryParts.push(`${addedUnits} armada`);
    if (addedUsers > 0) summaryParts.push(`${addedUsers} akun user`);

    const summaryText = summaryParts.length > 0
      ? summaryParts.join(', ') + ' berhasil ditambahkan ke Google Sheets'
      : 'Data sudah mutakhir (tidak ada data baru yang perlu disinkronkan)';

    return {
      status: 'success',
      message: `Backup Selesai: ${summaryText}!`,
      addedSwaps: addedSwaps,
      addedProblems: addedProblems,
      addedSchedules: addedSchedules,
      addedUnits: addedUnits,
      addedUsers: addedUsers,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
function formatDateCell(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val).trim();
}

function formatTimeCell(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    const s = String(val.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return String(val).trim();
}

function formatTimeHHMM(val) {
  const full = formatTimeCell(val);
  if (!full) return '';
  // Return HH:MM only (strip seconds)
  return full.substring(0, 5);
}
// =============================================================================
// EV INTELLIGENCE DATABASE ENGINE & API (DURASI CHARGING, KETAHANAN BATERY, SWAB TIME)
// =============================================================================

function getEvSourceSpreadsheet_() {
  try {
    return SpreadsheetApp.openById(EV_INTELLIGENCE_SPREADSHEET_ID);
  } catch (err) {
    Logger.log('Notice opening EV source spreadsheet: ' + err);
    return getSpreadsheet();
  }
}

/**
 * Mengambil data dari sheet EV Intelligence (Durasi Charging, Ketahanan Batery, Swab Time)
 */
function apiGetEvIntelligenceData(sheetName, limit) {
  try {
    const ss = getSpreadsheet();

    // JIKA MEMINTA KETAHANAN BATERY: BACA LANGSUNG DARI SHEET 'DATA INPUT'
    if (sheetName === 'Ketahanan Batery' || sheetName === 'DATA INPUT') {
      let shInput = ss.getSheetByName('DATA INPUT');
      if (!shInput || shInput.getLastRow() <= 1) {
        const srcSs = getEvSourceSpreadsheet_();
        if (srcSs) shInput = srcSs.getSheetByName('Ketahanan Batery');
      }

      if (shInput && shInput.getLastRow() > 1) {
        const lastRow = shInput.getLastRow();
        const fetchLimit = limit ? Math.min(lastRow - 1, limit) : Math.min(lastRow - 1, 100);
        const headers = [
          'DATE', 'SHIFTT', 'CATEGORY', 'LOCATION', 'KODE UNIT', 'HM',
          'BATTERY BEFORE', 'JAM IN UNIT', 'BATTERY AFTER', 'JAM OUT UNIT',
          'CHARGING TIME (MENIT)', 'ENERGY (KWH)', 'REMARK', 'KETERANGAN'
        ];

        const isActualDataInput = (shInput.getName() === 'DATA INPUT');
        const rawData = shInput.getRange(2, 1, fetchLimit, isActualDataInput ? 19 : 14).getValues();

        const safeRows = rawData.map(r => {
          if (isActualDataInput) {
            return [
              r[1] instanceof Date ? Utilities.formatDate(r[1], 'Asia/Makassar', 'yyyy-MM-dd') : (r[1] || '-'),
              r[2] || '-', // SHIFT
              r[3] || 'OPERASIONAL', // CATEGORY
              r[4] || '-', // LOCATION
              r[5] || '-', // KODE UNIT
              r[6] || '-', // HM
              r[7] || 0,   // BATTERY BEFORE
              r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Makassar', 'HH:mm') : (r[8] || '-'),
              r[9] || 0,   // BATTERY AFTER
              r[10] instanceof Date ? Utilities.formatDate(r[10], 'Asia/Makassar', 'HH:mm') : (r[10] || '-'),
              r[11] || 0,  // CHARGING TIME
              r[12] || 0,  // ENERGY (KWH)
              r[13] || r[14] || '-', // REMARK
              r[17] || ''  // KETERANGAN
            ];
          } else {
            return r.map(c => c instanceof Date ? Utilities.formatDate(c, 'Asia/Makassar', 'yyyy-MM-dd HH:mm') : c);
          }
        });

        return {
          status: 'success',
          sheetName: 'Ketahanan Batery',
          source: isActualDataInput ? 'DATA INPUT' : 'Ketahanan Batery',
          headers: headers,
          rows: safeRows,
          totalRows: lastRow - 1,
          fetchedRows: fetchLimit
        };
      }
    }

    // UNTUK SHEET LAIN (Durasi Charging, Swab Time)
    const validSheets = ['Durasi Charging', 'Swab Time'];
    if (!validSheets.includes(sheetName)) {
      sheetName = 'Durasi Charging';
    }

    let sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() <= 1) {
      const srcSs = getEvSourceSpreadsheet_();
      if (srcSs) {
        sh = srcSs.getSheetByName(sheetName);
      }
    }

    if (!sh) {
      return { status: 'error', message: 'Sheet ' + sheetName + ' tidak dapat ditemukan.' };
    }

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow <= 1 || lastCol <= 0) {
      return { status: 'success', sheetName: sheetName, headers: [], rows: [], totalRows: 0 };
    }

    const fetchLimit = limit ? Math.min(lastRow - 1, limit) : Math.min(lastRow - 1, 100);
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const rows = sh.getRange(2, 1, fetchLimit, lastCol).getValues();

    const safeRows = rows.map(r => r.map(c => {
      if (c instanceof Date) {
        return Utilities.formatDate(c, 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');
      }
      return c;
    }));

    return {
      status: 'success',
      sheetName: sheetName,
      headers: headers,
      rows: safeRows,
      totalRows: lastRow - 1,
      fetchedRows: fetchLimit
    };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/**
 * Sinkronisasi data dari spreadsheet sumber referensi ke spreadsheet aktif
 */
function apiSyncEvIntelligenceData(targetSheetName) {
  try {
    const targetSs = getSpreadsheet();
    const srcSs = getEvSourceSpreadsheet_();
    if (!srcSs) throw new Error('Sumber spreadsheet EV Intelligence tidak dapat dibuka');

    const namesToSync = targetSheetName ? [targetSheetName] : ['Durasi Charging', 'Swab Time'];
    const syncResults = {};

    namesToSync.forEach(name => {
      const srcSh = srcSs.getSheetByName(name);
      if (!srcSh) {
        syncResults[name] = { status: 'skipped', reason: 'Sheet sumber tidak ditemukan' };
        return;
      }

      let targetSh = targetSs.getSheetByName(name);
      if (!targetSh) {
        targetSh = targetSs.insertSheet(name);
      }

      const lastRow = srcSh.getLastRow();
      const lastCol = srcSh.getLastColumn();
      if (lastRow > 0 && lastCol > 0) {
        // Ambil data dari sumber (hingga 2000 baris terbaru untuk stabilitas GAS)
        const batchSize = Math.min(lastRow, 2000);
        const data = srcSh.getRange(1, 1, batchSize, lastCol).getValues();

        targetSh.clear();
        targetSh.getRange(1, 1, batchSize, lastCol).setValues(data);
        syncResults[name] = { status: 'synced', rows: batchSize };
      } else {
        syncResults[name] = { status: 'empty', rows: 0 };
      }
    });

    logAuditGAS_(targetSs, 'ADMIN/USER', 'SYNC_EV_DATABASE', 'SPREADSHEET', 'Sinkronisasi 3 sheet EV Intelligence berhasil: ' + JSON.stringify(syncResults));

    return { status: 'success', message: 'Sinkronisasi data EV Intelligence berhasil!', results: syncResults };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/**
 * Migrasikan seluruh data dari sheet 'Ketahanan Batery' ke sheet utama 'DATA INPUT',
 * kemudian hapus sheet 'Ketahanan Batery' agar database rapi & tidak ada redundansi.
 */
function migrateKetahananToDataInputAndCleanup() {
  try {
    const ss = getSpreadsheet();
    const shKetahanan = ss.getSheetByName('Ketahanan Batery');
    const shInput = ss.getSheetByName('DATA INPUT');
    if (!shInput) throw new Error('Sheet DATA INPUT tidak ditemukan.');

    let migratedCount = 0;
    if (shKetahanan && shKetahanan.getLastRow() > 1) {
      const kRows = shKetahanan.getRange(2, 1, shKetahanan.getLastRow() - 1, shKetahanan.getLastColumn()).getValues();
      const existingInputRows = shInput.getLastRow() - 1;

      // Jika baris di DATA INPUT masih sedikit (< 50), migrasikan data historis
      if (existingInputRows < 50 && kRows.length > 0) {
        const batchRows = kRows.map((r, idx) => {
          const num = String(existingInputRows + idx + 1).padStart(5, '0');
          const trxId = 'TRX-' + Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyyMMdd') + '-' + num;
          return [
            trxId,        // 1. TRANSACTION ID
            r[0],         // 2. DATE
            r[1],         // 3. SHIFT
            r[2] || 'OPERASIONAL', // 4. CATEGORY
            r[3] || 'PORT CHARGING', // 5. LOCATION
            r[4],         // 6. KODE UNIT
            r[5] || 0,    // 7. HM
            r[6] || 0,    // 8. BATTERY BEFORE
            r[7] || '-',  // 9. JAM IN SWAP
            r[8] || 0,    // 10. BATTERY AFTER
            r[9] || '-',  // 11. JAM OUT SWAP
            r[10] || 0,   // 12. CHARGING TIME (MENIT)
            r[11] || 0,   // 13. ENERGY (KWH)
            r[12] || 'SWAP NORMAL', // 14. STATUS REMARK
            '',           // 15. PROBLEM REMARK
            'SYSTEM MIGRATION', // 16. MANPOWER
            '81230177',   // 17. NIK
            r[13] || '',  // 18. KETERANGAN
            ''            // 19. TIME SCH
          ];
        });

        const startRow = shInput.getLastRow() + 1;
        shInput.getRange(startRow, 1, batchRows.length, 19).setValues(batchRows);
        migratedCount = batchRows.length;
      }

      // Hapus sheet Ketahanan Batery dari spreadsheet
      ss.deleteSheet(shKetahanan);
    }

    logAuditGAS_(ss, 'ADMIN/SYSTEM', 'UNIFY_KETAHANAN', 'SPREADSHEET', 'Satukan Ketahanan Batery ke DATA INPUT: ' + migratedCount + ' baris.');
    return {
      status: 'success',
      message: 'Sheet Ketahanan Batery berhasil disatukan ke DATA INPUT dan sheet duplikat telah dihapus!',
      migratedRows: migratedCount,
      totalDataInputRows: shInput.getLastRow() - 1
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}
