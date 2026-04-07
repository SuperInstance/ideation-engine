interface Env { IDEATE_KV: KVNamespace; BYOK_KV: KVNamespace; }

const CSP: Record<string, string> = { 'default-src': "'self'", 'script-src': "'self' 'unsafe-inline' 'unsafe-eval'", 'style-src': "'self' 'unsafe-inline' 'unsafe-normalize' https://cdn.jsdelivr.net", 'font-src': "https://fonts.googleapis.com https://cdn.jsdelivr.net", 'img-src': "'self' data: https:", 'connect-src': "'self' https://api.deepseek.com https://api.siliconflow.com https://api.deepinfra.com https://*" };

function json(data: unknown, s = 200) { return new Response(JSON.stringify(data), { status: s, headers: { 'Content-Type': 'application/json', ...CSP } }); }

// ---- Data types ----
interface Bubble { id: string; title: string; summary: string; full: string; model: string; parent?: string; children: string[]; group?: string; selected?: boolean; phase: string; temp: number; maxTokens: number; ts: string; }
interface Session { id: string; title: string; bubbles: Bubble[]; credits: number; maxCredits: number; config: ModelConfig; phase: string; mode: 'parallel' | 'serial'; created: string; updated: string; }
interface ModelConfig { provider: string; baseUrl: string; apiKey: string; proModel: string; miniModel: string; proTemp: number; miniTemp: number; proMaxTokens: number; miniMaxTokens: number; spokeCount: number; }

const DEFAULT_CONFIG: ModelConfig = { provider: 'custom', baseUrl: '', apiKey: '', proModel: 'bytedance/Seed-2.0-pro', miniModel: 'bytedance/seed-2.0-mini', proTemp: 0.85, miniTemp: 0.9, proMaxTokens: 1500, miniMaxTokens: 600, spokeCount: 12 };

async function callModel(baseUrl: string, apiKey: string, model: string, system: string, user: string, max: number, temp: number): Promise<string> {
  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: max, temperature: temp })
  });
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

function stripFences(t: string): string {
  t = t.trim();
  while (t.startsWith('```')) { t = t.split('\n').slice(1).join('\n'); }
  while (t.endsWith('```')) { t = t.slice(0, -3).trim(); }
  return t;
}

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }

// ---- Free tier: Casey's keys, rate-limited ----
const FREE_PRO = { baseUrl: 'https://api.deepinfra.com', apiKey: 'jfCang5GUEkcHktx6xPTysstl9oIyIP7', model: 'bytedance/Seed-2.0-pro' };
const FREE_MINI = { baseUrl: 'https://api.deepinfra.com', apiKey: 'jfCang5GUEkcHktx6xPTysstl9oIyIP7', model: 'bytedance/seed-2.0-mini' };
const FREE_CHAT = { baseUrl: 'https://api.deepseek.com', apiKey: 'sk-5fc339a4fcc748ffba658c615bc2564d', model: 'deepseek-chat' };

async function estimateCost(tokens: number, model: string): Promise<number> {
  // Rough per-token cost in USD
  const rates: Record<string, number> = { 'seed-2.0-pro': 0.003 / 1000, 'seed-2.0-mini': 0.0005 / 1000, 'deepseek-chat': 0.00014 / 1000 };
  const key = model.toLowerCase().includes('pro') ? 'seed-2.0-pro' : model.includes('mini') ? 'seed-2.0-mini' : 'deepseek-chat';
  return tokens * (rates[key] || 0.0002 / 1000);
}

