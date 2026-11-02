const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync(__dirname+'/index.html','utf8');
for(const forbidden of ['execute_sql','window.claude','sample.json','db.doc(','db.collection(','docs.google.com/document/']) assert(!s.includes(forbidden),`Unsupported/private client dependency remains: ${forbidden}`);
assert(!/\b(?:sk-(?:ant-|proj-)?|sb_secret_)[A-Za-z0-9_-]{15,}/.test(s),'Private provider credential');
for(const token of s.match(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]) {
 const p=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());assert.equal(p.role,'anon','Only existing public anon credentials allowed in browser');
}
for(const label of ['Отбор','Источники','Робот','Справочники и правила','Инструкции','Особенности программы'])assert(s.includes(label),`Missing original/current UI label: ${label}`);
assert(s.includes('<header class="top">'),'Must preserve actual top navigation');
for(const fn of ['home','pickView','robotView','evCardLive','loadPlCard','sources','docs'])assert(new RegExp('function\\s+'+fn+'\\s*\\(').test(s),`Missing original view: ${fn}`);
for(const op of ['events_card','events_refs','events_save','events_registry','places_card','places_save','robot_screen','showcase_pick'])assert(s.includes('"'+op+'"'),`Missing typed operation: ${op}`);
console.log('PASS public-source sanitation and current-version structural checks; not browser/runtime validation.');
