/* Review Inbox: what visitors sent from "Write A Review". Approve publishes one into Student Reviews (after any
   edits made here); Delete removes it for good. Nothing reaches the website without an approve. */
import { useEffect, useState } from 'react';
import { Check, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { Empty, Field, missing, useUi } from '../lib/ui.jsx';

const FIELDS = [['name', 'Name', 'text', { req: true }], ['role', 'Role / country'], ['rating', 'Star rating', 'stars'], ['body', 'Review', 'textarea', { req: true }]];
const when = d => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default function Inbox() {
  const { toast, ask } = useUi();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});   // id → the edited copy
  const [busy, setBusy] = useState(null);

  async function load() {
    setError(null);
    const r = await api('/api/admin/review-inbox');
    if (!r.ok) return setError(r.data.error || 'Could not load the inbox.');
    setRows(r.data);
  }
  useEffect(() => { load(); }, []);

  async function approve(x) {
    const edited = editing[x.id], label = edited && missing(FIELDS, edited);
    if (label) return toast(`Please fill in “${label}”.`, 'error');
    setBusy(x.id);
    const r = await api(`/api/admin/review-inbox/${x.id}/approve`, { method: 'POST', body: edited || {} });
    setBusy(null);
    if (!r.ok) return r.status !== 401 && toast(r.data.error || 'Could not approve this review.', 'error');
    setEditing(({ [x.id]: _, ...rest }) => rest);
    toast(`Published “${(edited || x).name}” to What Our Students Say ✓`);
    load();
  }

  async function remove(x) {
    if (!(await ask('Delete this review?', `The review from “${x.name}” is removed from the inbox for good. A copy already published stays in Student Reviews.`, 'Delete', true))) return;
    const r = await api(`/api/admin/review-inbox/${x.id}`, { method: 'DELETE' });
    if (!r.ok) return r.status !== 401 && toast(r.data.error || 'Could not delete this review.', 'error');
    load();
  }

  if (error) return <div className="a-panel"><Empty title="Could not load the inbox" text={error} /><div className="text-center"><button className="a-btn a-btn--ghost" onClick={load}>Try again</button></div></div>;
  if (!rows) return <div className="a-panel text-[13px] text-charcoal/50">Loading…</div>;
  const pending = rows.filter(x => x.status !== 'approved').length;

  return <>
    <div className="mb-4 flex items-center gap-2">
      <p className="mr-auto text-[13px] text-charcoal/55">{rows.length} review{rows.length === 1 ? '' : 's'} · {pending} waiting for approval</p>
      <button type="button" className="a-btn a-btn--ghost" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</button>
    </div>
    <div className="a-panel">
      {!rows.length ? <Empty title="Inbox is empty" text="Reviews sent from “Write A Review” on the home page will appear here." /> : (
        <div className="grid gap-3">
          {rows.map(x => {
            const ed = editing[x.id], approved = x.status === 'approved';
            return (
              <article key={x.id} className={`rounded-2xl border border-black/5 p-4 ${approved ? 'bg-white' : 'bg-mint/60'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <b className="text-[14px]">{x.name}</b>
                  <span className="text-[14px] text-amber-500" aria-label={`${x.rating} out of 5 stars`}>{'★'.repeat(x.rating)}<span className="text-black/15">{'★'.repeat(5 - x.rating)}</span></span>
                  <span className="text-[12px] text-charcoal/45">{when(x.date)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${approved ? 'bg-brand/15 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{approved ? 'Published' : 'Pending'}</span>
                  <span className="ml-auto flex gap-1.5">
                    <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setEditing(e => ({ ...e, [x.id]: ed ? undefined : { name: x.name, role: '', rating: x.rating, body: x.body } }))}>
                      <Pencil className="h-3.5 w-3.5" />{ed ? 'Cancel edit' : 'Edit'}
                    </button>
                    <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={busy === x.id} onClick={() => approve(x)}>
                      <Check className="h-3.5 w-3.5" />{approved ? 'Publish again' : 'Approve'}
                    </button>
                    <button type="button" aria-label="Delete" className="rounded-full p-2 text-charcoal/35 transition hover:bg-red-50 hover:text-red-500" onClick={() => remove(x)}><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
                {ed
                  ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{FIELDS.map(spec => <Field key={spec[0]} spec={spec} value={ed[spec[0]]} onChange={v => setEditing(e => ({ ...e, [x.id]: { ...ed, [spec[0]]: v } }))} />)}</div>
                  : <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-6 text-charcoal/75">{x.body}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  </>;
}
