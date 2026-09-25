import React,{useEffect,useMemo,useState} from 'react';import{createRoot}from'react-dom/client';import'./style.css';

const KEY='jujube_state_v1';
const encouragements=['今天也稳稳完成啦！','又拿下一次！','很好，今天的任务完成啦。','坚持住，已经越来越近了。','今天也没有落下，棒！','一次一次完成，49次就这样走出来啦。','今日完成 ✓','又向终点走近了一步。','做到了！明天继续。'];
const milestones={1:'第一次完成！好的开始，今天已经迈出第一步啦。',5:'已经开始进入节奏啦。',7:'一周完成！你比昨天的自己又坚持了一步。',10:'10次达成！继续稳稳地走。',20:'20次完成！你已经坚持了很久。',25:'一半啦！剩下的路已经越来越清楚了。',30:'30次完成！继续向终点走。',35:'只剩14次啦，胜利越来越近。',40:'40次！最后9次，坚持住。',42:'只剩7次啦！已经进入最后一周。',43:'再坚持6次，就快大功告成啦！',44:'再坚持5次！已经走到最后一段啦。',45:'再坚持4天，就大功告成啦！',46:'还剩3次！马上完成！',47:'最后2次！胜利就在眼前啦！',48:'只差最后一次！明天就是大功告成！',49:'🎉 大功告成！这一周期全部完成，辛苦啦！'};

const pad=n=>String(n).padStart(2,'0');
const iso=d=>{const x=new Date(d);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
const fromIso=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=fromIso(s);d.setDate(d.getDate()+n);return iso(d)};
const fmt=s=>{const d=fromIso(s);return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'};
const today=()=>iso(new Date());

function initial(){return{cycles:[],active:null,encUsed:[]}}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||initial()}catch{return initial()}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}

function App(){
 const [state,setState]=useState(load); const [tab,setTab]=useState('today'); const [modal,setModal]=useState(null);
 useEffect(()=>save(state),[state]);
 const active=state.active;
 const completed=active?.completed?.length||0;
 const progress=Math.round(completed/49*100);
 const missing=useMemo(()=>{if(!active||!active.completed.length)return[];const last=active.completed[active.completed.length-1];let a=[];let d=addDays(last,1);while(d<today()){if(!active.interruptions.includes(d)&&!active.completed.includes(d))a.push(d);d=addDays(d,1)}return a},[active]);
 const already=!!active?.completed?.includes(today());

 function startCycle(){const s=today(),c={id:Date.now(),start:s,completed:[],interruptions:[],status:'active'};setState({...state,active:c});setTab('today');setModal(null)}
 function newCycle(){setModal({type:'start'})}
 function completeToday(){
   if(!active||already)return;
   if(missing.length){setModal({type:'missing',days:missing});return}
   const next={...active,completed:[...active.completed,today()]};
   if(next.completed.length===49){next.status='completed';next.end=today();setState({...state,active:null,cycles:[next,...state.cycles]});setModal({type:'done',count:49});}
   else{setState({...state,active:next});setModal({type:'complete',count:next.completed.length})}
 }
 function confirmMissing(){
   const next={...active,interruptions:[...new Set([...active.interruptions,...missing])]};
   setState({...state,active:next});setModal(null);
 }
 function abandon(){if(!active)return;const c={...active,status:'abandoned',end:today()};setState({...state,active:null,cycles:[c,...state.cycles]});setModal(null);setTab('history')}
 function deleteHistory(id){setState({...state,cycles:state.cycles.filter(c=>c.id!==id)})}

 return <div className="app">
   <header><div className="brand">枣</div><div className="subtitle">49次 · 每天一步</div></header>
   {tab==='today'&&<main>
    {!active?<Empty onStart={newCycle}/>:<><section className="hero">
      <div className="eyebrow">本周期</div><div className="count">第 <b>{completed}</b> / 49 次</div>
      <div className="bar"><div style={{width:progress+'%'}}/></div><div className="percent">{progress}%</div>
      <div className="dates">{fmt(active.start)} → {completed?fmt(active.completed[completed-1]):'进行中'}</div>
      {already?<div className="doneCard"><span>✓</span><div><b>今天已完成</b><small>已完成 {completed} / 49</small></div></div>:<button className="complete" onClick={completeToday}>今日完成</button>}
      <div className="enc">{completed===0?'准备好了吗？':(milestones[completed]||encouragements[(completed+state.encUsed.length)%encouragements.length])}</div>
    </section>
    <section className="info"><div><span>预计完成</span><b>{fmt(addDays(active.start,48))}</b></div><div><span>中断</span><b>{active.interruptions.length} 天</b></div></section>
    <button className="textBtn" onClick={()=>setModal({type:'cycle'})}>查看本周期</button>
    </>}
   </main>}
   {tab==='history'&&<main><h2>历史周期</h2>{state.cycles.length===0?<div className="empty">还没有历史周期。</div>:state.cycles.map(c=><div className="history" key={c.id}><div><b>{c.status==='completed'?'✓':'✕'} {c.status==='completed'?'已完成':'已放弃'}</b><p>{fmt(c.start)} → {fmt(c.end||c.completed.at(-1)||c.start)}</p></div><strong>{c.completed.length}/49</strong><button onClick={()=>deleteHistory(c.id)}>删除</button></div>)}</main>}
   {tab==='settings'&&<main><h2>设置</h2><div className="setting"><b>22:00提醒</b><span>每天晚上提醒今天还没有完成</span><label className="switch"><input type="checkbox" defaultChecked onChange={e=>{if('Notification'in window&&e.target.checked)Notification.requestPermission()}}/><i/></label></div><p className="note">提醒需要系统允许通知。数据只保存在本机，不上传服务器。</p>{active&&<button className="danger" onClick={()=>setModal({type:'abandon'})}>放弃当前周期</button>}<button className="outline" onClick={newCycle}>新开一个周期</button></main>}
   <nav><button className={tab==='today'?'on':''} onClick={()=>setTab('today')}>今日</button><button className={tab==='history'?'on':''} onClick={()=>setTab('history')}>历史</button><button className={tab==='settings'?'on':''} onClick={()=>setTab('settings')}>设置</button></nav>
   {modal&&<Modal modal={modal} close={()=>setModal(null)} start={startCycle} complete={confirmMissing} abandon={abandon} />}
 </div>
}

