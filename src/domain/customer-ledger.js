import {cleanMemo,parseCustomerId} from '../shared/dom.js';

const PRESET_PROFILES=Object.freeze({
  'C-104':{name:'민수',stamps:8,memo:'샷 연하게'},
  'C-208':{name:'지현',stamps:4,memo:'얼음 적게'},
  'C-315':{name:'서연',stamps:9,memo:'텀블러 사용'}
});

function validateStampCount(stamps){
  if(!Number.isSafeInteger(stamps)||stamps<0||stamps>999){
    throw new RangeError('누적 스탬프는 0~999 사이의 정수여야 합니다.');
  }
}

export class Customer{
  constructor({id,name='신규 단골',stamps=0,memo='기본 레시피'}={}){
    this.id=parseCustomerId(id);
    this.name=cleanMemo(name);
    validateStampCount(stamps);
    this.stamps=stamps;
    this.memo=cleanMemo(memo);
  }
  get tier(){
    return this.stamps>=10?'GOLD':'SILVER';
  }
  get discount(){
    return this.stamps>=10?500:0;
  }
  addStamps(delta){
    if(!Number.isSafeInteger(delta)||delta<0||delta>10){
      throw new RangeError('적립 스탬프는 0~10 사이의 정수여야 합니다.');
    }
    validateStampCount(this.stamps+delta);
    this.stamps+=delta;
    return this;
  }
  updateMemo(nextMemo){
    this.memo=cleanMemo(nextMemo);
    return this;
  }
}

export class CustomerRepository{
  #customers=new Map();
  register(id,seed={}){
    const key=parseCustomerId(id);
    if(!this.#customers.has(key)){
      const preset=PRESET_PROFILES[key]||{name:`단골 ${key}`,stamps:0,memo:'기본 레시피'};
      this.#customers.set(key,new Customer({id:key,...preset,...seed}));
    }
    return this.#customers.get(key);
  }
  find(id){
    return this.#customers.get(parseCustomerId(id))||null;
  }
  get size(){
    return this.#customers.size;
  }
  entries(){
    return [...this.#customers.values()];
  }
  clear(){
    this.#customers.clear();
  }
}

export class Order{
  constructor({orderNo,menu,customerId,repository=null,seed={}}){
    if(typeof orderNo!=='string'||!orderNo.trim())throw new TypeError('주문 번호가 필요합니다.');
    if(typeof menu!=='string'||!menu.trim())throw new TypeError('메뉴 이름이 필요합니다.');
    this.orderNo=orderNo.trim();
    this.menu=menu.trim();
    const key=parseCustomerId(customerId);
    if(repository){
      this.customer=repository.register(key,seed);
    }else{
      const preset=PRESET_PROFILES[key]||{name:`단골 ${key}`,stamps:0,memo:'기본 레시피'};
      this.customer=new Customer({id:key,...preset,...seed});
    }
  }
}

export class LedgerExperiment{
  #mode;
  #repository;
  #order101;
  #order102;
  #labels;
  #nextIndex;
  #events;

  constructor({mode='copies'}={}){
    if(mode!=='copies'&&mode!=='reference'){
      throw new TypeError('실험 모드는 copies 또는 reference여야 합니다.');
    }
    this.#mode=mode;
    this.reset();
  }

  #label(customer){
    if(!this.#labels.has(customer)){
      const prefix=this.#mode==='reference'?'R':'C';
      this.#labels.set(customer,`${prefix}${this.#nextIndex++}`);
    }
    return this.#labels.get(customer);
  }

