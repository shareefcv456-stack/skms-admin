/* Admin shell: password sign-in (POST /api/admin/login → a 12-hour bearer token), sidebar tabs, and a guard that
   asks before unsaved edits are thrown away. When the token expires the sign-in comes back over the dashboard,
   so the draft on screen survives — sign in again, then press Save. */
import { useEffect, useState } from 'react';
import { BadgeDollarSign, CircleHelp, ExternalLink, GraduationCap, Image, Inbox as InboxIcon, LogOut, Menu, MessageSquareHeart, MessageSquareQuote, Receipt, Sparkles, X } from 'lucide-react';
import { api, events, session as store, SITE_URL as SITE } from './lib/api.js';
import { useUi } from './lib/ui.jsx';
import CmsEditor from './tabs/CmsEditor.jsx';
import Plans from './tabs/Plans.jsx';
import Inbox from './tabs/Inbox.jsx';
import Enrollments from './tabs/Enrollments.jsx';

const stars = r => `${r.name || 'New review'}  ${'★'.repeat(r.rating || 5)}`;
const review = [['name', 'Name', 'text', { req: true }], ['role', 'Role / country'], ['rating', 'Star rating', 'stars'], ['body', 'Review', 'textarea', { req: true }]];

/* [id, title, subtitle, icon, render(setDirty)] */
const TABS = [
  ['plans', 'Pricing & Plans', 'Price, name, days and features save to the app database (the mobile app sees them too); colours, ribbons and notes stay on the website.', BadgeDollarSign,
    d => <Plans setDirty={d} />],
  ['inbox', 'Review Inbox', 'Sent by visitors from “Write A Review”. Edit, approve to publish in “What Our Students Say”, or delete.', InboxIcon,
    () => <Inbox />],
  ['reviews', 'Student Reviews', '“What Our Students Say” on the home page. While this list is empty the built-in reviews are shown.', MessageSquareHeart,
    d => <CmsEditor key="reviews" section="reviews" list fields={review} blank={() => ({ name: '', role: '', rating: 5, body: '' })} rowTitle={stars} addLabel="Add review" saveLabel="Save Reviews" setDirty={d} />],
  ['hero', 'Hero Banner', 'Headline, description, buttons and banner image at the top of the home page.', Image,
    d => <CmsEditor key="hero" section="hero" saveLabel="Save Hero" setDirty={d} fields={[
      ['headline', 'Main headline (one row per line)', 'textarea', { req: true, hint: 'Wrap words in *asterisks* for the green italic.' }],
      ['sub', 'Sub-headline / description', 'textarea', { req: true }],
      ['cta1Text', 'First button text'], ['cta1Link', 'First button link', 'text', { hint: 'A page such as /courses, or a full https:// link.' }],
      ['cta2Text', 'Second button text'], ['cta2Link', 'Second button link'],
      ['image', 'Banner image', 'image'],
    ]} />],
  ['cases', 'Secondary Banner', 'The “Face Real Cases” section under the hero on the home page.', Sparkles,
    d => <CmsEditor key="cases" section="cases" saveLabel="Save Banner" setDirty={d} fields={[
      ['eyebrow', 'Small label above the title'],
      ['headline', 'Title (one row per line)', 'textarea', { req: true, hint: 'Wrap words in *asterisks* for the green italic.' }],
      ['body', 'Paragraphs (one per line)', 'lines', { hint: 'Wrap words in **double asterisks** for bold.' }],
      ['pills', 'Audience pills (one per line)', 'lines'],
      ['quote', 'Quote card', 'textarea'],
    ]} />],
  ['testimonials', 'Testimonials', '“Doctors Who Passed” reviews on the home page.', MessageSquareQuote,
    d => <CmsEditor key="testimonials" section="testimonials" list fields={review.map(f => f[0] === 'name' ? ['name', 'Doctor name', 'text', { req: true }] : f)}
      blank={() => ({ name: '', role: '', rating: 5, body: '' })} rowTitle={stars} addLabel="Add testimonial" saveLabel="Save Testimonials" setDirty={d} />],
  ['faculty', 'Faculty Showcase', '“Learn From the Best” doctors on the home and About pages.', GraduationCap,
    d => <CmsEditor key="faculty" section="faculty" list setDirty={d} addLabel="Add doctor" saveLabel="Save Faculty"
      fields={[['name', 'Name', 'text', { req: true }], ['role', 'Qualification', 'text', { req: true }], ['photo', 'Photo', 'image', { req: true, maxWidth: 480 }]]}
      blank={() => ({ name: '', role: '', photo: '' })} rowTitle={f => [f.name, f.role].filter(Boolean).join(' — ') || 'New doctor'} />],
  ['faqs', 'FAQs', 'Frequently asked questions — the first four also show on the home page.', CircleHelp,
    d => <CmsEditor key="faqs" section="faqs" list setDirty={d} addLabel="Add question" saveLabel="Save FAQs"
      fields={[['q', 'Question', 'text', { req: true, wide: true }], ['a', 'Answer', 'textarea', { req: true }]]}
      blank={() => ({ q: '', a: '' })} rowTitle={f => f.q || 'New question'} />],
  ['enrollments', 'Enrollments', 'Razorpay checkout transactions from the Buy Plans page.', Receipt,
    () => <Enrollments />],
];

