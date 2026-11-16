import {escapeHTML as e} from '../shared/dom.js';
import {ROUTES} from '../shared/routes.js';

export class BaseScreen{
  constructor(app,lesson){
    this.app=app;
    this.lesson=lesson;
    this.abort=new AbortController();
    this.dirty=false;
  }
  on(target,event,handler){
    target.addEventListener(event,handler,{signal:this.abort.signal});
  }
  head(){
    const i=ROUTES.findIndex(r=>r.id===this.lesson.id);
    return `<div class="lesson-heading"><p class="eyebrow">${String(i+1).padStart(2,'0')} / 06 <span>${e(this.lesson.kicker)}</span></p><h1>${e(this.lesson.title)}</h1><p class="lede">${e(this.lesson.intro)}</p></div>`;
  }
  foot(){
    const i=ROUTES.findIndex(r=>r.id===this.lesson.id),next=ROUTES[i+1];
    return `<div class="lesson-bottom"><p><span class="tiny-label">가져갈 한 문장</span>${e(this.lesson.takeaway)}</p>${next?`<a class="button" href="#${next.path}" data-route="${next.path}">${e(next.label)} <span aria-hidden="true">→</span></a>`:'<a class="button secondary" href="#/copies" data-route="/copies">다시 실험하기 ↗</a>'}</div>`;
  }
  discard(){this.dirty=false;}
  async saveDraft(){this.dirty=false;}
  dispose(){this.abort.abort();}
}
