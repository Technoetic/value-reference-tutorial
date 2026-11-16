const IDS=['intro','copies','reference','repository','practice','code'];
const ALLOWED_SOURCES=new Set([
  'https://refactoring.com/catalog/changeValueToReference.html',
  'https://martinfowler.com/bliki/EvansClassification.html',
  'https://refactoring.com/catalog/changeReferenceToValue.html'
]);

export class ContentService{
  constructor({baseUrl,fetcher=globalThis.fetch.bind(globalThis),timeoutMs=6000}){
    Object.assign(this,{baseUrl:new URL(baseUrl),fetcher,timeoutMs});
  }
  async load(signal){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const ctrl=new AbortController();
    const cancel=()=>ctrl.abort();
    signal?.addEventListener('abort',cancel,{once:true});
    let timer;
    try{
      const request=(async()=>{
        const url=new URL('data/lessons.json',this.baseUrl);
        url.searchParams.set('_fresh',crypto.randomUUID());
        const response=await this.fetcher(url,{cache:'no-store',signal:ctrl.signal});
        if(!response.ok)throw Error('내용을 불러오지 못했어요 ('+response.status+').');
        const data=await response.json();
        const validLessons=Array.isArray(data?.lessons)&&data.lessons.length===6
          &&IDS.every(id=>data.lessons.some(l=>l.id===id&&['title','intro','takeaway','kicker'].every(k=>typeof l[k]==='string')));
        const validQuestions=Array.isArray(data?.questions)&&data.questions.length===6
          &&data.questions.every(q=>q&&typeof q.id==='string'&&/^[a-z\d-]{1,40}$/.test(q.id)
            &&typeof q.prompt==='string'&&typeof q.explanation==='string'
            &&Array.isArray(q.options)&&q.options.length>=2
            &&q.options.every(o=>o&&typeof o.id==='string'&&/^[a-z\d-]{1,40}$/.test(o.id)&&typeof o.text==='string')
            &&q.options.some(o=>o.id===q.answer));
        const validSources=Array.isArray(data?.sources)&&data.sources.length>=2
          &&data.sources.every(s=>s&&typeof s.title==='string'&&ALLOWED_SOURCES.has(s.url));
        if(data?.schema!==1||!validLessons||!validQuestions||!validSources){
          throw Error('학습 내용의 형식이 올바르지 않아요.');
        }
        return data;
      })();
      return await Promise.race([
        request,
        new Promise((_,reject)=>{
          timer=setTimeout(()=>{ctrl.abort();reject(Error('응답이 늦어지고 있어요. 다시 시도해 주세요.'));},this.timeoutMs);
        })
      ]);
    }finally{
      clearTimeout(timer);
      signal?.removeEventListener('abort',cancel);
    }
  }
}
