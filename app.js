(()=>{
const root=document.getElementById('if-layout');
const picker=root.querySelector('#if-screen');
const stage=root.querySelector('#if-stage');
let content,nav,header,footer,edge;
const layers=[];
let busy=false;
let gesture=null;
let ignoreClickUntil=0;
const state={screen:'home',stock:0,tab:'chart',step:2,source:'both',metric:'거래량',memo:false};
const design={radius:12,relatedPreview:true};
const { button: btn, field, stockList } = window.IFComponents;
const names = ['예시 반도체 B', '예시 반도체 C', '예시 반도체 D'];
const stocks = () => stockList(names, state);
function render(){
picker.value=state.screen;nav.hidden=['search','input','stock'].includes(state.screen);
header.innerHTML=(layers.length>1?'<button class="if-back" data-back="true" aria-label="이전 화면으로">←</button>':'')+'<strong>'+(state.screen==='stock'?names[state.stock]:'<span class="if-brand">IF</span>투자 IF')+'</strong><span class="if-small">'+(state.screen==='stock'?'DEMO'+(state.stock+1):'미국 주식')+'</span>';
footer.hidden=state.screen!=='stock';
footer.innerHTML=state.screen==='stock'?btn('DEMO'+(state.stock+1)+' 이날 샀다면?','input',true):'';
edge.hidden=state.screen!=='stock';
let s='';
if(state.screen==='home')s=`<div class="if-kicker">DISCOVER YOUR NEXT IF</div><h2>어떤 선택이 궁금하세요?</h2><button class="if-search-entry" data-go="search">종목명 또는 티커 검색 <span aria-hidden="true">＋</span></button><div class="if-box"><h3>미국 주식 순위</h3><div class="if-small">미국 주식 · 최근 거래일 기준</div><div class="if-tabs"><button data-metric="거래량" aria-pressed="${state.metric==='거래량'}">거래량</button><button data-metric="시가총액" aria-pressed="${state.metric==='시가총액'}">시가총액</button></div>${stocks()}<p class="if-small">${state.metric} 순 · 지원 종목 기준</p></div>`;
if(state.screen==='search')s=`<h2>종목 검색</h2><label>종목명 또는 티커<input id="if-query" placeholder="이름 또는 티커 입력"></label><h3>예시 검색 결과</h3><div id="if-search-results">${stocks()}</div>`;
if(state.screen==='stock')s=`<div class="if-kicker">NASDAQ · DEMO${state.stock+1}</div><div class="if-price">$${100+state.stock*20}.00</div><p class="if-positive">+${state.stock+1}.20% <span class="if-small">최근 거래일 · 예시</span></p><div class="if-tabs"><button data-tab="chart" aria-pressed="${state.tab==='chart'}">차트</button><button data-tab="related" aria-pressed="${state.tab==='related'}">관련 종목</button></div>${state.tab==='chart'?`<svg class="if-chart" viewBox="0 0 340 180" role="img" aria-label="예시 가격 차트"><path d="M20 140 L60 120 L100 135 L140 90 L180 104 L220 60 L260 76 L320 35 L320 150 L20 150 Z" fill="#3182f619"/><path d="M20 140 L60 120 L100 135 L140 90 L180 104 L220 60 L260 76 L320 35" fill="none" stroke="#3182f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M140 16 V150" stroke="#3182f6" stroke-dasharray="4 5"/><circle cx="140" cy="90" r="5" fill="#3182f6" stroke="white" stroke-width="3"/><text x="20" y="166" fill="#626c79" font-size="12">과거</text><text x="290" y="166" fill="#626c79" font-size="12">현재</text></svg><p class="if-small">1개월　6개월　1년　전체</p><div class="if-box"><div class="if-kicker">선택한 날의 가격</div><div class="if-row" style="padding:0;border:0"><span>2025.04.07</span><span>$70.00</span></div></div>${design.relatedPreview?`<h3>같은 업종의 회사</h3>${stocks()}<button data-tab="related">관련 종목 더 보기 →</button>`:''}`:`<h3>같은 반도체 업종</h3>${stocks()}<p class="if-small">동일 업종을 기준으로 연결했어요</p>`}`;
if(state.screen==='input'){
s=`<h2>이날 샀다면?</h2><p class="if-small">DEMO1 · 날짜와 자금을 한 번에 입력</p>`;
s+=`<h3>매수 날짜</h3>${field('가상 매수 날짜','2025-04-07','date')}<div class="if-box">그날 종가 $70.00</div><p class="if-note">그날 종가로 사고 지금까지 보유했다고 가정해요.</p>`;
s+=`<h3>자금 원천</h3><p class="if-note">선택한 날짜의 예수금과 보유 수량을 입력해주세요.</p><div class="if-tabs"><button data-source="cash" aria-pressed="${state.source==='cash'}">예수금</button><button data-source="stock" aria-pressed="${state.source==='stock'}">주식 정리</button><button data-source="both" aria-pressed="${state.source==='both'}">둘 다</button></div>${state.source!=='stock'?field('그날 예수금 ($)','1000','number'):''}${state.source!=='cash'?`<div class="if-box"><h3>기존 보유 주식 A</h3><div class="if-two">${field('보유 수량','10','number')}${field('팔 수량','4','number')}</div><div class="if-small">예상 매도 대금 $400</div></div>`:''}`;
s+=`<h3>투자금</h3><div class="if-box"><span class="if-small">가용 자금</span><div class="if-price">$1,400</div></div><div class="if-tabs"><button aria-pressed="true">100%</button><span class="if-small">50% · 30% · 직접 입력</span></div><div class="if-row"><span>새로 살 주식</span><span>B 20주</span></div><div class="if-row"><span>남은 기존 주식</span><span>A 6주</span></div><div class="if-row"><span>남는 현금</span><span>$0</span></div><p class="if-note">고정 예시 · 세금·수수료·배당 제외</p>${btn('현재 예상 잔고 계산하기','result',true)}`;
}
if(state.screen==='result')s=`<div class="if-small">B · 2025.04.07 매수 가정</div><h2>계산 결과</h2><div class="if-box if-hero"><span class="if-small">현재 예상 잔고</span><div class="if-price">$2,720</div><span class="if-positive">시작 대비 +$720 (+36%)</span><p class="if-note">입력한 자산만 포함 · 세금·수수료·배당 제외</p></div><div class="if-two"><div class="if-box">그대로 유지<p>$2,200</p></div><div class="if-box">선택을 변경<p>$2,720</p></div></div><p class="if-comparison">선택을 바꿨다면 $520 더 많아요</p><div class="if-box"><div class="if-row"><span>새로 산 B 20주</span><span>$2,000</span></div><div class="if-row"><span>남은 A 6주</span><span>$720</span></div><div class="if-row"><span>현금</span><span>$0</span></div></div><button data-memo="toggle">복기 메모 ${state.memo?'닫기':'작성'}</button>${state.memo?'<label>그때 왜 관심이 갔나요?<textarea placeholder="당시 생각을 적어보세요"></textarea></label>':''}<div class="if-tabs">${btn('조건 바꿔 계산','input')}${btn('내 기록 보기','history')}</div>`;
if(state.screen==='history')s=`<h2>내 기록</h2><label>기록 검색<input placeholder="종목명 또는 티커"></label><div class="if-small">전체 · 예수금 · 주식 정리 · 혼합</div><button class="if-row" data-go="result"><span>예시 반도체 B<br><span class="if-small">2025.04.07 매수 가정<br>예시 평가 기록</span></span><span class="if-right">$2,720<br><span class="if-positive">유지 대비 +$520</span></span></button><p class="if-note">이 브라우저에서 만든 기록</p>${btn('다른 종목 둘러보기','home',true)}`;
content.innerHTML=s;nav.querySelectorAll('[data-root]').forEach(b=>{if(b.dataset.root===state.screen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});root.querySelectorAll('.if-box').forEach(x=>x.style.borderRadius=design.radius+'px');
}
function bind(layer){
 content=layer.querySelector('.if-content');nav=layer.querySelector('.if-nav');header=layer.querySelector('.if-top');footer=layer.querySelector('.if-footer');edge=layer.querySelector('.if-edge');
}
function makeLayer(){
 const layer=document.createElement('section');layer.className='if-layer';
 layer.innerHTML='<div class="if-top"></div><div class="if-content"></div><div class="if-footer" hidden></div><div class="if-nav"><button data-root="home">둘러보기</button><button data-root="history">내 기록</button></div><div class="if-edge" hidden aria-hidden="true"></div>';
 stage.appendChild(layer);return layer;
}
function duration(){return globalThis.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?0:260;}
function animate(layer,from,to,ms=duration()){
 layer.style.transform=to;
 if(!ms||!layer.animate)return Promise.resolve();
 const a=layer.animate([{transform:from},{transform:to}],{duration:ms,easing:'cubic-bezier(.22,.7,.2,1)'});
 return a.finished.catch(()=>{});
}
function setActive(layer,active){layer.inert=!active;layer.setAttribute('aria-hidden',String(!active));}
function saveCurrent(){const current=layers[layers.length-1];if(current){current.state={...state};current.focus=document.activeElement;}}
function focusBack(){const b=header.querySelector('.if-back');if(b)b.focus({preventScroll:true});}
async function push(screen,stock){
 if(busy)return;busy=true;saveCurrent();
 const previous=layers[layers.length-1];if(previous)setActive(previous.layer,false);
 state.screen=screen;if(screen==='stock'){state.stock=Number(stock)||0;state.tab='chart';}
 const layer=makeLayer();layers.push({layer,state:{...state}});bind(layer);render();
 await Promise.all([animate(layer,'translateX(100%)','translateX(0)'),previous?animate(previous.layer,'translateX(0)','translateX(-18%)'):Promise.resolve()]);
 busy=false;focusBack();
}
async function pop(start=0){
 if(busy||layers.length<2)return;busy=true;
 const current=layers[layers.length-1];const previous=layers[layers.length-2];
 const width=stage.getBoundingClientRect().width;
 await Promise.all([animate(current.layer,`translateX(${start}px)`,'translateX(100%)'),animate(previous.layer,`translateX(${-18*(1-start/width)}%)`,'translateX(0)')]);
 current.layer.remove();layers.pop();Object.assign(state,previous.state);bind(previous.layer);setActive(previous.layer,true);picker.value=state.screen;busy=false;
 if(previous.focus&&previous.layer.contains(previous.focus))previous.focus.focus({preventScroll:true});
}
function reset(screen='home'){
 if(busy)return;layers.forEach(x=>x.layer.remove());layers.length=0;state.screen=screen;state.tab='chart';
 const layer=makeLayer();layers.push({layer,state:{...state}});bind(layer);render();
}
root.addEventListener('click',e=>{
 if(busy||Date.now()<ignoreClickUntil)return;
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.back){pop();return;}
 if(b.dataset.root){reset(b.dataset.root);return;}
 if(b.dataset.go){push(b.dataset.go,b.dataset.stock);return;}
 if(b.dataset.tab)state.tab=b.dataset.tab;
 if(b.dataset.source)state.source=b.dataset.source;
 if(b.dataset.metric)state.metric=b.dataset.metric;
 if(b.dataset.memo)state.memo=!state.memo;
 render();
});
picker.addEventListener('change',()=>{
 if(busy){picker.value=state.screen;return;}
 const selected=picker.value;
 if(selected==='home'||selected==='history')reset(selected);
 else {reset('home');push(selected,0);}
});
root.addEventListener('input',e=>{
 if(e.target.id==='if-query'){
  const q=e.target.value.toLowerCase();content.querySelectorAll('#if-search-results button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q));
 }
});
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.screen==='stock'){e.preventDefault();pop();}});
stage.addEventListener('pointerdown',e=>{
 if(busy||state.screen!=='stock'||layers.length<2||!e.isPrimary||e.button!==0)return;
 const r=stage.getBoundingClientRect();if(e.clientX-r.left>24)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,start:performance.now(),width:r.width,dragging:false};
 stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(!gesture.dragging){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}if(dx<10||dx<Math.abs(dy)*1.2)return;gesture.dragging=true;}
 gesture.dx=Math.max(0,Math.min(gesture.width,dx));
 layers[layers.length-1].layer.style.transform=`translateX(${gesture.dx}px)`;
 layers[layers.length-2].layer.style.transform=`translateX(${-18*(1-gesture.dx/gesture.width)}%)`;
});
async function finishGesture(e,cancel=false){
 if(!gesture||e.pointerId!==gesture.id)return;
 const g=gesture;gesture=null;if(stage.hasPointerCapture(g.id))stage.releasePointerCapture(g.id);
 if(!g.dragging)return;ignoreClickUntil=Date.now()+350;
 const elapsed=Math.max(1,performance.now()-g.start);
 if(!cancel&&(g.dx>g.width*.28||(g.dx>48&&g.dx/elapsed>.55))){await pop(g.dx);return;}
 busy=true;await Promise.all([animate(layers[layers.length-1].layer,`translateX(${g.dx}px)`,'translateX(0)'),animate(layers[layers.length-2].layer,`translateX(${-18*(1-g.dx/g.width)}%)`,'translateX(-18%)')]);busy=false;
}
stage.addEventListener('pointerup',e=>finishGesture(e));
stage.addEventListener('pointercancel',e=>finishGesture(e,true));
reset();
if(globalThis.Tweak){const tweak=new Tweak({container:root,onChange:render});tweak.addSlider(design,'radius',{label:'카드 둥글기',min:8,max:24,unit:'px'});}
})();