function Empty({onStart}){return <main className="emptyPage"><div className="seed">🌹</div><h1>还没有开始</h1><p>一个周期 49 次，每天完成一次。</p><button className="complete" onClick={onStart}>＋ 新建周期</button></main>}
function Modal({modal,close,start,complete,abandon}){if(modal.type==='start')return <div className="shade"><div className="modal"><h3>🌱 准备开始新的49次周期</h3><p>如果今天开始：</p><div className="estimate">{fmt(today())}<span>→</span>{fmt(addDays(today(),48))}</div><p>预计完成日期：<b>{fmt(addDays(today(),48))}</b><br/>如果中间有中断，实际完成日期会相应顺延。</p><div className="actions"><button className="outline" onClick={close}>以后再说</button><button className="complete" onClick={start}>今天开始</button></div></div></div>;
if(modal.type==='missing')return <div className="shade"><div className="modal"><h3>发现中断日期</h3><p>以下日期没有记录，请确认这些天确实中断：</p><div className="missing">{modal.days.map(d=><span key={d}>{fmt(d)}</span>)}</div><div className="actions"><button className="outline" onClick={close}>返回</button><button className="complete" onClick={complete}>确认中断并完成今天</button></div></div></div>;
if(modal.type==='complete')return <div className="shade"><div className="modal celebrate"><div className="big">🎉</div><h3>已完成 {modal.count} / 49</h3><p>{milestones[modal.count]||encouragements[Math.floor(Math.random()*encouragements.length)]}</p><button className="complete" onClick={close}>好，继续</button></div></div>;
if(modal.type==='done')return <div className="shade"><div className="modal celebrate"><div className="big">🏆</div><h3>49 / 49</h3><p><b>大功告成！</b><br/>这一周期全部完成，辛苦啦！</p><button className="complete" onClick={close}>完成</button></div></div>;
if(modal.type==='abandon')return <div className="shade"><div className="modal"><h3>确定放弃当前周期吗？</h3><p>当前已完成 <b>{/* safe display via */''}</b> 次。放弃后会保留在历史记录中，不影响重新开始。</p><div className="actions"><button className="outline" onClick={close}>取消</button><button className="danger" onClick={abandon}>确认放弃</button></div></div></div>;
return <div className="shade"><div className="modal"><h3>本周期</h3><p>从 {fmt(modal.start||'2026-01-01')} 开始。</p><button className="outline" onClick={close}>关闭</button></div></div>}
createRoot(document.getElementById('root')).render(<App/>);