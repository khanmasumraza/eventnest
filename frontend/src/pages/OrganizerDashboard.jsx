import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import OrganizerLayout from '../components/OrganizerLayout'

const categoryIcons = {
  'Hackathon':'💻','Fest':'🎉','Workshop':'🛠️','Conference':'🎤',
  'Sports':'⚽','Cultural':'🎭','Meetup':'👋','Other':'📌',
  'Music':'🎵','Tech':'💻','Startup':'🚀','Community':'🤝','Education':'📚','Food':'🍕',
}
const ACTIVITY_DOT = { purchase: '#22c55e', register: '#6366f1' }

function getTimeAgo(d) {
  if (!d) return ''
  const diff=Date.now()-new Date(d).getTime()
  const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),dy=Math.floor(diff/86400000)
  if(m<60) return `${m} min ago`
  if(h<24) return `${h} hour${h>1?'s':''} ago`
  return `${dy} day${dy>1?'s':''} ago`
}

function AnimatedNumber({value,delay=0,duration=900,suffix=''}) {
  const [d,setD]=useState(0)
  const num=parseFloat(value)||0
  useEffect(()=>{
    let s=null
    const step=(ts)=>{
      if(!s)s=ts
      const el=ts-s-delay
      if(el<0){requestAnimationFrame(step);return}
      const p=Math.min(el/duration,1),e=1-Math.pow(1-p,3)
      setD(Math.round(e*num))
      if(p<1)requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  },[value,delay,duration])
  return <>{d.toLocaleString('en-IN')}{suffix}</>
}

const card={background:'#0d1220',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',padding:'20px'}
const btnP={display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:'9px',fontSize:'12px',fontWeight:600,cursor:'pointer',textDecoration:'none',fontFamily:'inherit'}
const btnO={display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'transparent',color:'#94a3b8',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',fontSize:'12px',fontWeight:500,cursor:'pointer',textDecoration:'none',fontFamily:'inherit'}

function StatCard({accent,iconBg,icon,label,trend,trendColor='#22c55e',visible,delay,children}) {
  const [hov,setHov]=useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:'#0d1220',border:'1px solid rgba(255,255,255,0.06)',borderTop:`2px solid ${accent}`,
      borderRadius:'14px',padding:'16px 18px',display:'flex',flexDirection:'column',minWidth:0,
      opacity:visible?1:0,transform:visible?(hov?'translateY(-3px)':'translateY(0)'):'translateY(16px)',
      transition:`opacity 0.4s ease ${delay}ms,transform 0.4s ease ${delay}ms,box-shadow 0.2s`,
      boxShadow:hov?`0 8px 28px ${accent}22`:'none',
    }}>
      <div style={{width:'36px',height:'36px',borderRadius:'10px',background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',marginBottom:'12px'}}>{icon}</div>
      <div style={{color:'#475569',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'4px'}}>{label}</div>
      <div style={{color:'#f1f5f9',fontSize:'28px',fontWeight:700,lineHeight:1}}>{children}</div>
      {trend&&<div style={{color:trendColor,fontSize:'11px',fontWeight:600,marginTop:'6px'}}>{trend}</div>}
    </div>
  )
}

function AlertItem({alert,visible,delay}) {
  const [hov,setHov]=useState(false)
  return (
    <a href={`/event/${alert._id}`} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'12px',textDecoration:'none',
      background:hov?'rgba(255,255,255,0.03)':'#0d1220',
      border:`1px solid ${hov?alert.color+'66':alert.color+'33'}`,
      opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(10px)',
      transition:`opacity 0.35s ease ${delay}ms,transform 0.35s ease ${delay}ms,border-color 0.15s,background 0.15s`,
    }}>
      <div style={{width:'34px',height:'34px',borderRadius:'9px',flexShrink:0,background:alert.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>
        {categoryIcons[alert.category]||'📌'}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:'#e5e7eb',fontSize:'13px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{alert.title}</div>
        <div style={{color:'#475569',fontSize:'11px',marginTop:'2px'}}>{alert.msg}</div>
      </div>
      <span style={{flexShrink:0,padding:'3px 9px',borderRadius:'6px',background:alert.bg,color:alert.color,fontSize:'10px',fontWeight:700}}>{alert.tag}</span>
    </a>
  )
}

function OrganizerDashboard() {
  const navigate=useNavigate()
  const {user}=useAuth()
  const [events,setEvents]=useState([])
  const [tickets,setTickets]=useState([])
  const [loading,setLoading]=useState(true)
  const [statsIn,setStatsIn]=useState(false)
  const [alertsIn,setAlertsIn]=useState(false)
  const [bottomIn,setBottomIn]=useState(false)

  useEffect(()=>{
    if(!user){navigate('/login');return}
    if(user.role!=='organizer'){navigate('/dashboard');return}
    fetchData()
  },[user])

  useEffect(()=>{
    if(loading)return
    setTimeout(()=>setStatsIn(true),80)
    setTimeout(()=>setAlertsIn(true),260)
    setTimeout(()=>setBottomIn(true),420)
  },[loading])

  const fetchData=async()=>{
    try {
      const evRes=await api.get('/events/my-events')
      const raw=evRes.data?.events||evRes.data
      setEvents(Array.isArray(raw)?raw:[])
      try {
        const tkRes=await api.get('/tickets/organizer/all')
        setTickets(tkRes.data?.tickets||tkRes.data||[])
      } catch{setTickets([])}
    } catch(err){console.error('Dashboard:',err.response?.data||err.message)}
    finally{setLoading(false)}
  }

  const totalEvents=events.length
  const upcomingEvents=useMemo(()=>events.filter(e=>new Date(e.date)>=new Date()).length,[events])
  const eventsThisMonth=useMemo(()=>{
    const now=new Date()
    return events.filter(e=>{const d=new Date(e.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length
  },[events])
  const avgAttendance=useMemo(()=>{
    const w=events.filter(e=>(e.capacity||0)>0)
    if(!w.length)return 0
    return Math.round(w.reduce((s,e)=>s+((e.registered||0)/e.capacity)*100,0)/w.length)
  },[events])
  const nextEvent=useMemo(()=>events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0]||null,[events])
  const topEvent=useMemo(()=>[...events].sort((a,b)=>(b.registered||0)-(a.registered||0))[0]||null,[events])
  const alerts=useMemo(()=>{
    const now=new Date()
    return events.filter(e=>{
      const dl=(new Date(e.date)-now)/86400000
      const f=((e.registered||0)/(e.capacity||1))*100
      return (f>=80&&dl>0)||(dl<=3&&dl>0&&f<20)
    }).slice(0,3).map(e=>{
      const dl=Math.ceil((new Date(e.date)-now)/86400000)
      const f=Math.round(((e.registered||0)/(e.capacity||1))*100)
      const af=f>=80
      return {_id:e._id,title:e.title,category:e.category,
        tag:af?'Almost Full':'Low Sales',
        color:af?'#f87171':'#f59e0b',
        bg:af?'rgba(248,113,113,0.1)':'rgba(245,158,11,0.1)',
        msg:af?`${f}% sold · ${dl}d left`:`Only ${f}% sold · ${dl}d left`}
    })
  },[events])
  const activities=useMemo(()=>{
    const items=[]
    ;[...tickets].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3)
      .forEach(t=>items.push({id:t._id,type:'purchase',text:`${t.user?.name||'Someone'} purchased a ticket for ${t.event?.title||'an event'}`,time:getTimeAgo(t.createdAt),_rawTime:t.createdAt}))
    ;[...events].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,2)
      .forEach(e=>items.push({id:e._id,type:'register',text:`Event "${e.title}" created`,time:getTimeAgo(e.createdAt),_rawTime:e.createdAt}))
    return items.sort((a,b)=>new Date(b._rawTime)-new Date(a._rawTime)).slice(0,6)
  },[tickets,events])

  const fmt=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0}).format(n)
  const nextFill=nextEvent?Math.min(((nextEvent.registered||0)/(nextEvent.capacity||1))*100,100):0
  const fillColor=nextFill>80?'#f87171':'#6366f1'

  if(loading)return(
    <OrganizerLayout>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
        <div style={{width:'36px',height:'36px',border:'3px solid rgba(99,102,241,0.15)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </OrganizerLayout>
  )

  return (
    <OrganizerLayout>
      <div style={{display:'flex',flexDirection:'column',gap:'16px',fontFamily:"'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard accent="#6366f1" iconBg="rgba(99,102,241,0.12)" icon="📅" label="Total Events" visible={statsIn} delay={0}>
            <AnimatedNumber value={totalEvents} delay={120}/>
          </StatCard>
          <StatCard accent="#a78bfa" iconBg="rgba(167,139,250,0.10)" icon="🔥" label="Upcoming" visible={statsIn} delay={65}>
            <AnimatedNumber value={upcomingEvents} delay={185}/>
          </StatCard>
          <StatCard accent="#22c55e" iconBg="rgba(34,197,94,0.10)" icon="📆" label="This Month" visible={statsIn} delay={130}
            trend={eventsThisMonth>0?`${eventsThisMonth} new event${eventsThisMonth>1?'s':''}`:null}>
            <AnimatedNumber value={eventsThisMonth} delay={250}/>
          </StatCard>
          <StatCard accent="#f59e0b" iconBg="rgba(245,158,11,0.10)" icon="📊" label="Avg Attendance" visible={statsIn} delay={195}
            trend={avgAttendance>0?(avgAttendance>=70?'🟢 Healthy fill rate':avgAttendance>=30?'🟡 Room to grow':'🔴 Low fill rate'):null}
            trendColor={avgAttendance>=70?'#22c55e':avgAttendance>=30?'#f59e0b':'#f87171'}>
            <AnimatedNumber value={avgAttendance} delay={315} suffix="%"/>
          </StatCard>
        </div>

        {/* Alerts */}
        {alerts.length>0&&(
          <div style={{opacity:alertsIn?1:0,transform:alertsIn?'translateY(0)':'translateY(12px)',transition:'opacity 0.4s ease,transform 0.4s ease'}}>
            <div style={{color:'#475569',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'10px'}}>Needs attention</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {alerts.map((a,i)=><AlertItem key={a._id} alert={a} visible={alertsIn} delay={i*60}/>)}
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className="dash-grid">

          {/* Next event */}
          <div style={{...card,opacity:bottomIn?1:0,transform:bottomIn?'translateY(0)':'translateY(16px)',transition:'opacity 0.4s ease 0ms,transform 0.4s ease 0ms'}}>
            <div style={{color:'#f1f5f9',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Next event</div>
            {nextEvent?(
              <>
                <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'16px'}}>
                  <div style={{width:'46px',height:'46px',borderRadius:'12px',flexShrink:0,background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>
                    {categoryIcons[nextEvent.category]||'🎉'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:'#f1f5f9',fontSize:'15px',fontWeight:700,marginBottom:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nextEvent.title}</div>
                    <div style={{color:'#475569',fontSize:'12px'}}>📍 {nextEvent.city||nextEvent.venue||'TBD'} · {new Date(nextEvent.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
                  {[{label:'Sold',value:nextEvent.registered||0,color:'#f1f5f9'},{label:'Remaining',value:Math.max((nextEvent.capacity||0)-(nextEvent.registered||0),0),color:'#22c55e'}].map((item,i)=>(
                    <div key={i} style={{background:'#111827',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',padding:'10px 12px'}}>
                      <div style={{color:'#475569',fontSize:'10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'3px'}}>{item.label}</div>
                      <div style={{color:item.color,fontSize:'20px',fontWeight:700}}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{color:'#475569',fontSize:'11px'}}>Capacity</span>
                    <span style={{color:'#94a3b8',fontSize:'11px'}}>{Math.round(nextFill)}%</span>
                  </div>
                  <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'999px',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:'999px',background:fillColor,width:bottomIn?`${nextFill}%`:'0%',transition:'width 0.9s cubic-bezier(0.34,1.2,0.64,1) 0.4s'}}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <Link to="/organiser/tickets" style={btnP}>View tickets</Link>
                  <Link to="/organiser/events" style={btnO}>All events</Link>
                </div>
              </>
            ):(
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:'32px',marginBottom:'10px'}}>📅</div>
                <p style={{color:'#94a3b8',fontSize:'13px',marginBottom:'16px'}}>No upcoming events</p>
                <Link to="/organiser/create" style={btnP}>Create event</Link>
              </div>
            )}
          </div>

          {/* Top event */}
          <div style={{...card,opacity:bottomIn?1:0,transform:bottomIn?'translateY(0)':'translateY(16px)',transition:'opacity 0.4s ease 80ms,transform 0.4s ease 80ms'}}>
            <div style={{color:'#f1f5f9',fontSize:'14px',fontWeight:600,marginBottom:'2px'}}>Top event</div>
            <div style={{color:'#475569',fontSize:'11px',marginBottom:'16px'}}>Most registrations</div>
            {topEvent&&(topEvent.registered||0)>0?(
              <>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                  <div style={{width:'42px',height:'42px',borderRadius:'11px',flexShrink:0,background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>
                    {categoryIcons[topEvent.category]||'🎉'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:'#f1f5f9',fontSize:'13px',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{topEvent.title}</div>
                    <div style={{color:'#475569',fontSize:'11px',marginTop:'2px'}}>{topEvent.city||'N/A'} · {new Date(topEvent.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                  {[{label:'Registered',value:topEvent.registered||0,color:'#f1f5f9'},{label:'Revenue',value:fmt((topEvent.registered||0)*(topEvent.price||0)),color:'#f59e0b'}].map((item,i)=>(
                    <div key={i} style={{flex:1,background:'#111827',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',padding:'10px 12px'}}>
                      <div style={{color:'#475569',fontSize:'10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'3px'}}>{item.label}</div>
                      <div style={{color:item.color,fontSize:'16px',fontWeight:700}}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{color:'#475569',fontSize:'11px'}}>Fill rate</span>
                    <span style={{color:'#f59e0b',fontSize:'11px',fontWeight:600}}>{Math.round(((topEvent.registered||0)/(topEvent.capacity||1))*100)}%</span>
                  </div>
                  <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'999px',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:'999px',background:'#f59e0b',width:bottomIn?`${Math.min(((topEvent.registered||0)/(topEvent.capacity||1))*100,100)}%`:'0%',transition:'width 0.9s cubic-bezier(0.34,1.2,0.64,1) 0.5s'}}/>
                  </div>
                </div>
                <a href={`/event/${topEvent._id}`} style={{...btnO,width:'100%',justifyContent:'center',boxSizing:'border-box'}}>View event →</a>
              </>
            ):(
              <div style={{textAlign:'center',padding:'28px 0'}}>
                <div style={{fontSize:'28px',marginBottom:'8px'}}>🏆</div>
                <p style={{color:'#334155',fontSize:'12px'}}>No ticket sales yet</p>
              </div>
            )}
          </div>

          {/* Activity */}
          <div style={{...card,opacity:bottomIn?1:0,transform:bottomIn?'translateY(0)':'translateY(16px)',transition:'opacity 0.4s ease 160ms,transform 0.4s ease 160ms'}}>
            <div style={{color:'#f1f5f9',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Recent activity</div>
            {activities.length>0?(
              <div style={{display:'flex',flexDirection:'column'}}>
                {activities.map((a,idx)=>(
                  <div key={idx} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 0',borderBottom:idx<activities.length-1?'1px solid rgba(255,255,255,0.04)':'none',opacity:bottomIn?1:0,transform:bottomIn?'translateX(0)':'translateX(-10px)',transition:`opacity 0.35s ease ${220+idx*55}ms,transform 0.35s ease ${220+idx*55}ms`}}>
                    <div style={{width:'7px',height:'7px',borderRadius:'50%',flexShrink:0,marginTop:'5px',background:ACTIVITY_DOT[a.type]||'#475569',boxShadow:`0 0 6px ${ACTIVITY_DOT[a.type]||'#475569'}88`}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{color:'#c4c9d4',fontSize:'12px',margin:'0 0 2px',lineHeight:1.5}}>{a.text}</p>
                      <p style={{color:'#334155',fontSize:'11px',margin:0}}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <p style={{color:'#334155',fontSize:'13px'}}>No recent activity yet</p>
              </div>
            )}
          </div>
        </div>

        {events.length===0&&(
          <div style={{...card,textAlign:'center',padding:'48px 24px',opacity:bottomIn?1:0,transform:bottomIn?'translateY(0)':'translateY(16px)',transition:'opacity 0.4s ease 200ms,transform 0.4s ease 200ms'}}>
            <div style={{width:'60px',height:'60px',borderRadius:'16px',background:'rgba(99,102,241,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'26px'}}>🎪</div>
            <h3 style={{color:'#f1f5f9',fontSize:'17px',fontWeight:600,margin:'0 0 8px'}}>Create your first event</h3>
            <p style={{color:'#475569',fontSize:'13px',marginBottom:'24px'}}>Start selling tickets and managing attendees in minutes</p>
            <Link to="/organiser/create" style={{...btnP,display:'inline-flex'}}>Create event →</Link>
          </div>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .dash-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,280px);gap:12px}
        @media(max-width:1100px){.dash-grid{grid-template-columns:1fr 1fr!important}.dash-grid>*:last-child{grid-column:1/-1}}
        @media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)!important}.dash-grid{grid-template-columns:1fr!important}.dash-grid>*:last-child{grid-column:unset}}
        @media(max-width:480px){.stats-grid{grid-template-columns:1fr 1fr!important}}
      `}</style>
    </OrganizerLayout>
  )
}

export default OrganizerDashboard