/**
 * SIAP WANAMSKA - Backend Script Pro Version
 * Developer: Arif Nuur Iswahyudi, S. Pd
 */

const SPREADSHEET_ID = "1psmyiXl6OvIpKmPnuUvtNeEoNvMt6GukJv_S2yLk4Hs"; 
const FOLDER_FOTO_ID = "1Dc399KOxltIa8osp0blPv_GX0ap--ekq";

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doGet(e) {
  if (!e || !e.parameter) return res({status: "error", message: "Akses ditolak."});
  const action = e.parameter.action;
  const ss = getSS();

  switch (action) {
    case 'login': return loginUser(ss, e.parameter.username, e.parameter.password);
    case 'getDashboardData': return getDashboardData(ss);
    case 'getKegiatan': return getKegiatan(ss);
    case 'getSettings': return getSettings(ss);
    default: return res({status: "error", message: "Action tidak ditemukan"});
  }
}

function doPost(e) {
  const ss = getSS();
  const data = JSON.parse(e.postData.contents);
  
  if (data.action === 'submitAbsensi') return simpanAbsensi(ss, data);
  if (data.action === 'updateProfile') return updateProfile(ss, data);
  
  return res({status: "error", message: "Post action tidak ditemukan"});
}

function loginUser(ss, username, password) {
  const sheet = ss.getSheetByName('users');
  const data = sheet.getDataRange().getValues();
  const u = username ? username.toString().trim() : "";
  const p = password ? password.toString().trim() : "";

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === u && data[i][1].toString().trim() === p) {
      // Hitung Persentase Kehadiran untuk Bintang
      const userStats = calculateUserAttendance(ss, u);
      
      return res({
        status: 'success', 
        user: { 
          row: i + 1, // Untuk keperluan update nanti
          user_id: data[i][0], 
          nama: data[i][2], 
          role: data[i][3], 
          regu: data[i][4], 
          foto: data[i][5], 
          qr: data[i][6],
          kelas: data[i][7],
          alamat: data[i][8],
          nta: data[i][9],
          ortu: data[i][10],
          ortu_job: data[i][11],
          stats: userStats
        }
      });
    }
  }
  return res({status: 'error', message: 'User ID atau Password salah.'});
}

function calculateUserAttendance(ss, userId) {
  const sheetAbsen = ss.getSheetByName('absensi');
  const data = sheetAbsen.getDataRange().getValues();
  
  // Hitung total pertemuan unik (berdasarkan tanggal)
  const dates = new Set();
  let userHadir = 0;

  for (let i = 1; i < data.length; i++) {
    const tgl = Utilities.formatDate(new Date(data[i][0]), "GMT+7", "yyyy-MM-dd");
    dates.add(tgl);
    if (data[i][1].toString() === userId && data[i][3] === 'Hadir') {
      userHadir++;
    }
  }

  const totalPertemuan = dates.size || 1; // Minimal 1 agar tidak pembagian nol
  const persen = Math.round((userHadir / totalPertemuan) * 100);
  
  let bintang = 0;
  if (persen >= 100) bintang = 5;
  else if (persen >= 75) bintang = 4;
  else if (persen >= 50) bintang = 3;
  else if (persen >= 30) bintang = 2;
  else if (persen >= 15) bintang = 1;

  return { hadir: userHadir, pertemuan: totalPertemuan, persen: persen, bintang: bintang };
}

function updateProfile(ss, data) {
  const sheet = ss.getSheetByName('users');
  const row = data.row;
  
  // Update: Password (B), Alamat (I), Ortu (K), Pekerjaan (L)
  if (data.password) sheet.getRange(row, 2).setValue(data.password);
  sheet.getRange(row, 9).setValue(data.alamat);
  sheet.getRange(row, 11).setValue(data.ortu);
  sheet.getRange(row, 12).setValue(data.ortu_job);

  return res({status: 'success', message: 'Profil & Password berhasil diperbarui!'});
}

// ... (Fungsi getDashboardData, getKegiatan, getSettings, simpanAbsensi, res tetap sama seperti sebelumnya) ...
function getSettings(ss) {
  const sheet = ss.getSheetByName('pengaturan');
  const data = sheet.getDataRange().getValues();
  return res({nama_sekolah: data[1][0], target_lat: parseFloat(data[1][1]), target_long: parseFloat(data[1][2]), radius_meter: parseInt(data[1][3])});
}
function getDashboardData(ss) {
  const sheetAbsen = ss.getSheetByName('absensi');
  const sheetUser = ss.getSheetByName('users');
  const dataAbsen = sheetAbsen.getDataRange().getValues();
  const dataUser = sheetUser.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  let stats = { hadir: 0, izin: 0, sakit: 0, total_peserta: 0, total_dewan: 0 };
  for(let j=1; j < dataUser.length; j++){
    if(dataUser[j][3] === 'Peserta') stats.total_peserta++;
    if(dataUser[j][3] === 'Dewan Penggalang') stats.total_dewan++;
  }
  for (let i = 1; i < dataAbsen.length; i++) {
    if(!dataAbsen[i][0]) continue;
    let tglAbsen = Utilities.formatDate(new Date(dataAbsen[i][0]), "GMT+7", "yyyy-MM-dd");
    if (tglAbsen === today) {
      let st = dataAbsen[i][3].toString().toLowerCase();
      if (st === 'hadir') stats.hadir++;
      if (st === 'izin') stats.izin++;
      if (st === 'sakit') stats.sakit++;
    }
  }
  return res(stats);
}
function getKegiatan(ss) {
  const sheet = ss.getSheetByName('kegiatan');
  const data = sheet.getDataRange().getValues();
  let result = [];
  for(let i=1; i<data.length; i++){
    if(!data[i][1]) continue;
    result.push({ id: data[i][0], judul: data[i][1], tgl: Utilities.formatDate(new Date(data[i][2]), "GMT+7", "dd MMM yyyy"), kategori: data[i][3], desc: data[i][4]});
  }
  return res(result);
}
function simpanAbsensi(ss, data) {
  try {
    const sheet = ss.getSheetByName('absensi');
    let fotoUrl = "-";
    if (data.foto && data.foto.includes("base64")) {
      const folder = DriveApp.getFolderById(FOLDER_FOTO_ID);
      const bytes = Utilities.base64Decode(data.foto.split(',')[1]);
      const blob = Utilities.newBlob(bytes, "image/jpeg", "Absen_" + data.user_id + "_" + Date.now() + ".jpg");
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoUrl = file.getUrl();
    }
    sheet.appendRow([new Date(), data.user_id, data.nama, data.status, data.lat, data.long, fotoUrl, data.metode, '-']);
    return res({status: 'success', message: 'Absensi berhasil!'});
  } catch (e) { return res({status: 'error', message: e.message}); }
}
function res(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
