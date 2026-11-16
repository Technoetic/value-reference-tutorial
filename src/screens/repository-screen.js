import {BaseScreen} from './base-screen.js';
import {evaluateRepositoryScenario} from '../domain/customer-ledger.js';
import {escapeHTML as e} from '../shared/dom.js';

export class RepositoryScreen extends BaseScreen{
  mount(root){
    this.root=root;
    root.innerHTML=`
<section class="lesson">
  ${this.head()}
  <div class="repo-layout">
    <section class="repo-bench" aria-labelledby="bench-heading">
      <span class="tiny-label">REPOSITORY &amp; IDENTITY BENCH</span>
      <h2 id="bench-heading" class="sr-only">보관소 조회와 참조 동일성 비교 결과</h2>
      <div class="comparison-cards">
        <div class="comparison-card"><span class="tiny-label">주문 A의 손님</span><strong id="card-a-id">C-104</strong><span id="card-a-stamps">적립 후 9개</span></div>
        <div class="compare-symbol" aria-hidden="true" id="compare-symbol">===</div>
        <div class="comparison-card" id="card-b"><span class="tiny-label">주문 B의 손님</span><strong id="card-b-id">C-104</strong><span id="card-b-stamps">함께 9개</span></div>
      </div>
      <div class="comparison-results" id="repo-results" aria-live="polite"></div>
    </section>
    <form id="repo-form" class="control-card">
      <span class="eyebrow">보관소 조건을 바꿔 보세요</span>
      <label class="field-label" for="first-id">주문 A의 손님 ID</label>
      <select id="first-id">
        <option value="C-104" selected>C-104 · 민수 (기본 8개)</option>
        <option value="C-208">C-208 · 지현 (기본 4개)</option>
        <option value="C-315">C-315 · 서연 (기본 9개)</option>
      </select>
      <label class="field-label" for="second-id">주문 B의 손님 ID <small>직접 입력 가능</small></label>
      <input id="second-id" type="text" value="C-104" maxlength="16" autocomplete="off">
      <div class="preset-row" aria-label="주문 B 손님 ID 빠른 선택">
        <button type="button" class="chip-btn" data-second-id="C-104">같은 단골 C-104</button>
        <button type="button" class="chip-btn" data-second-id="C-208">다른 단골 C-208</button>
        <button type="button" class="chip-btn" data-second-id="C-999">신규 C-999</button>
      </div>
      <label class="checkbox"><input id="spread-copy" type="checkbox"><span>실수 재현: 주문 B에서 <code>{ ...customer }</code>로 얕은 복사해 버리기</span></label>
      <button class="button full" type="submit">보관소 비교 실행 →</button>
      <button class="text-button" type="button" id="repo-cancel" hidden>작성 중인 입력 취소</button>
      <p class="error" role="alert" id="repo-error"></p>
    </form>
  </div>
  <div class="insight"><span>⊙</span><p><b>보관소에서 꺼낸 뒤 다시 복사하면 참조가 끊어집니다.</b> <code>customerRepo.register(id)</code>가 같은 객체를 돌려주더라도, 호출자가 <code>{ ...customer }</code>나 새 생성자로 감싸 버리면 다시 값 복사로 돌아가요.</p></div>
  <div class="two-notes">
    <article><span class="tiny-label">같은 ID · 같은 참조</span><h2>C-104와 C-104</h2><p>보관소에 이미 등록된 ID를 다시 요청하면 새 객체를 만들지 않고 기존 인스턴스를 그대로 반환해요.</p></article>
    <article><span class="tiny-label">다른 ID · 별개 참조</span><h2>C-104와 C-208</h2><p>손님 ID가 다르면 보관소도 각각 독립된 참조 객체를 유지해요.</p></article>
  </div>
  ${this.foot()}
</section>`;
    const markDirty=()=>{this.dirty=true;root.querySelector('#repo-cancel').hidden=false;};
    this.on(root.querySelector('#repo-form'),'input',markDirty);
    this.on(root.querySelector('#repo-form'),'change',markDirty);
    this.on(root,'click',ev=>{
      const btn=ev.target.closest('[data-second-id]');
      if(!btn)return;
      root.querySelector('#second-id').value=btn.dataset.secondId;markDirty();
    });
    this.on(root.querySelector('#repo-cancel'),'click',()=>this.discard());
    this.on(root.querySelector('#repo-form'),'submit',ev=>{ev.preventDefault();this.saveDraft().catch(()=>{});});
    this.evaluate();
  }
  evaluate(){
    const firstId=this.root.querySelector('#first-id').value;
    const secondId=this.root.querySelector('#second-id').value;
    const spreadCopy=this.root.querySelector('#spread-copy').checked;
    const res=evaluateRepositoryScenario({firstId,secondId,spreadCopy});
    this.root.querySelector('#card-a-id').textContent=res.firstId;
    this.root.querySelector('#card-a-stamps').textContent=`주문 A +1 적립 후 ${res.orderAStamps}개`;
    this.root.querySelector('#card-b-id').textContent=res.secondId;
    this.root.querySelector('#card-b-stamps').textContent=`주문 B에서 읽은 값 ${res.orderBStamps}개`;
    this.root.querySelector('#compare-symbol').textContent=res.sameReference?'===':'!==';
    const rows=[
      ['같은 참조 객체인가?','orderA.customer === orderB.customer',res.sameReference,res.sameReference?'true · 같은 인스턴스':'false · 다른 객체'],
      ['논리적 손님 ID가 같은가?','orderA.customer.id === orderB.customer.id',res.sameLogicalId,res.sameLogicalId?'true · 같은 ID':'false · 다른 ID'],
      ['주문 A 적립이 B에도 반영됐는가?','orderA +1 → orderB.customer.stamps',res.syncedAfterStamp,res.syncedAfterStamp?'true · 즉시 반영됨':res.sameLogicalId?'false · 복사 때문에 끊김':'false · 다른 단골임'],
      ['보관소 등록 인원 수',`repo.size (${res.registeredIds.join(', ')})`,res.repositorySize===1,`${res.repositorySize}명 등록`]
    ];
    this.root.querySelector('#repo-results').innerHTML=rows.map(([label,code,yes,chip])=>`<div class="result-row"><div><strong>${e(label)}</strong><code>${e(code)}</code></div><span class="result-chip ${yes?'yes':'no'}">${e(chip)}</span></div>`).join('');
    this.dirty=false;this.root.querySelector('#repo-cancel').hidden=true;
  }
  async saveDraft(){
    const err=this.root.querySelector('#repo-error');
    try{this.evaluate();err.textContent='';}catch(error){err.textContent=error.message;throw error;}
  }
  discard(){
    super.discard();
    this.root.querySelector('#first-id').value='C-104';
    this.root.querySelector('#second-id').value='C-104';
    this.root.querySelector('#spread-copy').checked=false;
    this.root.querySelector('#repo-error').textContent='';
    this.evaluate();
  }
}
