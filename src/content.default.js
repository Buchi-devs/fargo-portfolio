// Everything the site shows lives here. The admin edits a copy of this and saves it to Redis.
export const SHAPES = [
  ['coin', 'Coin (fintech, payments)'],
  ['arena', 'Fight ring (games)'],
  ['twin', 'Linked rings (social, real-time)'],
  ['vault', 'Vault cube (banking, security)'],
  ['agents', 'Network globe (AI, automation)'],
];

const ALL = ['fargo', 'arena', 'justus', 'bank', 'agents', 'grandeur', 'charity', 'pedal'];

const content = {
  seo: {
    title: 'Fargo by Buchi',
    description: 'Buchi is a full-stack engineer in Nigeria who designs, builds and runs live products across fintech, real-time media, 3D games and AI.',
  },
  brand: {
    wordmark: 'FARGO',
    tagline: 'Buchi, full-stack engineer',
    footerLeft: '© 2026 Fargo Group',
    footerRight: 'Designed and built by Buchi',
  },
  theme: { aura: '#D9C7A3', stackTint: '#CFCFD6', glow: 1 },
  labels: {
    navWork: 'Work', navStack: 'Stack', navContact: 'Contact',
    introChapter: 'Intro', stackChapter: 'Stack', contactChapter: 'Contact',
    visit: 'Visit live site', notes: 'Case notes', built: 'What I built', stack: 'Stack', close: 'Close', scroll: 'Scroll',
    navAbout: 'About', aboutChapter: 'About', moreChapter: 'All work', gallery: 'Screens',
  },
  about: {
    photo: '',
    name: 'Buchi',
    role: 'Full-stack engineer, Fargo Group',
    title: 'Hi, I’m Buchi.',
    body: 'I’m a pharmacy student in Nigeria who designs, builds and runs software for real users: fintech, real-time apps, 3D games and AI agents.\nI handle the whole thing, from the interface to the backend to keeping it live. I care about how a product feels as much as whether it works.',
    facts: [{ value: 'Nigeria', label: 'where I build from' }, { value: 'Pharmacy', label: 'what I study' }, { value: '5+', label: 'live products I run' }],
  },
  marquee: ['Fintech', 'Real-time', '3D games', 'AI agents', 'Laravel', 'React', 'Three.js', 'Design'],
  more: { title: 'Everything I’ve shipped', sub: 'Live products, client builds and experiments. Tap any one to look closer.' },
  hero: {
    title: 'I build software people pay to use.',
    sub: 'Full-stack engineer and pharmacy student in Nigeria. I design, build and run live products across fintech, real-time media, 3D games and AI.',
    primary: 'See the work',
    secondary: 'Start a project',
  },
  projects: [
    { id: 'fargo', shape: 'coin', tint: '#D9C7A3', name: 'Fargo Topup',
      kind: 'Airtime, data, bills and crypto from one wallet.',
      url: 'https://topup.fargohq.online', host: 'topup.fargohq.online',
      specs: [{ value: '8', label: 'services on one wallet' }, { value: 'Live', label: 'real users, real money' }, { value: 'AI voice', label: 'cloning and text to speech' }],
      problem: 'People in Nigeria juggle separate apps for airtime, data, bills and crypto. Fargo Topup puts all of it behind one funded wallet, and I run it day to day.',
      built: ['Wallet-funded airtime, data and bill payments with automated fulfilment', 'Social media growth services with live order progress and quality tiers', 'AI voice studio with preset voices and voice cloning, plus automatic wallet refunds when a job fails', 'Admin console with a live revenue chart, transaction filters and an on/off switch for each service', 'Announcement and promo system that shows once per day'],
      stack: ['Laravel', 'React', 'MySQL', 'Fish Audio', 'cPanel'] },
    { id: 'arena', shape: 'arena', tint: '#E3A07B', name: 'Wahala Arena',
      kind: 'A 3D fighting game where Nigeria’s loudest names settle it.',
      url: 'https://arena.kalyxen.org', host: 'arena.kalyxen.org',
      specs: [{ value: '1v1', label: 'invite a friend with a link' }, { value: '3D', label: 'in the browser, no install' }, { value: 'Online', label: 'live matches with real players' }],
      problem: 'A fighting game made for Nigerian group chats. Pick a famous fighter, send the link, and fight your friend in real time.',
      built: ['Roster of Nigerian public figures fighting in Nigerian scenes', 'Invite-link matchmaking with player accounts', 'TURN relay so matches stay smooth on everyday networks', 'Original street-pop soundtrack produced with ElevenLabs', 'Paid custom fighters, including one modelled on me'],
      stack: ['Three.js', 'WebRTC', 'Node.js', 'ElevenLabs'] },
    { id: 'justus', shape: 'twin', tint: '#D8B4C8', name: 'Justus',
      kind: 'Watch the same film at the same moment from different cities.',
      url: 'https://justus.kalyxen.org', host: 'justus.kalyxen.org',
      specs: [{ value: 'Synced', label: 'play, pause and seek for both' }, { value: 'Real-time', label: 'Socket.io rooms' }, { value: 'For two', label: 'private rooms for couples' }],
      problem: 'Long-distance couples want to watch together. Justus keeps two players in lockstep and lets them talk while they watch.',
      built: ['Room links that pair two people', 'Playback sync for play, pause and seek', 'Live chat beside the video', 'Node and Socket.io server deployed on Railway'],
      stack: ['React', 'Node.js', 'Socket.io', 'Railway'] },
    { id: 'bank', shape: 'vault', tint: '#AFC3E6', name: 'Kalyxen Bank',
      kind: 'A private banking interface that feels expensive and quiet.',
      url: 'https://bank.kalyxen.org', host: 'bank.kalyxen.org',
      specs: [{ value: 'Laravel 11', label: 'secure backend' }, { value: 'Dark UI', label: 'designed for trust' }, { value: 'Demo', label: 'full client dashboard' }],
      problem: 'A study in how private banking should feel online: calm, dark and precise, with nothing on screen that does not need to be there.',
      built: ['Client dashboard with balances and transaction history', 'Laravel 11 backend with a React front end', 'A restrained dark design language inspired by investment banks'],
      stack: ['Laravel 11', 'React', 'MySQL'] },
    { id: 'agents', shape: 'agents', tint: '#BFE1D9', name: 'AI Agents',
      kind: 'Software that keeps working after I log off.',
      url: '', host: '',
      specs: [{ value: 'Several', label: 'funding scans a day' }, { value: 'Voice', label: 'cloned-voice agent on live calls' }, { value: 'Make.com', label: 'plus LLM pipelines' }],
      problem: 'Client builds where AI handles the repetitive part of the job and a person only steps in for the decisions.',
      built: ['Funding intelligence agent that searches the web several times a day for grants and accelerators, ranks them and sends a report', 'Voice agent built on an ElevenLabs cloned voice that speaks with clients on live calls', 'Autoposting pipeline where Groq writes and Make.com publishes to Facebook Pages'],
      stack: ['Make.com', 'Groq', 'ElevenLabs', 'LLM pipelines'] },
  ],
  work: [
    { id: 'fargo', name: 'Fargo Topup', note: 'Fintech', summary: 'Airtime, data, bills and crypto from one funded wallet, live with paying users.' },
    { id: 'arena', name: 'Wahala Arena', note: '3D game', summary: 'Browser 3D fighting game with Nigerian icons and invite-link 1v1 matches.' },
    { id: 'justus', name: 'Justus', note: 'Real-time', summary: 'Watch-party app that keeps two video players in sync for couples.' },
    { id: 'bank', name: 'Kalyxen Bank', note: 'Banking UI', summary: 'Private banking demo with a quiet, dark interface on Laravel 11.' },
    { id: 'agents', name: 'AI agents', note: 'Automation', summary: 'A funding-alert agent, a cloned-voice call agent and an autoposting pipeline.' },
    { id: 'grandeur', name: 'Grandeur Bookings', note: 'Luxury bookings', summary: 'Invitation-only luxury booking platform built in PHP and MySQL.', url: 'https://grandeurbookings.site' },
    { id: 'charity', name: 'Kalyxen Charity', note: 'Nonprofit site', summary: 'Charity foundation website on Laravel, Inertia and React.', url: 'https://charity.kalyxen.org' },
    { id: 'pedal', name: 'PedalAI v2', note: 'Platform rebuild', summary: 'Full rebuild of the PedalAI platform on Laravel, MySQL and React.' },
  ],
  stack: {
    title: 'What I work with',
    intro: 'I study pharmacy and I ship software, and both reward getting the small details exactly right. Every tool here has run in production for a real client or a real user.',
    hint: 'Point at a skill to see where I used it.',
    usedPrefix: 'Where I used',
    groups: [
      { name: 'Backend', skills: [{ name: 'Laravel', uses: ['fargo', 'bank', 'charity', 'pedal'] }, { name: 'PHP', uses: ['fargo', 'bank', 'grandeur', 'charity', 'pedal'] }, { name: 'MySQL', uses: ['fargo', 'bank', 'grandeur', 'pedal'] }, { name: 'Inertia', uses: ['charity'] }, { name: 'Payment and VTU APIs', uses: ['fargo'] }] },
      { name: 'Frontend', skills: [{ name: 'React', uses: ['fargo', 'justus', 'bank', 'charity', 'pedal'] }, { name: 'Vite', uses: ['fargo', 'bank', 'pedal'] }, { name: 'UI and UX design', uses: ALL }] },
      { name: 'Real-time and 3D', skills: [{ name: 'Three.js', uses: ['arena'] }, { name: 'WebRTC and TURN', uses: ['arena'] }, { name: 'Socket.io', uses: ['justus'] }, { name: 'Node.js', uses: ['justus', 'arena'] }] },
      { name: 'AI and automation', skills: [{ name: 'LLM pipelines', uses: ['agents'] }, { name: 'ElevenLabs', uses: ['agents', 'arena'] }, { name: 'Fish Audio', uses: ['fargo'] }, { name: 'Make.com', uses: ['agents'] }] },
      { name: 'Shipping', skills: [{ name: 'cPanel', uses: ['fargo', 'arena', 'charity', 'grandeur'] }, { name: 'Railway', uses: ['justus'] }, { name: 'Git and GitHub', uses: ALL }] },
    ],
  },
  contact: {
    title: 'Have something worth building?',
    sub: 'I take on a few builds at a time, from first sketch to live product. Tell me what you need and when it has to ship.',
    email: 'hello@fargohq.online',
    github: 'https://github.com/Buchi-devs',
    githubLabel: 'GitHub',
    copy: 'Copy email',
    copied: 'Email copied',
  },
};

