(() => {
  'use strict';
  const section=document.getElementById('reader-feedback');
  if(!section)return;
  const form=document.getElementById('feedback-form'), list=document.getElementById('feedback-list');
  const status=document.getElementById('feedback-status'), listStatus=document.getElementById('feedback-list-status');
  const submit=document.getElementById('feedback-submit'), more=document.getElementById('feedback-more');
  const endpoint=window.WEBBOOK_CONFIG?.registrationEndpoint;
  let ready=false,busy=false,loading=false,next=0,pending=null;
  const shown=new Set();
  const visibility=()=>form.elements.visibility.value;
  const showVisibility=()=>{document.getElementById('feedback-visibility-note').textContent=visibility()==='private'?'관리자만 확인합니다. 공개 목록에는 표시되지 않습니다.':'별칭과 소감이 다른 독자들에게 공개됩니다.';};
  window.feedbackRoute=()=>{section.hidden=!ready||/^\/webbook\/privacy\/?$/.test(location.pathname);};
  form.addEventListener('change',showVisibility);
  form.elements.message.addEventListener('input',()=>{document.getElementById('feedback-count').textContent=form.elements.message.value.length+' / 1,500';});
  function render(items){for(const item of items){if(!item||typeof item.id!=='string'||typeof item.nickname!=='string'||typeof item.message!=='string'||shown.has(item.id))continue;
    const card=document.createElement('article');card.className='feedback-card';
    const top=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('span'),body=document.createElement('p');
    name.textContent=item.nickname;date.textContent=typeof item.date==='string'?item.date:'';body.textContent=item.message;
    top.append(name,date);card.append(top,body);list.append(card);shown.add(item.id);
  }}
  async function load(reset=false){if(!endpoint||loading)return;loading=true;more.disabled=true;
    try{const url=new URL(endpoint);url.searchParams.set('action','feedback');url.searchParams.set('limit','12');url.searchParams.set('_',String(Date.now()));if(!reset&&next)url.searchParams.set('before',String(next));
      const res=await fetch(url.href,{signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error('목록을 불러오지 못했습니다.');const data=await res.json();
      // The old PDF-only deployment has no feedback capability. Never show an unconnected form.
      if(data.feedback!==true){if(!ready){section.hidden=true;return false;}throw Error('소감 목록을 불러오지 못했습니다.');}
      if(data.ok!==true||!Array.isArray(data.items))throw Error('소감 목록을 불러오지 못했습니다.');
      ready=true;window.feedbackRoute();if(reset){list.replaceChildren();shown.clear();}
      render(data.items);next=Number.isSafeInteger(data.nextBefore)&&data.nextBefore>1?data.nextBefore:0;more.hidden=!next;
      listStatus.textContent=shown.size?'':'아직 공개된 소감이 없습니다. 첫 소감을 남겨 주세요.';return true;
    }catch(err){if(ready)listStatus.textContent='소감 목록을 불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.';return false;}
    finally{loading=false;more.disabled=false;}
  }
  more.addEventListener('click',()=>load(false));
  document.getElementById('feedback-refresh').addEventListener('click',()=>load(true));
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!form.reportValidity()||!ready)return;
    const values={action:'feedback',nickname:form.elements.nickname.value.trim(),message:form.elements.message.value.trim(),visibility:visibility(),consent:form.elements.consent.checked,website:form.elements.website.value};
    if(values.message.length<2){status.textContent='소감을 두 글자 이상 적어 주세요.';return;}
    const signature=JSON.stringify(values);if(!pending||pending.signature!==signature)pending={signature,id:crypto.randomUUID()};
    busy=true;submit.disabled=true;submit.textContent='소감을 저장하고 있습니다…';status.textContent='';
    try{const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...values,requestId:pending.id}),signal:AbortSignal.timeout(30000)});
      if(!res.ok)throw Error('저장 여부를 확인하지 못했습니다. 같은 내용으로 다시 눌러 주세요.');const data=await res.json();
      if(data.ok!==true)throw Error(data.error||'소감을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      if(data.visibility!==values.visibility)throw Error('공개 여부를 확인하지 못했습니다. 관리자에게 문의해 주세요.');
      form.elements.message.value='';form.elements.consent.checked=false;document.getElementById('feedback-count').textContent='0 / 1,500';pending=null;
      status.textContent=values.visibility==='private'?'관리자에게만 전달했습니다. 공개 목록에는 표시되지 않습니다.':'소감을 남겼습니다. 고맙습니다.';
      if(values.visibility==='public')await load(true);
    }catch(err){status.textContent=err.name==='TimeoutError'?'저장 여부를 확인하지 못했습니다. 같은 내용으로 다시 눌러 주세요.':err.message;}
    finally{busy=false;submit.disabled=false;submit.textContent='소감 남기기';}
  });
  showVisibility();if(endpoint)load(true);
})();