export default function App() {
  const { ask } = useUi();
  const [session, setSession] = useState(store.get);
  const [opened, setOpened] = useState(!!session);   // the dashboard stays mounted under an expired-session sign-in
  const [tab, setTab] = useState(() => TABS.find(t => t[0] === location.hash.slice(1))?.[0] || 'plans');
  const [dirty, setDirty] = useState(false);
  const [drawer, setDrawer] = useState(false);   // mobile (< 1024px) navigation

  useEffect(() => {
    events.onExpired = () => { store.set(null); setSession(null); };
    const warn = e => { if (dirty) e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = e => e.key === 'Escape' && setDrawer(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [drawer]);

  const leave = async () => !dirty || ask('Discard unsaved changes?', 'Your edits on this tab haven’t been saved yet.', 'Discard changes', true);
  async function go(id) {
    if (id === tab || !(await leave())) return;
    setDirty(false);
    setTab(id);
    history.replaceState(null, '', '#' + id);
  }
  async function logout() {
    if (!(await leave())) return;
    setDirty(false);
    store.set(null);
    setSession(null);
    setOpened(false);
  }
  function signedIn(s) {
    store.set(s);
    setSession(s);
    setOpened(true);
  }

  const [, title, sub, , render] = TABS.find(t => t[0] === tab);
  // the same items in the desktop sidebar and the mobile drawer; picking one also closes the drawer
  const navItems = TABS.map(([id, t, , Icon]) => (
    <button key={id} type="button" className="a-nav" aria-current={id === tab ? 'page' : undefined} onClick={() => { setDrawer(false); go(id); }}><Icon className="h-[18px] w-[18px]" />{t}</button>
  ));
  return <>
    {opened && (
      <div className="min-h-screen lg:flex">
        {/* mobile top bar (< 1024px): brand, logout, menu */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-charcoal pl-4 pr-2 text-white lg:hidden">
          <a href={SITE} target="_blank" rel="noopener" className="mr-auto flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
            <b className="truncate font-display text-[15px]">Dr. SKM&#39;s Academy</b>
          </a>
          <button type="button" onClick={logout} aria-label="Logout" title="Logout" className="grid h-10 w-10 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"><LogOut className="h-5 w-5" /></button>
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/10"><Menu className="h-6 w-6" /></button>
        </div>

        {/* mobile drawer: the sidebar's items, sliding in from the left over a dimmed page */}
        <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? '' : 'pointer-events-none'}`} inert={!drawer}>
          <div onClick={() => setDrawer(false)} className={`absolute inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity duration-300 ${drawer ? 'opacity-100' : 'opacity-0'}`} />
          <aside role="dialog" aria-modal="true" aria-label="Menu" className={`absolute inset-y-0 left-0 flex w-[min(82vw,288px)] flex-col bg-charcoal text-white shadow-2xl transition-transform duration-300 ease-out ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center gap-3 px-5 pt-5">
              <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
              <span className="min-w-0 flex-1 leading-tight"><b className="block font-display text-[16px]">Dr. SKM&#39;s Academy</b><span className="text-[11px] text-white/45">Admin dashboard</span></span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="-mr-2 grid h-10 w-10 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <nav className="mt-4 flex flex-col gap-1 overflow-y-auto px-4 py-2">{navItems}</nav>
            <div className="mt-auto border-t border-white/10 p-5">
              <p className="truncate text-[12px] text-white/45">{session?.email}</p>
              <a href={SITE} target="_blank" rel="noopener" className="mt-3 flex items-center gap-2 text-[13px] text-brand-light hover:underline"><ExternalLink className="h-4 w-4" />View website</a>
            </div>
          </aside>
        </div>

        {/* desktop sidebar (>= 1024px), unchanged */}
        <aside className="hidden bg-charcoal text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
          <a href={SITE} target="_blank" rel="noopener" className="flex items-center gap-3 px-5 pt-5 lg:px-6 lg:pt-7">
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="leading-tight"><b className="block font-display text-[16px]">Dr. SKM&#39;s Academy</b><span className="text-[11px] text-white/45">Admin dashboard</span></span>
          </a>
          <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:mt-6 lg:flex-col lg:overflow-y-auto lg:px-4">{navItems}</nav>
          <div className="mt-auto hidden border-t border-white/10 p-5 lg:block">
            <p className="truncate text-[12px] text-white/45">{session?.email}</p>
            <a href={SITE} target="_blank" rel="noopener" className="mt-3 flex items-center gap-2 text-[13px] text-brand-light hover:underline"><ExternalLink className="h-4 w-4" />View website</a>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="sticky top-14 z-20 flex flex-wrap items-center gap-3 border-b border-black/5 bg-mint/85 px-5 py-4 backdrop-blur lg:top-0 lg:px-10">
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-semibold">{title}</h1>
              <p className="text-[13px] text-charcoal/55">{sub}</p>
            </div>
            <button type="button" className="a-btn a-btn--ghost hidden lg:inline-flex" onClick={logout}><LogOut className="h-4 w-4" />Logout</button>
          </header>
          <section className="px-5 py-8 lg:px-10">{render(setDirty)}</section>
        </main>
      </div>
    )}
    {!session && <Login onSignedIn={signedIn} again={opened} />}
  </>;
}

function Login({ onSignedIn, again }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await api('/api/admin/login', { method: 'POST', body: { email, password } });
    setBusy(false);
    if (!r.ok) return setError(r.data.error || 'Sign-in failed');
    onSignedIn({ email: email.trim().toLowerCase(), token: r.data.token, exp: r.data.exp });
  }

  return (
    <main className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 ${again ? 'bg-charcoal/60 backdrop-blur-sm' : 'bg-mint'}`}>
      <div className="grid w-full max-w-[920px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_100px_-40px_rgba(30,35,30,.45)] md:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-charcoal p-10 text-white md:block">
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
          <img src="/logo.png" alt="" className="relative h-16 w-16 object-contain" />
          <h2 className="relative mt-10 font-display text-[34px] font-bold leading-tight">Content<br /><em className="text-brand-light">Management</em></h2>
          <p className="relative mt-4 text-[14px] leading-7 text-white/60">Update prices and plans, approve student reviews, edit the banners and faculty — and track Razorpay enrollments.</p>
        </div>
        <form className="p-8 sm:p-12" onSubmit={submit}>
          <img src="/logo.png" alt="" className="h-12 w-12 object-contain md:hidden" />
          <p className="eyebrow mt-4 md:mt-0">Dr. SKM&#39;s Academy</p>
          <h1 className="mt-2 text-[26px] font-semibold">{again ? 'Session expired — sign in again' : 'Admin sign in'}</h1>
          {again && <p className="mt-2 text-[13px] text-charcoal/55">Your unsaved edits are still there. Sign in, then press Save.</p>}
          <label className="a-label mt-8" htmlFor="l-email">Email</label>
          <input id="l-email" type="email" required autoComplete="username" autoFocus className="a-input py-3" value={email} onChange={e => setEmail(e.target.value)} />
          <label className="a-label mt-4" htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" required autoComplete="current-password" className="a-input py-3" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] text-red-600" role="alert">{error}</p>}
          <button className="a-btn a-btn--primary mt-7 w-full py-3.5" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </main>
  );
}
