/** Run setup once as the owner, then deploy as a Web app: Execute as Me / Anyone. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('질문수업 웹북 · PDF 신청 명단');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  var sheet = ss.getSheetByName('PDF 신청 명단');
  if (!sheet) {
    var first = ss.getSheets()[0];
    sheet = first.getLastRow() === 0 ? first.setName('PDF 신청 명단') : ss.insertSheet('PDF 신청 명단');
  }
  if (sheet.getLastRow() === 0) sheet.appendRow(['신청 ID','신청 일시 (한국)','이름','소속','이메일','동의 버전','구분']);
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,7).setBackground('#eeeeee').setFontWeight('bold');
  [310,170,120,240,250,110,120].forEach(function(w,i){sheet.setColumnWidth(i+1,w);});
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  if (!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='deleteExpiredRequests';})) ScriptApp.newTrigger('deleteExpiredRequests').timeBased().everyDays(1).atHour(3).create();
  console.log('관리자 전용 신청 명단: '+ss.getUrl());
}
function reply_(v) { return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return reply_({ok:true, service:'questionschool-pdf-registration'}); }
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw=e && e.postData && e.postData.contents;
    if (!raw || raw.length>4096) return reply_({ok:false,error:'입력 내용을 확인해 주세요.'});
    var v=JSON.parse(raw);
    function valid(s,max){return typeof s==='string' && s.trim().length>0 && s.trim().length<=max && !/[\x00-\x1f<>]/.test(s);}
    if(v.website || v.consent!==true || !valid(v.name,60) || !valid(v.affiliation,120) || !valid(v.email,254) || !/^\S+@[^\s@]+\.[^\s@]+$/.test(v.email) || !/^[-a-zA-Z0-9]{20,60}$/.test(v.requestId || '')) return reply_({ok:false,error:'이름, 소속, 이메일과 동의를 확인해 주세요.'});
    var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if(!id) return reply_({ok:false,error:'신청 저장소를 준비 중입니다. 관리자에게 문의해 주세요.'});
    if(!lock.tryLock(15000))return reply_({ok:false,error:'신청이 많습니다. 잠시 뒤 다시 시도해 주세요.'});
    var sheet=SpreadsheetApp.openById(id).getSheetByName('PDF 신청 명단');
    var last=sheet.getLastRow();
    if(last>1 && sheet.getRange(2,1,last-1,1).createTextFinder(v.requestId).matchEntireCell(true).findNext()) return reply_({ok:true});
    var cache=CacheService.getScriptCache();
    var key=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,v.email.trim().toLowerCase()));
    var count=Number(cache.get(key)||0);if(count>=5)return reply_({ok:false,error:'신청이 많습니다. 한 시간 뒤 다시 시도해 주세요.'});
    var minuteKey='minute-'+Math.floor(Date.now()/60000),total=Number(cache.get(minuteKey)||0);
    if(total>=40)return reply_({ok:false,error:'신청이 많습니다. 잠시 뒤 다시 시도해 주세요.'});
    function plain(s){s=s.trim();return /^[=+\-@]/.test(s)?"'"+s:s;}
    sheet.appendRow([v.requestId,Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss'),plain(v.name),plain(v.affiliation),plain(v.email),'2026-11-07','일반 신청']);
    SpreadsheetApp.flush();
    cache.put(key,String(count+1),3600);cache.put(minuteKey,String(total+1),120);
    return reply_({ok:true});
  } catch(err) { return reply_({ok:false,error:'신청을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'}); }
  finally { if(lock.hasLock())lock.releaseLock(); }
}
function deleteExpiredRequests() {
  var lock=LockService.getScriptLock();if(!lock.tryLock(15000))return;
  try {
    var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)return;
    var sheet=SpreadsheetApp.openById(id).getSheetByName('PDF 신청 명단'),last=sheet.getLastRow();if(last<2)return;
    var dates=sheet.getRange(2,2,last-1,1).getValues(),cutoff=Date.now()-365*86400000;
    for(var i=dates.length-1;i>=0;i--){var v=dates[i][0];var time=v instanceof Date?v.getTime():Date.parse(String(v).replace(' ','T')+'+09:00');if(Number.isFinite(time)&&time<cutoff)sheet.deleteRow(i+2);}
  } finally {lock.releaseLock();}
}
