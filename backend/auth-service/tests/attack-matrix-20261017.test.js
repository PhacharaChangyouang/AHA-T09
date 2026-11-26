jest.mock('../src/config/db',()=>({query:jest.fn(async()=>({rows:[],rowCount:0}))}));
const pool=require('../src/config/db'),model=require('../src/models/user.model'),controller=require('../src/controllers/auth.controller'),family=require('../src/controllers/family.controller');
const uid='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333';
beforeEach(()=>{pool.query.mockReset();pool.query.mockResolvedValue({rows:[],rowCount:0});});
const payloads=["' OR '1'='1",'x\" UNION SELECT NULL--',"x'; DROP TABLE users;--",'\\\u0000\r\n','<svg onload=alert(1)>'];
test.each(payloads)('all identity lookup model functions bind input: %s',async(value)=>{
 for(const fn of ['findByPhone','findByUsername','findByCredentials','findByEmail','findByGoogleSub','findById']){
  pool.query.mockClear();await model[fn](value);const [sql,args]=pool.query.mock.calls[0];expect(sql).not.toContain(value);expect(args).toEqual([value]);expect(sql).toContain('$1');
 }
});
test('profile mass assignment cannot replace id, role, credentials, or Google identity',async()=>{
 pool.query.mockResolvedValue({rows:[{id:uid,role:'elderly',name:'audit',password_hash:'must-not-leak',pin_hash:'must-not-leak',session_version:7,google_sub:'must-not-leak'}],rowCount:1});
 const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
 await controller.updateMe({user:{id:uid},body:{name:'audit',age:70,id:other,role:'system',password_hash:'attacker',pin_hash:'attacker',google_sub:'attacker',session_version:0}},res,e=>{throw e;});
 expect(res.status).toHaveBeenCalledWith(400);expect(pool.query).not.toHaveBeenCalled();
 const output=res.json.mock.calls[0][0];expect(output.success).toBe(false);
 for(const field of ['password_hash','pin_hash','session_version','google_sub'])expect(output).not.toHaveProperty(field);

});
test('family approval binds the actual recipient and only a pending request',async()=>{
 const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
 await family.updateConnection({user:{id:uid},params:{id:other},body:{status:'accepted',requested_id:other,requester_id:other}},res,e=>{throw e;});
 const [sql,args]=pool.query.mock.calls[0];expect(sql).toContain('requested_id = $3');expect(sql).toContain("status = 'pending'");expect(args).toEqual(['accepted',other,uid]);expect(res.status).toHaveBeenCalledWith(404);
});

test('allowed profile changes remain scoped to the authenticated user and hide credential fields',async()=>{
 pool.query.mockResolvedValue({rows:[{id:uid,role:'elderly',name:'audit',password_hash:'must-not-leak',pin_hash:'must-not-leak',session_version:7,google_sub:'must-not-leak'}],rowCount:1});
 const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
 await controller.updateMe({user:{id:uid},body:{name:'audit',age:70}},res,e=>{throw e;});
 const [sql,args]=pool.query.mock.calls[0];expect(sql).toMatch(/WHERE id = \$1/);expect(args).toEqual([uid,'audit',70]);
 const output=res.json.mock.calls[0][0];expect(output.user.id).toBe(uid);expect(output.user.role).toBe('elderly');
 for(const field of ['password_hash','pin_hash','session_version','google_sub'])expect(output.user).not.toHaveProperty(field);
});
