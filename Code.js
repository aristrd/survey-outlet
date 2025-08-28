// Ganti ID sheet sesuai dengan milik Anda
const MASTERDATA_SHEET_ID = "";
const MASTERDATA_SHEET_NAME = "";

// disimpan ke drive pribadi
// const PENDATAAN_SHEET_ID = '13VkXMvKFOcE_T5GW3X57eWLmzjBxnpsl8JbzXI0Qu1E';
// const PENDATAAN_SHEET_NAME = "FormResponses";

// disimpan ke drive kalimantan responses dan foto
const PENDATAAN_SHEET_ID = '';
const PENDATAAN_SHEET_NAME = "";
const PHOTO_FOLDER_ID = "";


// Sheet khusus untuk antrean (pribadi)
const QUEUE_SHEET_ID = ""; // ID sheet FormQueue yang baru

// folder foto drive pribadi
// const PHOTO_FOLDER_ID = "1yAu_xOMBwyqvJsUtxYGPzwDeWFdpzuc7";

// Percobaan sidebar
function doGet(e) {
  let page = e.parameter.page;
  if (page == null) page = "form";
  var output = HtmlService.createTemplateFromFile(page);
  return output.evaluate()
    .addMetaTag('viewport', 'width=device-width , initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate()
    .getContent();
}

function myURL() {
  return ScriptApp.getService().getUrl();
}
// Percobaan sidebar


/**
 * Mengambil semua data master dari MasterData.
 */
function getMasterData() {
  const ss = SpreadsheetApp.openById(MASTERDATA_SHEET_ID);
  const sheet = ss.getSheetByName(MASTERDATA_SHEET_NAME);

  if (!sheet) {
    throw new Error("Sheet '" + MASTERDATA_SHEET_NAME + "' tidak ditemukan.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  return data.map(row => ({
    cluster: row[0] ? String(row[0]).trim() : '',
    salesforce: row[1] ? String(row[1]).trim() : '',
    outletId: row[2] ? String(row[2]).trim() : '',
    namaOutlet: row[3] ? String(row[3]).trim() : '',
    longitude: row[4] ? String(row[4]).trim() : '',
    latitude: row[5] ? String(row[5]).trim() : ''
  }));
}

/**
 * Menyimpan data form ke Google Sheet "FormQueue" sebagai antrean.
 * Ini adalah fungsi yang dipanggil oleh `form.html` saat submit.
 */
function submitForm(formData) {
  try {
    const queueSs = SpreadsheetApp.openById(QUEUE_SHEET_ID);
    const queueSheet = queueSs.getActiveSheet();
    
    // Periksa apakah header sudah ada di sheet antrean
    if (queueSheet.getLastRow() === 0) {
      // Tambahkan header baru di sini
      queueSheet.appendRow(['Timestamp', 'Cluster', 'Salesforce', 'Outlet ID', 'Nama Outlet', 'Longitude', 'Latitude', 'Longitude Pengguna', 'Latitude Pengguna', 'Signshop', 'Spanduk', 'Priceboard', 'Poster Voice', 'Poster Digital', 'Poster Renewal', 'Promo Voucher Fisik', 'Foto Base64']);
    }

    const newRow = [
      new Date(),
      formData.cluster,
      formData.salesforce,
      formData.outletId,
      formData.namaOutlet,
      formData.longitude,
      formData.latitude,
      formData.userLongitude,
      formData.userLatitude,
      formData.signshop,
      formData.spanduk,
      formData.priceboard,
      formData.postervoice,
      formData.posterdigital,
      formData.posterRenewal,
      formData.voucher, // Tambahkan data dari field baru di sini
      formData.photo // Simpan data base64 di kolom ini
    ];

    queueSheet.appendRow(newRow);

    return { status: 'success', message: 'Data berhasil disimpan dan sedang diproses.' };
  } catch(e) {
    Logger.log("Gagal menyimpan data ke antrean: " + e.message);
    throw new Error("Terjadi kesalahan saat menyimpan data ke antrean.");
  }
}

/**
 * Fungsi ini dijalankan oleh pemicu berbasis waktu (time-driven trigger) 
 * untuk memproses data dari sheet "FormQueue".
 */