export default content;

const clone = o => JSON.parse(JSON.stringify(o));

// Fills any missing keys from the defaults so old saves keep working after new fields are added.
export function normalize(c) {
  const d = clone(content);
  if (!c || typeof c !== 'object') return d;
  const o = { ...d, ...c };
  for (const k of ['seo', 'brand', 'theme', 'labels', 'hero', 'about', 'more', 'stack', 'contact']) o[k] = { ...d[k], ...(c[k] || {}) };
  for (const k of ['projects', 'work', 'marquee']) o[k] = Array.isArray(c[k]) ? c[k] : d[k];
  if (!Array.isArray(o.about.facts)) o.about.facts = d.about.facts;
  o.projects = o.projects.map(p => ({ image: '', gallery: [], specs: [], built: [], stack: [], ...p }));
  o.work = o.work.map(w => ({ image: '', url: '', ...w }));
  if (!Array.isArray(o.stack.groups)) o.stack.groups = d.stack.groups;
  return o;
}

export const RESERVED_IDS = ['intro', 'about', 'more', 'stack', 'contact', 'root', 'gl'];

// Returns an error message, or null when the content is safe to save.
export function validate(c) {
  if (!c || typeof c !== 'object') return 'Content must be an object.';
  if (JSON.stringify(c).length > 300000) return 'Content is too large. Keep it under 300 KB.';
  if (!Array.isArray(c.projects) || !c.projects.length) return 'Add at least one project.';
  const ids = new Set();
  for (const p of c.projects) {
    if (!p || !/^[a-z0-9-]{1,40}$/.test(p.id || '')) return `Project "${p && p.name}" needs a link id made of lowercase letters, numbers and dashes.`;
    if (RESERVED_IDS.includes(p.id)) return `"${p.id}" is reserved. Pick another link id for ${p.name}.`;
    if (ids.has(p.id)) return `Two projects use the link id "${p.id}". Each one must be different.`;
    ids.add(p.id);
    if (!p.name) return 'Every project needs a name.';
  }
  return null;
}
