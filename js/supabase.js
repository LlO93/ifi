import {createClient} from '@supabase/supabase-js';

const url=String(import.meta.env.VITE_SUPABASE_URL||'').trim();
const publishableKey=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'').trim();
let client=null;
let error='';

if(url||publishableKey){
  try{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co'))throw Error('url');
    if(!publishableKey.startsWith('sb_publishable_'))throw Error('key');
    client=createClient(url,publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }catch{
    error='Supabase 연결 설정 형식을 확인해주세요.';
  }
}

window.IFSupabase={configured:Boolean(client),error,getClient:()=>client};
