// 공통 UI HTML 생성. 화면 상태는 호출자가 전달합니다.
window.IFComponents = (() => {
  const button=(text,go,main=false)=>`<button class="${main?'if-main':''}" data-go="${go}">${text}</button>`;
  const field=(label,value,type='text')=>`<label>${label}<input type="${type}" value="${value}"></label>`;
  const stockList=(names,state)=>names.map((n,i)=>({n,i})).filter(({i})=>state.screen!=='stock'||i!==state.stock).map(({n,i})=>`<button class="if-row" data-go="stock" data-stock="${i}"><span class="if-company"><span class="if-rank">${i+1}</span><span class="if-logo">${['B','C','D'][i]}</span><span class="if-company-name">${n}<br><span class="if-small">DEMO${i+1}</span></span></span><span class="if-right">$${100+i*20}.00<br><span class="if-small if-positive">+${i+1}.20%</span></span></button>`).join('');

  return { button, field, stockList };
})();
