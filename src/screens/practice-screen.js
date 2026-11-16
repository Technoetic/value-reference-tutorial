import {BaseScreen} from './base-screen.js';
import {escapeHTML as e} from '../shared/dom.js';

export class PracticeScreen extends BaseScreen{
  mount(root){
    this.root=root;
    this.draftNote=this.app.progress.note;
    this.draw();
    this.on(root,'click',async ev=>{
      const b=ev.target.closest('[data-answer]');
      if(!b||this.app.saving)return;
      const q=this.app.content.questions.find(item=>item.id===b.dataset.question);
      if(!q||!q.options.some(o=>o.id===b.dataset.answer))return;
      this.app.progress.answers[q.id]=b.dataset.answer;
      this.draw();
      root.querySelector(`[data-question="${q.id}"][data-answer="${b.dataset.answer}"]`)?.focus();
      await this.app.persist().catch(()=>{});
    });
    this.on(root,'input',ev=>{
      if(ev.target.id==='learner-note'){
        this.draftNote=ev.target.value;
        this.dirty=ev.target.value!==this.app.progress.note;
      }
    });
    this.on(root,'submit',ev=>{
      if(ev.target.id==='note-form'){ev.preventDefault();this.saveDraft().catch(()=>{});}
    });
  }
  draw(){
    const {questions}=this.app.content,answers=this.app.progress.answers;
    const correct=questions.filter(q=>answers[q.id]===q.answer).length,answered=questions.filter(q=>answers[q.id]).length;
    this.root.innerHTML=`<section class="lesson">${this.head()}<div class="practice-progress" aria-live="polite"><strong>${correct}<span> / 6</span></strong><p>개념 확인 완료<span>${answered}문항에 답했어요. 답은 언제든 다시 고를 수 있어요.</span></p><div class="progress-track"><i style="--progress:${correct/6*100}%"></i></div></div><div class="question-grid">${questions.map((q,i)=>{const selected=answers[q.id],right=selected===q.answer;return `<article class="question-card"><span class="tiny-label">CHECK ${String(i+1).padStart(2,'0')}</span><h2>${e(q.prompt)}</h2><div class="answer-options">${q.options.map(o=>`<button class="answer-option ${selected===o.id?'chosen':''}" type="button" data-question="${e(q.id)}" data-answer="${e(o.id)}" aria-pressed="${selected===o.id}"><span class="option-dot" aria-hidden="true"></span>${e(o.text)}</button>`).join('')}</div>${selected?`<div class="answer-feedback ${right?'correct':'retry'}" role="status"><b>${right?'✓ 정확해요.':'다시 살펴볼까요?'}</b><p>${e(q.explanation)}</p></div>`:''}</article>`;}).join('')}</div><form id="note-form" class="note-card"><label for="learner-note"><span class="tiny-label">MY TAKEAWAY</span><h2>내 말로 한 문장</h2></label><textarea id="learner-note" maxlength="2000" placeholder="같은 단골을 주문마다 복사하는 대신 보관소에서…">${e(this.draftNote)}</textarea><div class="note-actions"><p>답과 메모는 이 브라우저에만 저장돼요.</p><button class="button secondary" type="submit">메모 저장</button></div><p class="error" id="note-error" role="alert"></p></form>${this.foot()}</section>`;
  }
  async saveDraft(){
    const savedText=this.root.querySelector('#learner-note').value;
    this.draftNote=savedText;this.app.progress.note=savedText;
    try{
      await this.app.persist();
      const currentVal=this.root.querySelector('#learner-note')?.value??savedText;
      this.draftNote=currentVal;this.dirty=currentVal!==savedText;
    }catch(error){
      const errEl=this.root.querySelector('#note-error');if(errEl)errEl.textContent=error.message;throw error;
    }
  }
  discard(){
    super.discard();this.draftNote=this.app.progress.note;
    const el=this.root.querySelector('#learner-note');if(el)el.value=this.app.progress.note;
  }
}
