/* Razorpay checkouts from the Buy Plans page, newest first */
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, money } from '../lib/api.js';
import { Empty } from '../lib/ui.jsx';

const STATUS = { Success: 'bg-brand/15 text-emerald-700', Pending: 'bg-amber-100 text-amber-700', Failed: 'bg-red-100 text-red-600' };
const Stat = ({ label, value }) => <div className="a-panel"><p className="a-label">{label}</p><p className="text-[26px] font-semibold">{value}</p></div>;

export default function Enrollments() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    const r = await api('/api/enrollments');
    if (!r.ok) return setError(r.data.error || 'Could not load enrollments.');
    setRows([...r.data].sort((a, b) => String(b.date).localeCompare(String(a.date))));
  }
  useEffect(() => { load(); }, []);

  if (error) return <div className="a-panel"><Empty title="Could not load enrollments" text={error} /><div className="text-center"><button className="a-btn a-btn--ghost" onClick={load}>Try again</button></div></div>;
  if (!rows) return <div className="a-panel text-[13px] text-charcoal/50">Loading…</div>;
  const paid = rows.filter(r => r.status === 'Success');

  return <>
    <div className="mb-4 flex justify-end"><button type="button" className="a-btn a-btn--ghost" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</button></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat label="Transactions" value={rows.length} />
      <Stat label="Successful" value={paid.length} />
      <Stat label="Revenue" value={money(paid.reduce((s, r) => s + Number(r.price || 0), 0))} />
    </div>
    <div className="a-panel overflow-hidden !p-0">
      {!rows.length ? <Empty title="No enrollments yet" text="Completed Razorpay checkouts from the Buy Plans page will appear here." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="border-b border-black/5 bg-mint/60 text-[11px] uppercase tracking-wider text-charcoal/50">
              <tr>{['Payment ID', 'Name', 'Email', 'Phone', 'Plan', 'Amount', 'Date', 'Status', 'App access'].map(h => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-mint/40">
                  <td className="px-5 py-3.5 font-mono text-[12px] text-charcoal/60">{r.paymentId || r.id}</td>
                  <td className="px-5 py-3.5">{r.name}</td>
                  <td className="px-5 py-3.5">{r.email}</td>
                  <td className="px-5 py-3.5">{r.phone || '—'}</td>
                  <td className="px-5 py-3.5">{r.plan}</td>
                  <td className="px-5 py-3.5 font-semibold">{money(r.price)}</td>
                  <td className="px-5 py-3.5">{new Date(r.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS[r.status] || 'bg-black/5'}`}>{r.status}</span></td>
                  <td className="px-5 py-3.5 text-[12px]" title={r.appSyncError || ''}>{r.appSync ? '✓ Granted' : r.appSyncError ? <span className="text-red-600">Failed</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>;
}