// ---- Landing page ----
function getLanding(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ideation Engine — Visual Thinking with AI Models</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--card:#16161e;--border:#2a2a3a;--text:#e0e0e0;--muted:#8A93B4;--pro:#a855f7;--mini:#06b6d4;--brain:#ec4899;--ground:#22c55e;--refine:#f59e0b;--accent:#f59e0b;--danger:#ef4444}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow:hidden}
.topbar{height:48px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:12px;font-size:.85em}
.topbar .logo{color:var(--accent);font-weight:700;font-size:1.1em}
.topbar .credits{color:var(--muted);margin-left:auto}.topbar .credits strong{color:var(--accent)}
.topbar button{background:none;border:1px solid var(--border);color:var(--text);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.8em}
.topbar button:hover{border-color:var(--accent);color:var(--accent)}
.main{display:flex;height:calc(100vh - 48px)}
.sidebar{width:280px;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.sidebar h3{padding:12px 16px;font-size:.8em;color:var(--muted);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border)}
.sidebar .sessions{flex:1;overflow-y:auto;padding:8px}
.sidebar .session-item{padding:8px 12px;border-radius:6px;cursor:pointer;font-size:.85em;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center}
.sidebar .session-item:hover{background:var(--border)}
.sidebar .session-item.active{background:var(--accent);color:var(--bg)}
.sidebar .session-item .count{font-size:.7em;color:var(--muted)}
.sidebar .new-session{padding:12px;border-top:1px solid var(--border)}
.sidebar .new-session button{width:100%;padding:8px;background:var(--accent);color:var(--bg);border:none;border-radius:6px;cursor:pointer;font-weight:600}
.canvas-area{flex:1;display:flex;flex-direction:column}
.toolbar{height:52px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:8px}
.toolbar input{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;font-size:.9em}
.toolbar input:focus{outline:none;border-color:var(--accent)}
.toolbar select{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px;font-size:.8em}
.toolbar .btn{padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.85em}
.toolbar .btn-pro{background:var(--pro);color:white}.toolbar .btn-mini{background:var(--mini);color:var(--bg)}
.toolbar .btn-chat{background:var(--ground);color:var(--bg)}.toolbar .btn-pipeline{background:var(--accent);color:var(--bg)}
.toolbar .btn:hover{filter:brightness(1.15)}
.canvas{flex:1;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 50%,#1a1a2a 0%,var(--bg) 70%)}
.bubble{position:absolute;border-radius:12px;padding:12px 16px;cursor:pointer;transition:all .2s;min-width:120px;max-width:220px;font-size:.8em;line-height:1.4;border:2px solid transparent}
.bubble:hover{z-index:10;transform:scale(1.08);box-shadow:0 8px 32px rgba(0,0,0,.5)}
.bubble .title{font-weight:700;margin-bottom:4px;font-size:.95em}
.bubble .summary{color:rgba(255,255,255,.7);font-size:.85em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bubble.pro{background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.5);color:#d8b4fe}
.bubble.mini{background:rgba(6,182,212,.1);border-color:rgba(6,182,212,.4);color:#67e8f9}
.bubble.brain{background:rgba(236,72,153,.1);border-color:rgba(236,72,153,.4);color:#f9a8d4}
.bubble.ground{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.4);color:#86efac}
.bubble.refine{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.4);color:#fcd34d}
.bubble.selected{border-color:#fff!important;box-shadow:0 0 20px rgba(255,255,255,.2)}
.bubble .badge{position:absolute;top:-8px;right:-8px;background:var(--accent);color:var(--bg);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65em;font-weight:700}
.bubble .model-tag{font-size:.6em;color:var(--muted);margin-top:4px}
/* SVG lines */
.svg-lines{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0}
.svg-lines line{stroke:var(--border);stroke-width:1.5;opacity:.4}
.svg-lines line.active{stroke:var(--accent);opacity:.7}
/* Detail panel */
.detail{position:absolute;top:0;right:0;width:400px;height:100%;background:var(--card);border-left:1px solid var(--border);z-index:20;transform:translateX(100%);transition:transform .2s;display:flex;flex-direction:column}
.detail.open{transform:translateX(0)}
.detail .header{padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.detail .header h3{font-size:.9em}
.detail .header button{background:none;border:1px solid var(--border);color:var(--text);width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:1.1em}
.detail .body{flex:1;overflow-y:auto;padding:16px;font-size:.85em;line-height:1.6}
.detail .body h4{color:var(--muted);font-size:.75em;text-transform:uppercase;margin:16px 0 8px;letter-spacing:1px}
.detail .controls{display:flex;gap:6px;flex-wrap:wrap;padding:12px;border-top:1px solid var(--border)}
.detail .controls button{padding:6px 12px;border:1px solid var(--border);background:none;color:var(--text);border-radius:6px;cursor:pointer;font-size:.75em}
.detail .controls button:hover{border-color:var(--accent);color:var(--accent)}
/* Config modal */
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);z-index:50;display:none;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto}
.modal h2{color:var(--accent);margin-bottom:4px}.modal .sub{color:var(--muted);font-size:.85em;margin-bottom:20px}
.modal label{display:block;font-size:.8em;color:var(--muted);margin:12px 0 4px}
.modal input,.modal textarea{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:.85em}
.modal textarea{height:120px;resize:vertical}
.modal .save{margin-top:20px;width:100%;padding:10px;background:var(--accent);color:var(--bg);border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.9em}
.modal .hint{font-size:.75em;color:var(--muted);margin-top:8px;line-height:1.5}
/* Onboarding banner */
.onboard{background:linear-gradient(90deg,rgba(168,85,247,.1),rgba(6,182,212,.1));border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin:8px;font-size:.8em;line-height:1.5}
.onboard strong{color:var(--accent)}
/* Status bar */
.statusbar{height:28px;background:var(--card);border-top:1px solid var(--border);display:flex;align-items:center;padding:0 16px;font-size:.7em;color:var(--muted);gap:16px}
.loading-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--muted);font-size:.9em;text-align:center}
.empty-state{text-align:center;padding:60px 20px;color:var(--muted)}
.empty-state h2{color:var(--accent);font-size:1.3em;margin-bottom:12px}
.empty-state .flow{display:flex;align-items:center;justify-content:center;gap:6px;margin:20px 0;font-size:.75em}
.empty-state .flow .node{padding:4px 10px;border-radius:6px;font-weight:600}
.empty-state .flow .arrow{color:var(--border)}
</style></head><body>
<div class="topbar">
<span class="logo">\u{1f4a1} Ideation Engine</span>
<div class="credits"><strong id="creditDisplay">$0.020</strong> free credits</div>
<button onclick="openConfig()">{gear} BYOK Config</button>
<button onclick="window.open('https://github.com/Lucineer/ideation-engine','_blank')">{fork} Fork</button>
<button onclick="exportMarkdown()">Export Markdown</button>
</div>
<div class="main">
<div class="sidebar">
<h3>Sessions</h3>
<div class="sessions" id="sessionList"></div>
<div class="new-session"><button onclick="newSession()">+ New Session</button></div>
</div>
<div class="canvas-area">
<div class="toolbar">
<input id="promptInput" placeholder="What are you thinking about?" onkeydown="if(event.key==='Enter')dream()">
<select id="modeSelect"><option value="parallel">Parallel</option><option value="serial">Serial</option></select>
<select id="spokeCount"><option value="4">4 spokes</option><option value="8" selected>8 spokes</option><option value="12">12 spokes</option></select>
<select id="modelSelect"><option value="pro">Seed Pro</option><option value="chat">DeepSeek Chat</option></select>
<button class="btn btn-pipeline" onclick="dreamPipeline()">Pipeline</button>
<button class="btn btn-pro" onclick="dream()">Dream</button>
<button class="btn btn-mini" onclick="riff()">Riff Selected</button>
<button class="btn btn-chat" onclick="ground()">Ground</button>
</div>
<div class="canvas" id="canvas">
<svg class="svg-lines" id="lines"></svg>
<div class="empty-state" id="emptyState">
<h2>Visual Ideation</h2>
<p>Type an idea above and hit <strong>Pipeline</strong> to watch it bloom.</p>
<div class="flow">
<span class="node" style="background:rgba(168,85,247,.2);color:var(--pro)">Dream</span>
<span class="arrow">\u2192</span>
<span class="node" style="background:rgba(6,182,212,.2);color:var(--mini)">Spokes x8</span>
<span class="arrow">\u2192</span>
<span class="node" style="background:rgba(34,197,94,.2);color:var(--ground)">Ground</span>
<span class="arrow">\u2192</span>
<span class="node" style="background:rgba(245,158,11,.2);color:var(--refine)">Build</span>
</div>
<p style="font-size:.8em;margin-top:16px">Each bubble is a model output. Hover for summary, click for full text.<br>Select bubbles and riff again to explore deeper.</p>
</div>
</div>
<div class="statusbar">
<span id="statusText">Ready</span>
<span id="bubbleCount">0 bubbles</span>
<span id="sessionInfo"></span>
</div>
</div>
</div>
<div class="detail" id="detail">
<div class="header"><h3 id="detailTitle">Bubble</h3><button onclick="closeDetail()">{times}</button></div>
<div class="body" id="detailBody"></div>
<div class="controls" id="detailControls"></div>
</div>
<div class="modal-overlay" id="configModal">
<div class="modal">
<h2>{gear} Bring Your Own Keys</h2>
<p class="sub">Save config locally as JSON. Your keys never leave your browser.</p>
<label>Provider Base URL</label>
<input id="cfgUrl" placeholder="https://api.deepinfra.com">
<label>API Key</label>
<input id="cfgKey" type="password" placeholder="sk-...">
<label>Pro Model</label>
<input id="cfgPro" value="bytedance/Seed-2.0-pro">
<label>Mini Model</label>
<input id="cfgMini" value="bytedance/seed-2.0-mini">
<label>Full Config JSON (advanced)</label>
<textarea id="cfgJson" placeholder='{"baseUrl":"https://api.deepinfra.com","apiKey":"sk-...","proModel":"bytedance/Seed-2.0-pro","miniModel":"bytedance/seed-2.0-mini","proTemp":0.85,"miniTemp":0.9,"proMaxTokens":1500,"miniMaxTokens":600,"spokeCount":8}'></textarea>
<button class="save" onclick="saveConfig()">Save to localStorage</button>
<p class="hint">Config saved to your browser only. We never see your keys.<br>Fork the repo for persistent config via Cloudflare Secrets or .env files.<br>Runs instantly in GitHub Codespaces with a single fork.</p>
</div>
</div>
<script>
const LS_KEY='ideation-engine-config';let session=null;let bubbles=[];let credits=0.02;
function loadConfig(){const raw=localStorage.getItem(LS_KEY);if(raw){try{const c=JSON.parse(raw);
document.getElementById('cfgUrl').value=c.baseUrl||'';document.getElementById('cfgKey').value=c.apiKey||'';
document.getElementById('cfgPro').value=c.proModel||'';document.getElementById('cfgMini').value=c.miniModel||'';
document.getElementById('cfgJson').value=raw;}catch{}}}
function saveConfig(){const c={};
const raw=document.getElementById('cfgJson').value.trim();
if(raw){try{Object.assign(c,JSON.parse(raw))}catch{alert('Invalid JSON');return;}}
c.baseUrl=document.getElementById('cfgUrl').value||c.baseUrl;
c.apiKey=document.getElementById('cfgKey').value||c.apiKey;
c.proModel=document.getElementById('cfgPro').value||c.proModel;
c.miniModel=document.getElementById('cfgMini').value||c.miniModel;
localStorage.setItem(LS_KEY,JSON.stringify(c));closeConfig();status('Config saved to localStorage');}
function openConfig(){loadConfig();document.getElementById('configModal').classList.add('open');}
function closeConfig(){document.getElementById('configModal').classList.remove('open');}
function getConfig(){const raw=localStorage.getItem(LS_KEY);if(raw)return JSON.parse(raw);return null;}
function status(t){document.getElementById('statusText').textContent=t;}

async function loadSessions(){const r=await fetch('/api/sessions');const list=await r.json();const el=document.getElementById('sessionList');
el.innerHTML=list.map(s=>'<div class="session-item'+(session&&session.id===s.id?' active':'')+'" onclick="loadSession(\\''+s.id+'\\')"><span>'+s.title.substring(0,30)+'</span><span class="count">'+s.bubbleCount+'</span></div>').join('')||'<p style="color:var(--muted);padding:12px;font-size:.85em">No sessions yet.</p>';}

async function newSession(){const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Untitled Session'})});
session=await r.json();bubbles=[];render();loadSessions();}

async function loadSession(id){const r=await fetch('/api/session/'+id);session=await r.json();
bubbles=session.bubbles||[];render();loadSessions();document.getElementById('sessionInfo').textContent=session.title;}

function render(){document.getElementById('emptyState').style.display=bubbles.length?'none':'block';
document.getElementById('bubbleCount').textContent=bubbles.length+' bubbles';
document.getElementById('creditDisplay').textContent='$'+session.credits.toFixed(3);
const canvas=document.getElementById('canvas');
canvas.querySelectorAll('.bubble').forEach(b=>b.remove());
const svg=document.getElementById('lines');svg.innerHTML='';
// Layout: center hub, spokes in circle
const cx=canvas.offsetWidth/2,cy=canvas.offsetHeight/2;
const hub=bubbles.find(b=>!b.parent);
if(hub){const el=createBubbleEl(hub,cx-110,cy-40);canvas.appendChild(el);}
const children=bubbles.filter(b=>b.parent);
const R=Math.min(canvas.offsetWidth,canvas.offsetHeight)*0.32;
children.forEach((b,i)=>{const n=children.length;const a=(2*Math.PI*i/n)-Math.PI/2;
const x=cx+R*Math.cos(a)-100,y=cy+R*Math.sin(a)-30;
const el=createBubbleEl(b,x,y);canvas.appendChild(el);
// Line from parent
const pb=bubbles.find(p=>p.id===b.parent);
if(pb){const line=document.createElementNS('http://www.w3.org/2000/svg','line');
const pa=children.length===1?0:(2*Math.PI*(bubbles.filter(bb=>bb.parent===b.parent&&bb.id!==b.id&&bubbles.indexOf(bb)<i).length+1)/children.length)-Math.PI/2;
line.setAttribute('x1',cx.toString());line.setAttribute('y1',cy.toString());
line.setAttribute('x2',x.toString());line.setAttribute('y2',y.toString());
if(b.selected)line.classList.add('active');svg.appendChild(line);}
});
// Grandchildren
const gc=bubbles.filter(b=>b.parent&&bubbles.some(p=>p.id===b.parent&&p.parent));
if(gc.length){const R2=R+140;
gc.forEach((b,i)=>{const siblings=gc.filter(s=>s.parent===b.parent);const si=siblings.indexOf(b);const n=siblings.length||1;
const pi=bubbles.indexOf(bubbles.find(p=>p.id===b.parent));
const baseA=(2*Math.PI*pi/children.length)-Math.PI/2;
const spread=0.3;const a=baseA+(si-n/2+0.5)*spread*(2*Math.PI/children.length);
const x=cx+R2*Math.cos(a)-90,y=cy+R2*Math.sin(a)-30;
const el=createBubbleEl(b,x,y);canvas.appendChild(el);
const line=document.createElementNS('http://www.w3.org/2000/svg','line');
const pp=bubbles.find(p=>p.id===b.parent);
if(pp){const psi=children.indexOf(pp);const pa=(2*Math.PI*psi/children.length)-Math.PI/2;
line.setAttribute('x1',(cx+R*Math.cos(pa)).toString());line.setAttribute('y1',(cy+R*Math.sin(pa)).toString());
line.setAttribute('x2',x.toString());line.setAttribute('y2',y.toString());svg.appendChild(line);}
});
}}

function createBubbleEl(b,x,y){const el=document.createElement('div');
el.className='bubble '+b.phase+(b.selected?' selected':'');
el.id='bubble-'+b.id;
el.style.left=x+'px';el.style.top=y+'px';
el.innerHTML='<div class="title">'+escHtml(b.title)+'</div><div class="summary">'+escHtml(b.summary)+'</div><div class="model-tag">'+b.model+'</div>'+(b.children&&b.children.length?'<div class="badge">'+b.children.length+'</div>':'');
el.onclick=()=>openDetail(b);el.ondblclick=(e)=>{e.stopPropagation();toggleSelect(b.id);};
return el;}

function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function openDetail(b){const el=document.getElementById('detail');el.classList.add('open');
document.getElementById('detailTitle').textContent=b.title;
document.getElementById('detailBody').innerHTML=
'<h4>Full Output</h4><p style="white-space:pre-wrap;margin-bottom:12px">'+escHtml(b.full)+'</p>'+
'<h4>Details</h4><p>Model: '+b.model+'<br>Phase: '+b.phase+'<br>Temp: '+b.temp+'<br>Max Tokens: '+b.maxTokens+'<br>Created: '+new Date(b.ts).toLocaleString()+'</p>'+
(b.parent?'<h4>Parent</h4><p>'+escHtml((bubbles.find(p=>p.id===b.parent)||{title:'?'}).title)+'</p>':'')+
(b.children&&b.children.length?'<h4>Children ('+b.children.length+')</h4><p>'+b.children.map(id=>{const c=bubbles.find(bb=>bb.id===id);return c?c.title:id;}).join(', ')+'</p>':'');
document.getElementById('detailControls').innerHTML=
'<button onclick="toggleSelect(\\''+b.id+'\\')">'+(b.selected?'Deselect':'Select')+'</button>'+
'<button onclick="useAsPrompt(\\''+b.id+'\\')">Use as Prompt</button>'+
'<button onclick="riffSingle(\\''+b.id+'\\')">Riff This</button>'+
'<button onclick="groundSingle(\\''+b.id+'\\')">Ground This</button>';
}
function closeDetail(){document.getElementById('detail').classList.remove('open');}

async function toggleSelect(id){await fetch('/api/bubble/'+id+'/toggle',{method:'POST'});
bubbles.find(b=>b.id===id).selected=!bubbles.find(b=>b.id===id).selected;render();}

function useAsPrompt(id){const b=bubbles.find(bb=>bb.id===id);if(b)document.getElementById('promptInput').value=b.full;}

function getPrompt(){return document.getElementById('promptInput').value.trim();}
function getMode(){return document.getElementById('modeSelect').value;}
function getSpokeCount(){return parseInt(document.getElementById('spokeCount').value);}
function getModelChoice(){return document.getElementById('modelSelect').value;}

async function dream(){const p=getPrompt();if(!p)return;status('Dreaming...');
const r=await fetch('/api/dream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,prompt:p,modelChoice:getModelChoice(),temp:parseFloat(document.querySelector('[name=proTemp]')?.value||0.85),maxTokens:parseInt(document.querySelector('[name=proMax]')?.value||1500)})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();status('Dream complete');}

async function dreamPipeline(){const p=getPrompt();if(!p)return;status('Running full pipeline...');closeDetail();
const r=await fetch('/api/pipeline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,prompt:p,spokes:getSpokeCount(),mode:getMode(),modelChoice:getModelChoice()})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();
document.getElementById('creditDisplay').textContent='$'+(session.credits-(data.cost||0)).toFixed(3);
status('Pipeline complete — '+bubbles.length+' bubbles');}

async function riff(){const selected=bubbles.filter(b=>b.selected);if(!selected.length){status('Select bubbles first (double-click)');return;}
status('Riffing '+selected.length+' bubbles...');
const r=await fetch('/api/riff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,parentIds:selected.map(b=>b.id),prompt:getPrompt(),spokes:getSpokeCount(),mode:getMode(),modelChoice:getModelChoice()})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();status('Riff complete — '+bubbles.length+' bubbles');}

async function riffSingle(id){status('Riffing...');closeDetail();
const r=await fetch('/api/riff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,parentIds:[id],prompt:'',spokes:getSpokeCount(),mode:getMode(),modelChoice:getModelChoice()})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();status('Riff complete');}

async function ground(){const selected=bubbles.filter(b=>b.selected);if(!selected.length){status('Select bubbles to ground');return;}
status('Grounding...');
const r=await fetch('/api/ground',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,bubbleIds:selected.map(b=>b.id)})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();status('Ground check complete');}

async function groundSingle(id){status('Grounding...');closeDetail();
const r=await fetch('/api/ground',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,bubbleIds:[id]})});
const data=await r.json();if(data.error){status(data.error);return;}
bubbles=data.bubbles||[];render();loadSessions();status('Grounded');}

async function exportMarkdown(){if(!session){alert('No session open');return;}
const r=await fetch('/api/session/'+session.id+'/export');const md=await r.text();
const blob=new Blob([md],{type:'text/markdown'});const a=document.createElement('a');
a.href=URL.createObjectURL(blob);a.download=session.title.replace(/[^a-z0-9]/gi,'_')+'.md';a.click();status('Exported');}

loadConfig();newSession();
</script>
</div></body></html>`;
}

// ---- API handlers ----
function getConfigFromRequest(req: Request): ModelConfig | null {
  const cf = req.headers.get('X-BYOK-Config');
  if (cf) try { return JSON.parse(cf); } catch { return null; }
  return null;
}

function getProEndpoint(config: ModelConfig | null, modelChoice: string): { baseUrl: string; apiKey: string; model: string } {
  if (config && config.baseUrl && config.apiKey) return { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.proModel };
  if (modelChoice === 'chat') return { ...FREE_CHAT };
  return { ...FREE_PRO };
}

function getMiniEndpoint(config: ModelConfig | null): { baseUrl: string; apiKey: string; model: string } {
  if (config && config.baseUrl && config.apiKey) return { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.miniModel };
  return { ...FREE_MINI };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return json({ status: 'ok', vessel: 'ideation-engine' });
    if (url.pathname === '/vessel.json') return json({ name: 'ideation-engine', type: 'cocapn-vessel', version: '2.0.0', description: 'Visual ideation platform — multi-model bubble pipeline', fleet: 'https://the-fleet.casey-digennaro.workers.dev' });

    // --- Sessions ---
    if (url.pathname === '/api/sessions') {
      const sessions = await env.IDEATE_KV.list({ prefix: 'session:', limit: 20 });
      const result = [];
      for (const key of sessions.keys) {
        const s = await env.IDEATE_KV.get(key.name, 'json') as Session;
        if (s) result.push({ id: s.id, title: s.title, bubbleCount: s.bubbles?.length || 0, updated: s.updated });
      }
      result.sort((a: { updated: string }, b: { updated: string }) => b.updated.localeCompare(a.updated));
      return json(result);
    }

    if (url.pathname === '/api/session' && req.method === 'POST') {
      const { title } = await req.json() as { title: string };
      const s: Session = { id: uid(), title: title || 'Untitled', bubbles: [], credits: 0.02, maxCredits: 0.02, config: DEFAULT_CONFIG, phase: 'idle', mode: 'parallel', created: new Date().toISOString(), updated: new Date().toISOString() };
      await env.IDEATE_KV.put('session:' + s.id, JSON.stringify(s));
      return json(s);
    }

    if (url.pathname.startsWith('/api/session/') && url.pathname.split('/').length === 4 && req.method === 'GET') {
      const id = url.pathname.split('/')[3];
      const s = await env.IDEATE_KV.get('session:' + id, 'json') as Session;
      if (!s) return json({ error: 'not found' }, 404);
      return json(s);
    }

    // --- Markdown export ---
    if (url.pathname.match(/\/api\/session\/[^/]+\/export$/)) {
      const id = url.pathname.split('/')[3];
      const s = await env.IDEATE_KV.get('session:' + id, 'json') as Session;
      if (!s) return json({ error: 'not found' }, 404);
      let md = `# ${s.title}\n\n*Exported from Ideation Engine — ${new Date(s.updated).toLocaleString()}*\n\n---\n\n`;
      const roots = s.bubbles.filter((b: Bubble) => !b.parent);
      const byParent = new Map<string, Bubble[]>();
      for (const b of s.bubbles) { const p = b.parent || '_root'; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p)!.push(b); }
      for (const root of roots) {
        md += `## ${root.title}\n\n*${root.model} | temp ${root.temp}*\n\n${root.full}\n\n`;
        const children = byParent.get(root.id) || [];
        if (children.length) {
          md += `### Spokes (${children.length})\n\n`;
          for (const c of children) {
            md += `#### ${c.title} ${c.selected ? '[CANON]' : ''}\n\n*${c.model} | temp ${c.temp}*\n\n${c.full}\n\n`;
            const gc = byParent.get(c.id) || [];
            for (const g of gc) { md += `##### ${g.title}\n\n${g.full}\n\n`; }
          }
        }
      }
      return new Response(md, { headers: { 'Content-Type': 'text/markdown;charset=UTF-8' } });
    }

    // --- Dream (single hub bubble) ---
    if (url.pathname === '/api/dream' && req.method === 'POST') {
      const { sessionId, prompt, modelChoice, temp, maxTokens } = await req.json() as { sessionId: string; prompt: string; modelChoice?: string; temp?: number; maxTokens?: number };
      const config = getConfigFromRequest(req);
      const ep = getProEndpoint(config, modelChoice || 'pro');
      const output = await callModel(ep.baseUrl, ep.apiKey, ep.model,
        'You are a creative thinker. Given the topic, produce ONE bold idea with a short title (5-7 words) and a detailed description (3-5 sentences). Be specific and grounded, not vague. Start with "TITLE: " then the title, then a newline, then the description.',
        prompt, maxTokens || 1500, temp || 0.85);
      const stripped = stripFences(output);
      const titleMatch = stripped.match(/TITLE:\s*(.+)/);
      const title = titleMatch ? titleMatch[1].trim().substring(0, 60) : stripped.substring(0, 50);
      const body = titleMatch ? stripped.substring(stripped.indexOf('\n') + 1).trim() : stripped;
      const bubble: Bubble = { id: uid(), title, summary: body.substring(0, 200), full: body, model: ep.model, children: [], phase: 'pro', temp: temp || 0.85, maxTokens: maxTokens || 1500, ts: new Date().toISOString() };

      const s = await env.IDEATE_KV.get('session:' + sessionId, 'json') as Session;
      s.bubbles.push(bubble); s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('session:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // --- Full pipeline: dream → spokes → ground ---
    if (url.pathname === '/api/pipeline' && req.method === 'POST') {
      const { sessionId, prompt, spokes, mode, modelChoice } = await req.json() as { sessionId: string; prompt: string; spokes?: number; mode?: string; modelChoice?: string };
      const config = getConfigFromRequest(req);
      const proEp = getProEndpoint(config, modelChoice || 'pro');
      const miniEp = getMiniEndpoint(config);
      const spokeCount = spokes || 8;
      const s = await env.IDEATE_KV.get('session:' + sessionId, 'json') as Session;

      if (s.credits <= 0) return json({ error: 'No credits remaining. Save your BYOK config to continue.' });

      // 1. Dream
      status_text('Dreaming...');
      const dreamOut = await callModel(proEp.baseUrl, proEp.apiKey, proEp.model,
        'You are a creative thinker. Given the topic, produce ONE bold idea with a short title (5-7 words) and a detailed description (3-5 sentences). Start with "TITLE: " then the title, then a newline, then the description.',
        prompt, 1500, 0.85);
      const stripped = stripFences(dreamOut);
      const tm = stripped.match(/TITLE:\s*(.+)/);
      const hub: Bubble = { id: uid(), title: tm ? tm[1].trim().substring(0, 60) : stripped.substring(0, 50), summary: (tm ? stripped.substring(stripped.indexOf('\n') + 1) : stripped).substring(0, 200), full: tm ? stripped.substring(stripped.indexOf('\n') + 1).trim() : stripped, model: proEp.model, children: [], phase: 'pro', temp: 0.85, maxTokens: 1500, ts: new Date().toISOString() };

      // 2. Spokes (parallel or serial)
      const spokeBubbles: Bubble[] = [];
      const miniPrompt = `The central idea: "${hub.title}"\n${hub.full}\n\nProduce ONE distinct variation with a short title (3-6 words) and a 2-3 sentence description. Be meaningfully different. Start with "TITLE: " then title, then newline, then description.`;

      for (let i = 0; i < spokeCount; i++) {
        status_text(`Spoke ${i + 1}/${spokeCount}...`);
        const out = await callModel(miniEp.baseUrl, miniEp.apiKey, miniEp.model,
          `You are a creative variator. Variation ${i + 1} of ${spokeCount}.\n\n${miniPrompt}`,
          600, 0.9);
        const st = stripFences(out);
        const sm = st.match(/TITLE:\s*(.+)/);
        const spoke: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : st.substring(0, 50), summary: (sm ? st.substring(st.indexOf('\n') + 1) : st).substring(0, 200), full: sm ? st.substring(st.indexOf('\n') + 1).trim() : st, model: miniEp.model, parent: hub.id, children: [], phase: 'mini', temp: 0.9, maxTokens: 600, ts: new Date().toISOString() };
        spokeBubbles.push(spoke);
        hub.children.push(spoke.id);
      }

      s.bubbles.push(hub, ...spokeBubbles);
      s.credits -= 0.018; // rough cost
      s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('session:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits, cost: 0.018 });
    }

    // --- Riff (create spokes from selected bubbles) ---
    if (url.pathname === '/api/riff' && req.method === 'POST') {
      const { sessionId, parentIds, prompt, spokes, mode, modelChoice } = await req.json() as { sessionId: string; parentIds: string[]; prompt?: string; spokes?: number; mode?: string; modelChoice?: string };
      const config = getConfigFromRequest(req);
      const miniEp = getMiniEndpoint(config);
      const spokeCount = spokes || 8;
      const s = await env.IDEATE_KV.get('session:' + sessionId, 'json') as Session;
      if (s.credits <= 0) return json({ error: 'No credits remaining.' });

      const newBubbles: Bubble[] = [];
      for (const pid of parentIds) {
        const parent = s.bubbles.find((b: Bubble) => b.id === pid);
        if (!parent) continue;
        const context = prompt ? `Additional direction: ${prompt}\n\n` : '';
        const miniPrompt = `Variation of: "${parent.title}"\n${context}${parent.full}\n\nProduce ONE distinct variation with a short title (3-6 words) and a 2-3 sentence description. Start with "TITLE: " then title, then newline, then description.`;
        for (let i = 0; i < spokeCount; i++) {
          const out = await callModel(miniEp.baseUrl, miniEp.apiKey, miniEp.model,
            `You are a creative variator. Variation ${i + 1} of ${spokeCount}.\n\n${miniPrompt}`, 600, 0.9);
          const st = stripFences(out);
          const sm = st.match(/TITLE:\s*(.+)/);
          const spoke: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : st.substring(0, 50), summary: (sm ? st.substring(st.indexOf('\n') + 1) : st).substring(0, 200), full: sm ? st.substring(st.indexOf('\n') + 1).trim() : st, model: miniEp.model, parent: pid, children: [], phase: 'mini', temp: 0.9, maxTokens: 600, ts: new Date().toISOString() };
          newBubbles.push(spoke);
          parent.children.push(spoke.id);
        }
      }
      s.bubbles.push(...newBubbles);
      s.credits -= 0.005 * parentIds.length;
      s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('session:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // --- Ground (feasibility check) ---
    if (url.pathname === '/api/ground' && req.method === 'POST') {
      const { sessionId, bubbleIds } = await req.json() as { sessionId: string; bubbleIds: string[] };
      const s = await env.IDEATE_KV.get('session:' + sessionId, 'json') as Session;
      if (s.credits <= 0) return json({ error: 'No credits remaining.' });

      const targets = s.bubbles.filter((b: Bubble) => bubbleIds.includes(b.id));
      const context = targets.map((b: Bubble) => `[${b.title}] ${b.full}`).join('\n\n');
      const chatEp = { ...FREE_CHAT };
      const out = await callModel(chatEp.baseUrl, chatEp.apiKey, chatEp.model,
        'You are a practical engineer. For each idea, assess: 1) Feasibility TODAY (1-10) 2) Simplest MVP 3) Biggest risk 4) One concrete next step. Start with "TITLE: " for the overall assessment title, then newline, then the assessment.',
        `Evaluate these ideas:\n\n${context}`, 1000, 0.3);
      const st = stripFences(out);
      const sm = st.match(/TITLE:\s*(.+)/);
      const groundBubble: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : 'Ground Assessment', summary: st.substring(0, 200), full: st, model: 'deepseek-chat', children: [], phase: 'ground', temp: 0.3, maxTokens: 1000, ts: new Date().toISOString() };
      s.bubbles.push(groundBubble);
      s.credits -= 0.003;
      s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('session:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // --- Toggle select ---
    if (url.pathname.match(/\/api\/bubble\/[^/]+\/toggle$/) && req.method === 'POST') {
      const id = url.pathname.split('/')[3];
      const sessionId = req.headers.get('X-Session-Id');
      if (!sessionId) return json({ error: 'missing session' }, 400);
      const s = await env.IDEATE_KV.get('session:' + sessionId, 'json') as Session;
      const b = s.bubbles.find((bb: Bubble) => bb.id === id);
      if (b) b.selected = !b.selected;
      await env.IDEATE_KV.put('session:' + sessionId, JSON.stringify(s));
      return json({ selected: b?.selected });
    }

    return new Response(getLanding(), { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CSP } });
  }
};

function status_text(t: string) { /* no-op on server, used for logging */ }
