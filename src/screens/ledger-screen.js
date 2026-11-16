import {BaseScreen} from './base-screen.js';
import {escapeHTML as e,won,parseStamps,cleanMemo} from '../shared/dom.js';

export class LedgerScreen extends BaseScreen{
  constructor(app,lesson,mode){
    super(app,lesson);
    this.mode=mode;
    this.side='order101';
  }
  mount(root){
    this.root=root;
    const isRef=this.mode==='reference';
    const defaultMemo=this.app.labs[this.mode].snapshot().order101.customer.memo;
    root.innerHTML=`
<section class="lesson">
  ${this.head()}
  <div class="lab-layout">
    <section class="lab-board ${isRef?'ref-board':''}" aria-labelledby="board-title">
      <div class="board-top">
        <div>
          <span class="tiny-label">LIVE OBJECT MAP</span>
          <h2 id="board-title">${isRef?'단골 보관소의 같은 객체를 공유 참조':'주문서마다 손님 카드를 새로 복사'}</h2>
        </div>
        <span class="mode-pill">${isRef?'AFTER / 보관소 공유 참조':'BEFORE / 주문별 값 복사'}</span>
      </div>
      <div id="experiment-map"></div>
      <div class="board-callout" id="map-callout" role="status" aria-live="polite"></div>
    </section>
    <div class="lab-controls">
      <form id="ledger-form" class="control-card">
        <span class="eyebrow">직접 갱신해 보세요</span>
        <fieldset>
          <legend>어느 주문서 경로로 갱신할까요?</legend>
          <div class="segmented">
            <label><input type="radio" name="side" value="order101" checked><span>주문 #101 (아침)</span></label>
            <label><input type="radio" name="side" value="order102"><span>주문 #102 (오후)</span></label>
          </div>
        </fieldset>
        <label class="field-label" for="stamp-input">추가 적립 스탬프 <small>0 ~ 10개 · 10개부터 GOLD</small></label>
        <div class="amount-field">
          <input id="stamp-input" name="stamps" type="text" inputmode="numeric" value="2" maxlength="4" autocomplete="off" aria-describedby="stamp-help">
          <span>개</span>
        </div>
        <p class="field-help" id="stamp-help">처음 8개에서 2개를 더하면 GOLD(500원 할인)로 승급해요.</p>
        <label class="field-label" for="memo-input">단골 요청 메모 <small>36자 이내</small></label>
        <input id="memo-input" name="memo" type="text" value="${e(defaultMemo)}" maxlength="36" autocomplete="off">
        <div class="preset-row" aria-label="빠른 메모 예시">
          <button type="button" class="chip-btn" data-preset-memo="텀블러 지참">텀블러 지참</button>
          <button type="button" class="chip-btn" data-preset-memo="오트밀크 변경">오트밀크 변경</button>
          <button type="button" class="chip-btn" data-preset-memo="디카페인 원두">디카페인 원두</button>
        </div>
        <button class="button full" type="submit" id="apply-ledger">${isRef?'보관소 참조 카드 갱신':'선택한 주문의 카드만 갱신'} <span aria-hidden="true">→</span></button>
        <button class="text-button" type="button" id="cancel-draft" hidden>작성 중인 입력 취소</button>
        <p class="error" id="ledger-error" role="alert"></p>
      </form>
      <div class="code-caption">
        <span class="tiny-label">일어나는 일</span>
        <code>${isRef?'this.customer = customerRepo.register(data.customerId)':'this.customer = new Customer(data.customerId)'}</code>
        <p>${isRef?'두 주문서가 보관소에서 찾은 똑같은 R1 인스턴스를 가리켜요. 어디서 스탬프나 메모를 고쳐도 두 주문이 함께 최신 상태를 읽어요.':'손님 ID는 둘 다 #C-104로 같지만 new Customer를 두 번 호출해 C1과 C2로 갈라졌어요. 한쪽만 바꾸면 곧바로 데이터 불일치가 생겨요.'}</p>
      </div>
      <button class="text-button reset-button" type="button" id="reset-experiment">↺ 이 실험 처음부터</button>
    </div>
  </div>
  <section class="event-log" aria-labelledby="log-title"><h2 id="log-title">변화 기록</h2><ol id="events"></ol></section>
  <div class="insight"><span>!</span><p>${isRef?'<b>참조 객체의 핵심은 정체성(Identity)과 단일 진입점입니다.</b> 손님 ID가 같을 때 항상 같은 인스턴스를 돌려줄 보관소(Repository)가 있어야 Change Value to Reference가 완성돼요.':'<b>논리적으로 한 사람인데 메모리에는 두 객체가 생겼어요.</b> 시간에 따라 변하는 단골 상태를 복사본마다 따로 들면 반드시 서로 어긋나요.'}</p></div>
  ${this.foot()}
</section>`;
    const form=root.querySelector('#ledger-form');
    const markDirty=()=>{this.dirty=true;root.querySelector('#cancel-draft').hidden=false;};
    this.on(form,'input',markDirty);
    this.on(form,'change',ev=>{
      if(ev.target.name==='side'){
        this.side=ev.target.value;
        const snap=this.app.labs[this.mode].snapshot();
        if(!this.dirty)root.querySelector('#memo-input').value=snap[this.side].customer.memo;
        this.draw();
      }else markDirty();
    });
    this.on(root,'click',ev=>{
      const preset=ev.target.closest('[data-preset-memo]');
      if(!preset)return;
      root.querySelector('#memo-input').value=preset.dataset.presetMemo;
      markDirty();
    });
    this.on(form,'submit',ev=>{ev.preventDefault();this.saveDraft().catch(()=>{});});
    this.on(root.querySelector('#cancel-draft'),'click',()=>this.discard());
    this.on(root.querySelector('#reset-experiment'),'click',async()=>{
      if(this.app.saving)return;
      this.app.labs[this.mode].reset();
      this.app.progress[this.mode]=[];
      this.discard();this.draw();
      await this.app.persist().catch(()=>{});
    });
    this.draw();
  }
  draw(){
    const s=this.app.labs[this.mode].snapshot(),shared=s.sameReference;
    const renderOrder=key=>{
      const o=s[key],c=o.customer;
      return `<div class="owner-card ${this.side===key?'selected':''}" data-owner="${key}"><span class="tiny-label">${e(o.orderNo)}</span><span class="cup-badge" aria-hidden="true">${key==='order101'?'☕':'🥛'}</span><h3>${e(o.menu)}</h3><strong data-stamps="${key}">스탬프 ${c.stamps}개</strong><p class="card-meta"><span class="tier-pill ${c.tier==='GOLD'?'gold':''}">${e(c.tier)} · 할인 ${won(c.discount)}</span></p><p class="card-memo">메모: ${e(c.memo)}</p><span class="reference-link">customer (${e(c.id)}) <b>↓ ${e(c.objectId)}</b></span></div>`;
    };
    const renderCustomer=c=>`<div class="customer-object ${s.hasDrift?'drifted':''}"><span class="object-id">${e(c.objectId)}</span><span>${this.mode==='reference'?'보관소 등록 단일 참조':'주문서 내부 복사본'} · ${e(c.name)}(${e(c.id)})</span><strong>${c.stamps}개 · ${e(c.tier)}</strong><small>할인 ${won(c.discount)} · 메모 "${e(c.memo)}"</small></div>`;
    this.root.querySelector('#experiment-map').innerHTML=`<div class="orders-grid">${renderOrder('order101')}${renderOrder('order102')}</div><div class="connection-tree ${shared?'shared':'separate'}" aria-hidden="true"><i></i><i></i></div><div class="object-row ${shared?'shared':''}">${renderCustomer(s.order101.customer)}${shared?'':renderCustomer(s.order102.customer)}</div><div class="status-strip"><span><code>order101.customer === order102.customer</code>: <b>${shared?'true (같은 객체)':'false (별개 복사본)'}</b></span><span>상태 불일치(Drift): <b class="${s.hasDrift?'warn':'ok'}">${s.hasDrift?'발생함! 두 주문서의 단골 정보가 다름':'없음 (일치)'}</b></span></div><p class="identity-caption">C1·C2·R1은 참조 연결을 보여 주는 실험용 이름표이며 실제 메모리 주소가 아니에요.</p>`;
    const applied=this.app.progress[this.mode].length,callout=this.root.querySelector('#map-callout');
    callout.textContent=!applied
      ?(this.mode==='copies'?'주문 #101에 스탬프 2개를 적립해 GOLD로 승급시켜 보세요. 오후 주문 #102도 함께 바뀌는지 확인해요.':'이제 같은 손님 #C-104의 두 주문서가 보관소의 R1 하나를 함께 가리켜요. 스탬프 2개를 적립해 보세요.')
      :(this.mode==='copies'?(s.hasDrift?'같은 손님(#C-104 민수)인데 두 주문서의 스탬프·등급·메모가 갈라졌어요! 복사본 구조의 전형적인 어긋남이에요.':'우연히 숫자를 맞췄더라도 여전히 서로 다른 객체(C1 ≠ C2)라서 다음 변경 때 다시 갈라져요.'):'보관소의 R1 하나만 갱신했는데 두 주문서 모두 같은 스탬프·등급·메모를 일관되게 보여 줘요.');
    this.root.querySelector('#events').innerHTML=s.events.length?s.events.map(x=>`<li>${e(x)}</li>`).join(''):'<li class="empty">아직 변경하지 않았어요. 단골 #C-104 민수는 현재 스탬프 8개(SILVER) 상태예요.</li>';
  }
  async saveDraft(){
    if(this.app.saving)throw Error('이미 저장 중이에요. 잠시 기다려 주세요.');
    const err=this.root.querySelector('#ledger-error');err.textContent='';
    try{
      const stamps=parseStamps(this.root.querySelector('#stamp-input').value);
      const memo=cleanMemo(this.root.querySelector('#memo-input').value);
      const side=this.root.querySelector('input[name="side"]:checked').value;
      if(this.app.progress[this.mode].length>=60)throw Error('60회 실험을 마쳤어요. 처음부터 다시 시작해 주세요.');
      this.app.labs[this.mode].applyUpdate({side,stamps,memo});
      this.side=side;this.app.progress[this.mode].push({side,stamps,memo});
      this.dirty=false;this.root.querySelector('#cancel-draft').hidden=true;
      this.draw();await this.app.persist();
    }catch(error){err.textContent=error.message;throw error;}
  }
  discard(){
    super.discard();
    const snap=this.app.labs[this.mode].snapshot();
    this.root.querySelector('#stamp-input').value='2';
    this.root.querySelector('#memo-input').value=snap[this.side].customer.memo;
    this.root.querySelector('#cancel-draft').hidden=true;
    this.root.querySelector('#ledger-error').textContent='';
  }
}
