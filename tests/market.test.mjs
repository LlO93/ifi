import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDaily,createMarket} from '../server/market.mjs';

const fixture=()=>({'Meta Data':{'2. Symbol':'IBM'},'Time Series (Daily)':{
  '2025-01-03':{'4. close':'102','5. volume':'30'},
  '2025-01-02':{'4. close':'100','5. volume':'20'},
  '2025-01-06':{'4. close':'104','5. volume':'40'}
}});
test('daily prices sort ascending and omit uncompleted day',()=>{
  const d=parseDaily(fixture(),'IBM','2025-01-06');
  assert.deepEqual(d.bars.map(r=>r.date),['2025-01-02','2025-01-03']);
  assert.equal(d.asOf,'2025-01-03');assert.equal(d.priceBasis,'raw');
});
test('bad prices and provider errors are not silently plotted',()=>{
  const f=fixture();f['Time Series (Daily)']['2025-01-02']['4. close']='NaN';
  assert.throws(()=>parseDaily(f,'IBM'),/유효하지/);
  assert.throws(()=>parseDaily(fixture(),'AAPL'),/종목/);
  assert.throws(()=>parseDaily({Note:'rate'},'IBM'),/제한/);
});
test('official example supports IBM only and deduplicates concurrent requests',async()=>{
  let calls=0;const market=createMarket({fetchImpl:async url=>{calls++;assert.equal(url.searchParams.get('apikey'),'demo');return {ok:true,json:async()=>fixture()};}});
  const [a,b]=await Promise.all([market.daily('IBM'),market.daily('IBM')]);
  await market.daily('IBM');assert.equal(calls,1);assert.equal(a.fetchedAt,b.fetchedAt);
  assert.equal(a.sample,true);await assert.rejects(()=>market.daily('AAPL'),/API 키/);
  assert.equal(market.status().catalog.length,1);
});
test('personal search includes only US equities in USD and no key leaks',async()=>{
  const rows=[['USX','Equity','United States','USD'],['OT','Equity','Canada','CAD'],['ETF','ETF','United States','USD']];
  const market=createMarket({apiKey:'test-secret',fetchImpl:async()=>({ok:true,json:async()=>({bestMatches:rows.map(([symbol,type,region,currency])=>({'1. symbol':symbol,'2. name':symbol,'3. type':type,'4. region':region,'8. currency':currency}))})})});
  assert.deepEqual((await market.search('unknown')).map(r=>r.symbol),['USX']);
  assert.ok(!JSON.stringify(market.status()).includes('test-secret'));
});
test('network error does not reveal provider URL or key',async()=>{
  const market=createMarket({apiKey:'secret',fetchImpl:async()=>{throw Error('URL?apikey=secret');}});
  await assert.rejects(()=>market.daily('IBM'),e=>e.code==='NETWORK_ERROR'&&!e.message.includes('secret'));
});
