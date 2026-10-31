import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import defaults, { SHAPES, normalize, validate } from './content.default.js';
import './admin.css';

const api = async (path, opts = {}) => {
  try {
    const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    let data = null; try { data = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection.' } }; }
};
const clone = o => JSON.parse(JSON.stringify(o));
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const setPath = (o, path, v) => { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) t = t[k[i]]; t[k[k.length - 1]] = v; };
let uid = 0; const fid = () => 'f' + (++uid);

/* ---------- fields ---------- */
function Field({ label, hint, children, id }) {
  return <div className="f"><label className="f-l" htmlFor={id}>{label}</label>{children}{hint && <span className="f-h">{hint}</span>}</div>;
}
function Text({ label, hint, value, onChange, area, rows = 3, placeholder, type = 'text' }) {
  const [id] = useState(fid);
  return <Field label={label} hint={hint} id={id}>{area
    ? <textarea id={id} rows={rows} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    : <input id={id} type={type} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}</Field>;
}
function Color({ label, value, onChange }) {
  const [id] = useState(fid);
  return <Field label={label} id={id}><div className="color"><input type="color" aria-label={label + ' picker'} value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#d9c7a3'} onChange={e => onChange(e.target.value)} /><input id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} /></div></Field>;
}
function Select({ label, value, options, onChange }) {
  const [id] = useState(fid);
  return <Field label={label} id={id}><select id={id} value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
}

async function shrink(file, max = 1600) {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be read as an image.')); i.src = src; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const fmt = cv.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    let q = 0.86, data = cv.toDataURL(fmt, q);
    while (data.length > 1400000 && q > 0.4) { q -= 0.1; data = cv.toDataURL(fmt, q); }
    return data;
  } finally { URL.revokeObjectURL(src); }
}

function ImageField({ label, hint, value, onChange, tall }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const ref = useRef(); const [id] = useState(fid);
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true); setErr('');
    try {
      const data = await shrink(f);
      const r = await api('/api/media', { method: 'POST', body: JSON.stringify({ data }) });
      if (!r.ok) throw new Error(r.data?.error || 'Upload failed. Try again.');
      onChange(r.data.url);
    } catch (er) { setErr(er.message || 'Upload failed. Try again.'); }
    setBusy(false);
  };
  return <div className="f">
    <span className="f-l">{label}</span>
    <div className={'img-f' + (tall ? ' tall' : '')}>
      <div className="img-prev">{value ? <img src={value} alt="" /> : <span>No image</span>}</div>
      <div className="img-a">
        <button className="ghost" onClick={() => ref.current.click()} disabled={busy}>{busy ? 'Uploading' : value ? 'Replace image' : 'Upload image'}</button>
        {value && <button className="ghost danger" onClick={() => onChange('')}>Remove</button>}
        <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
        <input id={id} aria-label={label + ' link'} placeholder="Or paste an image link" value={value || ''} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
    {hint && <span className="f-h">{hint}</span>}
    {err && <span className="err" role="alert">{err}</span>}
  </div>;
}

function List({ items, onChange, make, title, render, addLabel }) {
  const [open, setOpen] = useState(null);
  const set = (i, v) => { const n = [...items]; n[i] = v; onChange(n); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setOpen(o => (o === i ? j : o === j ? i : o)); };
  const del = i => { if (!window.confirm(`Remove "${title(items[i], i)}"?`)) return; onChange(items.filter((_, k) => k !== i)); setOpen(null); };
  return <div className="list">
    {items.map((it, i) => (
      <div className={'li' + (open === i ? ' open' : '')} key={i}>
        <div className="li-h">
          <button className="li-t" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span className="li-chev" aria-hidden="true" />{title(it, i)}
          </button>
          <div className="li-a">
            <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">Up</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" title="Move down">Down</button>
            <button onClick={() => del(i)} className="danger">Remove</button>
          </div>
        </div>
        {open === i && <div className="li-b">{render(it, v => set(i, v), i)}</div>}
      </div>
    ))}
    <button className="add" onClick={() => { onChange([...items, make()]); setOpen(items.length); }}>{addLabel}</button>
  </div>;
}

/* ---------- sections ---------- */
const SECTIONS = [
  ['hero', 'Hero'], ['about', 'About and photo'], ['marquee', 'Moving words'], ['projects', 'Projects'], ['work', 'All work gallery'], ['stack', 'Skills'],
  ['contact', 'Contact'], ['brand', 'Brand and SEO'], ['labels', 'Buttons and labels'], ['data', 'Backup and history'],
];

