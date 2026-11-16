import {ROUTES} from './shared/routes.js';
import {escapeHTML as e} from './shared/dom.js';
import {Router} from './services/router.js';
import {VersionService} from './services/version-service.js';
import {EntryService} from './services/entry-service.js';
import {ContentService} from './services/content-service.js';
import {LabStorageService} from './services/storage-service.js';
import {LedgerExperiment} from './domain/customer-ledger.js';
import {IntroScreen} from './screens/intro-screen.js';
import {LedgerScreen} from './screens/ledger-screen.js';
import {RepositoryScreen} from './screens/repository-screen.js';
import {PracticeScreen} from './screens/practice-screen.js';
import {CodeScreen} from './screens/code-screen.js';

class TutorialApp{
  constructor({version}={}){
    this.root=document.querySelector('#main');
    this.loadedBuild=document.querySelector('meta[name="app-build"]').content;
    this.baseUrl=new URL('./',location.href);this.baseUrl.hash='';this.baseUrl.search='';
    this.storage=new LabStorageService();this.progress=this.storage.load();
    this.saving=false;this.unsaved=false;this.sequence=0;
    document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();this.root.focus();this.root.scrollIntoView({block:'start'});});
    this.createLabs();
    this.contentService=new ContentService({baseUrl:this.baseUrl});
    this.version=version??new VersionService({baseUrl:this.baseUrl,loadedBuild:this.loadedBuild});
    document.body.dataset.build=this.loadedBuild;
    document.querySelector('#build-label').textContent=this.loadedBuild.slice(0,15);
    this.nav=document.querySelector('#lesson-nav');
    this.nav.innerHTML=ROUTES.map((r,i)=>`<a href="#${r.path}" data-route="${r.path}"><span>${String(i+1).padStart(2,'0')}</span><b>${e(r.label)}</b></a>`).join('');
    document.querySelector('#motion-toggle').addEventListener('click',ev=>{const b=ev.currentTarget,on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));document.body.classList.toggle('reduce-motion',on);});
    this.router=new Router({baseUrl:this.baseUrl,version:this.version,readState:()=>this.editState(),onNavigate:r=>this.render(r),onProtect:info=>this.protect(info),onUpdate:()=>this.showUpdate(),onError:err=>this.notice(err.message)});
    addEventListener('beforeunload',ev=>{const s=this.editState();if(s.dirty||s.saving){ev.preventDefault();ev.returnValue='';}});
  }
  createLabs(){
    this.labs={};
    for(const mode of ['copies','reference']){
      this.labs[mode]=new LedgerExperiment({mode});
      try{for(const action of this.progress[mode])this.labs[mode].applyUpdate(action);}
      catch{this.labs[mode].reset();this.progress[mode]=[];}
    }
  }
  editState(){return {dirty:!!this.screen?.dirty||this.unsaved,saving:this.saving};}
  notice(message){const el=document.querySelector('#notice');el.textContent=message;el.hidden=!message;}
  showUpdate(){if(this.version.pendingBuild)this.notice('새 버전이 준비됐어요. 입력을 마친 뒤 다음 화면으로 이동하면 자동 적용돼요.');}
  async persist(){
    if(this.saving)throw Error('이미 저장 중이에요. 잠시 기다려 주세요.');
    this.saving=true;this.unsaved=true;
    try{await this.storage.save(structuredClone(this.progress));this.unsaved=false;this.notice('이 브라우저에 학습 기록을 저장했어요.');this.showUpdate();}
    catch(err){this.notice(err.message);throw err;}finally{this.saving=false;}
  }
  async render(route){
    const sequence=++this.sequence;this.screen?.dispose();this.screen=null;this.request?.abort();this.request=new AbortController();
    const info=ROUTES.find(r=>r.path===route.path);document.body.dataset.screen=info?.id||'missing';
    this.nav.querySelectorAll('a').forEach(a=>{if(a.dataset.route===route.path)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
    if(!info){this.root.innerHTML='<section class="lesson missing"><h1>이 학습 단계는 없어요.</h1><p class="lede">주소를 다시 확인하거나 첫 화면에서 차례대로 시작해 보세요.</p><a class="button" href="#/" data-route="/">시작으로 돌아가기 →</a></section>';return;}
    this.root.innerHTML='<div class="loading" role="status"><span class="loading-mark" aria-hidden="true">⊙</span>단골 원장을 펼치는 중…</div>';
    try{
      const content=await this.contentService.load(this.request.signal);
      if(sequence!==this.sequence)return;this.content=content;
      const lesson=content.lessons.find(l=>l.id===info.id);
      if(info.id==='intro')this.screen=new IntroScreen(this,lesson);
      else if(info.id==='copies'||info.id==='reference')this.screen=new LedgerScreen(this,lesson,info.id);
      else if(info.id==='repository')this.screen=new RepositoryScreen(this,lesson);
      else if(info.id==='practice')this.screen=new PracticeScreen(this,lesson);
      else this.screen=new CodeScreen(this,lesson);
      this.screen.mount(this.root);document.title=`${lesson.title} — REF / LEDGER`;this.root.focus({preventScroll:true});scrollTo({top:0,behavior:'instant'});
    }catch(err){
      if(sequence!==this.sequence||err.name==='AbortError')return;
      this.root.innerHTML=`<section class="lesson load-error"><p class="eyebrow">연결을 확인해 주세요</p><h1>학습 내용을 펼치지 못했어요.</h1><p>${e(err.message)}</p><button type="button" class="button" id="retry-load">다시 시도 →</button></section>`;
      this.root.querySelector('#retry-load').addEventListener('click',()=>this.render(route),{once:true});
    }
  }
  async protect({changed}){
    const dialog=document.querySelector('#guard'),error=document.querySelector('#guard-error');error.textContent='';
    document.querySelector('#guard-description').textContent=changed?'새 버전이 준비됐어요. 작성한 입력을 적용·저장하거나 취소한 뒤 이동하면 새 문서로 자동 전환돼요.':'작성 중인 실험 입력이나 메모를 적용·저장하거나, 입력을 취소한 뒤 이동할 수 있어요.';
    const buttons=['stay','discard','save'].map(id=>document.querySelector('#guard-'+id));buttons[1].disabled=this.saving;buttons[2].disabled=this.saving;
    return new Promise(resolve=>{
      const controller=new AbortController();const done=value=>{controller.abort();dialog.close();resolve(value);};
      buttons[0].addEventListener('click',()=>done(false),{signal:controller.signal});
      buttons[1].addEventListener('click',()=>{if(this.saving)return;this.screen?.discard();if(this.unsaved){this.progress=this.storage.load();this.createLabs();this.unsaved=false;}done(true);},{signal:controller.signal});
      buttons[2].addEventListener('click',async()=>{if(this.saving)return;buttons[1].disabled=true;buttons[2].disabled=true;try{if(this.screen?.dirty)await this.screen.saveDraft();if(this.unsaved)await this.persist();done(true);}catch(err){error.textContent=err.message;buttons[1].disabled=false;buttons[2].disabled=false;}},{signal:controller.signal});
      dialog.addEventListener('cancel',ev=>{ev.preventDefault();done(false);},{signal:controller.signal});dialog.showModal();
    });
  }
  async start(){await this.router.start();if(this.storage.warning)this.notice(this.storage.warning);}
}

async function boot(){
  const loadedBuild=document.querySelector('meta[name="app-build"]').content;
  const baseUrl=new URL('./',location.href);baseUrl.hash='';baseUrl.search='';
  const version=new VersionService({baseUrl,loadedBuild});
  const entry=new EntryService({version,currentURL:location.href,replace:url=>location.replace(url)});
  if(await entry.start()==='replaced')return;
  await new TutorialApp({version}).start();
}
boot().catch(error=>{document.querySelector('#main').textContent='튜토리얼을 시작하지 못했어요. '+error.message;});
