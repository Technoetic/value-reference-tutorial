import {BaseScreen} from './base-screen.js';

export class IntroScreen extends BaseScreen{
  mount(root){
    root.innerHTML=`
<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow"><span class="live-dot"></span> INTERACTIVE REFACTORING LAB · 02</p>
    <h1>한 명의 단골.<br>하나의 <em>원장.</em></h1>
    <p class="hero-description">주문서마다 손님 카드를 복사해 두면,<br>아침에 적립한 스탬프를 오후 주문서는 왜 모를까요?</p>
    <p class="tech-title">Change Value to Reference<span>값에서 참조로</span></p>
    <a class="button hero-cta" href="#/copies" data-route="/copies">단골 원장 실험 시작 <span aria-hidden="true">↗</span></a>
    <div class="hero-meta"><span>6개 단계</span><span>직접 적립하고 비교</span><span>코드 지식 없이 시작</span></div>
  </div>
  <div class="hero-stage" aria-label="두 주문서가 각자 복사본을 쓰던 구조에서 단골 원장 참조 하나로 모이는 모형">
    <div class="stage-grid" aria-hidden="true"></div>
    <div class="stage-label">ONE CUSTOMER. ONE LEDGER.</div>
    <div class="floating-ledger">
      <span class="ledger-pin" aria-hidden="true"></span>
      <span class="tiny-label">CUSTOMER REPOSITORY · #C-104</span>
      <strong>민수<span>GOLD</span></strong>
      <span class="ledger-rule"></span>
      <span>복사본 여러 장 <b>→</b> 공유 참조 하나</span>
    </div>
    <div class="stage-connector" aria-hidden="true"></div>
    <div class="mini-orders">
      <div><span class="cup-icon" aria-hidden="true">☕</span><span>주문 #101 · 아침</span><b>→ #C-104</b></div>
      <div><span class="cup-icon" aria-hidden="true">🥛</span><span>주문 #102 · 오후</span><b>→ #C-104</b></div>
    </div>
    <span class="stage-footnote">스탬프를 적립하고 두 주문서를 비교해 보세요.</span>
  </div>
</section>
<section class="intro-strip" aria-label="학습 순서">
  <div><span>01 — DRIFT</span><h2>복사본이 갈라지는 순간</h2><p>같은 손님 ID여도 새 객체를 매번 만들면 상태가 어긋납니다.</p></div>
  <div><span>02 — REPOSITORY</span><h2>보관소에서 찾아 연결하기</h2><p>ID 하나당 단 하나의 손님 객체만 등록해 참조를 나눕니다.</p></div>
  <div><span>03 — BOUNDARY</span><h2>참조와 값의 올바른 경계</h2><p>살아 움직이는 개체는 참조로, 스냅숏 금액은 값으로 둡니다.</p></div>
</section>
<section class="source-note">
  <p><b>마틴 파울러의 리팩토링을 손으로 이해하기.</b> 공식 카탈로그의 Order/Customer/Repository 예제를 카페 단골 스탬프 원장으로 각색한 비공식 학습 도구입니다. 실제 매장 운영 시스템이 아닙니다.</p>
  <a href="https://refactoring.com/catalog/changeValueToReference.html" target="_blank" rel="noopener">공식 기법 보기 ↗</a>
</section>`;
  }
}