function Projects({ c, set }) {
  return <>
    <p className="lead">Each project is one full-screen scene on the site, in this order. Open one to edit it.</p>
    <List items={c.projects} onChange={set('projects')} addLabel="Add project" title={p => p.name || 'Untitled project'}
      make={() => ({ id: 'project-' + Date.now().toString(36), name: 'New project', kind: '', url: '', host: '', shape: 'coin', tint: '#D9C7A3', specs: [{ value: '', label: '' }], problem: '', built: [], stack: [] })}
      render={(p, sp) => {
        const f = k => v => sp({ ...p, [k]: v });
        return <>
          <div className="row">
            <Text label="Name" value={p.name} onChange={f('name')} />
            <Text label="Link id" hint="Used in the page address, like #fargo. Lowercase letters, numbers and dashes." value={p.id} onChange={v => f('id')(slug(v))} />
          </div>
          <Text label="One-line description" value={p.kind} onChange={f('kind')} />
          <div className="row">
            <Text label="Live URL" placeholder="https://" value={p.url} onChange={f('url')} hint="Leave empty if the project is not public." />
            <Text label="Link text" placeholder="Shows the URL without https://" value={p.host} onChange={f('host')} />
          </div>
          <div className="row">
            <Select label="3D shape" value={p.shape} options={SHAPES} onChange={f('shape')} />
            <Color label="Scene light" value={p.tint} onChange={f('tint')} />
          </div>
          <ImageField label="Screenshot" hint="Shown in the floating browser frame. A 16:9 screenshot of the homepage works best." value={p.image} onChange={f('image')} />
          <h4>More screens</h4>
          <List items={p.gallery || []} onChange={f('gallery')} addLabel="Add screen" title={(g, i) => 'Screen ' + (i + 1)} make={() => ''}
            render={(g, sg) => <ImageField label="Image" value={g} onChange={sg} />} />
          <h4>Specs</h4>
          <List items={p.specs || []} onChange={f('specs')} addLabel="Add spec" title={s => [s.value, s.label].filter(Boolean).join(' / ') || 'New spec'}
            make={() => ({ value: '', label: '' })}
            render={(s, ss) => <div className="row"><Text label="Big text" value={s.value} onChange={v => ss({ ...s, value: v })} /><Text label="Small text" value={s.label} onChange={v => ss({ ...s, label: v })} /></div>} />
          <h4>Case notes</h4>
          <Text area rows={3} label="Summary" value={p.problem} onChange={f('problem')} />
          <Text area rows={6} label="What I built" hint="One item per line." value={(p.built || []).join('\n')} onChange={v => f('built')(v.split('\n'))} />
          <Text label="Stack" hint="Separate with commas." value={(p.stack || []).join(', ')} onChange={v => f('stack')(v.split(',').map(s => s.trimStart()))} />
        </>;
      }} />
  </>;
}

function Work({ c, set }) {
  return <>
    <p className="lead">These entries appear twice: as cards in the sideways-scrolling gallery, and in the list beside your skills. The link id connects them to skills and to a project's case notes.</p>
    <Text label="Gallery title" value={c.more.title} onChange={set('more.title')} />
    <Text label="Gallery intro" value={c.more.sub} onChange={set('more.sub')} />
    <h4>Entries</h4>
    <List items={c.work} onChange={set('work')} addLabel="Add entry" title={w => w.name || 'Untitled'}
      make={() => ({ id: 'work-' + Date.now().toString(36), name: 'New entry', note: '', summary: '' })}
      render={(w, sw) => {
        const f = k => v => sw({ ...w, [k]: v });
        return <>
          <div className="row"><Text label="Name" value={w.name} onChange={f('name')} /><Text label="Tag" value={w.note} onChange={f('note')} placeholder="Fintech" /></div>
          <Text label="Brief explanation" area rows={2} value={w.summary} onChange={f('summary')} />
          <Text label="Link id" hint="Use the same link id as a project and the card opens that project's case notes." value={w.id} onChange={v => f('id')(slug(v))} />
          <Text label="Link" placeholder="https://" hint="Used when the entry is not one of your projects." value={w.url} onChange={f('url')} />
          <ImageField label="Card image" hint="Leave empty to use the matching project's screenshot." value={w.image} onChange={f('image')} />
        </>;
      }} />
  </>;
}

