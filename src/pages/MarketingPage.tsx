import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, Check, ChevronDown, Command, Focus, Layers3, LockKeyhole, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

type Plan = 'free' | 'pro' | 'business';
type PlanInfo = { id: Plan; name: string; currency: string; monthlyPriceCents: number; maxProjects: number; maxAiPerDay: number; hostedAi: boolean };

const fallbackPlans: PlanInfo[] = [
  { id: 'free', name: 'Free', currency: 'USD', monthlyPriceCents: 0, maxProjects: 5, maxAiPerDay: 3, hostedAi: false },
  { id: 'pro', name: 'Pro', currency: 'USD', monthlyPriceCents: 800, maxProjects: 100, maxAiPerDay: 50, hostedAi: true },
  { id: 'business', name: 'Business', currency: 'USD', monthlyPriceCents: 1600, maxProjects: 500, maxAiPerDay: 250, hostedAi: true },
];
const planCopy: Record<Plan, { note: string; extras: string[] }> = {
  free: { note: 'For your personal starting line', extras: ['Inbox capture and core task planning'] },
  pro: { note: 'For a calmer, more capable week', extras: ['Hosted AI, calendar and advanced filters'] },
  business: { note: 'For teams that move together', extras: ['Shared workspaces, roles and team reporting'] },
};

