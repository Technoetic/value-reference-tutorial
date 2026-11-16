import test from 'node:test';
import assert from 'node:assert/strict';
import {Customer,CustomerRepository,Order,LedgerExperiment,evaluateRepositoryScenario} from '../src/domain/customer-ledger.js';

test('copies mode creates distinct Customer instances that drift on update',()=>{
  const lab=new LedgerExperiment({mode:'copies'});
  const s0=lab.snapshot();
  assert.equal(s0.sameReference,false);
  assert.equal(s0.sameCustomerId,true);
  assert.equal(s0.hasDrift,false);
  assert.equal(s0.order101.customer.objectId,'C1');
  assert.equal(s0.order102.customer.objectId,'C2');

  const s1=lab.applyUpdate({side:'order101',stamps:2,memo:'텀블러 지참'});
  assert.equal(s1.order101.customer.stamps,10);
  assert.equal(s1.order101.customer.tier,'GOLD');
  assert.equal(s1.order101.customer.discount,500);
  assert.equal(s1.order102.customer.stamps,8);
  assert.equal(s1.order102.customer.tier,'SILVER');
  assert.equal(s1.hasDrift,true);
});

test('reference mode shares a single Customer instance via CustomerRepository',()=>{
  const lab=new LedgerExperiment({mode:'reference'});
  const s0=lab.snapshot();
  assert.equal(s0.sameReference,true);
  assert.equal(s0.repositorySize,1);
  assert.equal(s0.order101.customer.objectId,'R1');
  assert.equal(s0.order102.customer.objectId,'R1');

  const s1=lab.applyUpdate({side:'order101',stamps:2,memo:'오트밀크 변경'});
  assert.equal(s1.order102.customer.stamps,10);
  assert.equal(s1.order102.customer.tier,'GOLD');
  assert.equal(s1.order102.customer.memo,'오트밀크 변경');
  assert.equal(s1.hasDrift,false);
});

test('no-op update or invalid inputs throw clear Korean errors',()=>{
  const lab=new LedgerExperiment({mode:'reference'});
  assert.throws(()=>lab.applyUpdate({side:'order101',stamps:0,memo:'샷 연하게'}),/적립할 스탬프/);
  assert.throws(()=>lab.applyUpdate({side:'order101',stamps:15,memo:'샷 연하게'}),/10개/);
  assert.throws(()=>new Customer({id:'bad id!',name:'민수'}),/손님 ID/);
});

test('repository scenario distinguishes same ID, different ID, and spread copy trap',()=>{
  const same=evaluateRepositoryScenario({firstId:'C-104',secondId:'C-104',spreadCopy:false});
  assert.equal(same.sameReference,true);
  assert.equal(same.syncedAfterStamp,true);
  assert.equal(same.repositorySize,1);

  const diff=evaluateRepositoryScenario({firstId:'C-104',secondId:'C-208',spreadCopy:false});
  assert.equal(diff.sameReference,false);
  assert.equal(diff.sameLogicalId,false);
  assert.equal(diff.repositorySize,2);

  const spread=evaluateRepositoryScenario({firstId:'C-104',secondId:'C-104',spreadCopy:true});
  assert.equal(spread.sameLogicalId,true);
  assert.equal(spread.sameReference,false);
  assert.equal(spread.syncedAfterStamp,false);
});

test('Order works both with and without an injected repository',()=>{
  const repo=new CustomerRepository();
  const a=new Order({orderNo:'#1',menu:'라떼',customerId:'c-104',repository:repo});
  const b=new Order({orderNo:'#2',menu:'모카',customerId:'C-104',repository:repo});
  const c=new Order({orderNo:'#3',menu:'드립',customerId:'C-104'});
  assert.equal(a.customer,b.customer);
  assert.notEqual(a.customer,c.customer);
  assert.equal(repo.find('C-104'),a.customer);
});
