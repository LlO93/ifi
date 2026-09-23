import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMarket} from '../api/_market-handler.mjs';

const fakeMarket={
  status:()=>({configured:true}),
  search:async query=>[{symbol:query.toUpperCase()}],
  daily:async symbol=>({symbol,bars:[]})
};

test('Vercel market routes keep the browser API contract',async()=>{
  const status=await handleMarket(new Request('https://example.test/api/market/status'),'status',fakeMarket);
  assert.deepEqual(await status.json(),{configured:true});
  assert.equal(status.headers.get('cache-control'),'no-store');

  const search=await handleMarket(new Request('https://example.test/api/market/search?q=aapl'),'search',fakeMarket);
  assert.deepEqual(await search.json(),{items:[{symbol:'AAPL'}]});

  const daily=await handleMarket(new Request('https://example.test/api/market/daily?symbol=ibm'),'daily',fakeMarket);
  assert.deepEqual(await daily.json(),{symbol:'IBM',bars:[]});
});

test('Vercel market routes reject unsupported methods and paths',async()=>{
  const method=await handleMarket(new Request('https://example.test/api/market/status',{method:'POST'}),'status',fakeMarket);
  assert.equal(method.status,405);
  const missing=await handleMarket(new Request('https://example.test/api/market/missing'),'missing',fakeMarket);
  assert.equal(missing.status,404);
});
