const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const begin=html.indexOf('let ECchg=false'),end=html.indexOf('/* справочник типов и жанров',begin);
const moduleSource=html.slice(begin,end);
const listeners={};let calls=[],fail=false,renderCount=0,replyOverride=null;
const catalog=[{code:'tribute',name:'Трибьют',is_active:true},{code:'choir',name:'Хор',is_active:true},{code:'solo_concert',name:'Сольный концерт',is_active:true},{code:'retired',name:'Старое',is_active:false}];
let card={id:'AFC-0765',title:'Test',cat:'Развлечения',direction:'Музыка',type:'Концерт',genre:null,language:null,age:null,status:'active',price_from:9000,price_to:50000,showcase:false,luxe:false,moods:[],fw:[],places:[],orgs:[],perfs:[],dates:[],dates_total:0,program_features:['tribute'],program_feature_details:[catalog[0]]};
const refs={cats:['Развлечения'],dirs:{Развлечения:['Музыка']},types:['Концерт'],genres:{Концерт:['Рок']},langs:['Русский'],ages:['12+'],program_features:catalog};
const clone=x=>JSON.parse(JSON.stringify(x));
const c=vm.createContext({console,Date,Intl,Map,Set,JSON,Math,setTimeout,clearTimeout,window:{confirm:()=>false,scrollTo(){},scrollY:0,addEventListener(){}},document:{addEventListener(k,fn){(listeners[k]??=[]).push(fn)},querySelector:()=>({textContent:''}),querySelectorAll:()=>[],getElementById:()=>null},requestAnimationFrame:fn=>fn(),S:{view:'evcard',arg:'AFC-0765'},$:(x)=>({classList:{remove(){}}}),go(){},render(){renderCount++},toast(){},TZ:'Asia/Almaty',esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),nf:x=>String(x),fmtT:()=>'',fmtD:()=>'',fmtDT:()=>'',whenTxt:()=>'',SRC_NAMES:{},MOOD:{},MOODS:[],FW:[],statsError:()=>'',bkErrText:e=>e.message||'error',ES:null,ERkey:null,async apiCall(op,args){calls.push({op,args});if(fail)throw {code:'upstream_error',message:'test failure'};if(replyOverride)return replyOverride(op,args);if(op==='events_refs')return clone(refs);if(op==='events_card')return clone(card);if(op==='events_save'){const p=clone(args.p);Object.assign(card,p.set||{});card.program_feature_details=catalog.filter(x=>card.program_features.includes(x.code));return {changed:1,card:clone(card)}}throw Error('unexpected typed operation')} });
vm.runInContext(moduleSource,c);
const run=x=>vm.runInContext(x,c),val=x=>clone(run(x));
(async()=>{
 await run(`loadEvCard('AFC-0765')`);assert.deepEqual(val('ED.program_features'),['tribute']);assert.equal(run('evDirty()'),false);
 run(`ED.program_features=['tribute','choir']`);assert.deepEqual(val('evPayload().set.program_features'),['choir','tribute']);assert.match(run('pfControl()'),/Трибьют, Хор/);assert(!run('pfControl()').includes('2 выбрано'));
 await run('evSave()');assert.deepEqual(card.program_features,['choir','tribute']);assert.equal(run('evDirty()'),false);
 await run(`loadEvCard('AFC-0765')`);assert.deepEqual(val('ED.program_features'),['choir','tribute']);
 run('ED.program_features=[]');await run('evSave()');assert.deepEqual(card.program_features,[]);
 run(`ED.title='Changed'`);assert(!('program_features' in val('evPayload().set')));await run('evSave()');
 run(`EC.program_features=undefined;ED=draftOf(EC);ED.title='Other'`);assert(!('program_features' in val('evPayload().set')));assert.match(run('pfControl()'),/недоступны/);
 run(`EC.program_features=['retired'];EC.program_feature_details=[{code:'retired',name:'Старое',is_active:false}];ED=draftOf(EC)`);assert.match(run('pfControl()'),/Старое/);assert.match(run('pfControl()'),/checked/);
 run(`ED.program_features=['choir']`);fail=true;await run('evSave()');assert.deepEqual(val('ED.program_features'),['choir']);assert.equal(run('ECsave'),false);assert.match(run('ECmsg'),/Не удалось подтвердить/);fail=false;
 const n=calls.length;await run('evSave({archive:true})');assert.equal(calls.length,n);assert.match(run('ECmsg'),/Сначала сохраните/);
 // Same-record refresh must not wipe a dirty form.
 await run(`loadEvCard('AFC-0765')`);assert.equal(calls.length,n);assert.deepEqual(val('ED.program_features'),['choir']);
 run(`EC.program_feature_details=[null]`);assert.equal(run('pfItems()'),null);assert(!('program_features' in val('evPayload().set||{}')));
 // Stale loads with the same id: only the newest response wins.
 run(`EC=null;ED=null;EF=null`);const pending=[];replyOverride=q=>new Promise(resolve=>pending.push({q,resolve}));const first=run(`loadEvCard('AFC-0765')`);const second=run(`loadEvCard('AFC-0765')`);
 pending[2].resolve({...clone(card),title:'New'});pending[3].resolve(clone(refs));await second;pending[0].resolve({...clone(card),title:'Stale'});pending[1].resolve(clone(refs));await first;assert.equal(run('EC.title'),'New');replyOverride=null;
 // Type changes must not silently replace or remove existing genre.
 run(`ED.genre='Unknown genre'`);const event={target:{dataset:{ed:'type'},tagName:'SELECT',type:'select-one',value:'Другой тип'}};for(const h of listeners.change||[])h(event);assert.equal(run('ED.genre'),'Unknown genre');
 run(`ED=draftOf(EC);ED.program_features=['solo_concert']`);replyOverride=async()=>({changed:1,card:{...clone(card),program_features:[]}});await run('evSave()');assert.deepEqual(val('ED.program_features'),['solo_concert']);assert.match(run('ECmsg'),/Не удалось подтвердить/);replyOverride=null;
 // Existing topnav and all views remain, and actual livecard positions are adjacent.
 const live=html.slice(html.indexOf('function evCardLive'),html.indexOf('document.addEventListener("input",ev=>{const t=ev.target;if(!ED'));
 assert(live.indexOf('selF("genre"')<live.indexOf('fld("Особенности программы"'));
 assert(live.indexOf('fld("Особенности программы"')<live.indexOf('selF("language"'));
 assert(live.includes('class="ec-lower"'));assert(html.includes('class="topin"'));assert(html.includes('async function apiCall('));
 console.log('PASS: 15 correct-source mock scenarios; no original transport/network executed');
})().catch(e=>{console.error(e);process.exitCode=1});
