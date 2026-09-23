import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createMarket,MarketError} from './market.mjs';

try{process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));}catch(e){if(e.code!=='ENOENT')console.error('환경 설정 파일을 읽지 못했습니다.');}
const market=createMarket({apiKey:process.env.ALPHA_VANTAGE_API_KEY||''});
const port=Number(process.env.PORT||4173);
const publicFiles=new Map([
  ['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/main.js','main.js'],['/app.js','app.js'],
  ...['components','records','demo-flow','live-market'].map(name=>[`/js/${name}.js`,`js/${name}.js`])
]);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
  if(!hosts.has(req.headers.host)||req.headers.origin&&!new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]).has(req.headers.origin))return json(403,{error:'허용되지 않은 접속입니다.'});
  if(req.method!=='GET')return json(405,{error:'지원하지 않는 요청입니다.'});
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/market/status')return json(200,market.status());
    if(url.pathname==='/api/market/search')return json(200,{items:await market.search((url.searchParams.get('q')||'').trim())});
    if(url.pathname==='/api/market/daily')return json(200,await market.daily((url.searchParams.get('symbol')||'').toUpperCase()));
    const file=publicFiles.get(url.pathname);
    if(!file)return json(404,{error:'페이지를 찾지 못했어요.'});
    const data=await readFile(new URL('../'+file,import.meta.url));
    res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]});res.end(data);
  }catch(error){json(error instanceof MarketError?error.status:500,{code:error instanceof MarketError?error.code:'SERVER_ERROR',error:error instanceof MarketError?error.message:'요청을 처리하지 못했어요.'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`개인 개발용 시세 앱: http://127.0.0.1:${port} · ${market.status().sample?'공식 IBM 예제 모드':'개인 API 키 사용'}`));
