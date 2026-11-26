process.env.PIN_PEPPER='audit-pin-test-pepper-only-123456789012345678901234567890';
jest.mock('../src/config/db',()=>({query:jest.fn(async()=>({rows:[]}))}));
jest.mock('../src/models/user.model',()=>({findByPhone:jest.fn(async()=>null),findByUsername:jest.fn(async()=>null),createWithPassword:jest.fn(async()=>({id:'audit',role:'elderly'}))}));
jest.mock('../src/services/token.service',()=>({issueSession:jest.fn(async()=>({accessToken:'fixture',refreshToken:'fixture'}))}));
const bcrypt=require('bcryptjs'),model=require('../src/models/user.model'),controller=require('../src/controllers/password-auth.controller');
test('registration persists salted bcrypt cost 12; wrong password fails',async()=>{
 const password='AuditPassword123!';
 const body={phone:'0800000000',firstName:'Audit',lastName:'Test',username:'audit',email:'audit@example.invalid',password,confirmPassword:password,pin:'4826',confirmPin:'4826',role:'elderly',termsAccepted:true};
 const response=()=>({cookie(){return this;},status(){return this;},json(){return this;}});
 await controller.registerWithPassword({body},response(),e=>{throw e});
 await controller.registerWithPassword({body},response(),e=>{throw e});
 const hashes=model.createWithPassword.mock.calls.map(([data])=>data.passwordHash);
 expect(hashes).toHaveLength(2);expect(hashes[0]).not.toBe(hashes[1]);
 for(const hash of hashes){expect(bcrypt.getRounds(hash)).toBe(12);expect(hash).not.toContain(password);expect(await bcrypt.compare(password,hash)).toBe(true);expect(await bcrypt.compare('wrong',hash)).toBe(false);}
},10000);
