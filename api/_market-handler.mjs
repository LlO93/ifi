import {createMarket,MarketError} from '../server/market.mjs';

const deployedMarket=createMarket({apiKey:process.env.ALPHA_VANTAGE_API_KEY||''});
const json=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff'
}});

export async function handleMarket(request,action,market=deployedMarket){
  if(request.method!=='GET')return json({error:'지원하지 않는 요청입니다.'},405);
  try{
    const url=new URL(request.url);
    if(action==='status')return json(market.status());
    if(action==='search')return json({items:await market.search((url.searchParams.get('q')||'').trim())});
    if(action==='daily')return json(await market.daily((url.searchParams.get('symbol')||'').toUpperCase()));
    return json({error:'페이지를 찾지 못했어요.'},404);
  }catch(error){
    return json({
      code:error instanceof MarketError?error.code:'SERVER_ERROR',
      error:error instanceof MarketError?error.message:'요청을 처리하지 못했어요.'
    },error instanceof MarketError?error.status:500);
  }
}
