/**
 * SIAP WANAMSKA - Backend Script
 * Developer: Arif Nuur Iswahyudi, S. Pd
 */

// ID Spreadsheet Bapak (Sudah saya ambil dari link Bapak)
const SPREADSHEET_ID = "1psmyiXl6OvIpKmPnuUvtNeEoNvMt6GukJv_S2yLk4Hs"; 
// Tambahkan di bagian atas Kode.gs (di bawah SPREADSHEET_ID)
const FOLDER_FOTO_ID = "1Dc399KOxltIa8osp0blPv_GX0ap--ekq";

// Fungsi Utama untuk koneksi ke Spreadsheet
function getSS() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    console.error("Gagal membuka Spreadsheet: " + e.message);
    return null;
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  var ss = getSS();

  if (!ss) return res({status: "error", message: "Script tidak bisa mengakses Spreadsheet. Cek Izin/ID."});

  switch (action) {
    case 'login': return loginUser(ss, e.parameter.username, e.parameter.password);
    case 'getDashboardData': return getDashboardData(ss);
    case 'getKegiatan': return getKegiatan(ss);
    case 'getSettings': return getSettings(ss);
    default: return res({status: "error", message: "Action tidak ditemukan: " + action});
  }
}

function doPost(e) {
  var ss = getSS();
  if (!ss) return res({status: "error", message: "Gagal akses Spreadsheet."});
  
  var data = JSON.parse(e.postData.contents);
  if (data.action == 'submitAbsensi') return simpanAbsensi(ss, data);
}

// --- FUNGSI DETAIL ---

function getSettings(ss) {
  var sheet = ss.getSheetByName('pengaturan');
  if (!sheet) return res({status: "error", message: "Sheet 'pengaturan' tidak ada."});
  var data = sheet.getDataRange().getValues();
  return res({
    nama_sekolah: data[1][0],
    target_lat: parseFloat(data[1][1]),
    target_long: parseFloat(data[1][2]),
    radius_meter: parseInt(data[1][3])
  });
}

function loginUser(ss, username, password) {
  var sheet = ss.getSheetByName('users');
  if (!sheet) return res({status: "error", message: "Sheet 'users' tidak ada."});
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() == username && data[i][1].toString() == password) {
      return res({status: 'success', user: { user_id: data[i][0], nama: data[i][2], role: data[i][3], regu: data[i][4], foto: data[i][5], qr: data[i][6] }});
    }
  }
  return res({status: 'error', message: 'User ID atau Password salah.'});
}

function getDashboardData(ss) {
  var sheetAbsen = ss.getSheetByName('absensi');
  var sheetUser = ss.getSheetByName('users');
  if (!sheetAbsen || !sheetUser) return res({status: "error", message: "Sheet data tidak lengkap."});
  
  var dataAbsen = sheetAbsen.getDataRange().getValues();
  var dataUser = sheetUser.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  
  var stats = { hadir: 0, izin: 0, sakit: 0, total_peserta: 0, total_dewan: 0 };
  for(var j=1; j < dataUser.length; j++){
    if(dataUser[j][3] == 'Peserta') stats.total_peserta++;
    if(dataUser[j][3] == 'Dewan Penggalang') stats.total_dewan++;
  }
  for (var i = 1; i < dataAbsen.length; i++) {
    if(!dataAbsen[i][0]) continue;
    var tglAbsen = Utilities.formatDate(new Date(dataAbsen[i][0]), "GMT+7", "yyyy-MM-dd");
    if (tglAbsen === today) {
      if (dataAbsen[i][3] == 'Hadir') stats.hadir++;
      if (dataAbsen[i][3] == 'Izin') stats.izin++;
      if (dataAbsen[i][3] == 'Sakit') stats.sakit++;
    }
  }
  return res(stats);
}

function getKegiatan(ss) {
  var sheet = ss.getSheetByName('kegiatan');
  if (!sheet) return res({status: "error", message: "Sheet 'kegiatan' tidak ada."});
  var data = sheet.getDataRange().getValues();
  var result = [];
  for(var i=1; i<data.length; i++){
    if(!data[i][1]) continue;
    result.push({ id: data[i][0], judul: data[i][1], tgl: data[i][2], kategori: data[i][3], desc: data[i][4], img: data[i][5] });
  }
  return res(result);
}
 

function simpanAbsensi(ss, data) {
  try {
    const sheet = ss.getSheetByName('absensi');
    let fotoUrl = "-";

    // Jika ada data foto (Base64)
    if (data.foto && data.foto.includes("base64")) {
      const folder = DriveApp.getFolderById(FOLDER_FOTO_ID);
      const contentType = data.foto.substring(5, data.foto.indexOf(';'));
      const bytes = Utilities.base64Decode(data.foto.split(',')[1]);
      const blob = Utilities.newBlob(bytes, contentType, "Absen_" + data.user_id + "_" + Date.now() + ".jpg");
      const file = folder.createFile(blob);
      
      // Set agar foto bisa dilihat semua orang yang punya link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoUrl = file.getUrl();
    }

    sheet.appendRow([
      new Date(), 
      data.user_id, 
      data.nama, 
      data.status, 
      data.lat, 
      data.long, 
      fotoUrl, // Sekarang yang disimpan adalah LINK DRIVE
      data.metode, 
      data.petugas || '-'
    ]);

    return res({status: 'success', message: 'Absensi berhasil! Foto tersimpan di Drive.'});
  } catch (e) {
    return res({status: 'error', message: 'Gagal simpan: ' + e.message});
  }
}

function res(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