function Skills({ c, set }) {
  return <>
    <Text label="Section title" value={c.stack.title} onChange={set('stack.title')} />
    <Text label="Intro" area rows={3} value={c.stack.intro} onChange={set('stack.intro')} />
    <div className="row">
      <Text label="Hint before a skill is picked" value={c.stack.hint} onChange={set('stack.hint')} />
      <Text label="Text before a picked skill" value={c.stack.usedPrefix} onChange={set('stack.usedPrefix')} />
    </div>
    <h4>Skill groups</h4>
    <List items={c.stack.groups} onChange={set('stack.groups')} addLabel="Add group" title={g => g.name || 'Untitled group'}
      make={() => ({ name: 'New group', skills: [] })}
      render={(g, sg) => <>
        <Text label="Group name" value={g.name} onChange={v => sg({ ...g, name: v })} />
        <List items={g.skills || []} onChange={v => sg({ ...g, skills: v })} addLabel="Add skill" title={s => s.name || 'New skill'}
          make={() => ({ name: '', uses: [] })}
          render={(s, ss) => <>
            <Text label="Skill" value={s.name} onChange={v => ss({ ...s, name: v })} />
            <div className="f"><span className="f-l">Used in</span><div className="checks">
              {c.work.map(w => {
                const on = (s.uses || []).includes(w.id);
                return <label key={w.id} className={'check' + (on ? ' on' : '')}><input type="checkbox" checked={on} onChange={() => ss({ ...s, uses: on ? s.uses.filter(x => x !== w.id) : [...(s.uses || []), w.id] })} />{w.name}</label>;
              })}
            </div></div>
          </>} />
      </>} />
  </>;
}

function Data({ c, setC, flash }) {
  const [hist, setHist] = useState(null);
  const fileRef = useRef();
  const loadHist = async () => { const r = await api('/api/content?history=1'); setHist(r.ok ? r.data.history || [] : []); if (!r.ok) flash(r.data?.error || 'Could not load history.', 'err'); };
  const exportJson = () => { const b = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'fargo-content.json'; a.click(); URL.revokeObjectURL(a.href); };
  const importJson = e => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then(t => { try { setC(normalize(JSON.parse(t))); flash('Imported. Review it, then save.'); } catch (er) { flash('That file is not valid JSON.', 'err'); } });
    e.target.value = '';
  };
  return <>
    <p className="lead">Download a copy before big changes. Every save keeps the previous version, up to ten.</p>
    <div className="btns">
      <button className="ghost" onClick={exportJson}>Download backup</button>
      <button className="ghost" onClick={() => fileRef.current.click()}>Import backup</button>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={importJson} />
      <button className="ghost danger" onClick={() => { if (window.confirm('Replace everything with the original content? You still need to save.')) { setC(clone(defaults)); flash('Original content loaded. Save to publish it.'); } }}>Load original content</button>
    </div>
    <h4>Previous versions</h4>
    {hist === null ? <button className="ghost" onClick={loadHist}>Show previous versions</button>
      : hist.length === 0 ? <p className="muted">No previous versions yet. They appear after your second save.</p>
      : <ul className="hist">{hist.map((h, i) => <li key={i}><span>{new Date(h.savedAt).toLocaleString()}</span><button className="ghost" onClick={() => { setC(normalize(h.content)); flash('Version loaded. Save to publish it.'); }}>Load this version</button></li>)}</ul>}
  </>;
}

