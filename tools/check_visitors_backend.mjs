import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
let now='2026-11-07T14:59:00Z',locked=false;const props=new Map([['SPREADSHEET_ID','private']]),sheets={};
class Clock extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return new Date(now).getTime();}}
class Sheet{constructor(){this.rows=[];}getLastRow(){return this.rows.length;}appendRow(r){this.rows.push(r);return this;}setFrozenRows(){}deleteRows(start,n){this.rows.splice(start-1,n);}getRange(r,c,n=1,m=1){return{getValues:()=>this.rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+m)),createTextFinder:value=>({matchEntireCell(){return this;},findNext:()=>{const i=this.rows.findIndex((x,j)=>j>=r-1&&j<r-1+n&&x[c-1]===value);return i<0?null:{getRow:()=>i+1};}})};}}
const ctx={Date:Clock,ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},hasLock:()=>locked,releaseLock:()=>locked=false})},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]=new Sheet()}),flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:1},computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),formatDate:d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../backend/google-apps-script/Code.gs',import.meta.url),'utf8'),ctx);
const get=()=>ctx.doGet({parameter:{action:'visitorStats'}}),visit=id=>ctx.doPost({postData:{contents:JSON.stringify({action:'visit',visitorId:id})}});
assert.equal(get().total,0);assert.equal(Object.keys(sheets).length,0);
assert.equal(visit('bad').ok,false);assert.equal(Object.keys(sheets).length,0);
const a=crypto.randomUUID(),b=crypto.randomUUID();
assert.equal(visit(a).total,1);assert.equal(visit(a).total,1);assert.equal(visit(a).daily,1);
assert.equal(visit(b).total,2);assert.equal(get().daily,2);assert.equal(locked,false);
assert(!JSON.stringify(sheets).includes(a));assert(!JSON.stringify(sheets).includes(b));const hash=sheets['웹북 방문 통계'].rows[1][1];
now='2026-11-07T15:01:00Z';assert.equal(get().daily,0);assert.equal(get().total,2);
assert.equal(visit(a).total,3);assert.equal(get().daily,1);assert.equal(sheets['웹북 방문 통계'].rows.length,2);assert.notEqual(hash,sheets['웹북 방문 통계'].rows[1][1]);assert.equal(visit(a).total,3);
assert(!JSON.stringify(get()).includes('hash'));assert.equal(Object.keys(sheets).length,1);
console.log('PASS: daily dedup, KST midnight, aggregate retention, old-hash removal, no raw IDs, invalid-input rejection, lock release');