function processQueue() {
  const queueSs = SpreadsheetApp.openById(QUEUE_SHEET_ID);
  const queueSheet = queueSs.getActiveSheet();
  
  if (queueSheet.getLastRow() <= 1) { // Periksa jika hanya ada header
    Logger.log("Tidak ada data baru di antrean.");
    return;
  }
  
  const dataToProcess = queueSheet.getRange(2, 1, queueSheet.getLastRow() - 1, queueSheet.getLastColumn()).getValues();
  const ss = SpreadsheetApp.openById(PENDATAAN_SHEET_ID);
  const pendataanSheet = ss.getSheetByName(PENDATAAN_SHEET_NAME) || ss.insertSheet(PENDATAAN_SHEET_NAME);
  
  if (pendataanSheet.getLastRow() === 0) {
    // Perbarui header di sini
    pendataanSheet.appendRow(['Timestamp', 'Cluster', 'Salesforce', 'Outlet ID', 'Nama Outlet', 'Longitude', 'Latitude', 'Longitude Pengguna', 'Latitude Pengguna', 'Signshop', 'Spanduk', 'Priceboard', 'Poster Voice', 'Poster Digital', 'Poster Renewal', 'Promo Voucher Fisik', 'URL Foto']);
  }

  const newRows = [];
  dataToProcess.forEach(row => {
    let photoUrl = '';
    // Perbarui indeks kolom foto
    const base64Data = row[16]; // Sekarang kolom ke-16 adalah data Base64
    
    if (base64Data && base64Data.length > 0) {
      try {
        const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data.split(',')[1]), "image/jpeg", "Outlet Photo.jpeg");
        const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
        const file = folder.createFile(decodedBlob);
        photoUrl = file.getUrl();
      } catch (e) {
        Logger.log("Gagal menyimpan foto: " + e.message);
        photoUrl = "Gagal menyimpan";
      }
    }
    
    const newRow = [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      row[12],
      row[13],
      row[14],
      row[15], // Data Promo Voucher Fisik
      photoUrl
    ];
    newRows.push(newRow);
  });

  if (newRows.length > 0) {
    pendataanSheet.getRange(pendataanSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    queueSheet.deleteRows(2, newRows.length);
    Logger.log(`Berhasil memproses dan menambahkan ${newRows.length} baris data.`);
  }
}

// ... Fungsi-fungsi lainnya tidak berubah
function getDropdownData() {
  const spreadsheetId = '1aw9VjoyTZNbxyvEHl1POQpL653crhHNGUIQ01lNMrFQ';
  const sheetName = 'MasterData';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  const clusters = [...new Set(data.map(row => row[0]))].filter(c => c); // Kolom 0 = Cluster
  const salesforces = [...new Set(data.map(row => row[1]))].filter(s => s); // Kolom 1 = Salesforce
  const outlets = [...new Set(data.map(row => row[2]))].filter(o => o); // Kolom 2 = Outlet ID

  return { clusters, salesforces, outlets };
}

function findNearestOutlets(userLat, userLng) {
  const spreadsheetId = '1aw9VjoyTZNbxyvEHl1POQpL653crhHNGUIQ01lNMrFQ';
  const sheetname = 'MasterData';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetname);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  Logger.log("Koordinat pengguna: Longitude=%s, Latitude=%s", userLng, userLat);
  
  const outlets = data.map((row, index) => {
    const rawLongitude = String(row[4]);
    const rawLatitude = String(row[5]);
    const longitude = parseFloat(rawLongitude);
    const latitude = parseFloat(rawLatitude);
    
    Logger.log("Baris %s: Raw Longitude=%s, Parsed Longitude=%s | Raw Latitude=%s, Parsed Latitude=%s", 
      index + 2, row[4], longitude, row[5], latitude);

    return {
      cluster: row[0],
      salesforce: row[1],
      outletId: row[2],
      namaOutlet: row[3],
      longitude: longitude,
      latitude: latitude
    };
  });

  const outletsWithDistance = outlets.map(outlet => {
    if (isNaN(outlet.latitude) || isNaN(outlet.longitude)) {
      return { ...outlet, distance: 999999999 };
    }
    const distance = haversine(userLat, userLng, outlet.latitude, outlet.longitude);
    return {
      ...outlet,
      distance: distance.toFixed(2)
    };
  });

  outletsWithDistance.sort((a, b) => a.distance - b.distance);

  return outletsWithDistance.slice(0, 10);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function isMaintenance() {
  return false; // ubah ke false jika form aktif
}