function Editor({ section, c, set, setC, flash }) {
  if (section === 'hero') return <>
    <Text label="Headline" value={c.hero.title} onChange={set('hero.title')} />
    <Text label="Supporting line" area rows={3} value={c.hero.sub} onChange={set('hero.sub')} />
    <div className="row"><Text label="Main button" value={c.hero.primary} onChange={set('hero.primary')} /><Text label="Second button" value={c.hero.secondary} onChange={set('hero.secondary')} /></div>
  </>;
  if (section === 'about') return <>
    <ImageField tall label="Your photo" hint="A portrait works best. It is cropped to 4:5 and compressed before upload." value={c.about.photo} onChange={set('about.photo')} />
    <div className="row"><Text label="Name" value={c.about.name} onChange={set('about.name')} /><Text label="Role under your name" value={c.about.role} onChange={set('about.role')} /></div>
    <Text label="Headline" value={c.about.title} onChange={set('about.title')} />
    <Text label="About you" area rows={6} hint="Each new line becomes a paragraph." value={c.about.body} onChange={set('about.body')} />
    <h4>Quick facts</h4>
    <List items={c.about.facts} onChange={set('about.facts')} addLabel="Add fact" title={f => [f.value, f.label].filter(Boolean).join(' / ') || 'New fact'}
      make={() => ({ value: '', label: '' })}
      render={(f, sf) => <div className="row"><Text label="Big text" value={f.value} onChange={v => sf({ ...f, value: v })} /><Text label="Small text" value={f.label} onChange={v => sf({ ...f, label: v })} /></div>} />
  </>;
  if (section === 'marquee') return <>
    <p className="lead">Two bands of large words slide across the screen and speed up as people scroll.</p>
    <Text label="Words" area rows={6} hint="One per line." value={c.marquee.join('\n')} onChange={v => set('marquee')(v.split('\n'))} />
  </>;
  if (section === 'projects') return <Projects c={c} set={set} />;
  if (section === 'work') return <Work c={c} set={set} />;
  if (section === 'stack') return <Skills c={c} set={set} />;
  if (section === 'contact') return <>
    <Text label="Headline" value={c.contact.title} onChange={set('contact.title')} />
    <Text label="Supporting line" area rows={3} value={c.contact.sub} onChange={set('contact.sub')} />
    <div className="row"><Text label="Email" type="email" value={c.contact.email} onChange={set('contact.email')} /><Text label="GitHub URL" value={c.contact.github} onChange={set('contact.github')} /></div>
    <div className="row"><Text label="Copy button" value={c.contact.copy} onChange={set('contact.copy')} /><Text label="After copying" value={c.contact.copied} onChange={set('contact.copied')} /></div>
    <Text label="GitHub button" value={c.contact.githubLabel} onChange={set('contact.githubLabel')} />
  </>;
  if (section === 'brand') return <>
    <div className="row"><Text label="Wordmark" hint="Shown in the loader and the top bar." value={c.brand.wordmark} onChange={set('brand.wordmark')} /><Text label="Loader line" value={c.brand.tagline} onChange={set('brand.tagline')} /></div>
    <div className="row"><Color label="Main glow colour" value={c.theme.aura} onChange={set('theme.aura')} /><Color label="Skills scene light" value={c.theme.stackTint} onChange={set('theme.stackTint')} /></div>
    <div className="f"><label className="f-l" htmlFor="glow">Background light strength</label><div className="range"><input id="glow" type="range" min="0" max="2" step="0.1" value={c.theme.glow ?? 1} onChange={e => set('theme.glow')(Number(e.target.value))} /><output>{Number(c.theme.glow ?? 1).toFixed(1)}</output></div><span className="f-h">0 turns the moving light off. 2 is very bright.</span></div>
    <div className="row"><Text label="Footer left" value={c.brand.footerLeft} onChange={set('brand.footerLeft')} /><Text label="Footer right" value={c.brand.footerRight} onChange={set('brand.footerRight')} /></div>
    <h4>Search and sharing</h4>
    <Text label="Page title" value={c.seo.title} onChange={set('seo.title')} />
    <Text label="Description" area rows={2} value={c.seo.description} onChange={set('seo.description')} />
  </>;
  if (section === 'labels') {
    const L = [['navAbout', 'Top bar: about'], ['aboutChapter', 'Chapter: about'], ['moreChapter', 'Chapter: all work'], ['gallery', 'Case notes: screens heading'], ['navWork', 'Top bar: work'], ['navStack', 'Top bar: skills'], ['navContact', 'Top bar: contact'], ['introChapter', 'Chapter: intro'], ['stackChapter', 'Chapter: skills'], ['contactChapter', 'Chapter: contact'], ['visit', 'Visit button'], ['notes', 'Case notes button'], ['built', 'Case notes: built heading'], ['stack', 'Case notes: stack heading'], ['close', 'Close button'], ['scroll', 'Scroll hint']];
    return <div className="grid2">{L.map(([k, l]) => <Text key={k} label={l} value={c.labels[k]} onChange={set('labels.' + k)} />)}</div>;
  }
  if (section === 'data') return <Data c={c} setC={setC} flash={flash} />;
  return null;
}

/* ---------- shell ---------- */
function Login({ onDone, configured }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    setBusy(false); r.ok ? onDone() : setErr(r.data?.error || 'Could not sign in.');
  };
  return <div className="login">
    <form onSubmit={submit} className="login-card">
      <div className="mark" aria-hidden="true" />
      <h1>Fargo admin</h1>
      {!configured && <p className="err">ADMIN_PASSWORD is not set yet. Add it in Vercel under Settings, Environment Variables, then redeploy.</p>}
      <label htmlFor="pw" className="f-l">Password</label>
      <input id="pw" type="password" autoFocus autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy || !pw}>{busy ? 'Signing in' : 'Sign in'}</button>
    </form>
  </div>;
}

