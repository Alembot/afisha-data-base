const fs=require('node:fs'); const vm=require('node:vm'); const {stripTypeScriptTypes}=require('node:module');const assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../supabase/functions/program-features-admin/index.ts','utf8');
const code=stripTypeScriptTypes(source.replace(/^import .*server-policy.*\n/m,'').split('\nDeno.serve(')[0].replace('export function','function'))+'\nglobalThis.createHandler=createHandler;';
const ctx={Request,Response,TextDecoder,Uint8Array,Set,fetch};vm.createContext(ctx);new vm.Script(code).runInContext(ctx);
const owner='11111111-1111-4111-8111-111111111111', event='22222222-2222-4222-8222-222222222222';
const settings={url:'https://project.supabase.co',serviceKey:'test-server-secret',allowedUserIds:[owner]};
const catalog=[{code:'tribute',name:'Трибьют',is_active:true,description:'not needed'}];
const card={program_features:['tribute'],program_feature_details:[{code:'tribute',name:'Трибьют',is_active:true}],title:'PRIVATE MUST NOT RETURN',history:['PRIVATE']};
let checks=0;
const ok=(x)=>{assert.ok(x);checks++};
function request(body={action:'read',event_id:event},options={}) {return new Request('https://edge.test',{method:options.method||'POST',headers:{origin:options.origin||'https://alembot.github.io',authorization:'Bearer user-token','content-type':'application/json',...options.headers},...((options.method==='OPTIONS'||options.method==='GET')?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
function backend(options={}) {const calls=[];const f=async(url,init)=>{calls.push({url,init});if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify(options.user||{id:owner,email_confirmed_at:'2026-01-01',is_anonymous:false}),{status:options.authStatus||200}); if(url.includes('/events?'))return Response.json(options.events||[{public_id:'AFC-0765'}]);if(url.endsWith('/events_refs'))return Response.json({program_features:options.catalog||catalog});if(url.endsWith('/events_save'))return options.saveError?Response.json({code:'22023',message:'private database detail'},{status:400}):Response.json({changed:1,card});if(url.endsWith('/events_card'))return Response.json(card);throw Error('unexpected URL')};return {f,calls};}
(async()=>{
 for(const [req,status] of [[request({}, {origin:'https://evil.example'}),403],[request({}, {method:'GET'}),405],[request({}, {headers:{authorization:''}}),401],[request({}, {headers:{'content-type':'text/plain'}}),415],[request('not json'),400],[request({action:'read',event_id:'bad'}),400],[request({action:'save',event_id:event,program_features:null}),400],[request({action:'save',event_id:event,program_features:[4]}),400],[request({action:'save',event_id:event,program_features:[],sql:'DROP TABLE'}),400],[request(' '.repeat(8193)),413]]) {
  const b=backend(); const r=await ctx.createHandler(settings,b.f)(req);ok(r.status===status);ok(b.calls.length===0);
 }
 for(const opts of [{authStatus:401},{user:{id:'other',email_confirmed_at:'yes'}},{user:{id:owner}},{user:{id:owner,email_confirmed_at:'yes',is_anonymous:true}}]){const b=backend(opts);const r=await ctx.createHandler(settings,b.f)(request());ok(r.status===401||r.status===403);ok(b.calls.length===1);}
 const noAllow=backend();ok((await ctx.createHandler({...settings,allowedUserIds:[]},noAllow.f)(request())).status===403);
 const b=backend();const r=await ctx.createHandler(settings,b.f)(request());const out=await r.json();ok(r.status===200);ok(out.catalog[0].code==='tribute');ok(!JSON.stringify(out).includes('PRIVATE'));ok(r.headers.get('cache-control')==='no-store');ok(b.calls[0].init.headers.authorization==='Bearer user-token');ok(b.calls.slice(1).every(c=>c.init.headers.authorization==='Bearer test-server-secret'));ok(!JSON.stringify(out).includes('secret'));
 const save=backend();const sr=await ctx.createHandler(settings,save.f)(request({action:'save',event_id:event,program_features:[]}));ok(sr.status===200);const saveArgs=JSON.parse(save.calls.at(-1).init.body);assert.deepEqual(saveArgs,{p:{id:'AFC-0765',set:{program_features:[]}}});checks++;
 const err=backend({saveError:true});const er=await ctx.createHandler(settings,err.f)(request({action:'save',event_id:event,program_features:['unknown']}));ok(er.status===422);ok(!(await er.text()).includes('private'));
 const empty=backend({catalog:[]});ok((await ctx.createHandler(settings,empty.f)(request())).status===503);
 const pre=await ctx.createHandler(settings,backend().f)(request({}, {method:'OPTIONS'}));ok(pre.status===204);ok(pre.headers.get('access-control-allow-origin')==='https://alembot.github.io');
 console.log(`PASS ${checks} mocked auth/input/narrow-read/save/CORS assertions. Actual allowed-user login not tested; no user JWT supplied.`);
})().catch(e=>{console.error(e);process.exitCode=1});
