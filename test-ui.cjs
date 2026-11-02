const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const code=html.slice(html.indexOf('const SUPA_URL='),html.lastIndexOf('</script>'));
let network=[],writes=[],featureError=false,legacyError=false;
let dbFeatures=['tribute'];
const catalog=[{code:'tribute',name:'Трибьют',is_active:true},{code:'choir',name:'Хор',is_active:true},{code:'retired',name:'Старое',is_active:false}];
const result=()=>({catalog,program_features:[...dbFeatures],program_feature_details:catalog.filter(x=>dbFeatures.includes(x.code))});
const nodes=new Map();
function node(key){if(!nodes.has(key))nodes.set(key,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,inert:false,addEventListener(){},classList:{remove(){},toggle(){}},closest(){return null}});return nodes.get(key)}
const sb={functions:{async invoke(name,{body}){network.push({name,...body});if(featureError)return {error:new Error('blocked')};if(body.action==='save')dbFeatures=[...body.program_features];return {data:result(),error:null}}},auth:{onAuthStateChange(){},async signOut(){},async signInWithPassword(){}},from(table){let payload;const q={select(){return q},order(){return q},eq(){return q},range(){return q},update(v){payload=v;writes.push({table,payload});return q},insert(v){writes.push({table,payload:v});return q},delete(){return q},then(resolve,reject){return Promise.resolve({data:[],error:legacyError&&table==='events'?new Error('write rejected'):null}).then(resolve,reject)}};return q}};
const context=vm.createContext({console,Date,Intl,Map,Set,JSON,Number,String,Array,Boolean,URL,Promise,setTimeout,clearTimeout,setInterval,clearInterval,window:{supabase:{createClient:()=>sb},addEventListener(){},confirm:()=>false,scrollTo(){}},document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){}}});
vm.runInContext(code,context);
const run=src=>vm.runInContext(src,context);const val=src=>JSON.parse(JSON.stringify(run(src)));
const fields={f_cat:'Развлечения',f_type:'Концерт',f_genre:'',f_direction:'Музыка',f_language:'',f_luxe:'0',f_showcase:'0',f_age:'',f_meet:'',f_booking:'',f_free:'0',f_pfrom:'9000',f_pto:'50000',f_start:'',f_place:''};
Object.entries(fields).forEach(([k,v])=>node('#'+k).value=v);
run(`EV=[{id:'event-1',public_id:'AFB-0765',leisure_category_id:'cat-1',event_category:'Концерт',direction:'Музыка',genre:null,language:null,is_luxe:false,is_showcase:false,age_restriction:null,meeting_point:null,booking_url:null,is_free:false,price_from:9000,price_to:50000,moods:[],for_whom:[],pipeline_stage:4}];CATS=[{id:'cat-1',name:'Развлечения'}];S.view='event';S.arg='event-1';render=()=>{};loadEvents=async()=>{};toast=t=>{globalThis.lastToast=t};`);
(async()=>{
 await run(`loadFeatureState('event-1')`);
 assert.equal(run(`featureNames(FEATURE_STATE.get('event-1'))`),'Трибьют');
 run(`FEATURE_STATE.get('event-1').selected=['tribute','choir'];EVENT_DIRTY=true`);
 assert.equal(run(`featureNames(FEATURE_STATE.get('event-1'))`),'Трибьют, Хор');
 await run(`saveEvent('event-1')`);assert.deepEqual(dbFeatures,['choir','tribute']);assert.equal(run('EVENT_DIRTY'),false);assert.equal(run('EVENT_SAVING'),false);
 await run(`loadFeatureState('event-1')`);assert.deepEqual(val(`FEATURE_STATE.get('event-1').selected`),['choir','tribute']);
 run(`FEATURE_STATE.get('event-1').selected=[];EVENT_DIRTY=true`);await run(`saveEvent('event-1')`);assert.deepEqual(dbFeatures,[]);
 const requests=network.length;run(`FEATURE_STATE.set('event-1',{status:'error',error:'unavailable'});EVENT_DIRTY=true`);await run(`saveEvent('event-1')`);assert.equal(network.length,requests,'unrelated legacy save must not clear unloaded features');
 dbFeatures=['tribute'];await run(`loadFeatureState('event-1')`);run(`FEATURE_STATE.get('event-1').selected=['choir'];EVENT_DIRTY=true`);featureError=true;const writesBefore=writes.length;await run(`saveEvent('event-1')`);assert.equal(writes.length,writesBefore);assert.equal(run('EVENT_DIRTY'),true);assert.equal(run('EVENT_SAVING'),false);assert.deepEqual(val(`FEATURE_STATE.get('event-1').selected`),['choir']);
 featureError=false;legacyError=true;await run(`saveEvent('event-1')`);assert.match(run('lastToast'),/Особенности сохранены/);assert.deepEqual(dbFeatures,['choir']);assert.equal(run('EVENT_DIRTY'),true);legacyError=false;
 const n=network.length;await run(`saveEvent('event-1',{status:'archived'})`);assert.equal(network.length,n);assert.match(run('lastToast'),/Сначала сохраните/);
 run(`S.view='event';S.arg='event-1';EVENT_DIRTY=true`);await run('loadAll(false)');assert.equal(network.length,n);run(`go('home')`);assert.equal(run('S.view'),'event');
 run(`FEATURE_STATE.set('event-1',{status:'ready',catalog:[],details:[{code:'retired',name:'Старое',is_active:false}],original:['retired'],selected:['retired']})`);assert.match(run(`featureField('event-1')`),/Старое/);assert.match(run(`featureField('event-1')`),/checked/);
 run(`REFCATS=[{id:'types',code:'event_type'},{id:'genres',code:'event_genre'}];REFITEMS=[{id:'concert',catalog_id:'types',name:'Концерт'},{id:'play',catalog_id:'types',name:'Спектакль'},{catalog_id:'genres',parent_id:'concert',name:'Рок'},{catalog_id:'genres',parent_id:'play',name:'Драма'}]`);assert.deepEqual(val(`catalogNames('event_genre',EV[0])`),['Рок']);
 assert.equal((html.match(/id="f_age"/g)||[]).length,1);assert(!html.includes('sb.rpc('));assert(!html.includes('localStorage'));
 // Race: entering an event waits for the in-flight initial/poll load.
 run(`EVENT_DIRTY=false;S.view='events';LOADING_ALL=new Promise(resolve=>{globalThis.releasePoll=resolve})`);
 const navigation=run(`go('event','event-1')`);assert.equal(run('S.view'),'events');run(`releasePoll()`);await navigation;assert.equal(run('S.view'),'event');run(`LOADING_ALL=null`);
 // Race: logout/map-clear invalidates a pending read.
 run(`globalThis.realFeatureRequest=featureRequest;featureRequest=()=>new Promise(resolve=>{globalThis.releaseFeature=resolve});FEATURE_STATE.clear()`);
 const pending=run(`loadFeatureState('late-event')`);run(`FEATURE_STATE.clear();releaseFeature({catalog:[],program_features:[],program_feature_details:[]})`);await pending;assert.equal(run(`FEATURE_STATE.has('late-event')`),false);run(`featureRequest=realFeatureRequest`);
 assert.equal(run(`validFeatureResult({catalog:[],program_features:[],program_feature_details:[null]})`),false);
 assert.equal(run(`validFeatureResult({catalog:[],program_features:['missing'],program_feature_details:[]})`),false);
 run(`globalThis.realInvoke=sb.functions.invoke;sb.functions.invoke=async()=>({data:{catalog:[{code:'tribute',name:'Трибьют',is_active:true}],program_features:['tribute'],program_feature_details:[]}})`);
 await assert.rejects(run(`featureRequest('save','event-1',[])`),/не совпадает/);run(`sb.functions.invoke=realInvoke`);
 console.log('PASS 16 scenarios (including poll/read races and malformed/mismatched service replies): multi/save/reopen/clear/unloaded omission/feature error/partial error/stage guard/poll guard/navigation/inactive/genre filtering');
})().catch(err=>{console.error(err);process.exitCode=1});