function Admin() {
  const [auth, setAuth] = useState(null);
  const [c, setC] = useState(null);
  const [saved, setSaved] = useState('');
  const [section, setSection] = useState('hero');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('desktop');
  const [showPrev, setShowPrev] = useState(innerWidth >= 1200);
  const frame = useRef();

  useEffect(() => { api('/api/login').then(r => setAuth(r.data || { authed: false, configured: true })); }, []);
  useEffect(() => {
    if (!auth?.authed) return;
    api('/api/content?fresh=1').then(r => { const n = normalize(r.ok ? r.data : defaults); setC(n); setSaved(JSON.stringify(n)); });
  }, [auth?.authed]);

  const dirty = c && JSON.stringify(c) !== saved;
  const flash = (msg, kind = 'ok') => { setStatus({ msg, kind }); clearTimeout(flash.t); flash.t = setTimeout(() => setStatus(null), 4200); };
  const up = fn => setC(prev => { const n = clone(prev); fn(n); return n; });
  const set = path => v => up(n => setPath(n, path, v));

  const save = async () => {
    const err = validate(c); if (err) return flash(err, 'err');
    setSaving(true);
    const r = await api('/api/content', { method: 'PUT', body: JSON.stringify(c) });
    setSaving(false);
    if (r.status === 401) { setAuth({ authed: false, configured: true }); return; }
    if (!r.ok) return flash(r.data?.error || 'Save failed. Try again.', 'err');
    setSaved(JSON.stringify(c)); flash('Saved. The live site updates within 30 seconds.');
  };

  // live preview
  const post = () => frame.current?.contentWindow?.postMessage({ type: 'fargo:content', content: c }, location.origin);
  useEffect(() => { const t = setTimeout(post, 350); return () => clearTimeout(t); }, [c, showPrev]);
  useEffect(() => { const h = e => { if (e.origin === location.origin && e.data?.type === 'fargo:ready') post(); }; addEventListener('message', h); return () => removeEventListener('message', h); });
  useEffect(() => { const h = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  useEffect(() => { const h = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty && !saving) save(); } }; addEventListener('keydown', h); return () => removeEventListener('keydown', h); });

  if (auth === null) return <div className="boot">Loading</div>;
  if (!auth.authed) return <Login configured={auth.configured} onDone={() => setAuth({ authed: true, configured: true })} />;
  if (!c) return <div className="boot">Loading content</div>;

  const signOut = async () => { if (dirty && !window.confirm('You have unsaved changes. Sign out anyway?')) return; await api('/api/login', { method: 'DELETE' }); setAuth({ authed: false, configured: true }); };

  return <div className={'app' + (showPrev ? ' with-prev' : '')}>
    <header className="top">
      <div className="brand"><span className="mark sm" aria-hidden="true" />Fargo admin</div>
      <div className="state" aria-live="polite">{saving ? 'Saving' : dirty ? 'Unsaved changes' : 'All changes saved'}</div>
      <div className="top-a">
        <a className="ghost" href="/" target="_blank" rel="noopener">Open site</a>
        <button className="ghost" onClick={() => setShowPrev(s => !s)} aria-pressed={showPrev}>{showPrev ? 'Hide preview' : 'Show preview'}</button>
        <button className="ghost" onClick={signOut}>Sign out</button>
        <button className="pri" onClick={save} disabled={!dirty || saving}>Save changes</button>
      </div>
    </header>
    <nav className="side" aria-label="Sections">
      {SECTIONS.map(([k, l]) => <button key={k} className={section === k ? 'on' : ''} onClick={() => setSection(k)}>{l}</button>)}
    </nav>
    <main className="edit">
      <h2>{SECTIONS.find(s => s[0] === section)[1]}</h2>
      <Editor section={section} c={c} set={set} setC={setC} flash={flash} />
    </main>
    {showPrev && <aside className="prev">
      <div className="prev-bar">
        <span>Live preview, not yet published</span>
        <div className="seg">
          <button className={view === 'desktop' ? 'on' : ''} onClick={() => setView('desktop')}>Desktop</button>
          <button className={view === 'phone' ? 'on' : ''} onClick={() => setView('phone')}>Phone</button>
        </div>
      </div>
      <div className="prev-stage"><iframe ref={frame} title="Site preview" src="/?preview=1" className={view} /></div>
    </aside>}
    {status && <div className={'toast ' + status.kind} role="status">{status.msg}</div>}
  </div>;
}

createRoot(document.getElementById('admin')).render(<Admin />);
