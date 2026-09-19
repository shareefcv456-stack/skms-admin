/* Pricing & Plans: every program with its plans, straight from the database (GET /api/plans/live).
   Save sends the whole list to PUT /api/admin/plans/bulk-sync — one transaction updates prices and plans, adds new
   ones and switches removed ones off (never deletes them); if anything is refused, nothing changes. */
import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { api, money } from '../lib/api.js';
import { Empty, Field, missing, useUi } from '../lib/ui.jsx';

const CARD = [
  ['name', 'Plan name'], ['duration', 'Access label (e.g. 45 days access)', 'text', { req: true }],
  ['durationDays', 'Duration (days)', 'number', { req: true, hint: 'How long the app subscription lasts.' }],
  ['price', 'Price (₹)', 'number', { req: true }], ['was', 'Old price (₹) — optional', 'number'],
  ['features', 'Features (one per line)', 'lines'], ['note', 'Description', 'textarea'],
  ['flag', 'Ribbon text'], ['sub', 'Highlight text'],
  ['tone', 'Header colour', 'select', { options: ['grey', 'blue', 'pink'] }], ['dark', 'Featured (dark card)', 'check'],
];
const blankCard = () => ({ name: '', duration: '', durationDays: 30, tone: 'grey', features: [] });   // no planId: Save creates the row
const cardTitle = c => [c.name, c.price > 0 && money(c.price), c.duration, c.planId ? `#${c.planId}` : 'new'].filter(Boolean).join(' · ') || 'New plan';

export default function Plans({ setDirty }) {
  const { toast, ask } = useUi();
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(null);

  async function load() {
    setError(null);
    const r = await api('/api/plans/live');
    if (!r.ok) return setError(r.data.error || 'Could not load the plans.');
    setDraft(r.data.plans);
    setSource(r.data.source);
    setDirty(false);
  }
  useEffect(() => { load(); }, []);

  const edit = fn => { const next = structuredClone(draft); fn(next); setDraft(next); setDirty(true); setBad(null); };

  async function removeCard(gi, ci) {
    if (draft[gi].cards.length === 1) return toast('A program needs at least one plan.', 'error');
    if (!(await ask('Remove this plan?', `“${cardTitle(draft[gi].cards[ci])}” is switched off in the database (never deleted) when you press Save Plans.`, 'Remove', true))) return;
    edit(d => d[gi].cards.splice(ci, 1));
  }

  async function save() {
    for (const [gi, g] of draft.entries()) {
      if (!String(g.label ?? '').trim()) { setBad(`${gi}`); return toast('Every program needs a name.', 'error'); }
      for (const [ci, c] of g.cards.entries()) {
        const label = missing(CARD, c);
        if (label) { setBad(`${gi}.${ci}`); return toast(`${g.label}, plan ${ci + 1}: please fill in “${label}”.`, 'error'); }
      }
    }
    setBusy(true);
    const body = draft.map(g => ({ ...g, cards: g.cards.map(c => ({ ...c, features: (c.features || []).map(s => s.trim()).filter(Boolean) })) }));
    const r = await api('/api/admin/plans/bulk-sync', { method: 'PUT', body });
    setBusy(false);
    if (!r.ok) return r.status !== 401 && toast(r.data.error || 'Nothing was saved.', 'error');
    setDraft(r.data.plans);   // new plans now carry their database ids
    setDirty(false);
    toast(`Plans saved to the database ✓${r.data.retired?.length ? ` — ${r.data.retired.length} plan(s) switched off` : ''}`);
  }

  if (error) return <div className="a-panel"><Empty title="Could not load the plans" text={error} /><div className="text-center"><button className="a-btn a-btn--ghost" onClick={load}>Try again</button></div></div>;
  if (!draft) return <div className="a-panel text-[13px] text-charcoal/50">Loading…</div>;

  return <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <p className="mr-auto text-[13px] text-charcoal/55">
        {draft.length} programs · a removed plan is switched off in the database, never deleted
        {source !== 'db' && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">database not reached yet — showing saved cards</span>}
      </p>
      <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={busy}>Save Plans</button>
    </div>

    {draft.map((g, gi) => (
      <div key={g.id} className="a-panel mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <Field spec={['label', 'Program name', 'text', { req: true }]} value={g.label} bad={bad === `${gi}`} onChange={v => edit(d => { d[gi].label = v; })} />
          </div>
          <span className="mb-2 rounded-full bg-mint px-3 py-1 text-[12px] text-charcoal/55">#{g.id} · app course {g.courseId ?? '—'} · {g.cards.length} plan{g.cards.length === 1 ? '' : 's'}</span>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => edit(d => d[gi].cards.push(blankCard()))}><Plus className="h-4 w-4" />Add plan</button>
        </div>
        <div className="mt-5 grid gap-3">
          {g.cards.map((c, ci) => (
            <details key={c.planId ?? `new-${ci}`} open={bad === `${gi}.${ci}` || !c.planId || undefined}
              className="min-w-0 rounded-2xl border border-black/5 bg-mint/70 transition open:bg-white open:shadow-[0_10px_30px_-18px_rgba(30,35,30,.3)]">
              <summary className="flex items-center gap-3 px-4 py-3">
                <ChevronDown className="chev h-4 w-4 shrink-0 text-charcoal/40" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{cardTitle(c)}</span>
                <button type="button" aria-label="Remove plan" className="rounded-full p-2 text-charcoal/35 transition hover:bg-red-50 hover:text-red-500"
                  onClick={e => { e.preventDefault(); removeCard(gi, ci); }}><Trash2 className="h-4 w-4" /></button>
              </summary>
              <div className="grid gap-4 border-t border-black/5 p-4 sm:grid-cols-2">
                {CARD.map(spec => <Field key={spec[0]} spec={spec} value={c[spec[0]]} onChange={v => edit(d => { d[gi].cards[ci][spec[0]] = v; })} />)}
              </div>
            </details>
          ))}
        </div>
      </div>
    ))}
  </>;
}
