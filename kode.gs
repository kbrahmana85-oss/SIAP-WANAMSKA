/** 
 * SIAP WANAMSKA - UPDATE 2026 (MULTI-LOCATION ON/OFF)
 * Developer: Arif Nuur Iswahyudi, S. Pd
 */

const SPREADSHEET_ID = "1psmyiXl6OvIpKmPnuUvtNeEoNvMt6GukJv_S2yLk4Hs";
const FOLDER_FOTO_ID = "1Dc399KOxltIa8osp0blPv_GX0ap--ekq";

function getSS() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function doGet(e) {
  const action = e.parameter.action;
  const ss = getSS();
  if (action === 'login') return loginUser(ss, e.parameter.username, e.parameter.password);
  if (action === 'getDashboardData') return getDashboardData(ss, e.parameter.user_id);
  if (action === 'getKegiatan') return getKegiatan(ss);
  if (action === 'getSettings') return getSettings(ss);
  return res({status:"error", message:"Backend Ready"});
}

function doPost(e) {
  const ss = getSS();
  const data = JSON.parse(e.postData.contents);
  if (data.action === 'submitAbsensi') return simpanAbsensi(ss, data);
  if (data.action === 'updateProfile') return updateProfile(ss, data);
  if (data.action === 'addKegiatan') return addKegiatan(ss, data);
  if (data.action === 'deleteKegiatan') return deleteKegiatan(ss, data.id);
}

function loginUser(ss, u, p) {
  const sheet = ss.getSheetByName('users');
  const data = sheet.getDataRange().getValues();
  const uIn = u ? u.toString().trim().toLowerCase() : "";
  const pIn = p ? p.toString().trim() : "";
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toLowerCase() === uIn && data[i][1].toString().trim() === pIn) {
      const stats = calculateUserStats(ss, data[i][0].toString());
      return res({ status: 'success', user: { row: i + 1, user_id: data[i][0], nama: data[i][2], role: data[i][3], regu: data[i][4], foto: data[i][5], qr: data[i][6], kelas: data[i][7], alamat: data[i][8], nta: data[i][9], ortu: data[i][10], ortu_job: data[i][11], bintang: stats.bintang, persen: stats.persen, hadirCount: stats.hadir, totalHari: stats.totalPertemuan } });
    }
  }
  return res({status: 'error', message: 'User ID / Password salah'});
}

function simpanAbsensi(ss, d) {
  try {
    const sheet = ss.getSheetByName('absensi');
    const tglWaktuFormat = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    let fotoUrl = "-";
    if (d.foto && d.foto.includes("base64")) {
      const bytes = Utilities.base64Decode(d.foto.split(',')[1]);
      const blob = Utilities.newBlob(bytes, "image/jpeg", "Absen_" + d.user_id + ".jpg");
      const file = DriveApp.getFolderById(FOLDER_FOTO_ID).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoUrl = file.getUrl();
    }
    const maps = `https://www.google.com/maps?q=${d.lat},${d.long}`;
    sheet.appendRow([tglWaktuFormat, d.user_id, d.nama, d.status, d.tipe, d.petugas, maps, "Terverifikasi", fotoUrl, "PWA", d.kelas]);
    return res({status: 'success', message: 'Absensi ' + d.tipe + ' berhasil!'});
  } catch (e) { return res({status: 'error', message: e.message}); }
}

function getSettings(ss) {
  if (!ss) ss = getSS();
  const data = ss.getSheetByName('pengaturan').getDataRange().getValues();
  let settings = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] && data[i][4].toString().trim().toLowerCase() === "on") {
      settings = { sekolah: data[i][0], lat: data[i][1], lng: data[i][2], radius: data[i][3] };
      break;
    }
  }
  if (!settings) settings = { sekolah: data[1][0], lat: data[1][1], lng: data[1][2], radius: data[1][3] };
  return res(settings);
}

function calculateUserStats(ss, userId) {
  const dataAbsen = ss.getSheetByName('absensi').getDataRange().getValues();
  const setUnik = new Set(); let count = 0;
  for (let i = 1; i < dataAbsen.length; i++) {
    if(!dataAbsen[i][0]) continue;
    const tgl = dataAbsen[i][0].toString().split(' ')[0];
    setUnik.add(tgl);
    if (dataAbsen[i][1].toString() === userId && dataAbsen[i][3] === 'Hadir') count++;
  }
  const totalHari = setUnik.size || 1;
  const persen = Math.round((count / totalHari) * 100);
  let star = 0;
  if(persen >= 100) star=5; else if(persen >= 75) star=4; else if(persen >= 50) star=3; else if(persen >= 30) star=2; else if(persen >= 15) star=1;
  return { hadir: count, totalPertemuan: totalHari, persen: persen, bintang: star };
}

function getDashboardData(ss, userId) {
  const dataAbsen = ss.getSheetByName('absensi').getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  let hadirHariIni = 0;
  for (let i = 1; i < dataAbsen.length; i++) {
    if(!dataAbsen[i][0]) continue;
    if(dataAbsen[i][0].toString().includes(today) && dataAbsen[i][3] === 'Hadir') hadirHariIni++;
  }
  const totalSiswa = ss.getSheetByName('users').getLastRow() - 1;
  return res({ globalPersen: Math.round((hadirHariIni/totalSiswa)*100) || 0, hadirHariIni: hadirHariIni, totalPeserta: totalSiswa });
}

function updateProfile(ss, d) {
  const s = ss.getSheetByName('users'); const r = d.row;
  if (d.newPass) s.getRange(r, 2).setValue(d.newPass);
  s.getRange(r, 5).setValue(d.regu);
  s.getRange(r, 9).setValue(d.alamat);
  s.getRange(r, 11).setValue(d.ortu);
  s.getRange(r, 12).setValue(d.ortu_job);
  return res({status: 'success', message: 'Profil Diupdate'});
}
function getKegiatan(ss) { const d = ss.getSheetByName('kegiatan').getDataRange().getValues(); let r = []; for(let i=1;i<d.length;i++) if(d[i][1]) r.push({id:d[i][0], judul:d[i][1], tgl:d[i][2], kategori:d[i][3], desc:d[i][4]}); return res(r); }
function addKegiatan(ss, d) { ss.getSheetByName('kegiatan').appendRow(["ID"+Date.now(), d.judul, d.tgl, "Agenda", d.desc]); return res({status:'success'}); }
function deleteKegiatan(ss, id) { const s = ss.getSheetByName('kegiatan'); const d = s.getDataRange().getValues(); for(let i=1;i<d.length;i++) if(d[i][0].toString() === id.toString()){ s.deleteRow(i+1); return res({status:'success'}); } }
function res(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
