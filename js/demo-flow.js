// 화면 검증용 가상 가격. 실제 종목·시세·기업행동 데이터가 아닙니다.
window.IFDemo = (() => {
  const dates = ['2025-04-07','2025-09-22','2026-03-23','2026-08-24','2026-09-01','2026-09-08','2026-09-15','2026-09-22'];
  const prices = [70,82,76,88,92,86,96,100];
  const names = ['예시 반도체 B','예시 반도체 C','예시 반도체 D'];
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const price = (stock,date) => {const i=dates.indexOf(date);return i<0?null:prices[i]+stock*20;};
  const init = s => Object.assign(s,{date:'',period:'all',cash:'1000',budgetMode:'100',budget:'',held:'10',sell:'4',source:'cash',error:'',result:null,record:null,memoDraft:['','',''],memoEditing:false,recordError:''});
  function calculate(s){
    const buy=price(s.stock,s.date);
    if(!buy)return {error:'매수 날짜를 선택해주세요. 데모에 제공된 날짜만 선택할 수 있어요.',field:'demo-date'};
    const cash=s.source==='stock'?0:Number(s.cash);
    if(s.source!=='stock'&&(s.cash.trim()===''||!Number.isFinite(cash)||cash<0||cash>1000000000))return {error:'예수금은 0~1,000,000,000달러로 입력해주세요.',field:'demo-cash'};
    const held=s.source==='cash'?0:Number(s.held),sell=s.source==='cash'?0:Number(s.sell);
    if(s.source!=='cash'&&(!s.held.trim()||!s.sell.trim()||!Number.isSafeInteger(held)||!Number.isSafeInteger(sell)||held<0||sell<0||sell>held||held>1000000))return {error:'보유 수량과 팔 수량을 확인해주세요. 0~1,000,000주 사이의 정수이며 팔 수량은 보유 수량 이하여야 해요.',field:'demo-sell'};
    const available=Math.round(cash*100)+sell*10000;
    const budget=s.budgetMode==='custom'?Math.round(Number(s.budget)*100):Math.floor(available*Number(s.budgetMode)/100);
    if((s.budgetMode==='custom'&&!s.budget.trim())||!Number.isFinite(budget)||budget<=0||budget>available)return {error:'투자금은 0보다 크고 가용 자금 이하여야 해요.',field:s.budgetMode==='custom'?'demo-budget':'demo-cash'};
    const count=Math.floor(budget/(buy*100));
    if(!count)return {error:`1주 가격 ${money(buy)} 이상 투자해주세요. 데모는 정수 주식으로 계산해요.`,field:s.budgetMode==='custom'?'demo-budget':'demo-cash'};
    const remaining=(available-count*buy*100)/100;
    const current=count*price(s.stock,dates.at(-1)),old=(held-sell)*120;
    const total=Math.round((current+old+remaining)*100)/100,keep=Math.round((cash+held*120)*100)/100;
    return {stock:s.stock,date:s.date,cash,held,sell,buy,count,remaining,current,old,total,keep,difference:Math.round((total-keep)*100)/100};
  }
  const options=s=>'<option value="">날짜를 선택해주세요</option>'+dates.map(d=>`<option value="${d}" ${s.date===d?'selected':''}>${d} · ${money(price(s.stock,d))}</option>`).join('');
  const dateField=s=>`<label for="demo-date">가상 매수 날짜</label><select id="demo-date" data-demo="date">${options(s)}</select>`;
  const input=(key,label,value)=>`<label for="demo-${key}">${label}</label><input id="demo-${key}" data-demo="${key}" type="number" min="0" step="${['held','sell'].includes(key)?'1':'0.01'}" value="${value}" inputmode="decimal">`;
  function chart(s){
    const start={month:3,half:2,year:1,all:0}[s.period];
    const shown=dates.slice(start),values=shown.map(d=>price(s.stock,d));
    const low=Math.min(...values)-5,high=Math.max(...values)+5;
    const points=shown.map((d,i)=>({d,x:24+i*292/(shown.length-1),y:155-(values[i]-low)/(high-low)*125}));
    return `<svg class="if-chart" viewBox="0 0 340 180" role="group" aria-label="날짜 선택이 가능한 데모 차트"><polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#3182f6" stroke-width="3"/>${points.map(p=>`<g role="button" tabindex="0" data-date="${p.d}" aria-label="${p.d}, ${money(price(s.stock,p.d))} 선택" aria-pressed="${s.date===p.d}"><circle cx="${p.x}" cy="${p.y}" r="22" fill="transparent"/><circle cx="${p.x}" cy="${p.y}" r="${s.date===p.d?7:4}" fill="${s.date===p.d?'#191f28':'#3182f6'}" pointer-events="none"/></g>`).join('')}</svg><div class="if-chart-labels"><span>${shown[0]}</span><span>${shown.at(-1)}</span></div>`;
  }
  function summary(s){
    const r=calculate(s);
    return r.error?'<p class="if-note">날짜와 금액을 입력하면 매수 수량과 남는 현금을 볼 수 있어요.</p>':`<div class="if-box"><div class="if-row"><span>가용 자금</span><strong>${money(r.cash+r.sell*100)}</strong></div><div class="if-row"><span>새로 살 DEMO${s.stock+1}</span><strong>${r.count}주</strong></div><div class="if-row"><span>남는 현금</span><strong>${money(r.remaining)}</strong></div>${s.source!=='cash'?`<p class="if-note">기존 주식 A ${r.held-r.sell}주 유지</p>`:''}</div>`;
  }
  function render(s,stockList){
    if(s.screen==='stock')return `<div class="if-kicker">DEMO${s.stock+1} · 가상 종목</div><div class="if-price">${money(price(s.stock,dates.at(-1)))}</div><p class="if-note">2026-09-22 기준 · 데모 종가</p><div class="if-tabs"><button data-tab="chart" aria-pressed="${s.tab==='chart'}">차트</button><button data-tab="related" aria-pressed="${s.tab==='related'}">관련 종목</button></div>${s.tab==='chart'?`${chart(s)}<div class="if-tabs">${[['month','1개월'],['half','6개월'],['year','1년'],['all','전체']].map(([v,t])=>`<button data-period="${v}" aria-pressed="${s.period===v}">${t}</button>`).join('')}</div><div class="if-box">${dateField(s)}<p class="if-note">점을 누르거나 날짜를 선택하세요. 선택일: ${s.date||'미선택'}</p></div><p class="if-note">기간별 일부 날짜만 담은 가상 가격이에요.</p><h3>같은 업종의 회사</h3>${stockList()}`:`<h3>같은 반도체 업종 · 예시</h3>${stockList()}`}`;
    if(s.screen==='input')return `<h2>이날 샀다면?</h2><p>${names[s.stock]} · DEMO${s.stock+1}</p><h3>언제 샀을까요?</h3>${dateField(s)}<p class="if-note">${s.date?'그날 데모 종가 '+money(price(s.stock,s.date)):'종목 화면에서 고르지 않았다면 여기서 날짜를 선택하세요.'}</p><h3>그때 쓸 수 있었던 자금</h3><div class="if-tabs">${[['cash','예수금'],['stock','주식 정리'],['both','둘 다']].map(([v,t])=>`<button data-source="${v}" aria-pressed="${s.source===v}">${t}</button>`).join('')}</div>${s.source!=='stock'?input('cash','그날 예수금 ($)',s.cash):''}${s.source!=='cash'?`<div class="if-box"><h3>기존 보유 주식 A · 예시</h3><p class="if-note">매도일 $100 · 평가일 $120로 고정된 가상 주식</p>${input('held','그날 보유 수량',s.held)}${input('sell','팔 수량',s.sell)}</div>`:''}<h3>얼마를 투자할까요?</h3><div class="if-tabs">${['100','50','30','custom'].map(v=>`<button data-budget-mode="${v}" aria-pressed="${s.budgetMode===v}">${v==='custom'?'직접 입력':v+'%'}</button>`).join('')}</div>${s.budgetMode==='custom'?input('budget','투자할 금액 ($)',s.budget):''}<div id="demo-summary" aria-live="polite">${summary(s)}</div><p class="if-note">가상 가격으로 계산 · 세금·수수료·배당 미반영</p><p id="demo-error" class="if-error" role="alert">${s.error||''}</p><button class="if-main" data-calculate="true">데모 예상 잔고 계산하기</button>`;
    if(s.screen==='result'){
      const r=s.result;
      if(!r)return '<h2>아직 계산한 결과가 없어요</h2><p>종목과 날짜, 자금을 먼저 선택해주세요.</p><button data-go="input">조건 입력하기</button>';
      return `<p class="if-small">DEMO${r.stock+1} · ${r.date} 매수 가정<br>평가 기준일 2026-09-22 · 데모 계산</p><h2>선택을 바꿨다면</h2><div class="if-box if-hero"><span>현재 예상 잔고</span><div class="if-price">${money(r.total)}</div><p class="if-note">입력한 자산만 포함 · 세금·수수료·배당 미반영</p></div><div class="if-two"><div class="if-box">그대로 유지<p>${money(r.keep)}</p></div><div class="if-box">선택을 변경<p>${money(r.total)}</p></div></div><p class="if-comparison">${r.difference===0?'유지했을 때와 같아요':`선택을 바꿨다면 ${money(Math.abs(r.difference))} ${r.difference>0?'더 많아요':'더 적어요'}`}</p><div class="if-box"><div class="if-row"><span>DEMO${r.stock+1} ${r.count}주</span><strong>${money(r.current)}</strong></div><div class="if-row"><span>남은 기존 주식 ${r.held-r.sell}주</span><strong>${money(r.old)}</strong></div><div class="if-row"><span>남은 현금</span><strong>${money(r.remaining)}</strong></div></div>${window.IFRecords.detail(s)}`;
    }
    if(s.screen==='history')return window.IFRecords.history(s);
    return null;
  }
  return {init,render,calculate,summary};
})();
