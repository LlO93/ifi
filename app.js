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
window.IFDemo.init(state);
const design={radius:12,relatedPreview:true};
const { button: btn, field, stockList } = window.IFComponents;
const names = ['예시 반도체 B', '예시 반도체 C', '예시 반도체 D'];
const stocks = () => stockList(names, state);
function render(){
picker.value=state.screen;nav.hidden=['search','input','stock'].includes(state.screen);
header.innerHTML=(layers.length>1?'<button class="if-back" data-back="true" aria-label="이전 화면으로">←</button>':'')+'<strong>'+(state.screen==='stock'?names[state.stock]:'<span class="if-brand">IF</span>그 주식 샀다면')+'</strong><span class="if-small">'+(state.screen==='stock'?'DEMO'+(state.stock+1):'미국 주식')+'</span>';
footer.hidden=state.screen!=='stock';
footer.innerHTML=state.screen==='stock'?btn('DEMO'+(state.stock+1)+' 이날 샀다면?','input',true):'';
edge.hidden=state.screen!=='stock';
let s='';
if(state.screen==='home')s=`<div class="if-kicker">DISCOVER YOUR NEXT IF</div><h2>어떤 선택이 궁금하세요?</h2><button class="if-search-entry" data-go="search">종목명 또는 티커 검색 <span aria-hidden="true">＋</span></button><div class="if-box"><h3>미국 주식 순위</h3><div class="if-small">가상 종목 · 예시 순위</div><div class="if-tabs"><button data-metric="거래량" aria-pressed="${state.metric==='거래량'}">거래량</button><button data-metric="시가총액" aria-pressed="${state.metric==='시가총액'}">시가총액</button></div>${stocks()}<p class="if-small">${state.metric} 순 · 지원 종목 기준</p></div>`;
if(state.screen==='search')s=`<h2>종목 검색</h2><label>종목명 또는 티커<input id="if-query" placeholder="이름 또는 티커 입력"></label><h3>예시 검색 결과</h3><div id="if-search-results">${stocks()}</div>`;
s=window.IFDemo.render(state,stocks)??s;
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
 state.screen=screen;if(screen==='stock'){state.stock=Number(stock)||0;state.tab='chart';window.IFDemo.init(state);}
 const layer=makeLayer();layers.push({layer,state:{...state}});bind(layer);render();
 await Promise.all([animate(layer,'translateX(100%)','translateX(0)'),previous?animate(previous.layer,'translateX(0)','translateX(-18%)'):Promise.resolve()]);
 busy=false;focusBack();
}
async function pop(start=0){
 if(busy||layers.length<2)return;busy=true;
 const current=layers[layers.length-1];const previous=layers[layers.length-2];
 const width=stage.getBoundingClientRect().width;
 await Promise.all([animate(current.layer,`translateX(${start}px)`,'translateX(100%)'),animate(previous.layer,`translateX(${-18*(1-start/width)}%)`,'translateX(0)')]);
 current.layer.remove();layers.pop();Object.assign(state,previous.state);bind(previous.layer);setActive(previous.layer,true);picker.value=state.screen;busy=false;if(state.screen==='history')render();
 if(previous.focus&&previous.layer.contains(previous.focus))previous.focus.focus({preventScroll:true});
}
function reset(screen='home'){
 if(busy)return;layers.forEach(x=>x.layer.remove());layers.length=0;state.screen=screen;state.tab='chart';
 const layer=makeLayer();layers.push({layer,state:{...state}});bind(layer);render();
}
root.addEventListener('click',e=>{
 if(busy||Date.now()<ignoreClickUntil)return;
 const point=e.target.closest('[data-date]');if(point){state.date=point.dataset.date;render();return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.calculate){const result=window.IFDemo.calculate(state);if(result.error){state.error=result.error;content.querySelector('#demo-error').textContent=result.error;const field=content.querySelector('#'+result.field);if(field)field.focus();return;}state.error='';state.result=result;window.IFRecords.create(state);push('result');return;}
 if(b.dataset.recordDelete){state.deleteConfirm=true;state.deleteError='';render();content.querySelector('[data-delete-cancel]').focus();return;}
 if(b.dataset.deleteCancel){state.deleteConfirm=false;render();content.querySelector('[data-record-delete]').focus();return;}
 if(b.dataset.deleteConfirm){if(window.IFRecords.remove(state)){state.result=null;state.record=null;reset('history');setTimeout(()=>{const notices=content.querySelector('#record-notices');if(notices)notices.innerHTML=window.IFRecords.notices();},5100);}else render();return;}
 if(b.dataset.recordUndo){window.IFRecords.undo(b.dataset.recordUndo);render();return;}
 if(b.dataset.recordId){if(window.IFRecords.open(state,b.dataset.recordId))push('result');else render();return;}
 if(b.dataset.memoEdit){state.memoEditing=true;render();content.querySelector('#memo-0').focus();return;}
 if(b.dataset.memoClose){state.memoEditing=false;render();return;}
 if(b.dataset.memoSave||b.dataset.recordRetry){window.IFRecords.save(state);render();return;}
 if(b.dataset.recordCopy){Object.assign(state,state.record.inputs,{error:''});push('input');return;}
 if(b.dataset.recordFilter){state.recordFilter=b.dataset.recordFilter;render();return;}
 if(b.dataset.recordReload){render();return;}
 if(b.dataset.period)state.period=b.dataset.period;
 if(b.dataset.budgetMode)state.budgetMode=b.dataset.budgetMode;
 if(b.dataset.back){pop();return;}
 if(b.dataset.root){reset(b.dataset.root);return;}
 if(b.dataset.go){push(b.dataset.go,b.dataset.stock);return;}
 if(b.dataset.tab)state.tab=b.dataset.tab;
 if(b.dataset.source){state.source=b.dataset.source;state.error='';}
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
root.addEventListener('change',e=>{if(e.target.dataset.demo==='date'){state.date=e.target.value;state.error='';render();}});
root.addEventListener('input',e=>{
 if(e.target.dataset.memoIndex!==undefined){state.memoDraft=state.memoDraft.map((m,i)=>i===Number(e.target.dataset.memoIndex)?e.target.value:m);return;}
 if(e.target.id==='record-query'){state.recordQuery=e.target.value;content.querySelector('#record-cards').innerHTML=window.IFRecords.cards(state.recordQuery,state.recordFilter);return;}
 const key=e.target.dataset.demo;
 if(key&&key!=='date'){state[key]=e.target.value;state.error='';const summary=content.querySelector('#demo-summary');if(summary)summary.innerHTML=window.IFDemo.summary(state);const error=content.querySelector('#demo-error');if(error)error.textContent='';}

 if(e.target.id==='if-query'){
  const q=e.target.value.toLowerCase();content.querySelectorAll('#if-search-results button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q));
 }
});
root.addEventListener('keydown',e=>{if(e.target.closest('[data-date]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.closest('[data-date]').dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}if(e.key==='Escape'&&state.screen==='stock'){e.preventDefault();pop();}});
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
