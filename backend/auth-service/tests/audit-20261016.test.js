process.env.JWT_SECRET = 'audit-access-test-only-123456789012345678901234567890';
process.env.JWT_REFRESH_SECRET = 'audit-refresh-test-only-123456789012345678901234567890';
jest.mock('../src/config/db', () => ({query:jest.fn(async()=>({rows:[],rowCount:0})),connect:jest.fn()}));
const pool=require('../src/config/db');
const model=require('../src/models/user.model');
const tokens=require('../src/services/token.service');
const jwt=require('jsonwebtoken');
const controller=require('../src/controllers/auth.controller');
const user={id:'11111111-1111-4111-8111-111111111111',role:'elderly'};
afterEach(()=>jest.restoreAllMocks());
test.each(["' OR '1'='1", "x'; DROP TABLE users;--", '<img src=x onerror=alert(1)>'])('credential input remains a bound SQL value: %s',async(value)=>{
 pool.query.mockClear();await model.findByCredentials(value);
 const [sql,args]=pool.query.mock.calls[0];expect(sql).not.toContain(value);expect(args).toEqual([value]);
});
test.each([{expiresIn:-30},{audience:'wrong'},{issuer:'wrong'},{algorithm:'HS384'}])('reject invalid JWT claims/signature policy %j',(override)=>{
 const token=jwt.sign(user,process.env.JWT_SECRET,{algorithm:'HS256',issuer:'aha-auth-service',audience:'aha-api',expiresIn:60,...override});
 expect(tokens.verifyAccessToken(token)).toBeNull();
});
test('reject refresh token used as access token',async()=>{
 const token=await tokens.generateRefreshToken(user);expect(tokens.verifyAccessToken(token)).toBeNull();
});
function response(){return {code:200,cookie(){return this;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};}
test('concurrent refresh issues only one successor session',async()=>{
 const refresh=await tokens.generateRefreshToken(user);
 jest.spyOn(model,'findById').mockResolvedValue(user);
 let consumed=false;
 const clients=[];
 pool.connect.mockImplementation(async()=>{
  const client={release:jest.fn(),query:jest.fn(async(sql)=>{
   if(sql.includes('UPDATE refresh_tokens')){const count=consumed?0:1;consumed=true;return {rowCount:count,rows:[]};}
   return {rowCount:1,rows:[{session_version:0}]};
  })};clients.push(client);return client;
 });
 const a=response(),b=response(),req={body:{refreshToken:refresh},headers:{}};
 await Promise.all([controller.refresh(req,a,e=>{throw e}),controller.refresh(req,b,e=>{throw e})]);
 expect([a,b].filter(r=>r.body?.success)).toHaveLength(1);
 expect([a.code,b.code].sort()).toEqual([200,401]);
 expect(clients.every(c=>c.release.mock.calls.length===1)).toBe(true);
});
test('rotation stores only token hashes and commits revoke + insert on the same client',async()=>{
 const refresh=await tokens.generateRefreshToken(user);
 const client={release:jest.fn(),query:jest.fn(async()=>({rowCount:1,rows:[{session_version:0}]}))};pool.connect.mockResolvedValue(client);
 const session=await tokens.rotateRefreshSession(refresh,user);
 const calls=client.query.mock.calls;
 expect(calls[0][0]).toBe('BEGIN');expect(calls.at(-1)[0]).toBe('COMMIT');
 const consumed=calls.find(([sql])=>sql.includes('UPDATE refresh_tokens'));
 const inserted=calls.find(([sql])=>sql.includes('INSERT INTO refresh_tokens'));
 expect(consumed[0]).toMatch(/user_id = \$2/);expect(consumed[0]).toMatch(/revoked_at IS NULL AND expires_at > now\(\)/);
 expect(consumed[1][0]).toMatch(/^[0-9a-f]{64}$/);expect(consumed[1][1]).toBe(user.id);
 expect(inserted[1][1]).toMatch(/^[0-9a-f]{64}$/);expect(inserted[1][1]).not.toBe(session.refreshToken);
 expect(tokens.verifyRefreshToken(session.refreshToken).id).toBe(user.id);expect(client.release).toHaveBeenCalledTimes(1);
});
test('failed successor insert rolls back revocation',async()=>{
 const failure=Error('database unavailable');
 const refresh=await tokens.generateRefreshToken(user);
 const client={release:jest.fn(),query:jest.fn(async(sql)=>{if(sql.includes('INSERT INTO'))throw failure;return {rowCount:1,rows:[{session_version:0}]};})};pool.connect.mockResolvedValue(client);
 await expect(tokens.rotateRefreshSession(refresh,user)).rejects.toBe(failure);
 expect(client.query.mock.calls.map(([sql])=>sql)).toContain('ROLLBACK');
 expect(client.query.mock.calls.map(([sql])=>sql)).not.toContain('COMMIT');expect(client.release).toHaveBeenCalledTimes(1);
});
test('revoked or expired refresh cannot issue another token',async()=>{
 const refresh=await tokens.generateRefreshToken(user);
 const client={release:jest.fn(),query:jest.fn(async()=>({rowCount:0,rows:[]}))};pool.connect.mockResolvedValue(client);
 expect(await tokens.rotateRefreshSession(refresh,user)).toBeNull();
 expect(client.query.mock.calls.some(([sql])=>sql.includes('INSERT INTO'))).toBe(false);
 expect(client.query.mock.calls.map(([sql])=>sql)).toContain('ROLLBACK');expect(client.release).toHaveBeenCalledTimes(1);
});
