'use strict';
// Keep the controller contract and request validation. Academic has no outbound mail.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function createController(){
 async function availability(req,res){res.set('Cache-Control','no-store');return res.json({available:false});}
 async function deliver(req,res){
  const {jobId,token,week}=req.body||{};
  if(!UUID.test(jobId||'')||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)||typeof week!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(week)||Object.keys(req.body||{}).some(k=>!['jobId','token','week'].includes(k)))return res.status(400).json({success:false});
  return res.status(503).json({success:false});
 }
 return {availability,deliver};
}
module.exports={...createController(),createController};