function go(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function MarketingPage() {
  const [plan, setPlan] = useState<Plan>('pro');
  const [plans, setPlans] = useState<PlanInfo[]>(fallbackPlans);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [cookieNotice, setCookieNotice] = useState(() => localStorage.getItem('taskflow-cookie-notice') !== 'dismissed');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;
    fetch(`${apiUrl}/billing/plans`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.plans)) setPlans(data.plans);
    }).catch(() => undefined);
  }, []);
  const selectedPlan = plans.find((item) => item.id === plan) || fallbackPlans.find((item) => item.id === plan)!;

  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <button className="marketing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="TaskFlow home">
          <span className="marketing-logo-mark">T</span><span>TASKFLOW</span>
        </button>
        <div className="marketing-nav-links">
          <a href="#workflow">How it works</a><a href="#calendar">Planning</a><a href="#teams">For teams</a><a href="#plans">Plans</a>
        </div>
        <div className="marketing-nav-actions"><button className="marketing-text-button" onClick={() => go('/login')}>Sign in</button><button className="marketing-nav-cta" onClick={() => go('/register')}>Start free <ArrowRight size={15} /></button></div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow"><span className="marketing-live-dot" /> A quieter way to get work moving</p>
          <h1>Make the next move obvious.</h1>
          <p className="marketing-hero-lead">TaskFlow brings capture, planning, focus and review into one clear workspace, so important work has somewhere to go.</p>
          <div className="marketing-hero-actions"><button className="marketing-primary" onClick={() => go('/register')}>Build your workspace <ArrowRight size={17} /></button><a href="#workflow" className="marketing-secondary">See the workflow <ChevronDown size={16} /></a></div>
          <div className="marketing-proof"><span><Check size={14} /> No credit card</span><span><Check size={14} /> Setup in 2 minutes</span></div>
        </div>
        <div className="marketing-hero-visual">
          <div className="marketing-window-bar"><span /><span /><span /><small>today / focus</small><Command size={14} /></div>
          <div className="marketing-window-body">
            <aside><div className="marketing-mini-mark">T</div><i /><i /><i /><i /><i /></aside>
            <div className="marketing-board"><div className="marketing-board-top"><span>Tuesday, 14 May</span><b>3 moves in focus</b></div><div className="marketing-focus-row"><span className="marketing-task-check" /><div><strong>Ship the first customer story</strong><small>Today · 45 min · Launch</small></div><em>1</em></div><div className="marketing-focus-row muted"><span className="marketing-task-check" /><div><strong>Review onboarding notes</strong><small>Today · 25 min · Research</small></div><em>2</em></div><div className="marketing-focus-row"><span className="marketing-task-check" /><div><strong>Share the weekly plan</strong><small>Today · 15 min · Team</small></div><em>3</em></div><div className="marketing-board-footer"><Sparkles size={15} /><span>AI found 2 tasks that can move together.</span></div></div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-border" id="workflow"><div className="marketing-section-heading"><p className="marketing-eyebrow">THE WORKFLOW</p><h2>From loose thought to finished work.</h2><p>Every part of the loop has a place. The product keeps the system visible while you keep your attention on the work.</p></div><div className="marketing-workflow-grid"><article><span>01</span><Layers3 size={21} /><h3>Capture without friction</h3><p>Drop a thought into the inbox before it disappears. Add context later, when you have the space.</p></article><article><span>02</span><Focus size={21} /><h3>Plan with intention</h3><p>Turn priorities into a realistic day, with dates, estimates and projects that make sense.</p></article><article><span>03</span><Sparkles size={21} /><h3>Let AI do the sorting</h3><p>Break down a brief, spot dates and suggest a cleaner order. You approve every meaningful change.</p></article><article><span>04</span><ShieldCheck size={21} /><h3>Review the signal</h3><p>Use activity and insights to see what moved, what stalled and what deserves the next move.</p></article></div></section>

      <section className="marketing-section marketing-planning" id="calendar"><div className="marketing-planning-copy"><p className="marketing-eyebrow">TIME, MADE VISIBLE</p><h2>Give priorities a place in the week.</h2><p>Move from a clean capture list to a plan you can actually carry. Calendar context, estimates and focus sessions make the tradeoffs visible before the day gets away from you.</p><div className="marketing-feature-list"><span><CalendarDays size={16} /> Week and calendar context</span><span><Focus size={16} /> Time-aware focus blocks</span><span><Sparkles size={16} /> Suggestions stay reviewable</span></div></div><div className="marketing-calendar-art" aria-label="Calendar planning example"><header><span>May</span><b>Week 20</b><i>Today</i></header><div className="marketing-calendar-days"><span>Mon <b>13</b></span><span>Tue <b>14</b></span><span className="today">Wed <b>15</b></span><span>Thu <b>16</b></span><span>Fri <b>17</b></span></div><div className="marketing-calendar-grid"><i /><i /><i /><i /><i /><em className="slot coral">Brief</em><em className="slot blue">Focus</em><em className="slot olive">Review</em></div></div></section>

      <section className="marketing-signal-band"><div><p className="marketing-eyebrow">THE SIGNAL, NOT THE NOISE</p><h2>See what your week is telling you.</h2><p>TaskFlow turns completed work, overdue work and focus time into a quiet review ritual. Use the trend to choose a better next week.</p><button className="marketing-outline-button" onClick={() => go('/register')}>Start your review <ArrowRight size={16} /></button></div><div className="marketing-signal-art"><div className="marketing-signal-title"><BarChart3 size={17} /><span>Weekly rhythm</span><b>72% complete</b></div><div className="marketing-bars" aria-label="Weekly completion chart"><i style={{ height: '42%' }} /><i style={{ height: '66%' }} /><i style={{ height: '54%' }} /><i className="active" style={{ height: '88%' }} /><i style={{ height: '71%' }} /></div><div className="marketing-signal-foot"><span>12 tasks closed</span><span>+18% vs last week</span></div></div></section>

      <section className="marketing-section marketing-team-section" id="teams"><div><p className="marketing-eyebrow">PERSONAL + TEAM</p><h2>A shared rhythm, without shared noise.</h2><p>Keep personal planning private and bring the right work into a team space. Roles, activity and project context stay close to the work.</p><button className="marketing-outline-button" onClick={() => go('/register')}>Explore the workspace <ArrowRight size={16} /></button></div><div className="marketing-team-art"><div className="marketing-team-header"><UsersRound size={17} /><span>Launch team</span><b>4 members</b></div><div className="marketing-team-line"><i className="avatar coral">A</i><div><strong>Homepage copy</strong><small>Assigned to Alex · In review</small></div><span className="status-pill">Today</span></div><div className="marketing-team-line"><i className="avatar blue">M</i><div><strong>Customer interview</strong><small>Assigned to Mina · Scheduled</small></div><span className="status-pill green">Done</span></div><div className="marketing-team-line"><i className="avatar olive">J</i><div><strong>Release checklist</strong><small>Assigned to Jo · 6 subtasks</small></div><span className="status-pill">Wed</span></div></div></section>

      <section className="marketing-section marketing-plans" id="plans"><div className="marketing-section-heading"><p className="marketing-eyebrow">PLANS THAT SCALE WITH THE WORK</p><h2>Start small. Add structure when you need it.</h2><p>Plan rules and usage limits are enforced by the service, so your workspace always reflects the plan you actually have.</p></div><div className="marketing-plan-toggle" role="tablist" aria-label="Plans">{plans.map((item) => <button key={item.id} role="tab" aria-selected={plan === item.id} className={plan === item.id ? 'selected' : ''} onClick={() => setPlan(item.id)}>{item.name}</button>)}</div><div className="marketing-plan-detail"><div><span className="marketing-plan-name">{selectedPlan.name}</span><strong><sup>{selectedPlan.currency === 'USD' ? '$' : selectedPlan.currency}</sup>{(selectedPlan.monthlyPriceCents / 100).toFixed(selectedPlan.monthlyPriceCents % 100 ? 2 : 0)}<small>/ month</small></strong><p>{planCopy[plan].note}</p></div><ul><li><Check size={16} />Up to {selectedPlan.maxProjects} projects</li><li><Check size={16} />Up to {selectedPlan.maxAiPerDay} AI actions each day</li>{planCopy[plan].extras.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><button className="marketing-primary" onClick={() => go('/register')}>{plan === 'free' ? 'Start free' : `Choose ${selectedPlan.name}`} <ArrowRight size={17} /></button></div></section>

      <section className="marketing-security"><div className="marketing-security-mark"><LockKeyhole size={30} /></div><div><p className="marketing-eyebrow">SECURITY BY DESIGN</p><h2>Your workspace stays yours.</h2><p>Plan changes, roles, quotas and AI access are decided by the service, not by a hidden browser control. AI suggestions are rendered safely, meaningful changes require review, and access boundaries are enforced on the server.</p></div><div className="marketing-security-points"><span><Check size={16} /> Server-owned plans and roles</span><span><Check size={16} /> Review before AI changes</span><span><Check size={16} /> Authenticated file access</span></div></section>

      <section className="marketing-case"><div><p className="marketing-eyebrow">DEMO SCENARIO</p><h2>A launch team, one calmer Monday.</h2></div><div className="marketing-case-quote"><p>“We brought research, copy and release tasks into one view. The plan stayed clear even when the week changed.”</p><span>Illustrative TaskFlow workspace scenario</span></div><div className="marketing-case-metric"><strong>3</strong><span>focus moves<br />for the day</span></div></section>

      <section className="marketing-faq"><div><p className="marketing-eyebrow">QUESTIONS, ANSWERED</p><h2>Good systems should feel understandable.</h2></div><div>{['Can I start without a team?', 'What does the AI change?', 'Can I leave whenever I need to?'].map((question, index) => <div className="marketing-faq-item" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><span>{openFaq === index ? '−' : '+'}</span></button>{openFaq === index && <p>{index === 0 ? 'Yes. TaskFlow is useful as a focused personal workspace and grows into team collaboration when the work calls for it.' : index === 1 ? 'AI suggests structure and drafts changes. You review and confirm before anything important is applied to your workspace.' : 'Yes. Your data stays yours, and the service keeps plan changes and account actions visible.'}</p>}</div>)}</div></section>

      <section className="marketing-final-cta"><p className="marketing-eyebrow">MAKE ROOM FOR THE WORK</p><h2>Start with the next move.</h2><p>A focused personal workspace is free to begin. Add team structure when the work asks for it.</p><button className="marketing-primary" onClick={() => go('/register')}>Create your workspace <ArrowRight size={17} /></button></section>

      <footer className="marketing-footer"><div className="marketing-logo"><span className="marketing-logo-mark">T</span><span>TASKFLOW</span></div><p>A considered workspace for the work that matters.</p><div><a href="#workflow">Product</a><a href="#plans">Plans</a><button onClick={() => go('/privacy')}>Privacy</button><button onClick={() => go('/terms')}>Terms</button><button onClick={() => go('/login')}>Sign in</button></div></footer>
      {cookieNotice && <aside className="marketing-cookie" aria-label="Cookie preference"><p>TaskFlow uses essential storage for authentication, offline sync and your display preferences.</p><div><button onClick={() => { localStorage.setItem('taskflow-cookie-notice', 'dismissed'); setCookieNotice(false); }}>Accept essential</button><button className="marketing-cookie-link" onClick={() => go('/privacy')}>Privacy</button></div></aside>}
    </main>
  );
}
