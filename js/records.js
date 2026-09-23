// 데모 기록은 이 브라우저에만 저장합니다. 서버·계정 간 동기화는 없습니다.
window.IFRecords = (() => {
  const key='invest-if.demo-records.v1';
  const fields=['stock','date','cash','held','sell','source','budgetMode','budget'];
  const titles=['그때 왜 관심이 갔나요?','실행하지 않은 이유는 무엇인가요?','지금 돌아보면 어떤 생각이 드나요?'];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  let readError='';
  const pendingDeletes=new Map();
  function write(records){
    try{localStorage.setItem(key,JSON.stringify(records));return true;}catch{return false;}
  }
  function remove(s){
    const records=read();
    if(!records){s.deleteError=readError;return false;}
    const index=records.findIndex(r=>r.id===s.record?.id);
    if(index<0){s.deleteError='기록을 찾지 못했어요. 내 기록에서 다시 확인해주세요.';return false;}
    const record=records[index];
    if(!write(records.filter(r=>r.id!==record.id))){s.deleteError='삭제하지 못했어요. 기존 기록은 그대로 있어요. 브라우저 저장 설정을 확인하고 다시 시도해주세요.';return false;}
    pendingDeletes.set(record.id,{record,index,expires:Date.now()+5000,error:''});
    s.deleteConfirm=false;s.deleteError='';return true;
  }
  function undo(id){
    const pending=pendingDeletes.get(id);
    if(!pending||pending.expires<=Date.now()){pendingDeletes.delete(id);return false;}
    const records=read();
    if(!records){pending.error=readError;return false;}
    // 다른 탭에서 이미 복원한 경우에도 중복 기록을 만들지 않습니다.
    if(!records.some(r=>r.id===id)){
      records.splice(Math.min(pending.index,records.length),0,pending.record);
      if(!write(records)){pending.error='복원하지 못했어요. 남은 시간 안에 다시 시도해주세요.';return false;}
    }
    pendingDeletes.delete(id);return true;
  }
  function notices(){
    for(const [id,p] of pendingDeletes)if(p.expires<=Date.now())pendingDeletes.delete(id);
    return [...pendingDeletes].map(([id,p])=>`<div class="if-undo" role="status"><span>DEMO${p.record.result.stock+1} · ${escape(p.record.result.date)} 기록을 삭제했어요.<br><small>5초 안에 취소할 수 있어요. 새로고침하면 취소할 수 없어요.</small></span><button data-record-undo="${escape(id)}">실행 취소</button>${p.error?`<p class="if-error">${escape(p.error)}</p>`:''}</div>`).join('');
  }
  function deleteControls(s){
    if(!s.recordSaved)return '';
    if(!s.deleteConfirm)return '<button class="if-danger" data-record-delete="true">이 기록 삭제</button>';
    return `<section class="if-box" role="group" aria-labelledby="delete-title"><h3 id="delete-title">이 기록을 삭제할까요?</h3><p>DEMO${s.record.result.stock+1} · ${escape(s.record.result.date)} 매수 가정</p><p class="if-note">계산 결과와 복기 메모를 함께 삭제해요. 삭제 후 5초 동안 실행 취소할 수 있어요.</p><p class="if-error" role="alert">${escape(s.deleteError||'')}</p><div class="if-tabs"><button data-delete-cancel="true">취소</button><button class="if-danger" data-delete-confirm="true">삭제하기</button></div></section>`;
  }
  function read(){
    try{
      const raw=localStorage.getItem(key),records=raw?JSON.parse(raw):[];
      if(!Array.isArray(records)||records.some(r=>!r||typeof r.id!=='string'||!r.result||!r.inputs||!Array.isArray(r.memo)||r.memo.length!==3||r.memo.some(m=>typeof m!=='string'||m.length>1000)||!Number.isInteger(r.result.stock)||r.result.stock<0||r.result.stock>2||typeof r.result.date!=='string'||['total','keep','difference','current','old','remaining','count','held','sell'].some(f=>!Number.isFinite(r.result[f]))||fields.some(f=>f==='stock'?!Number.isInteger(r.inputs[f]):typeof r.inputs[f]!=='string')))throw Error('format');
      if(records.some(r=>!/^\d{4}-\d{2}-\d{2}$/.test(r.result.date)||r.inputs.date!==r.result.date||r.inputs.stock!==r.result.stock||!['cash','stock','both'].includes(r.inputs.source)||!['100','50','30','custom'].includes(r.inputs.budgetMode)||['cash','held','sell','budget'].some(f=>!/^[-+\d.eE]*$/.test(r.inputs[f]))))throw Error('inputs');
      readError='';return records;
    }catch{readError='기록을 불러오지 못했어요. 브라우저 저장 설정을 확인하고 다시 시도해주세요. 기존 데이터는 덮어쓰지 않았어요.';return null;}
  }
  function persist(record){
    const records=read();if(!records)return {error:readError};
    const i=records.findIndex(r=>r.id===record.id);
    if(i<0)records.unshift(record);else records[i]=record;
    try{localStorage.setItem(key,JSON.stringify(records));return {record};}
    catch{return {error:'아직 저장되지 않았어요. 브라우저 저장 공간이나 설정을 확인한 뒤 다시 시도해주세요.'};}
  }
  function create(s){
    const record={id:crypto.randomUUID(),createdAt:new Date().toISOString(),inputs:Object.fromEntries(fields.map(f=>[f,s[f]])),result:{...s.result},memo:['','','']};
    s.record=record;s.memoDraft=[...record.memo];s.memoEditing=false;s.deleteConfirm=false;s.deleteError='';
    const saved=persist(record);s.recordSaved=!saved.error;s.recordError=saved.error||'';
  }
  function open(s,id){
    const record=read()?.find(r=>r.id===id);if(!record)return false;
    Object.assign(s,record.inputs,{result:{...record.result},record,memoDraft:[...record.memo],memoEditing:false,recordSaved:true,recordError:'',deleteConfirm:false,deleteError:''});return true;
  }
  function save(s){
    const record={...s.record,memo:[...s.memoDraft]};const saved=persist(record);
    s.recordError=saved.error||'';
    if(!saved.error){s.record=record;s.recordSaved=true;s.memoEditing=false;}
    return !saved.error;
  }
  function detail(s){
    if(!s.record)return '';
    return `<div class="if-box"><p class="${s.recordError?'if-error':'if-note'}" role="status">${escape(s.recordError||(s.recordSaved?'이 브라우저에 저장했어요.':'아직 저장되지 않았어요.'))}</p>${s.recordError?'<button data-record-retry="true">저장 다시 시도</button>':''}<h3>나의 투자 복기</h3>${s.memoEditing?titles.map((t,i)=>`<label for="memo-${i}">${t}</label><textarea id="memo-${i}" data-memo-index="${i}" maxlength="1000" rows="3" placeholder="생각을 편하게 적어보세요">${escape(s.memoDraft[i])}</textarea>`).join('')+'<p class="if-note">항목별 최대 1,000자 · 저장을 눌러야 기록에 반영돼요.</p><div class="if-tabs"><button class="if-main" data-memo-save="true">메모 저장</button><button data-memo-close="true">접기</button></div>':s.record.memo.some(Boolean)?s.record.memo.map((m,i)=>`<p class="if-small">${titles[i]}</p><p class="if-memo-text">${escape(m)||'아직 작성하지 않았어요.'}</p>`).join('')+'<button data-memo-edit="true">메모 수정</button>':'<p class="if-note">결과와 함께 당시의 생각을 남겨보세요.</p><button data-memo-edit="true">복기 메모 작성</button>'}</div><p class="if-note">같은 브라우저·접속 주소에서만 볼 수 있어요. 브라우저 데이터를 지우면 기록도 삭제돼요.</p><div class="if-tabs"><button data-record-copy="true">조건 바꿔 새로 계산</button><button data-root="history">내 기록 보기</button></div>${deleteControls(s)}`;
  }
  function cards(query='',source='all'){
    const records=read();if(!records)return `<p class="if-error" role="alert">${escape(readError)}</p><button data-record-reload="true">다시 불러오기</button>`;
    const names=['예시 반도체 B','예시 반도체 C','예시 반도체 D'];
    const filtered=records.filter(r=>(source==='all'||r.inputs.source===source)&&`${names[r.result.stock]} DEMO${r.result.stock+1}`.toLowerCase().includes(query.toLowerCase()));
    if(!records.length)return '<div class="if-box"><h3>아직 계산한 기록이 없어요</h3><p class="if-note">계산을 완료하면 조건과 결과를 여기에 저장해요.</p><button data-root="home">종목 둘러보기</button></div>';
    if(!filtered.length)return '<p role="status">조건에 맞는 기록이 없어요. 검색어나 필터를 바꿔보세요.</p>';
    return `<p class="if-note">${filtered.length}개 · 최신 계산순</p>`+filtered.map(r=>`<button class="if-record-card" data-record-id="${escape(r.id)}"><strong>${names[r.result.stock]} · DEMO${r.result.stock+1}</strong><span class="if-small">${escape(r.result.date)} 매수 가정 → 2026-09-22 평가</span><span class="if-price">${money(r.result.total)}</span><span>유지 대비 ${r.result.difference>=0?'+':'−'}${money(Math.abs(r.result.difference))}</span><span class="if-small if-memo-preview">${escape(r.memo.find(Boolean)||'복기 메모를 남겨보세요.')}</span></button>`).join('');
  }
  function history(s){return `<h2>내 기록</h2><div id="record-notices">${notices()}</div><p class="if-note">이 브라우저에서 만든 데모 기록 · 실제 시세가 아니에요.</p><label for="record-query">종목명 또는 티커 검색</label><input id="record-query" value="${escape(s.recordQuery||'')}" placeholder="예: DEMO1"><div class="if-tabs">${[['all','전체'],['cash','예수금'],['stock','주식 정리'],['both','혼합']].map(([v,t])=>`<button data-record-filter="${v}" aria-pressed="${(s.recordFilter||'all')===v}">${t}</button>`).join('')}</div><div id="record-cards">${cards(s.recordQuery,s.recordFilter)}</div>`;}
  return {create,open,save,detail,history,cards,remove,undo,notices,deleteControls};
})();
