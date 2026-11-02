const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const start=html.indexOf('async function apiCall('),end=html.indexOf('async function startSession',start);
let confirm=true,calls=[],reply={data:{ok:true},error:null};
const c=vm.createContext({AUTH_ID:'owner',AUTH_EPOCH:1,AUTH_LOCKED:false,window:{confirm:()=>confirm},sb:{functions:{async invoke(name,p){calls.push({name,...p});return typeof reply==='function'?reply():reply}}},Error,String});vm.runInContext(html.slice(start,end),c);
const call=(op,args={})=>c.apiCall(op,args);
(async()=>{
 await call('events_card',{p_id:'AFC-0765'});assert.equal(calls.at(-1).name,'afisha-admin');assert.equal(calls.at(-1).body.args.p_id,'AFC-0765');assert(!('confirm' in calls.at(-1).body));
 for(const [op,args] of [['events_save',{p:{id:'AFC-0765',archive:true}}],['places_save',{p:{id:'p',action:'archive'}}],['sources_archive',{id:'x'}],['reference_book_delete',{p_id:'x'}],['robot_run',{p_key:'x'}],['venue_source_remove',{p_src:1}]]){await call(op,args);assert.equal(calls.at(-1).body.confirm,true)}
 confirm=false;const n=calls.length;await assert.rejects(call('sources_archive',{id:'x'}),/отменено/);assert.equal(calls.length,n);confirm=true;
 await call('events_save',{p:{id:'x',set:{program_features:['choir','tribute']}}});assert(!('confirm' in calls.at(-1).body));assert.equal(calls.at(-1).body.args.p.set.program_features.join(','),'choir,tribute');
 c.AUTH_ID=null;await assert.rejects(call('bootstrap'),/Сессия/);c.AUTH_ID='owner';
 reply={error:{message:'sensitive database detail'},data:null};await assert.rejects(call('bootstrap'),e=>!e.message.includes('sensitive'));
 reply=()=>new Promise(resolve=>setTimeout(()=>{c.AUTH_EPOCH++;resolve({data:{ok:true}})},1));await assert.rejects(call('events_card',{p_id:'x'}),/изменилась/);
 for(const forbidden of ['window.claude','execute_sql','db.doc(','docs.google.com','sample.json','select public.'])assert(!html.includes(forbidden),forbidden);
 assert(html.includes('function initApp(BOOT)'));assert(html.includes('await apiCall("bootstrap",{})'));assert(html.includes('if(!boot?.config)throw'));assert(html.includes('if(view==="event")view="evcard"'));assert(html.includes('if(view==="place")view="plcard"'));
 console.log('PASS typed transport: 18 assertions incl critical confirm, cancellation, feature payload, auth/stale response, error redaction; mocks only');
})().catch(e=>{console.error(e);process.exitCode=1});
