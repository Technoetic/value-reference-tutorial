export function escapeHTML(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

export function won(amount){
  return new Intl.NumberFormat('ko-KR').format(amount)+'원';
}

export function parseStamps(raw){
  const trimmed=String(raw??'').trim().replaceAll(',','');
  if(!/^\d+$/.test(trimmed))throw new RangeError('적립 스탬프는 0 이상의 정수로 입력해 주세요.');
  const n=Number(trimmed);
  if(!Number.isSafeInteger(n)||n<0||n>10)throw new RangeError('한 번에 0개부터 10개까지 적립할 수 있어요.');
  return n;
}

export function cleanMemo(raw){
  const text=String(raw??'').replace(/[\u0000-\u001f\u007f]/g,'').trim();
  if(!text)throw new RangeError('요청 메모를 한 글자 이상 입력해 주세요.');
  if(text.length>36)throw new RangeError('요청 메모는 36자 이내로 입력해 주세요.');
  return text;
}

export function parseCustomerId(raw){
  const text=String(raw??'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9-]{1,15}$/.test(text)){
    throw new RangeError('손님 ID는 영문 대문자·숫자·하이픈 2~16자로 입력해 주세요 (예: C-104).');
  }
  return text;
}
