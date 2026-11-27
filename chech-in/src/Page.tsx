import {requestCheckin} from "./request";
import {useEffect,useState} from "react";
import {BookOpen,Heart,Check,Users,Leaf,Copy,RefreshCw,X} from "lucide-react";
type Entry={id:string;name:string;score:number;positive:string;change:string;expectation:string;likeCount:number;liked:number|boolean;updatedAt:string};
type Data={rows:Entry[];stats:{count:number;average:number|null};hist:{score:number;count:number}[];mine:Entry|null};
const blank={name:"",score:0,positive:"",change:"",expectation:""};
const scoresDescending = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export default function Page(){
 const [view,setView]=useState('form');const [form,setForm]=useState(blank);const [data,setData]=useState<Data|null>(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [remove,setRemove]=useState(false);const [filter,setFilter]=useState('all');
 async function load(hydrate=false){setLoading(true);setError('');try{const res=await requestCheckin({cache:'no-store'});const d=await res.json() as Data & {error?:string};if(!res.ok)throw Error(d.error);setData(d);if(hydrate)setForm(d.mine?{name:d.mine.name,score:d.mine.score,positive:d.mine.positive,change:d.mine.change,expectation:d.mine.expectation??""}:blank);return true}catch(e){setError(e instanceof Error?e.message:'불러오지 못했어요.');return false}finally{setLoading(false)}}
 useEffect(()=>{setData(null);setForm(blank);setRemove(false);setFilter('all');void load(true)},[]);
 function update(key:string,value:string|number){setForm(f=>({...f,[key]:value}))}
 async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{const res=await requestCheckin({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await res.json() as {error?:string};if(!res.ok)throw Error(d.error);setNotice('이번 학기의 성찰을 남겼어요. 함께 돌아볼까요?');setView('results');await load();window.scrollTo({top:0,behavior:'smooth'})}catch(e){setError((e as Error).message)}finally{setSaving(false)}}
 async function share(){try{await navigator.clipboard.writeText(new URL("./", location.href).href);setNotice('사이트 링크를 복사했어요.')}catch{setNotice(`이 주소를 복사해 주세요: ${new URL("./", location.href).href}`)}}
 async function deleteMine(){setSaving(true);try{const r=await requestCheckin({method:'DELETE'});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error);setForm(blank);setRemove(false);await load();setNotice('내 응답을 삭제했어요.')}catch(e){setError((e as Error).message)}finally{setSaving(false)}}
 const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
 async function setLike(question: Entry) {
   if (pendingLikes.has(question.id)) return;
   setPendingLikes(previous => new Set(previous).add(question.id));
   setError('');
   try {
     const res = await requestCheckin({
       method: 'POST', headers: {'Content-Type':'application/json'},
       body: JSON.stringify({operation:'setQuestionLike', questionId:question.id, liked:!question.liked})
     });
     const result = await res.json() as {error?:string; liked:boolean; likeCount:number};
     if (!res.ok) throw Error(result.error || '좋아요를 저장하지 못했어요.');
     setData(previous => previous && ({...previous, rows:previous.rows.map(row => row.id === question.id
       ? {...row, likeCount:result.likeCount, liked:result.liked} : row)}));
   } catch (e) { setError((e as Error).message); }
   finally { setPendingLikes(previous => {const next=new Set(previous);next.delete(question.id);return next;}); }
 }
 const questions = (data?.rows ?? []).filter(row => row.expectation?.trim());
 const count=data?.stats.count||0;const rows=(data?.rows||[]).filter(r=>filter==='all'||r.score===Number(filter));
 return <><header><a className="brand" href="./"><span className="brand-icon"><BookOpen size={19}/></span> 학습촉진자를 위한 질문수업</a><button className="quiet" onClick={share}><Copy size={15}/> 링크 공유</button></header><main><section className="hero"><img className="question-artist" src="./question-artist.jpg" width={120} height={120} alt="커다란 물음표 옆에서 생각에 잠긴 질문술사"/><div className="eyebrow"><span/> 이번 학기를 마무리하며...</div><h1>이번 학기, 여러분 자신의<br/><span>수업에 대한 만족도는 몇 점인가요<span className="gold">?</span></span></h1></section>
 <nav className="tabs" aria-label="체크인 화면"><button className={view==='form'?'active':''} onClick={()=>{setView('form');setRemove(false)}}><BookOpen size={17}/> 나의 수업 돌아보기</button><button className={view==='results'?'active':''} onClick={()=>{setView('results');void load()}}><Users size={18}/> 함께 돌아보기{count>0&&<span className="count">{count}</span>}</button></nav>
 {notice&&<div className="notice" role="status"><Check size={17}/><span>{notice}</span><button aria-label="알림 닫기" onClick={()=>setNotice('')}><X size={17}/></button></div>}{error&&<div className="error" role="alert">{error} <button onClick={()=>void load()}>다시 불러오기</button></div>}
 {view==='form'?<><form className="card form" onSubmit={submit}><div className="card-head"><h2>Check-In</h2><span className="pill">약 3분</span></div><div className="alias-field"><label htmlFor="name">별칭 <span className="required">필수</span></label><input id="name" required maxLength={30} placeholder="사용할 별칭을 입력해 주세요" value={form.name} onChange={e=>update('name',e.target.value)}/></div>
 <fieldset><legend>이번 학기, 여러분 자신의 수업에 대한 만족도는 몇 점인가요? <span className="required">필수</span></legend><div className="score-grid" role="radiogroup" aria-label="수업 만족도 1~10점">{scoresDescending.map(n=><button type="button" role="radio" aria-checked={form.score===n} aria-label={`${n}점`} className={`score ${form.score===n?'selected':''}`} style={{'--tone':`${91-n*2.7}%`} as React.CSSProperties} key={n} onClick={()=>update('score',n)}>{n}{form.score===n&&<Check size={14}/>}</button>)}</div><div className="scale"><span>10점 · 매우 만족해요</span><span>1점 · 매우 아쉬워요</span></div><p className="score-help" aria-live="polite">{form.score?<>지금 나의 만족도는 <strong>{form.score}점</strong>이에요.</>:'정답은 없어요. 그냥 지금 떠오르는 점수를 체크해 주시면 됩니다.'}</p></fieldset>
 <div className="question"><label htmlFor="positive">그보다 더 낮은 점수를 주지 않은 이유는? <span>선택</span></label><p>이번 학기 수업에서 잘된 점이나 학생들에게서 발견한 긍정적인 변화를 적어 주세요.</p><textarea id="positive" maxLength={500} value={form.positive} onChange={e=>update('positive',e.target.value)} placeholder="예: 질문이 없던 학생들이 수업 후 자신의 생각을 나누기 시작했어요."/><div className="char">{form.positive.length} / 500</div></div>
 <div className="question"><label htmlFor="change">1점이라도 더 높은 점수를 주려면, 무엇이 달라져야 할까요? <span>선택</span></label><p>다음 학기에 새롭게 시도해 보고 싶은 일이나 바꾸고 싶은 수업 방식을 적어 주세요.</p><textarea id="change" maxLength={500} value={form.change} onChange={e=>update('change',e.target.value)} placeholder="예: 다음 학기에는 수업 마지막 3분 동안 학생들의 질문을 익명으로 받아 보고 싶어요."/><div className="char">{form.change.length} / 500</div></div>

 <div className="question">
   <label htmlFor="expectation">‘학습촉진자를 위한 질문수업’에서 기대하는 점이나 함께 나누고 싶은 질문은 무엇인가요? <span>선택</span></label>
   <textarea id="expectation" maxLength={500} style={{marginTop: 12}} value={form.expectation} onChange={e=>update('expectation',e.target.value)} placeholder="예: 조용한 학습자도 편하게 답할 수 있는 질문은 어떻게 만들까요?"/>
   <div className="char">{form.expectation.length} / 500</div>
 </div>
 <p className="sharing-note"><Users size={16}/> 별칭·점수·작성한 내용은 이 사이트의 참여자들에게 보여요.<br/>학생 개인을 식별할 수 있는 내용은 적지 말아 주세요.</p><button className="primary" disabled={!form.name.trim()||!form.score||saving||loading}>{saving?'성찰을 저장하는 중…':data?.mine?'내 응답 수정하고 함께 보기':'체크인하고 함께 돌아보기'}</button><p className="form-foot">같은 브라우저에서 한 응답 · 수정 가능</p></form></>:<section className="results"><div className="results-title"><div><span className="kicker">Our Story</span><h2>우리의 한 학기를 모아보면</h2></div><button className="quiet" disabled={loading} onClick={()=>void load()} aria-label="결과 새로고침"><RefreshCw size={17} className={loading?'spin':''}/></button></div><p className="intro">서로의 점수를 비교하기보다, 경험과 가능성을 발견해 보세요.</p>{loading&&!data?<div className="card empty" role="status">이번 학기의 이야기를 불러오고 있어요…</div>:data?<><div className="stats"><div><span>함께 돌아본 학습촉진자</span><strong>{count}<small>명</small></strong></div><div><span>우리의 수업 만족도</span><strong>{count?Number(data.stats.average).toFixed(1):'—'}<small>/ 10</small></strong></div></div><div className="card distribution"><h3>우리의 점수</h3><div className="bars" role="img" aria-label={`점수별 응답 수. ${scoresDescending.map(score=>`${score}점 ${data.hist.find(h=>h.score===score)?.count||0}명`).join(', ')}`}>{scoresDescending.map(n=>{const c=data.hist.find(h=>h.score===n)?.count||0;const max=Math.max(1,...data.hist.map(h=>h.count));return <div className="bar-col" key={n}><span>{c}</span><div className="bar-track"><div className="bar" style={{height:`${c/max*100}%`}}/></div><span>{n}점</span></div>})}</div><p className="muted">참여자 전체의 응답을 기준으로 집계해요.</p></div>
 {data.mine&&<div className="my-response"><span><Check size={17}/> 내 응답 · {data.mine.score}점</span><div><button onClick={()=>setView('form')}>수정</button><button onClick={()=>setRemove(true)}>삭제</button></div></div>}{remove&&<div className="card confirm" role="alert"><p>이번 학기의 내 응답을 삭제할까요?</p><div><button className="quiet" onClick={()=>setRemove(false)}>취소</button><button className="danger" onClick={deleteMine} disabled={saving}>{saving?'삭제 중…':'내 응답 삭제'}</button></div></div>}
 <section className="participant-questions" aria-labelledby="participant-questions-title">
   <div className="stories-title"><h3 id="participant-questions-title">어떤 질문을 품고 이 자리에 오셨나요?</h3></div>
   {questions.length ? (
     <ul className="card question-list">
       {questions.map(question => (
         <li key={question.id}>
           <p>{question.expectation}{' '}<span className="question-author">_ {question.name}</span></p>
           <button className="question-like" type="button"
             aria-label={question.name+'님의 질문 좋아요 '+(question.likeCount ?? 0)+'명'}
             aria-pressed={Boolean(question.liked)}
             disabled={question.id===data.mine?.id || pendingLikes.has(question.id)}
             title={question.id===data.mine?.id?'내 질문의 좋아요 수':question.liked?'좋아요 취소':'좋아요'}
             onClick={()=>setLike(question)}>
             <Heart size={17} aria-hidden="true" fill={question.liked?'currentColor':'none'}/>
             {question.likeCount ?? 0}
           </button>
         </li>
       ))}
     </ul>
   ) : <p className="card empty">아직 작성된 질문이 없어요.</p>}
 </section>
 <div className="stories-title"><h3>동료 학습자들의 성찰</h3><label className="sr-only" htmlFor="filter">점수로 응답 필터</label><select id="filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">모든 점수</option>{scoresDescending.map(score=><option value={score} key={score}>{score}점</option>)}</select></div>{count===0?<div className="card empty"><Leaf size={30}/><h3>첫 번째 수업 이야기를 기다려요.</h3><p>이번 학기, 무엇이 잘되었나요?<br/>선생님의 성찰로 이야기를 시작해 주세요.</p><button className="quiet" onClick={()=>setView('form')}>나의 수업 돌아보기</button></div>:rows.length===0?<div className="card empty">이 점수의 응답은 아직 없어요.</div>:rows.map(r=><article className="card story" key={r.id}><div className="story-top"><div className="avatar">{r.name.slice(0,1)}</div><div><h4>{r.name}{data.mine?.id===r.id&&<span className="mine-tag">나</span>}</h4></div><div className="story-score">{r.score}<small> / 10</small></div></div>{r.positive&&<div className="story-answer"><span>이미 잘 하고 있어요.</span><p>{r.positive}</p></div>}{r.change&&<div className="story-answer"><span>더 잘하고 싶어요.</span><p>{r.change}</p></div>}{!r.positive&&!r.change&&!r.expectation&&<p className="muted">점수로 이번 학기의 마음을 나눠주셨어요.</p>}</article>)}{count>100&&<p className="muted">최근 응답 100개를 보여드려요. 위 통계에는 전체 {count}명의 응답이 포함되어 있어요.</p>}</>:null}</section>}
 </main><footer><span><BookOpen size={15}/> 이번 학기, 나의 수업은</span><p>‘학습촉진자를 위한 질문수업’ 참가자를 위한 체크인입니다.</p><p>응답은 서버에 저장되어 참여자들과 공유돼요.<br/>이 브라우저의 사이트 데이터를 지우면 내 응답의 수정·삭제 권한을 잃을 수 있어요.</p><p>문의 : <a href="mailto:thomas@questionschool.net" style={{color:"inherit",textUnderlineOffset:"3px"}}>thomas@questionschool.net</a></p>
   <p><a href="https://pf.kakao.com/_XGbin" target="_blank" rel="noopener noreferrer" style={{color:"inherit",textUnderlineOffset:"3px"}}>카카오톡 채널을 통해 문의하기</a></p>
 </footer></>
}
