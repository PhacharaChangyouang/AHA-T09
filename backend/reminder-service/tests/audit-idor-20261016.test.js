const jwt=require('jsonwebtoken'),request=require('supertest');
process.env.JWT_SECRET='audit-jwt-test-secret-only';process.env.AUTH_SERVICE_URL='http://auth.test';process.env.INTERNAL_API_KEY='audit-internal-test-only';
jest.mock('../src/config/db',()=>({query:jest.fn()}));
const pool=require('../src/config/db'),app=require('../src/server');
const uid='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const token=jwt.sign({id:uid,role:'caregiver'},process.env.JWT_SECRET,{issuer:'aha-auth-service',audience:'aha-api',expiresIn:60});
let businessFetch;
beforeEach(()=>{pool.query.mockReset();businessFetch=jest.fn(async()=>({ok:true,json:async()=>({data:[]})}));global.fetch=jest.fn((url,...args)=>String(url).endsWith('/auth/internal/session')?Promise.resolve({ok:true,json:async()=>({active:true})}):businessFetch(url,...args));});
test('unlinked caregiver cannot create medication',async()=>{
 const r=await request(app).post('/api/caregiver/reminders').set('Authorization',`Bearer ${token}`).send({elderly_user_id:other,medicine_name:'audit',reminder_time:'01:11'});
 expect(r.status).toBe(403);expect(pool.query).not.toHaveBeenCalled();
});
test('unlinked caregiver cannot delete medication',async()=>{
 pool.query.mockResolvedValueOnce({rowCount:1,rows:[{id:rid,user_id:other}]});
 const r=await request(app).delete('/api/caregiver/reminders/'+rid).set('Authorization',`Bearer ${token}`);
 expect(r.status).toBe(403);expect(pool.query).toHaveBeenCalledTimes(1);expect(pool.query.mock.calls[0][0]).toMatch(/^SELECT/);
});
test('caregiver summary selects only linked elderly ids',async()=>{
 businessFetch.mockResolvedValueOnce({ok:true,json:async()=>({data:[{user_id:other}]})});
 pool.query.mockResolvedValue({rows:[],rowCount:0});
 const r=await request(app).get('/api/caregiver/summary').set('Authorization',`Bearer ${token}`);
 expect(r.status).toBe(200);expect(pool.query).toHaveBeenCalledTimes(2);
 for(const [sql,args] of pool.query.mock.calls){expect(sql).toMatch(/ANY\(\$1::uuid\[\]\)/);expect(args).toEqual([[other]]);}
});
test.each(['get','put','delete'])('personal %s reminder endpoint scopes access to authenticated owner',async(method)=>{
 pool.query.mockResolvedValue({rowCount:0,rows:[]});
 const r=await request(app)[method]('/api/reminders/'+rid+'?user_id='+other).set('Authorization',`Bearer ${token}`).send(method==='put'?{reminder_time:'01:11'}:{});
 expect(r.status).toBe(404);expect(pool.query).toHaveBeenCalledTimes(1);
 const [sql,args]=pool.query.mock.calls[0];expect(sql).toMatch(/user_id\s*=\s*\$\d+/);expect(args).toContain(uid);expect(args).not.toContain(other);
});
