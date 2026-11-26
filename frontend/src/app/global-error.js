'use client';

import { prompt } from './font';

export default function GlobalError() {
  return <html lang="th" className={prompt.variable}><body className={prompt.className}><main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:22,background:'#f5f8f8',color:'#20343c',fontWeight:400,letterSpacing:'normal'}}><section style={{maxWidth:430,textAlign:'center',padding:28,background:'#fff',border:'1px solid #dbe6e8',borderRadius:18}}><h1 style={{fontWeight:700}}>ไม่สามารถเปิด AHA ได้</h1><p style={{lineHeight:1.65,color:'#687d85',fontWeight:400}}>กรุณาปิดหน้านี้แล้วเปิดใหม่ หรืออัปเดต Chrome / Android System WebView ก่อนลองอีกครั้ง</p><button type="button" onClick={() => window.location.reload()} style={{width:'100%',padding:14,border:0,borderRadius:12,background:'#2085b1',color:'#fff',fontSize:16,fontWeight:500}}>โหลดใหม่</button></section></main></body></html>;
}
