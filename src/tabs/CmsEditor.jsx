/* One CMS section, edited as a form (an object: hero, cases) or a list of rows (testimonials, reviews,
   faculty, faqs). Loads GET /api/cms/:section (the saved copy or the built-in one), saves with PUT, and
   "Restore defaults" deletes the saved copy so the website falls back to the built-in content. */
import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { api, siteUrl } from '../lib/api.js';
import { AVATAR, Empty, Field, fallback, missing, useUi } from '../lib/ui.jsx';

export default function CmsEditor({ section, fields, list, blank, rowTitle, addLabel = 'Add item', saveLabel, setDirty, note }) {
  const { toast, ask } = useUi();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [bad, setBad] = useState(null);       // { row, key } of the first empty required field after a failed save
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(new Set());

  async function load() {
    setError(null);
    const r = await api(`/api/cms/${section}`);
    if (!r.ok) return setError(r.data.error || 'Could not load this section.');
    setDraft(r.data);
    setDirty(false);
  }
  useEffect(() => { load(); }, [section]);

  const edit = next => { setDraft(next); setDirty(true); setBad(null); };
  const setRow = (i, key, v) => edit(draft.map((row, j) => (j === i ? { ...row, [key]: v } : row)));

  async function save() {
    const rows = list ? draft : [draft];
    for (const [i, row] of rows.entries()) {
      const label = missing(fields, row);
      if (!label) continue;
      setBad({ row: i, key: fields.find(f => f[1] === label)[0] });
      if (list) setOpen(o => new Set(o).add(i));
      return toast(`Please fill in “${label}”${list ? ` in item ${i + 1}` : ''}.`, 'error');
    }
    setBusy(true);
    // "lines" fields are cleaned on blur; clean them again in case Save was pressed while one still had focus
    const clean = row => Object.fromEntries(Object.entries(row).map(([k, v]) =>
      [k, fields.find(f => f[0] === k)?.[2] === 'lines' && Array.isArray(v) ? v.map(s => s.trim()).filter(Boolean) : v]));
    const body = list ? draft.map(clean) : clean(draft);
    const r = await api(`/api/cms/${section}`, { method: 'PUT', body });
    setBusy(false);
    if (!r.ok) return r.status !== 401 && toast(r.data.error || 'Nothing was saved.', 'error');
    setDraft(body);
    setDirty(false);
    toast(r.data.warning || 'Published to the website ✓', r.data.warning ? 'error' : 'ok');
  }

  async function restore() {
    if (!(await ask('Restore the built-in content?', 'The website goes back to its original copy of this section right away. Your saved version is deleted.', 'Restore defaults', true))) return;
    const r = await api(`/api/cms/${section}`, { method: 'DELETE' });
    if (!r.ok) return r.status !== 401 && toast(r.data.error || 'Could not restore the defaults.', 'error');
    toast('Built-in content restored ✓');
    load();
  }

  async function remove(i) {
    if (!(await ask('Delete this item?', `“${rowTitle(draft[i])}” will be removed from the website when you press ${saveLabel}.`, 'Delete', true))) return;
    edit(draft.filter((_, j) => j !== i));
    setOpen(new Set());
  }

  function add() {
    edit([...draft, blank()]);
    setOpen(new Set([draft.length]));
  }

  if (error) return <div className="a-panel"><Empty title="Could not load this section" text={error} /><div className="text-center"><button className="a-btn a-btn--ghost" onClick={load}>Try again</button></div></div>;
  if (!draft) return <div className="a-panel text-[13px] text-charcoal/50">Loading…</div>;

  const form = (row, i) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(spec => (
        <Field key={spec[0]} spec={spec} value={row[spec[0]]} bad={bad?.row === i && bad.key === spec[0]}
          onChange={v => (list ? setRow(i, spec[0], v) : edit({ ...draft, [spec[0]]: v }))} />
      ))}
    </div>
  );

  return <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {note && <p className="mr-auto text-[13px] text-charcoal/55">{note}</p>}
      {list && <p className="mr-auto text-[13px] text-charcoal/55">{draft.length} item{draft.length === 1 ? '' : 's'} · click a row to edit</p>}
      <button type="button" className="a-btn a-btn--ghost ml-auto" onClick={restore}>Restore defaults</button>
      {list && <button type="button" className="a-btn a-btn--ghost" onClick={add}><Plus className="h-4 w-4" />{addLabel}</button>}
      <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={busy}>{saveLabel}</button>
    </div>

    {!list ? <div className="a-panel max-w-[860px]">{form(draft, 0)}</div> : (
      <div className="a-panel">
        {!draft.length ? <Empty title="Nothing here yet" text={`Use “${addLabel}” to create the first one.`} /> : (
          <div className="grid gap-3">
            {draft.map((row, i) => (
              <details key={i} open={open.has(i)} onToggle={e => { const on = e.currentTarget.open; setOpen(o => { const n = new Set(o); on ? n.add(i) : n.delete(i); return n; }); }}
                className="min-w-0 rounded-2xl border border-black/5 bg-mint/70 transition open:bg-white open:shadow-[0_10px_30px_-18px_rgba(30,35,30,.3)]">
                <summary className="flex items-center gap-3 px-4 py-3">
                  <ChevronDown className="chev h-4 w-4 shrink-0 text-charcoal/40" />
                  {'photo' in row && <img src={siteUrl(row.photo) || AVATAR} onError={fallback(AVATAR)} alt="" className="h-9 w-9 shrink-0 rounded-full bg-mint object-cover" />}
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{rowTitle(row)}</span>
                  <button type="button" aria-label="Delete" className="rounded-full p-2 text-charcoal/35 transition hover:bg-red-50 hover:text-red-500"
                    onClick={e => { e.preventDefault(); remove(i); }}><Trash2 className="h-4 w-4" /></button>
                </summary>
                <div className="border-t border-black/5 p-4">{form(row, i)}</div>
              </details>
            ))}
          </div>
        )}
      </div>
    )}
  </>;
}
