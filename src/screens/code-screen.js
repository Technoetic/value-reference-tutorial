import {BaseScreen} from './base-screen.js';
import {escapeHTML as e} from '../shared/dom.js';

const BEFORE=`// BEFORE: 주문마다 손님 객체를 새로 생성(값 복사)한다.
class Order {
  constructor(data) {
    this._number = data.number;
    this._customer = new Customer(data.customer);
  }
  get customer() { return this._customer; }
}`;

const AFTER=`// AFTER: 보관소(Repository)에서 ID로 공유 참조를 받아 온다.
class Order {
  constructor(data) {
    this._number = data.number;
    this._customer = registerCustomer(data.customer);
  }
  get customer() { return this._customer; }
}`;

const REPO=`let _repositoryData;

export function initialize() {
  _repositoryData = { customers: new Map() };
}

export function registerCustomer(id) {
  if (!_repositoryData.customers.has(id)) {
    _repositoryData.customers.set(id, new Customer(id));
  }
  return findCustomer(id);
}

export function findCustomer(id) {
  return _repositoryData.customers.get(id);
}

const o1 = new Order({ number: 101, customer: "C-104" });
const o2 = new Order({ number: 102, customer: "C-104" });
o1.customer === o2.customer; // true: 단 하나의 공유 참조`;

export class CodeScreen extends BaseScreen{
  mount(root){
    root.innerHTML=`<section class="lesson">${this.head()}<div class="code-pair"><article><div class="code-label"><span>BEFORE</span><b>매번 새 복사본을 생성</b></div><pre><code>${e(BEFORE)}</code></pre></article><article><div class="code-label after"><span>AFTER</span><b>보관소에서 단일 참조를 조회</b></div><pre><code>${e(AFTER)}</code></pre></article></div><div class="insight"><span>⊙</span><p><b>반대 방향 리팩토링(Change Reference to Value)과 짝을 이뤄 기억하세요.</b> 값 자체가 의미의 전부이고 변경 파급을 막고 싶을 때는 불변 <b>값(Value)</b>으로 나누고, 실세계의 같은 대상이 변할 때 모든 곳이 최신 상태를 함께 봐야 한다면 <b>참조(Reference) + 보관소(Repository)</b>로 모읍니다.</p></div><section class="repo-code"><div><span class="eyebrow">REPOSITORY PATTERN</span><h2>같은 ID에는<br>언제나 같은 객체.</h2><p>보관소는 이미 등록된 ID면 기존 객체를 돌려주고, 처음 본 ID면 한 번만 생성해 기록합니다. 덕분에 주문서가 백 장으로 늘어나도 손님 #C-104는 메모리에 단 하나뿐입니다.</p><p class="field-help">아래 코드는 마틴 파울러 카탈로그의 핵심 구조를 보여 주는 최소 예시입니다. 테스트 격리를 위해 전역 싱글턴 대신 Order 생성자에 보관소 인스턴스를 주입할 수도 있습니다.</p></div><pre><code>${e(REPO)}</code></pre></section><section class="two-notes"><article><span class="tiny-label">참조 객체(Reference)가 맞는 경우</span><h2>단골 손님 · 계좌 · 설비</h2><p>고유 ID로 식별되고, 시간이 지나며 상태(등급·스탬프·가동 상태)가 갱신될 때 연결된 모든 주문·작업이 일관된 최신 상태를 봐야 하는 개체예요.</p></article><article><span class="tiny-label">값 객체(Value)로 남겨 둘 경우</span><h2>결제 시점 금액 · 과거 영수증 스냅숏</h2><p>나중에 메뉴 가격이나 회원 등급이 바뀌더라도 이미 결제된 옛 영수증의 결제 금액까지 따라 바뀌면 안 돼요. 그럴 때는 불변 값으로 남깁니다.</p></article></section><section class="checklist"><h2>안전하게 리팩토링하는 네 단계</h2><ol><li>관련 객체를 담을 <b>보관소(Repository)</b>를 만든다 (이미 있다면 그대로 활용한다).</li><li>ID로 기존 객체를 찾고 없을 때만 등록하는 조회·등록 함수를 준비한다.</li><li>소유 객체(<code>Order</code>)의 생성자가 보관소를 통해 참조를 얻도록 바꾼다.</li><li>공유 참조가 된 뒤 의도치 않은 복사(<code>{ ...customer }</code>)나 동시 변경 부작용이 없는지 테스트로 검증한다.</li></ol></section><section class="source-note"><div><h2>원문과 짝꿍 튜토리얼 보기</h2><p>마틴 파울러의 공식 Order/Customer 예제를 카페 단골 스탬프 원장으로 재구성했습니다. 반대 방향 기법인 Change Reference to Value 튜토리얼과 함께 비교해 보세요.</p></div><div class="source-links">${this.app.content.sources.map(s=>`<a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.title)} <span aria-hidden="true">↗</span><span class="sr-only"> (새 탭)</span></a>`).join('')}<a href="https://technoetic.github.io/reference-value-tutorial/" target="_blank" rel="noopener">짝꿍: Change Reference to Value ↗<span class="sr-only"> (새 탭)</span></a><a href="https://github.com/Technoetic/value-reference-tutorial" target="_blank" rel="noopener">튜토리얼 소스 ↗<span class="sr-only"> (새 탭)</span></a></div></section>${this.foot()}</section>`;
  }
}