  applyUpdate({side,stamps=0,memo}){
    if(side!=='order101'&&side!=='order102'){
      throw new TypeError('주문 #101 또는 주문 #102를 선택해 주세요.');
    }
    if(!Number.isSafeInteger(stamps)||stamps<0||stamps>10){
      throw new RangeError('한 번에 0개부터 10개까지 적립할 수 있어요.');
    }
    const order=side==='order101'?this.#order101:this.#order102;
    const target=order.customer;
    const cleanedMemo=memo===undefined?target.memo:cleanMemo(memo);
    if(stamps===0&&cleanedMemo===target.memo){
      throw new RangeError('적립할 스탬프(1개 이상)를 넣거나 요청 메모를 다르게 입력해 주세요.');
    }
    const prevStamps=target.stamps;
    const prevTier=target.tier;
    const prevMemo=target.memo;
    if(stamps>0)target.addStamps(stamps);
    if(cleanedMemo!==prevMemo)target.updateMemo(cleanedMemo);

    const tag=this.#label(target);
    const changes=[];
    if(stamps>0)changes.push(`스탬프 ${prevStamps}→${target.stamps}개(${prevTier}→${target.tier})`);
    if(cleanedMemo!==prevMemo)changes.push(`메모 '${prevMemo}'→'${target.memo}'`);
    const summary=changes.join(', ');

    if(this.#mode==='copies'){
      this.#events.push(`${order.orderNo} 경로로 ${tag} 복사본만 수정: ${summary}. 다른 주문서의 복사본은 갱신되지 않았습니다.`);
    }else{
      this.#events.push(`${order.orderNo} 경로로 보관소의 ${tag} 참조를 수정: ${summary}. 두 주문서가 즉시 같은 단골 상태를 읽습니다.`);
    }
    return this.snapshot();
  }

  reset(){
    this.#labels=new WeakMap();
    this.#nextIndex=1;
    this.#events=[];
    this.#repository=this.#mode==='reference'?new CustomerRepository():null;
    this.#order101=new Order({orderNo:'주문 #101',menu:'아침 아메리카노',customerId:'C-104',repository:this.#repository});
    this.#order102=new Order({orderNo:'주문 #102',menu:'오후 카페라떼',customerId:'C-104',repository:this.#repository});
    this.#label(this.#order101.customer);
    this.#label(this.#order102.customer);
    return this.snapshot();
  }

  snapshot(){
    const describeOrder=order=>({
      orderNo:order.orderNo,
      menu:order.menu,
      customer:{
        id:order.customer.id,
        name:order.customer.name,
        stamps:order.customer.stamps,
        tier:order.customer.tier,
        discount:order.customer.discount,
        memo:order.customer.memo,
        objectId:this.#label(order.customer)
      }
    });
    const a=this.#order101.customer;
    const b=this.#order102.customer;
    const sameReference=a===b;
    const hasDrift=a.stamps!==b.stamps||a.memo!==b.memo||a.tier!==b.tier;
    return {
      mode:this.#mode,
      repositorySize:this.#repository?this.#repository.size:0,
      order101:describeOrder(this.#order101),
      order102:describeOrder(this.#order102),
      sameReference,
      sameCustomerId:a.id===b.id,
      hasDrift,
      events:[...this.#events]
    };
  }
}

export function evaluateRepositoryScenario({firstId='C-104',secondId='C-104',spreadCopy=false}={}){
  const repo=new CustomerRepository();
  const idA=parseCustomerId(firstId);
  const idB=parseCustomerId(secondId);
  const orderA=new Order({orderNo:'주문 A',menu:'드립 커피',customerId:idA,repository:repo});
  const registeredB=repo.register(idB);
  const customerB=spreadCopy?{...registeredB}:registeredB;
  const beforeBStamps=customerB.stamps;
  orderA.customer.addStamps(1);
  return {
    firstId:idA,
    secondId:idB,
    spreadCopy:!!spreadCopy,
    sameReference:orderA.customer===customerB,
    sameLogicalId:orderA.customer.id===customerB.id,
    repositorySize:repo.size,
    orderAStamps:orderA.customer.stamps,
    orderBStamps:customerB.stamps,
    beforeBStamps,
    syncedAfterStamp:idA===idB&&orderA.customer.stamps===customerB.stamps,
    registeredIds:repo.entries().map(c=>c.id)
  };
}
