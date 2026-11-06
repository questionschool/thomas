/* PDF 신청과 공개/비공개 소감. 기존 프로젝트에서 setup 실행 후 기존 웹 앱을 새 버전으로 배포합니다. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('질문수업 웹북 · PDF 신청 명단');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  let pdf = ss.getSheetByName('PDF 신청 명단');
  if (!pdf) {
    const first = ss.getSheets()[0];
    pdf = first.getLastRow() === 0 ? first.setName('PDF 신청 명단') : ss.insertSheet('PDF 신청 명단');
  }
  prepareSheet_(pdf, ['신청 ID','신청 일시 (한국)','이름','소속','이메일','동의 버전','구분']);
  let feedback = ss.getSheetByName('웹북 소감');
  if (!feedback) feedback = ss.insertSheet('웹북 소감');
  prepareSheet_(feedback, ['소감 ID','작성 일시 (한국)','별칭','소감','공개 여부','동의 버전']);
  feedback.setColumnWidth(4, 480);
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'deleteExpiredRequests')) {
    ScriptApp.newTrigger('deleteExpiredRequests').timeBased().everyDays(1).atHour(3).create();
  }
  console.log('관리자 전용 명단과 소감: ' + ss.getUrl());
}
function prepareSheet_(sheet, headers) {
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,headers.length).setBackground('#eeeeee').setFontWeight('bold');
  [310,170,120,240,250,110,120].slice(0,headers.length).forEach((w,i) => sheet.setColumnWidth(i+1,w));
}
function sheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id).getSheetByName(name) : null;
}
function reply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'feedback') return publicFeedback_(e.parameter);
    return reply_({ok:true,service:'questionschool-pdf-registration',feedback:!!sheet_('웹북 소감')});
  } catch (err) {
    return reply_({ok:false,error:'소감을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'});
  }
}
function valid_(s,max) {
  return typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max && !/[\x00-\x1f<>]/.test(s);
}
function plain_(s) {
  s = s.trim();
  return /^[=+\-@]/.test(s) ? "'"+s : s;
}
function date_(value) {
  return value instanceof Date ? value.getTime() : Date.parse(String(value).replace(' ','T')+'+09:00');
}
function existingRow_(sheet,id) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const match = sheet.getRange(2,1,last-1,1).createTextFinder(id).matchEntireCell(true).findNext();
  return match ? sheet.getRange(match.getRow(),1,1,sheet.getLastColumn()).getValues()[0] : null;
}
function rateKey_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text));
}
function limited_(key,limit) {
  const cache = CacheService.getScriptCache();
  return Number(cache.get(key)||0) >= limit;
}
function count_(key,ttl) {
  const cache = CacheService.getScriptCache();
  cache.put(key,String(Number(cache.get(key)||0)+1),ttl);
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 9000) return reply_({ok:false,error:'입력 내용을 확인해 주세요.'});
    const v = JSON.parse(raw);
    if (v.website || v.consent !== true || !/^[-a-zA-Z0-9]{20,60}$/.test(v.requestId||'')) {
      return reply_({ok:false,error:'입력 내용과 수집 동의를 확인해 주세요.'});
    }
    if (!lock.tryLock(15000)) return reply_({ok:false,error:'요청이 많습니다. 잠시 뒤 다시 시도해 주세요.'});
    return v.action === 'feedback' ? saveFeedback_(v) : savePdf_(v);
  } catch (err) {
    return reply_({ok:false,error:'저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
function savePdf_(v) {
  if (!valid_(v.name,60) || !valid_(v.affiliation,120) || !valid_(v.email,254) || !/^\S+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    return reply_({ok:false,error:'이름, 소속, 이메일을 확인해 주세요.'});
  }
  const sheet = sheet_('PDF 신청 명단');
  if (!sheet) return reply_({ok:false,error:'관리자 계정에서 setup을 실행해 주세요.'});
  if (existingRow_(sheet,v.requestId)) return reply_({ok:true});
  const key = 'pdf-'+rateKey_(v.email.trim().toLowerCase());
  const minute = 'pdf-minute-'+Math.floor(Date.now()/60000);
  if (limited_(key,5) || limited_(minute,40)) return reply_({ok:false,error:'신청이 많습니다. 잠시 뒤 다시 시도해 주세요.'});
  sheet.appendRow([v.requestId,Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss'),plain_(v.name),plain_(v.affiliation),plain_(v.email),'2026-11-07','일반 신청']);
  SpreadsheetApp.flush();
  count_(key,3600);count_(minute,120);
  return reply_({ok:true});
}
function saveFeedback_(v) {
  if (!valid_(v.nickname,30) || typeof v.message !== 'string' || v.message.trim().length < 2 || v.message.trim().length > 1500 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v.message) || !['public','private'].includes(v.visibility)) {
    return reply_({ok:false,error:'별칭, 소감, 공개 여부를 확인해 주세요.'});
  }
  const sheet = sheet_('웹북 소감');
  if (!sheet) return reply_({ok:false,error:'소감 기능을 준비 중입니다. 잠시 뒤 다시 시도해 주세요.'});
  const nickname = v.nickname.trim(), message = v.message.trim();
  const previous = existingRow_(sheet,v.requestId);
  if (previous) {
    if (String(previous[2])!==nickname || String(previous[3])!==message || previous[4]!==v.visibility) return reply_({ok:false,error:'이전 요청과 내용이 다릅니다. 화면을 새로고침한 뒤 다시 남겨 주세요.'});
    return reply_({ok:true,visibility:previous[4]});
  }
  const key = 'feedback-'+rateKey_(nickname);
  const minute = 'feedback-minute-'+Math.floor(Date.now()/60000);
  if (limited_(key,5) || limited_(minute,30)) return reply_({ok:false,error:'소감이 여러 번 접수되었습니다. 잠시 뒤 다시 시도해 주세요.'});
  sheet.appendRow([v.requestId,new Date(),plain_(nickname),plain_(message),v.visibility,'2026-11-07']);
  sheet.getRange(sheet.getLastRow(),2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  SpreadsheetApp.flush();
  count_(key,3600);count_(minute,120);
  return reply_({ok:true,visibility:v.visibility});
}
function publicFeedback_(parameters) {
  const sheet = sheet_('웹북 소감');
  if (!sheet) return reply_({ok:true,feedback:false,items:[],nextBefore:0});
  const last = sheet.getLastRow();
  const limit = Math.min(20,Math.max(1,Math.floor(Number(parameters.limit)||12)));
  let end = Math.min(last,Math.floor(Number(parameters.before)||last+1)-1);
  if (!Number.isFinite(end) || end < 2) return reply_({ok:true,feedback:true,items:[],nextBefore:0});
  const items = [], cutoff = Date.now()-365*86400000;
  let next = 0;
  while (end >= 2 && items.length < limit) {
    const start = Math.max(2,end-99);
    const rows = sheet.getRange(start,1,end-start+1,6).getValues();
    for (let i=rows.length-1;i>=0;i--) {
      const row = rows[i], time = date_(row[1]);
      // Only explicitly public records may leave the administrator spreadsheet.
      if (row[4] !== 'public' || !Number.isFinite(time) || time < cutoff) continue;
      items.push({id:String(row[0]),nickname:String(row[2]),message:String(row[3]),date:Utilities.formatDate(new Date(time),'Asia/Seoul','yyyy.MM.dd')});
      if (items.length === limit) {next = start+i > 2 ? start+i : 0;break;}
    }
    end = start-1;
  }
  return reply_({ok:true,feedback:true,items:items,nextBefore:next});
}
function deleteExpiredRequests() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const cutoff = Date.now()-365*86400000;
    ['PDF 신청 명단','웹북 소감'].forEach(name => {
      const sheet = sheet_(name);
      if (!sheet || sheet.getLastRow()<2) return;
      const dates = sheet.getRange(2,2,sheet.getLastRow()-1,1).getValues();
      for(let i=dates.length-1;i>=0;i--) {
        const time = date_(dates[i][0]);
        if(Number.isFinite(time) && time < cutoff) sheet.deleteRow(i+2);
      }
    });
  } finally {lock.releaseLock();}
}
