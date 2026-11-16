import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeScreen} from '../src/screens/practice-screen.js';

test('new typing during in-flight note save preserves dirty state',async()=>{
  let finishSave;
  const textarea={value:'초안 1'};
  const errEl={textContent:''};
  const root={
    querySelector:sel=>sel==='#learner-note'?textarea:sel==='#note-error'?errEl:null,
    addEventListener(){},
    set innerHTML(_){}
  };
  const app={
    progress:{note:'',answers:{}},
    content:{questions:[]},
    saving:false,
    persist:()=>new Promise(r=>{finishSave=()=>{textarea.value='초안 1 + 추가 입력';r();};})
  };
  const screen=new PracticeScreen(app,{id:'practice',title:'t',intro:'i',takeaway:'k',kicker:'c'});
  screen.root=root;
  screen.dirty=true;
  const saving=screen.saveDraft();
  finishSave();
  await saving;
  assert.equal(screen.dirty,true);
  assert.equal(screen.draftNote,'초안 1 + 추가 입력');
});
