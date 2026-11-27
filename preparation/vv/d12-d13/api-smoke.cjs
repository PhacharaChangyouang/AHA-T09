'use strict';
// Draft executable HTTP checks; run only through seed.py api <generated project>.
// JSON is a valid YAML subset. This deliberately uses a fixed internal origin.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const contract=JSON.parse(fs.readFileSync(path.join(__dirname,'openapi.yaml'),'utf8'));
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
const users=Object.fromEntries(fixture.users.map(u=>[u.key,u]));
const password=process.env.AHA_FIXTURE_PASSWORD;
const base='http://api-gateway';
if(!/^FixtureAa1[0-9a-f]{32}$/.test(password||'')||contract.servers[0].url!==base) throw Error('Synthetic fixture only');
let fails=0, passes=0;
const tokens={};
const refreshTokens={};
async function http(method,template,{id,token,body}={}){
  const url=base+template.replace('{id}',encodeURIComponent(id||''));
  const r=await fetch(url,{method,redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>null);
  return {status:r.status,data};
}
async function expect(method,template,status,options,check){
  const op=contract.paths[template]?.[method.toLowerCase()];
  assert.ok(op?.responses[String(status)],'Expected status absent from draft contract');
  const r=await http(method,template,options);
  if(r.status!==status) throw Error('HTTP expected '+status+' actual '+r.status);
  if(!r.data||typeof r.data.success!=='boolean') throw Error('Missing response envelope');
  assert.equal(r.data.success,status<400,'Incorrect success flag');
  if(check) check(r.data);
  return r.data;
}
async function test(id,fn){
  try{await fn();passes++;console.log(id+' PASS');}
  catch(e){fails++;console.log(id+' FAIL '+(e.message?.startsWith('HTTP expected ')?e.message:'assertion or transport failure'));}
}
async function ready(){
  for(let n=0;n<60;n++){
    try{
      const all=await Promise.all(['auth-service:3001','reminder-service:3002','notification-service:3003'].map(h=>fetch('http://'+h+'/health',{redirect:'error',signal:AbortSignal.timeout(2000)})));
      if(all.every(r=>r.ok))return;
    }catch{}
    await new Promise(r=>setTimeout(r,1000));
  }
  throw Error('Services not ready');
}
function token(k){if(!tokens[k])throw Error('Login prerequisite missing');return tokens[k];}
async function main(){
  await ready();
  for(const k of ['E01','E02','C01','C02','C03']){
    await test('AUTH-'+k,async()=>{
      const data=await expect('POST','/auth/login-password',200,{body:{identifier:users[k].username,password}},d=>{
        assert.equal(d.user.id,users[k].id);assert.equal(typeof d.accessToken,'string');assert.ok(d.accessToken);
      });tokens[k]=data.accessToken;refreshTokens[k]=data.refreshToken;
    });
  }
  await test('AUTH-NEG',()=>expect('POST','/auth/login-password',401,{body:{identifier:users.E01.username,password:'WrongFixtureAa1234'}}));
  await test('REM-NOAUTH',()=>expect('GET','/api/reminders',401,{}));
  await test('REM-OWN',()=>expect('GET','/api/reminders',200,{token:token('E01')},d=>{
    assert.deepEqual(d.data.map(x=>x.id).sort(),fixture.reminders.filter(x=>x.user_id===users.E01.id).map(x=>x.id).sort());
  }));
  await test('REM-IDOR',()=>expect('GET','/api/reminders/{id}',404,{id:fixture.reminders[0].id,token:token('E02')}));
  for(const time of ['24:00','12:60'])await test('REM-BVA-'+time,()=>expect('POST','/api/reminders',400,{token:token('E01'),body:{medicine_name:'FIXTURE-INVALID',reminder_time:time}}));
  await test('REM-CRUD',async()=>{
    let id;
    try{
      const d=await expect('POST','/api/reminders',201,{token:token('E01'),body:{medicine_name:'FIXTURE-CRUD',reminder_time:'00:00',is_active:false}});
      id=d.data.id;assert.ok(id);
      await expect('GET','/api/reminders/{id}',200,{id,token:token('E01')},r=>assert.equal(r.data.medicine_name,'FIXTURE-CRUD'));
      await expect('GET','/api/reminders/{id}',404,{id,token:token('E02')});
    }finally{if(id)await expect('DELETE','/api/reminders/{id}',200,{id,token:token('E01')});}
  });
  await test('CARE-LINKED',()=>expect('GET','/api/caregiver/summary',200,{token:token('C01')},d=>assert.deepEqual(d.data.elderly.map(x=>x.user_id),[users.E01.id])));
  await test('CARE-PENDING',()=>expect('GET','/api/caregiver/summary',200,{token:token('C03')},d=>assert.deepEqual(d.data.elderly,[])));
  await test('CARE-ROLE',()=>expect('GET','/api/caregiver/summary',403,{token:token('E01')}));
  await test('CARE-IDOR',()=>expect('POST','/api/caregiver/reminders',403,{token:token('C02'),body:{elderly_user_id:users.E01.id,medicine_name:'FIXTURE-DENY',reminder_time:'08:00'}}));
  await test('NOTIFY-OWN',()=>expect('GET','/api/notifications/{id}',200,{id:fixture.notifications[0].id,token:token('E01')},d=>assert.equal(d.data.id,fixture.notifications[0].id)));
  await test('NOTIFY-IDOR',()=>expect('GET','/api/notifications/{id}',404,{id:fixture.notifications[0].id,token:token('E02')}));
  await test('NOTIFY-SPOOF',()=>expect('POST','/api/notifications',403,{token:token('E01'),body:{type:'emergency',title:'Synthetic',message:'Synthetic'}}));
  await test('SOS-LOCATION',()=>expect('POST','/api/notifications/emergency',400,{token:token('E01'),body:{message:'Synthetic only',latitude:0,longitude:0}},d=>assert.equal(d.code,'ACADEMIC_LOCATION_DISABLED')));
  await test('PUSH-DISABLED',()=>expect('POST','/api/push/subscribe',503,{token:token('E01'),body:{}}));
  // Adapted academic regression cases from the previously established test
  // design. Use only a fresh synthetic Compose project per run.
  await test('CARE-LINKED-B',()=>expect('GET','/api/caregiver/summary',200,{token:token('C02')},d=>{
    assert.deepEqual(d.data.elderly.map(x=>x.user_id),[users.E02.id]);
  }));
  await test('CARE-DENIED-EDIT',()=>expect('PUT','/api/caregiver/reminders/{id}',403,{
    token:token('C02'),id:fixture.reminders[0].id,body:{medicine_name:'FIXTURE-UNAUTHORIZED'}
  }));
  await test('CARE-DENIED-DELETE',async()=>{
    await expect('DELETE','/api/caregiver/reminders/{id}',403,{token:token('C02'),id:fixture.reminders[0].id});
    await expect('GET','/api/reminders/{id}',200,{token:token('E01'),id:fixture.reminders[0].id},d=>{
      assert.equal(d.data.medicine_name,fixture.reminders[0].medicine_name);
      assert.equal(String(d.data.reminder_time).slice(0,5),fixture.reminders[0].reminder_time);
    });
  });
  await test('SOS-LOCAL-RECIPIENT',async()=>{
    const marker='FIXTURE-SOS-'+require('node:crypto').randomUUID();
    const d=await expect('POST','/api/notifications/emergency',201,{token:token('E01'),body:{message:marker}},r=>{
      assert.equal(r.recipients,1);assert.equal(r.notified,1);
      assert.equal(r.pushProviderAccepted,0);assert.equal(r.deviceReceiptConfirmed,false);
      assert.equal(r.data.length,1);assert.equal(r.data[0].user_id,users.C01.id);
    });
    const id=d.data[0].id;
    await expect('GET','/api/notifications/{id}',200,{token:token('C01'),id},r=>assert.ok(r.data.message.includes(marker)));
    for(const k of ['C02','C03','E01'])await expect('GET','/api/notifications/{id}',404,{token:token(k),id});
  });
  await test('PUSH-STATUS',()=>expect('GET','/api/push/status',200,{token:token('E01')},d=>{
    assert.equal(d.configured,false);assert.equal(d.subscribed,false);
  }));
  await test('CARE-REVOKE-DENIED',()=>expect('DELETE','/family/connections/{id}',404,{
    token:token('C02'),id:fixture.links[0].id
  }));
  await test('CARE-REVOKE',async()=>{
    await expect('DELETE','/family/connections/{id}',200,{token:token('E01'),id:fixture.links[0].id});
    await expect('GET','/api/caregiver/summary',200,{token:token('C01')},d=>assert.deepEqual(d.data.elderly,[]));
    await expect('POST','/api/caregiver/reminders',403,{token:token('C01'),body:{
      elderly_user_id:users.E01.id,medicine_name:'FIXTURE-REVOKED',reminder_time:'08:00'
    }});
    await expect('POST','/api/notifications/emergency',404,{token:token('E01'),body:{message:'FIXTURE-NO-RECIPIENT'}},d=>{
      assert.equal(d.code,'NO_ACCEPTED_FAMILY_CONNECTION');
    });
  });
  await test('SESSION-LOGOUT',async()=>{
    assert.ok(refreshTokens.C03);
    await expect('POST','/auth/logout',200,{body:{refreshToken:refreshTokens.C03,accessToken:token('C03')}});
    await expect('GET','/api/caregiver/summary',401,{token:token('C03')});
    await expect('GET','/api/caregiver/summary',200,{token:token('C02')},d=>assert.deepEqual(d.data.elderly.map(x=>x.user_id),[users.E02.id]));
  });
  console.log('HTTP cases: passed='+passes+' failed='+fails+' (draft subset, not full D13)');
  if(fails)process.exitCode=1;
}
main().catch(()=>{console.error('HTTP suite setup failed; no pass claim');process.exitCode=1;});
