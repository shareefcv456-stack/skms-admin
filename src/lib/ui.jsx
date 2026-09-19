/* Small shared UI: toasts, the confirm dialog, form fields and in-browser image resizing */
import { createContext, useContext, useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { siteUrl } from './api.js';

// placeholders for an empty or broken image preview: a doctor avatar (faculty photos) and a banner (hero)
const svg = body => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${body}</svg>`);
export const AVATAR = svg('viewBox="0 0 64 64"><rect width="64" height="64" fill="#E8F5EC"/><g fill="#22C55E" opacity=".5"><circle cx="32" cy="25" r="11"/><path d="M12 56c2-11 10-17 20-17s18 6 20 17z"/></g>');
export const BANNER = svg('viewBox="0 0 160 100"><rect width="160" height="100" fill="#1E231E"/><g fill="#22C55E" opacity=".5"><path d="M40 72l24-26 18 18 12-12 26 20z"/><circle cx="104" cy="34" r="8"/></g>');
// onError={fallback(AVATAR)}: swap in the placeholder once, so a broken placeholder can't loop
export const fallback = img => e => { const t = e.currentTarget; if (t.src !== img) t.src = img; };

const Ui = createContext(null);
export const useUi = () => useContext(Ui);

/* toast(msg, 'error') and `await ask(title, text, okLabel, danger)` → true/false.
   An in-page dialog, not window.confirm: browsers can silence native dialogs, which would lock the admin out of a tab. */
export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const id = useRef(0);

  const toast = (msg, type = 'ok') => {
    const t = { id: ++id.current, msg, type };
    setToasts(ts => [...ts, t]);
    setTimeout(() => setToasts(ts => ts.filter(x => x !== t)), 4500);
  };
  const ask = (title, text, okLabel, danger = false) => new Promise(resolve => setDialog({ title, text, okLabel, danger, resolve }));
  const answer = ok => { dialog.resolve(ok); setDialog(null); };

  return (
    <Ui.Provider value={{ toast, ask }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] grid max-w-[calc(100vw-2.5rem)] gap-2">
        {toasts.map(t => <div key={t.id} role="status" className={`rounded-xl px-4 py-3 text-[13px] shadow-lg ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-charcoal text-white'}`}>{t.msg}</div>)}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-charcoal/50 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && answer(false)}
          onKeyDown={e => e.key === 'Escape' && answer(false)}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-[400px] rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-[17px] font-semibold">{dialog.title}</p>
            <p className="mt-2 text-[14px] leading-6 text-charcoal/65">{dialog.text}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" autoFocus className="a-btn a-btn--ghost" onClick={() => answer(false)}>Cancel</button>
              <button type="button" className={`a-btn ${dialog.danger ? 'a-btn--danger' : 'a-btn--primary'}`} onClick={() => answer(true)}>{dialog.okLabel}</button>
            </div>
          </div>
        </div>
      )}
    </Ui.Provider>
  );
}

// ponytail: images ride inside the CMS JSON sent to every visitor; move to object storage/CDN if pages feel heavy
export function imageToDataUrl(file, maxWidth = 1920) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This browser can’t open that image format.')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      // downscale + JPEG so it fits the API's 5 MB body limit
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1E231E';   // transparent PNGs get the theme charcoal, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}

/* One form field. spec: [key, label, type = 'text', { req, hint, options, wide, maxWidth }]
   types: text, textarea, lines (string[] one per line), number, select, stars, check, image */
export function Field({ spec: [key, label, type = 'text', o = {}], value, onChange, bad }) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const id = `f-${key}-${useRef(Math.random().toString(36).slice(2)).current}`;
  const cls = `a-input${bad ? ' is-bad' : ''}`;

  if (type === 'check') return (
    <label className="flex items-center gap-2 self-end pb-2.5 text-[14px]">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-[#22C55E]" />{label}
    </label>
  );

  if (type === 'image') {
    const pick = async file => {
      if (!file) return;
      setBusy(true);
      try { onChange(await imageToDataUrl(file, o.maxWidth)); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
    };
    return (
      <div className="sm:col-span-2">
        <p className="a-label">{label}</p>
        <label className={`a-drop${busy ? ' cursor-wait opacity-60' : ''}${bad ? ' !border-red-400' : ''}`}
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
          <img src={siteUrl(value) || (o.maxWidth ? AVATAR : BANNER)} onError={fallback(o.maxWidth ? AVATAR : BANNER)} alt="" className={`shrink-0 bg-charcoal object-cover ${o.maxWidth ? 'h-16 w-16 rounded-full' : 'h-20 w-32 rounded-xl'}`} />
          <span className="pointer-events-none min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[14px] font-semibold"><ImageUp className="h-4 w-4 text-brand" />Click to upload or drag an image here</span>
            <span className="mt-1 block text-[12px] text-charcoal/50">JPG, PNG or WebP · resized to {o.maxWidth || 1920}px wide</span>
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={e => { pick(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>
    );
  }

  const input =
    type === 'textarea' || type === 'lines'
      ? <textarea id={id} rows={type === 'lines' ? 4 : 3} className={cls}
          value={type === 'lines' ? (value || []).join('\n') : value ?? ''}
          onChange={e => onChange(type === 'lines' ? e.target.value.split('\n') : e.target.value)}
          onBlur={e => type === 'lines' && onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
    : type === 'select'
      ? <select id={id} className={cls} value={value ?? o.options[0]} onChange={e => onChange(e.target.value)}>{o.options.map(v => <option key={v}>{v}</option>)}</select>
    : type === 'stars'
      ? <select id={id} className={cls} value={Number(value ?? 5)} onChange={e => onChange(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}  ({n})</option>)}
        </select>
    : <input id={id} type={type === 'number' ? 'number' : 'text'} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? 0 : undefined}
        className={cls} value={value ?? ''} onChange={e => onChange(type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)} />;

  return (
    <div className={type === 'textarea' || type === 'lines' || o.wide ? 'sm:col-span-2' : ''}>
      <label className="a-label" htmlFor={id}>{label}{o.req && <span className="text-red-500"> *</span>}</label>
      {input}
      {o.hint && <p className="mt-1 text-[12px] text-charcoal/45">{o.hint}</p>}
    </div>
  );
}

/* the first required field that is empty (numbers must be above 0), as "label" — or null when all are filled */
export function missing(fields, value) {
  const f = fields.find(([k, , type, o = {}]) => o.req && (type === 'number' ? !(Number(value?.[k]) > 0) : !String(value?.[k] ?? '').trim()));
  return f ? f[1] : null;
}

export const Empty = ({ title, text }) => (
  <div className="py-12 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-[13px] text-charcoal/50">{text}</p></div>
);
