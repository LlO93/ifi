(() => {
  const host=document.querySelector('#if-live');
  const demo=document.querySelector('#if-demo');
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
  let config=null,items=[],data=null,selected='',range=100,requestId=0,queryId=0;
  async function get(path){
    const response=await fetch(path,{signal:AbortSignal.timeout(20000)});
    const body=await response.json();if(!response.ok)throw Error(body.error||'요청에 실패했어요.');return body;
  }
  function list(){host.querySelector('#live-list').innerHTML=items.length?items.map(s=>`<button class="if-row" data-symbol="${escape(s.symbol)}"><span>${escape(s.name)}<br><span class="if-small">${escape(s.symbol)}</span></span><span>차트 보기 →</span></button>`).join(''):'<p class="if-note">지원하는 미국 주식 검색 결과가 없어요.</p>';}
  function chart(){
    const rows=data.bars.slice(-range),min=Math.min(...rows.map(r=>r.close)),max=Math.max(...rows.map(r=>r.close)),span=max-min||1;
    const points=rows.map((r,i)=>`${20+i*300/Math.max(1,rows.length-1)},${160-(r.close-min)/span*130}`).join(' ');
    const picked=data.bars.find(r=>r.date===selected),last=data.bars.at(-1);
    host.querySelector('#live-chart').innerHTML=`<div class="if-box"><h3>${escape(data.symbol)}</h3><div class="if-price">${money(last.close)}</div><p class="if-note">수신한 마지막 종가: ${escape(data.asOf)} · 미국 동부 기준</p><svg class="if-chart" viewBox="0 0 340 180" role="img" aria-label="${escape(data.symbol)} 일별 종가 차트"><polyline points="${points}" fill="none" stroke="#3182f6" stroke-width="3"/></svg><div class="if-chart-labels"><span>${escape(rows[0].date)}</span><span>${escape(last.date)}</span></div><div class="if-tabs">${[[20,'최근 20일'],[60,'최근 60일'],[100,'제공 전체']].map(([v,t])=>`<button data-live-range="${v}" aria-pressed="${range===v}">${t}</button>`).join('')}</div><label for="live-date">날짜별 종가 확인</label><select id="live-date"><option value="">날짜 선택</option>${data.bars.map(r=>`<option value="${r.date}" ${selected===r.date?'selected':''}>${r.date} · ${money(r.close)}</option>`).join('')}</select><p aria-live="polite">${picked?`${escape(picked.date)} · ${money(picked.close)} · 거래량 ${picked.volume.toLocaleString('en-US')}주`:'제공된 거래일에서 날짜를 골라보세요.'}</p><p class="if-note">출처: Alpha Vantage · USD · 분할·배당 미조정 종가<br>표시 범위: ${data.bars.length}개 거래일. 당일 자료는 확정 여부를 보수적으로 판단해 제외해요.<br>수집 시각: ${escape(new Date(data.fetchedAt).toLocaleString('ko-KR'))}${data.sample?'<br>공식 IBM 예제 응답 · 최신성은 보장하지 않아요.':''}</p></div><p class="if-note">현재는 실제 가격 조회까지 연결됐어요. 주식 분할·기업행동 확인 전에는 이 가격으로 투자 잔고를 계산하지 않아요.</p>`;
  }
  async function load(symbol){
    const id=++requestId;data=null;selected='';
    const area=host.querySelector('#live-chart');area.innerHTML='<p role="status">일별 가격을 불러오는 중이에요…</p>';
    try{const result=await get('/api/market/daily?symbol='+encodeURIComponent(symbol));if(id!==requestId)return;data=result;chart();}
    catch(e){if(id===requestId)area.innerHTML=`<p class="if-error" role="alert">${escape(e.message)}</p><button data-symbol="${escape(symbol)}">다시 시도</button>`;}
  }
  async function start(){
    if(location.protocol==='file:'){host.innerHTML='<h2>실제 시세 연결</h2><p>실제 데이터를 불러오려면 API 키를 관리하는 로컬 서버로 접속해야 해요.</p><p class="if-note">서버 실행 방법은 프로젝트의 실제데이터연결.md에서 확인할 수 있어요.</p>';return;}
    host.innerHTML='<p role="status">시세 연결 상태를 확인하는 중이에요…</p>';
    try{
      config=await get('/api/market/status');items=config.catalog;
      host.innerHTML=`<div class="if-kicker">미국 주식 · 개인 개발 검증</div><h2>실제 종목을 살펴보세요</h2><p class="if-note">${config.sample?'아직 개인 API 키가 없어요. 공식 IBM 예제로 데이터 연결을 확인할 수 있어요.':'개인 API 키 연결 · 일별 종가 조회'}</p>${config.sample?'<p><a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer">무료 API 키 발급 안내 ↗</a></p>':''}<form id="live-search"><label for="live-query">종목명 또는 티커</label><div class="if-live-search"><input id="live-query" placeholder="예: IBM, AAPL, 애플" maxlength="60"><button type="submit">검색</button></div></form><p class="if-note">조회 횟수를 아끼기 위해 검색 버튼을 누를 때만 요청해요. 아래 목록은 순위가 아닌 조회 시작용 종목이에요.</p><p id="live-search-status" role="status"></p><div id="live-list"></div><div id="live-chart"></div>`;
      list();
    }catch(e){host.innerHTML=`<p class="if-error">${escape(e.message)}</p><button data-live-reconnect="true">다시 연결</button>`;}
  }
  host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.symbol)load(b.dataset.symbol);if(b.dataset.liveRange&&data){range=Number(b.dataset.liveRange);chart();}if(b.dataset.liveReconnect)start();});
  host.addEventListener('change',e=>{if(e.target.id==='live-date'){selected=e.target.value;chart();host.querySelector('#live-date').focus();}});
  host.addEventListener('submit',async e=>{
    if(e.target.id!=='live-search')return;e.preventDefault();const query=host.querySelector('#live-query').value.trim();if(!query)return;
    const id=++queryId,status=host.querySelector('#live-search-status');status.textContent='검색 중…';
    try{const result=await get('/api/market/search?q='+encodeURIComponent(query));if(id!==queryId)return;items=result.items;list();status.textContent=config.sample?'IBM 예제 모드예요. 다른 종목은 개인 API 키를 설정해주세요.':'';}
    catch(e){if(id===queryId)status.textContent=e.message;}
  });
  document.querySelector('#if-data-mode').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;const live=b.dataset.mode==='live';host.hidden=!live;demo.hidden=live;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  start();
})();
