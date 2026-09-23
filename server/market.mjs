export class MarketError extends Error {
  constructor(code,message,status=502){super(message);this.code=code;this.status=status;}
}
export const catalog=[
  {symbol:'IBM',name:'IBM',alias:'아이비엠'},
  {symbol:'AAPL',name:'Apple',alias:'애플'},
  {symbol:'MSFT',name:'Microsoft',alias:'마이크로소프트'},
  {symbol:'NVDA',name:'NVIDIA',alias:'엔비디아'},
  {symbol:'AMZN',name:'Amazon',alias:'아마존'},
  {symbol:'TSLA',name:'Tesla',alias:'테슬라'}
];
const easternDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function parseDaily(data,symbol,today=easternDate()){
  if(data?.['Error Message'])throw new MarketError('SYMBOL_NOT_FOUND','해당 종목의 일별 가격을 찾지 못했어요.',404);
  if(data?.Note||data?.Information)throw new MarketError('PROVIDER_LIMIT','공급자가 요청을 제한했어요. API 키·이용 한도·지원 범위를 확인해주세요.',429);
  const series=data?.['Time Series (Daily)'];
  if(!series||data['Meta Data']?.['2. Symbol']!==symbol)throw new MarketError('INVALID_DATA','공급자 응답의 종목·가격 형식을 확인하지 못했어요.');
  const bars=Object.entries(series).filter(([date])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<today).map(([date,row])=>{
    const close=Number(row['4. close']),volume=Number(row['5. volume']);
    if(!Number.isFinite(close)||close<=0||!Number.isSafeInteger(volume)||volume<0)throw new MarketError('INVALID_DATA','유효하지 않은 가격 자료가 있어 차트를 표시하지 않았어요.');
    return {date,close,volume};
  }).sort((a,b)=>a.date.localeCompare(b.date)).slice(-100);
  if(!bars.length)throw new MarketError('NO_COMPLETED_DATA','조회 가능한 완료 거래일 자료가 없어요.',404);
  return {symbol,bars,asOf:bars.at(-1).date,provider:'Alpha Vantage',currency:'USD',priceBasis:'raw',timezone:'America/New_York',fetchedAt:data._fetchedAt||new Date().toISOString()};
}
export function createMarket({apiKey='',fetchImpl=fetch}={}){
  const sample=!apiKey||apiKey==='demo';
  const cache=new Map(),pending=new Map(),allowed=new Set(catalog.map(s=>s.symbol));
  let day='',requests=0;
  async function request(params){
    const id=JSON.stringify(params),hit=cache.get(id);
    if(hit&&hit.expires>Date.now())return hit.value;
    if(pending.has(id))return pending.get(id);
    const today=new Date().toISOString().slice(0,10);
    if(today!==day){day=today;requests=0;}
    if(requests>=25)throw new MarketError('LOCAL_LIMIT','오늘 이 서버의 조회 한도 25회에 도달했어요. 캐시된 자료를 이용하거나 다음 날 다시 시도해주세요.',429);
    requests++;
    const job=(async()=>{
      try{
        const url=new URL('https://www.alphavantage.co/query');
        for(const [k,v] of Object.entries({...params,apikey:sample?'demo':apiKey}))url.searchParams.set(k,v);
        const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new MarketError('UPSTREAM_HTTP','시세 공급자 연결에 실패했어요. 잠시 뒤 다시 시도해주세요.');
        const value=await response.json();
        if(value.Note||value.Information)throw new MarketError('PROVIDER_LIMIT','공급자가 요청을 제한했어요. API 키·무료 한도·지원 범위를 확인해주세요.',429);
        if(value['Error Message'])throw new MarketError('SYMBOL_NOT_FOUND','종목을 찾지 못했어요.',404);
        value._fetchedAt=new Date().toISOString();
        cache.set(id,{value,expires:Date.now()+3600000});
        return value;
      }catch(error){if(error instanceof MarketError)throw error;throw new MarketError('NETWORK_ERROR','시세 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');}
      finally{pending.delete(id);}
    })();
    pending.set(id,job);return job;
  }
  return {
    status:()=>({provider:'Alpha Vantage',sample,configured:!sample,catalog:sample?catalog.slice(0,1):catalog}),
    async search(query){
      if(!query||query.length>60)throw new MarketError('INVALID_QUERY','검색어는 1~60자로 입력해주세요.',400);
      const matches=catalog.filter(s=>`${s.symbol} ${s.name} ${s.alias}`.toLowerCase().includes(query.toLowerCase()));
      if(sample)return catalog.slice(0,1).filter(s=>`${s.symbol} ${s.name} ${s.alias}`.toLowerCase().includes(query.toLowerCase()));
      if(matches.length)return matches;
      const data=await request({function:'SYMBOL_SEARCH',keywords:query});
      if(!Array.isArray(data.bestMatches))throw new MarketError('INVALID_DATA','검색 결과를 확인하지 못했어요.');
      return data.bestMatches.filter(r=>r['4. region']==='United States'&&r['3. type']==='Equity'&&r['8. currency']==='USD'&&/^[A-Z0-9.\-]{1,15}$/.test(r['1. symbol'])).map(r=>{allowed.add(r['1. symbol']);return {symbol:r['1. symbol'],name:String(r['2. name'])};});
    },
    async daily(symbol){
      if(!allowed.has(symbol))throw new MarketError('UNSUPPORTED_SYMBOL','미국 주식 검색 결과에서 종목을 선택해주세요.',400);
      if(sample&&symbol!=='IBM')throw new MarketError('KEY_REQUIRED','다른 종목은 무료 API 키를 설정한 뒤 조회할 수 있어요.',401);
      return {...parseDaily(await request({function:'TIME_SERIES_DAILY',symbol}),symbol),sample};
    }
  };
}
