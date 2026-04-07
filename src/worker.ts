interface Env { IDEATE_KV: KVNamespace; BYOK_KV: KVNamespace; }

const CSP: Record<string, string> = { 'default-src': "'self'", 'script-src': "'self' 'unsafe-inline' 'unsafe-eval'", 'style-src': "'self' 'unsafe-inline'", 'font-src': "https://fonts.googleapis.com", 'img-src': "'self' data: https:", 'connect-src': "'self' https://api.deepseek.com https://api.siliconflow.com https://api.deepinfra.com https://*" };

function json(data: unknown, s = 200) { return new Response(JSON.stringify(data), { status: s, headers: { 'Content-Type': 'application/json', ...CSP } }); }

interface Bubble { id: string; title: string; summary: string; full: string; model: string; parent?: string; children: string[]; group?: string; selected?: boolean; phase: string; temp: number; maxTokens: number; ts: string; }
interface Session { id: string; title: string; bubbles: Bubble[]; credits: number; config: Record<string, unknown>; phase: string; mode: string; created: string; updated: string; }

async function callModel(baseUrl: string, apiKey: string, model: string, system: string, user: string, max: number, temp: number): Promise<string> {
  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: max, temperature: temp })
  });
  const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return d.choices?.[0]?.message?.content || '';
}

function stripFences(t: string): string { t = t.trim(); while (t.startsWith('```')) t = t.split('\n').slice(1).join('\n'); while (t.endsWith('```')) t = t.slice(0, -3).trim(); return t; }
function uid(): string { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const FREE_PRO = { baseUrl: 'https://api.deepinfra.com', apiKey: 'jfCang5GUEkcHktx6xPTysstl9oIyIP7', model: 'bytedance/Seed-2.0-pro' };
const FREE_MINI = { baseUrl: 'https://api.deepinfra.com', apiKey: 'jfCang5GUEkcHktx6xPTysstl9oIyIP7', model: 'bytedance/seed-2.0-mini' };
const FREE_CHAT = { baseUrl: 'https://api.deepseek.com', apiKey: 'sk-5fc339a4fcc748ffba658c615bc2564d', model: 'deepseek-chat' };

function getLanding(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ideation Engine</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--card:#16161e;--border:#2a2a3a;--text:#e0e0e0;--muted:#8A93B4;--pro:#a855f7;--mini:#06b6d4;--ground:#22c55e;--accent:#f59e0b;--danger:#ef4444}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;display:flex;flex-direction:column}
/* Topbar */
.topbar{height:44px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:8px;font-size:.82em;flex-shrink:0}
.logo{color:var(--accent);font-weight:700;font-size:1em;white-space:nowrap}
.sep{width:1px;height:20px;background:var(--border)}
.credits{color:var(--muted);margin-left:auto;white-space:nowrap}.credits b{color:var(--accent)}
.tbtn{background:none;border:1px solid var(--border);color:var(--text);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:.78em;white-space:nowrap}
.tbtn:hover{border-color:var(--accent);color:var(--accent)}
.view-btns{display:flex;gap:2px}.view-btns button{background:none;border:none;color:var(--muted);padding:2px 6px;cursor:pointer;font-size:.85em;border-radius:3px}
.view-btns button.active{color:var(--accent);background:rgba(245,158,11,.1)}
/* Toolbar */
.toolbar{height:48px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:6px;flex-shrink:0;flex-wrap:nowrap}
.toolbar input[type=text]{flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:.88em}
.toolbar input:focus{outline:none;border-color:var(--accent)}
.toolbar select,.toolbar input[type=number]{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:5px;font-size:.78em;width:auto}
.toolbar input[type=number]{width:56px;text-align:center}
.toolbar .lbl{font-size:.68em;color:var(--muted);white-space:nowrap}
.btn{padding:6px 12px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82em;white-space:nowrap}
.btn:hover{filter:brightness(1.15)}
.btn-p{background:var(--pro);color:#fff}.btn-m{background:var(--mini);color:var(--bg)}.btn-g{background:var(--ground);color:var(--bg)}.btn-a{background:var(--accent);color:var(--bg)}
/* Main area */
.main{flex:1;display:flex;overflow:hidden}
/* Sidebar */
.sidebar{width:240px;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.sidebar h4{padding:10px 12px;font-size:.7em;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--border)}
.slist{flex:1;overflow-y:auto;padding:4px}
.sitem{padding:6px 10px;border-radius:5px;cursor:pointer;font-size:.82em;margin-bottom:1px;display:flex;justify-content:space-between}
.sitem:hover{background:var(--border)}.sitem.active{background:var(--accent);color:var(--bg)}
.sitem .cnt{font-size:.68em;color:var(--muted)}
.snew{padding:8px;border-top:1px solid var(--border)}.snew button{width:100%;padding:6px;background:var(--accent);color:var(--bg);border:none;border-radius:5px;cursor:pointer;font-weight:600;font-size:.85em}
/* Canvas */
.canvas-wrap{flex:1;position:relative;overflow:hidden}
#flowView,#wikiView,#sheetView,#codeView{position:absolute;inset:0;overflow:auto;padding:20px}
#flowView{background:radial-gradient(circle at 50% 50%,#1a1a2a 0%,var(--bg) 70%)}
#wikiView,#sheetView,#codeView{background:var(--bg);display:none}
.hidden{display:none!important}
/* Bubbles */
.bubble{position:absolute;border-radius:12px;padding:10px 14px;cursor:pointer;transition:all .15s;min-width:100px;max-width:200px;font-size:.78em;line-height:1.35;border:2px solid transparent;user-select:none}
.bubble:hover{z-index:10;transform:scale(1.06);box-shadow:0 6px 24px rgba(0,0,0,.5)}
.bubble .bt{font-weight:700;margin-bottom:3px;font-size:.9em}
.bubble .bs{color:rgba(255,255,255,.65);font-size:.82em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bubble .bm{font-size:.58em;color:var(--muted);margin-top:3px;font-family:'JetBrains Mono',monospace}
.bubble.pro{background:rgba(168,85,247,.13);border-color:rgba(168,85,247,.45);color:#d8b4fe}
.bubble.mini{background:rgba(6,182,212,.08);border-color:rgba(6,182,212,.35);color:#67e8f9}
.bubble.ground{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35);color:#86efac}
.bubble.selected{border-color:#fff!important;box-shadow:0 0 16px rgba(255,255,255,.15)}
.bubble .badge{position:absolute;top:-7px;right:-7px;background:var(--accent);color:var(--bg);width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6em;font-weight:700}
.svg-lines{position:absolute;inset:0;pointer-events:none;z-index:0}
.svg-lines line{stroke:var(--border);stroke-width:1.5;opacity:.35}
/* Detail panel */
.detail{position:absolute;top:0;right:0;width:380px;height:100%;background:var(--card);border-left:1px solid var(--border);z-index:20;transform:translateX(100%);transition:transform .15s;display:flex;flex-direction:column}
.detail.open{transform:translateX(0)}
.detail .dh{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.detail .dh h3{font-size:.88em}
.detail .dh button{background:none;border:1px solid var(--border);color:var(--text);width:26px;height:26px;border-radius:5px;cursor:pointer}
.detail .db{flex:1;overflow-y:auto;padding:16px;font-size:.84em;line-height:1.55}
.detail .db h4{color:var(--muted);font-size:.72em;text-transform:uppercase;margin:14px 0 6px;letter-spacing:.8px}
.detail .dc{display:flex;gap:5px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid var(--border)}
.detail .dc button{padding:5px 10px;border:1px solid var(--border);background:none;color:var(--text);border-radius:5px;cursor:pointer;font-size:.72em}
.detail .dc button:hover{border-color:var(--accent);color:var(--accent)}
/* Config modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:50;display:none;align-items:center;justify-content:center}
.modal-bg.open{display:flex}
.modal{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px;max-width:500px;width:92%;max-height:80vh;overflow-y:auto}
.modal h2{color:var(--accent);margin-bottom:3px;font-size:1.1em}.modal .sub{color:var(--muted);font-size:.82em;margin-bottom:16px}
.modal label{display:block;font-size:.78em;color:var(--muted);margin:10px 0 3px}
.modal input,.modal textarea{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:.82em}
.modal textarea{height:100px;resize:vertical}
.modal .save{margin-top:16px;width:100%;padding:9px;background:var(--accent);color:var(--bg);border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:.88em}
.modal .hint{font-size:.72em;color:var(--muted);margin-top:8px;line-height:1.45}
/* Empty state */
.empty{text-align:center;padding:60px 20px;color:var(--muted);position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.empty h2{color:var(--accent);font-size:1.2em;margin-bottom:10px}
.empty .fl{display:flex;align-items:center;gap:5px;margin:16px 0;font-size:.72em}
.empty .fl .n{padding:3px 8px;border-radius:5px;font-weight:600}
.empty .fl .a{color:var(--border)}
/* Wiki view */
.wiki-page h1{color:var(--accent);font-size:1.4em;margin-bottom:4px}
.wiki-page .meta{color:var(--muted);font-size:.78em;margin-bottom:20px}
.wiki-page h2{color:var(--pro);margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)}
.wiki-page h3{color:var(--mini);margin:16px 0 6px}
.wiki-page .tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:.68em;margin-right:4px}
.wiki-page .tag-canon{background:rgba(245,158,11,.2);color:var(--accent)}
.wiki-page .tag-pro{background:rgba(168,85,247,.2);color:var(--pro)}
.wiki-page .tag-mini{background:rgba(6,182,212,.2);color:var(--mini)}
.wiki-page .tag-ground{background:rgba(34,197,94,.2);color:var(--ground)}
/* Sheet view */
.sheet{width:100%;border-collapse:collapse;font-size:.82em}
.sheet th{background:var(--card);color:var(--muted);text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);position:sticky;top:0}
.sheet td{padding:8px 12px;border-bottom:1px solid var(--border);vertical-align:top;max-width:400px;overflow:hidden;text-overflow:ellipsis}
.sheet tr:hover td{background:rgba(245,158,11,.03)}
.sheet tr.selected td{background:rgba(245,158,11,.08)}
/* Code view */
.code-out{font-family:'JetBrains Mono',monospace;font-size:.78em;line-height:1.5;white-space:pre-wrap;color:#8A93B4}
.code-out .kw{color:#c084fc}.code-out .str{color:#86efac}.code-out .cmt{color:#475569}
/* Fork banner */
.fork-banner{background:linear-gradient(90deg,rgba(168,85,247,.08),rgba(6,182,212,.08));border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin:8px;font-size:.78em;line-height:1.4}
.fork-banner strong{color:var(--accent)}
/* Status */
.statusbar{height:24px;background:var(--card);border-top:1px solid var(--border);display:flex;align-items:center;padding:0 12px;font-size:.68em;color:var(--muted);gap:14px;flex-shrink:0}
</style></head><body>
<div class="topbar">
<span class="logo">\u{1f4a1} Ideation Engine</span>
<div class="sep"></div>
<div class="view-btns">
<button class="active" onclick="setView('flow')" title="Bubble flowchart">Flow</button>
<button onclick="setView('wiki')" title="Navigable wiki">Wiki</button>
<button onclick="setView('sheet')" title="Spreadsheet">Sheet</button>
<button onclick="setView('code')" title="Pseudocode">Code</button>
</div>
<div class="sep"></div>
<div class="credits"><b id="creditDisp">$0.020</b> free</div>
<button class="tbtn" onclick="openCfg()">{gear} BYOK</button>
<button class="tbtn" onclick="window.open('https://github.com/Lucineer/ideation-engine','_blank')">{fork} Fork</button>
<button class="tbtn" onclick="exportMd()">Export .md</button>
<button class="tbtn" onclick="exportPseudo()">Export code</button>
</div>
<div class="toolbar">
<input id="promptIn" placeholder="What are you thinking about?" onkeydown="if(event.key==='Enter')runPipeline()">
<span class="lbl">Temp:</span><input type="number" id="proTemp" value="0.85" min="0" max="2" step="0.05" style="width:52px" title="Pro temperature">
<span class="lbl">Mini:</span><input type="number" id="miniTemp" value="0.9" min="0" max="2" step="0.05" style="width:52px" title="Mini temperature">
<span class="lbl">Tokens:</span><input type="number" id="proMax" value="1500" min="100" max="4000" step="100" style="width:60px" title="Pro max tokens">
<select id="spokes"><option value="4">4</option><option value="8" selected>8</option><option value="12">12</option></select>
<select id="mode"><option value="parallel">Parallel</option><option value="serial">Serial</option></select>
<select id="modelCh"><option value="pro">Seed Pro</option><option value="chat">DeepSeek Chat</option></select>
<button class="btn btn-a" onclick="runPipeline()">Pipeline</button>
<button class="btn btn-p" onclick="dreamOne()">Dream</button>
<button class="btn btn-m" onclick="riffSel()">Riff</button>
<button class="btn btn-g" onclick="groundSel()">Ground</button>
</div>
<div class="main">
<div class="sidebar">
<h4>Sessions</h4>
<div class="slist" id="sList"></div>
<div class="snew"><button onclick="newSess()">+ New Session</button></div>
</div>
<div class="canvas-wrap">
<div id="flowView"><svg class="svg-lines" id="svgL"></svg><div class="empty" id="emptyMsg"><h2>Visual Ideation</h2><p>Type an idea and hit Pipeline to watch it bloom.</p><div class="fl"><span class="n" style="background:rgba(168,85,247,.15);color:var(--pro)">Dream</span><span class="a">\u2192</span><span class="n" style="background:rgba(6,182,212,.15);color:var(--mini)">Spokes</span><span class="a">\u2192</span><span class="n" style="background:rgba(34,197,94,.15);color:var(--ground)">Ground</span></div><p style="font-size:.78em;margin-top:12px">Hover for summary. Click for full text. Double-click to select.<br>Selected bubbles can be riffed or grounded together.</p></div></div>
<div id="wikiView"></div>
<div id="sheetView"></div>
<div id="codeView"><div class="code-out" id="codeOut"></div></div>
</div>
</div>
<div class="detail" id="detail">
<div class="dh"><h3 id="dTitle">Bubble</h3><button onclick="closeDet()">&times;</button></div>
<div class="db" id="dBody"></div>
<div class="dc" id="dCtrl"></div>
</div>
<div class="modal-bg" id="cfgModal">
<div class="modal">
<h2>{gear} Bring Your Own Keys</h2>
<p class="sub">Config is saved to your browser only. Your keys never leave this machine.</p>
<label>Base URL</label><input id="cfgUrl" placeholder="https://api.deepinfra.com">
<label>API Key</label><input id="cfgKey" type="password" placeholder="sk-...">
<label>Pro Model</label><input id="cfgPro" value="bytedance/Seed-2.0-pro">
<label>Mini Model</label><input id="cfgMini" value="bytedance/seed-2.0-mini">
<label>Full JSON (advanced)</label><textarea id="cfgJson"></textarea>
<button class="save" onclick="saveCfg()">Save to localStorage</button>
<p class="hint">Fork the repo to run on your own Cloudflare account with your own secrets.<br>Or open in GitHub Codespaces for instant setup.<br>The worker never sees your BYOK keys \u2014 they go directly from browser to provider.</p>
</div>
</div>
<div class="statusbar"><span id="statusTxt">Ready</span><span id="bubCnt">0 bubbles</span></div>
<script>
let S=null, B=[], view='flow';
function $(id){return document.getElementById(id)}
function loadCfg(){const r=localStorage.getItem('ideation-cfg');if(!r)return;try{const c=JSON.parse(r);$('cfgUrl').value=c.baseUrl||'';$('cfgKey').value=c.apiKey||'';$('cfgPro').value=c.proModel||'';$('cfgMini').value=c.miniModel||'';$('cfgJson').value=r;}catch{}}
function saveCfg(){let c={};const r=$('cfgJson').value.trim();if(r)try{c=JSON.parse(r)}catch{alert('Invalid JSON');return;}
c.baseUrl=$('cfgUrl').value||c.baseUrl;c.apiKey=$('cfgKey').value||c.apiKey;
c.proModel=$('cfgPro').value||c.proModel;c.miniModel=$('cfgMini').value||c.miniModel;
localStorage.setItem('ideation-cfg',JSON.stringify(c));closeCfg();stat('Config saved');}
function openCfg(){loadCfg();$('cfgModal').classList.add('open');}
function closeCfg(){$('cfgModal').classList.remove('open');}
function getCfg(){const r=localStorage.getItem('ideation-cfg');return r?JSON.parse(r):null;}
function stat(t){$('statusTxt').textContent=t;}
function prompt(){return $('promptIn').value.trim();}

// --- Sessions ---
async function loadSessList(){const r=await fetch('/api/sessions');const list=await r.json();
$('sList').innerHTML=list.map(s=>'<div class="sitem'+(S&&S.id===s.id?' active':'')+'" onclick="loadSess(\\''+s.id+'\\')"><span>'+esc(s.title.substring(0,28))+'</span><span class="cnt">'+s.bc+'</span></div>').join('')||'<p style="padding:10px;color:var(--muted);font-size:.82em">No sessions yet.</p>';}
async function newSess(){const t=prompt()||'Session '+new Date().toLocaleDateString();
const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t})});
S=await r.json();B=S.bubbles||[];render();loadSessList();}
async function loadSess(id){const r=await fetch('/api/session/'+id);S=await r.json();B=S.bubbles||[];render();loadSessList();}

// --- Views ---
function setView(v){view=v;['flowView','wikiView','sheetView','codeView'].forEach(el=>$(el).classList.add('hidden'));
if(v==='flow')$('flowView').classList.remove('hidden');
else if(v==='wiki'){$('wikiView').classList.remove('hidden');renderWiki();}
else if(v==='sheet'){$('sheetView').classList.remove('hidden');renderSheet();}
else if(v==='code'){$('codeView').classList.remove('hidden');renderCode();}
document.querySelectorAll('.view-btns button').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase()===v));
}

function renderWiki(){
const roots=B.filter(b=>!b.parent);let html='<div class="wiki-page"><h1>'+esc(S.title)+'</h1><div class="meta">'+B.length+' bubbles \u00b7 '+new Date(S.updated).toLocaleString()+'</div>';
if(!roots.length){html+='<p style="color:var(--muted)">Empty session.</p>';}
for(const root of roots){html+='<h2>'+esc(root.title)+' <span class="tag tag-pro">'+root.model.split('/').pop()+'</span></h2><p>'+esc(root.full)+'</p>';
const kids=B.filter(b=>b.parent===root.id);if(kids.length){html+='<p style="color:var(--muted);font-size:.78em">'+kids.length+' variations:</p>';
for(const k of kids){html+='<h3>'+esc(k.title)+(k.selected?' <span class="tag tag-canon">CANON</span>':'')+' <span class="tag tag-mini">'+k.model.split('/').pop()+'</span></h3><p>'+esc(k.full)+'</p>';
const gc=B.filter(b=>b.parent===k.id);for(const g of gc){html+='<p style="margin:4px 0 4px 16px;color:var(--muted);font-size:.8em"><strong>'+esc(g.title)+'</strong></p><p style="margin:2px 0 2px 16px">'+esc(g.full)+'</p>';}}}
const grounds=B.filter(b=>b.phase==='ground'&&b.parent===root.id);for(const g of grounds){html+='<h2 style="color:var(--ground)">'+esc(g.title)+' <span class="tag tag-ground">Ground</span></h2><p>'+esc(g.full)+'</p>';}}
html+='</div>';$('wikiView').innerHTML=html;}

function renderSheet(){
let html='<table class="sheet"><thead><tr><th>Phase</th><th>Title</th><th>Model</th><th>Temp</th><th>Tokens</th><th>Summary</th><th>Selected</th><th>Parent</th></tr></thead><tbody>';
const sorted=[...B].sort((a,b)=>{const o={pro:0,mini:1,ground:2};return(o[a.phase]||9)-(o[b.phase]||9);});
for(const b of sorted){const par=b.parent?B.find(p=>p.id===b.parent):null;
html+='<tr class="'+(b.selected?'selected':'')+'"><td>'+b.phase+'</td><td><strong>'+esc(b.title)+'</strong></td><td style="font-family:monospace;font-size:.72em">'+esc(b.model.split('/').pop())+'</td><td>'+b.temp+'</td><td>'+b.maxTokens+'</td><td>'+esc(b.summary)+'</td><td>'+(b.selected?'\u2705':'')+'</td><td>'+(par?esc(par.title.substring(0,20)):'\u2014')+'</td></tr>';}
html+='</tbody></table>';$('sheetView').innerHTML=html;}

function renderCode(){
let c='# Ideation Session: '+S.title+'\n# Generated '+new Date(S.created).toLocaleString()+'\n\n';
const roots=B.filter(b=>!b.parent);for(const root of roots){
c+='## '+root.title+' # [pro: '+root.model+']\n'+root.full+'\n\n';
const kids=B.filter(b=>b.parent===root.id);if(kids.length){c+='### Variations\n';for(const k of kids){
c+='#### '+(k.selected?'[CANON] ':'')+k.title+' # [mini: '+k.model+', temp: '+k.temp+']\n'+k.full+'\n\n';}}
const grounds=B.filter(b=>b.phase==='ground'&&b.parent===root.id);for(const g of grounds){c+='### Ground: '+g.title+'\n'+g.full+'\n\n';}}
$('codeOut').textContent=c;}

// --- Bubble canvas rendering ---
function render(){
$('emptyMsg').style.display=B.length?'none':'flex';
$('bubCnt').textContent=B.length+' bubbles';
$('creditDisp').textContent='$'+(S.credits||0.02).toFixed(3);
const cv=$('flowView');cv.querySelectorAll('.bubble').forEach(b=>b.remove());
const svg=$('svgL');svg.innerHTML='';
if(!B.length)return;
const cx=cv.offsetWidth/2,cy=cv.offsetHeight/2;
const hub=B.find(b=>!b.parent&&b.phase==='pro');
if(!hub)return;
cv.appendChild(mkBubble(hub,cx-100,cy-35));
const kids=B.filter(b=>b.parent===hub.id);
const R=Math.min(cv.offsetWidth,cv.offsetHeight)*0.3;
kids.forEach((b,i)=>{const a=(2*Math.PI*i/Math.max(kids.length,1))-Math.PI/2;
const x=cx+R*Math.cos(a)-90,y=cy+R*Math.sin(a)-28;cv.appendChild(mkBubble(b,x,y));
const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',cx);ln.setAttribute('y1',cy);ln.setAttribute('x2',x+90);ln.setAttribute('y2',y+28);
if(b.selected)ln.style.stroke='var(--accent)';svg.appendChild(ln);});
// Grandchildren
B.filter(b=>b.parent&&B.some(p=>p.id===b.parent&&p.parent===hub.id)).forEach(b=>{
const par=B.find(p=>p.id===b.parent);if(!par)return;
const pi=kids.indexOf(par);const ba=(2*Math.PI*pi/Math.max(kids.length,1))-Math.PI/2;
const R2=R+130;const spread=0.35/Math.max(kids.length,1);
const si=B.filter(s=>s.parent===b.parent).indexOf(b);const a=ba+(si-0.5)*spread*2*Math.PI;
const x=cx+R2*Math.cos(a)-80,y=cy+R2*Math.sin(a)-25;cv.appendChild(mkBubble(b,x,y));
const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',cx+R*Math.cos(ba));ln.setAttribute('y1',cy+R*Math.sin(ba));ln.setAttribute('x2',x+80);ln.setAttribute('y2',y+25);svg.appendChild(ln);});
// Ground bubbles — place below center
B.filter(b=>b.phase==='ground').forEach((b,i)=>{const x=cx-90+i*210,y=cy+R+60;cv.appendChild(mkBubble(b,x,y));
const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',cx);ln.setAttribute('y1',cy);ln.setAttribute('x2',x+90);ln.setAttribute('y2',y+25);ln.style.stroke='var(--ground)';ln.style.opacity='.3';svg.appendChild(ln);});
}

function mkBubble(b,x,y){const el=document.createElement('div');el.className='bubble '+b.phase+(b.selected?' selected':'');
el.style.left=x+'px';el.style.top=y+'px';el.innerHTML='<div class="bt">'+esc(b.title)+'</div><div class="bs">'+esc(b.summary)+'</div><div class="bm">'+b.model.split('/').pop()+' t:'+b.temp+'</div>'+((b.children&&b.children.length)?'<div class="badge">'+b.children.length+'</div>':'');
el.onclick=()=>openDet(b);el.ondblclick=(e)=>{e.stopPropagation();toggleSel(b.id);};return el;}

function openDet(b){$('detail').classList.add('open');$('dTitle').textContent=b.title;
$('dBody').innerHTML='<h4>Full Output</h4><p style="white-space:pre-wrap;margin-bottom:10px">'+esc(b.full)+'</p><h4>Metadata</h4><p style="font-size:.82em;color:var(--muted)">Model: '+esc(b.model)+'<br>Phase: '+b.phase+'<br>Temp: '+b.temp+'<br>Max tokens: '+b.maxTokens+'<br>Created: '+new Date(b.ts).toLocaleString()+'</p>'+(b.selected?'<h4>Canon</h4><p style="color:var(--accent)">Selected for next ideation round</p>':'');
$('dCtrl').innerHTML='<button onclick="toggleSel(\\''+b.id+'\\')">'+(b.selected?'Deselect':'Select')+'</button><button onclick="usePrompt(\\''+b.id+'\\')">Use as Prompt</button><button onclick="riffOne(\\''+b.id+'\\')">Riff</button><button onclick="groundOne(\\''+b.id+'\\')">Ground</button><button onclick="markCanon(\\''+b.id+'\\')">'+(b.selected?'Unmark':'Mark')+' Canon</button>';}
function closeDet(){$('detail').classList.remove('open');}
async function toggleSel(id){const r=await fetch('/api/bubble/'+id+'/toggle',{method:'POST',headers:{'X-Session-Id':S.id}});
const d=await r.json();const b=B.find(bb=>bb.id===id);if(b)b.selected=d.selected;render();}
function markCanon(id){toggleSel(id);}
function usePrompt(id){const b=B.find(bb=>bb.id===id);if(b)$('promptIn').value=b.full;}
async function riffOne(id){stat('Riffing...');closeDet();const n=parseInt($('spokes').value);
const r=await fetch('/api/riff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,parentIds:[id],spokes:n,mode:$('mode').value,modelChoice:$('modelCh').value,miniTemp:parseFloat($('miniTemp').value)})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();stat('Riffed \u2014 '+B.length+' bubbles');}
async function groundOne(id){stat('Grounding...');closeDet();
const r=await fetch('/api/ground',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,bubbleIds:[id]})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();stat('Grounded');}

// --- Main actions ---
async function dreamOne(){const p=prompt();if(!p)return;stat('Dreaming...');
const r=await fetch('/api/dream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,prompt:p,modelChoice:$('modelCh').value,temp:parseFloat($('proTemp').value),maxTokens:parseInt($('proMax').value)})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();stat('Dream complete');}

async function runPipeline(){const p=prompt();if(!p)return;stat('Running pipeline...');closeDet();
const r=await fetch('/api/pipeline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,prompt:p,spokes:parseInt($('spokes').value),mode:$('mode').value,modelChoice:$('modelCh').value,proTemp:parseFloat($('proTemp').value),miniTemp:parseFloat($('miniTemp').value),proMaxTokens:parseInt($('proMax').value)})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();loadSessList();stat('Pipeline complete \u2014 '+B.length+' bubbles');}

async function riffSel(){const sel=B.filter(b=>b.selected);if(!sel.length){stat('Double-click bubbles to select first');return;}
stat('Riffing '+sel.length+'...');const r=await fetch('/api/riff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,parentIds:sel.map(b=>b.id),spokes:parseInt($('spokes').value),mode:$('mode').value,modelChoice:$('modelCh').value,miniTemp:parseFloat($('miniTemp').value)})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();stat('Riffed \u2014 '+B.length+' bubbles');}

async function groundSel(){const sel=B.filter(b=>b.selected);if(!sel.length){stat('Select bubbles to ground');return;}
stat('Grounding...');const r=await fetch('/api/ground',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:S.id,bubbleIds:sel.map(b=>b.id)})});
const d=await r.json();if(d.error){stat(d.error);return;}B=d.bubbles;S.credits=d.credits;render();stat('Grounded');}

async function exportMd(){const r=await fetch('/api/session/'+S.id+'/export');const blob=new Blob([await r.text()],{type:'text/markdown'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=S.title.replace(/[^a-z0-9]/gi,'_')+'.md';a.click();stat('Exported markdown');}

async function exportPseudo(){const r=await fetch('/api/session/'+S.id+'/export/pseudo');const blob=new Blob([await r.text()],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=S.title.replace(/[^a-z0-9]/gi,'_')+'.txt';a.click();stat('Exported pseudocode');}

loadCfg();newSess();
</script>
</div></body></html>`;
}

// ---- API ----
function getSession(kv: KVNamespace, id: string): Promise<Session> { return kv.get('s:' + id, 'json') as Promise<Session>; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return json({ status: 'ok', vessel: 'ideation-engine' });
    if (url.pathname === '/vessel.json') return json({ name: 'ideation-engine', type: 'cocapn-vessel', version: '2.0.0', description: 'Visual ideation platform with multi-model bubble pipeline', fleet: 'https://the-fleet.casey-digennaro.workers.dev' });

    // Sessions list
    if (url.pathname === '/api/sessions') {
      const list = await env.IDEATE_KV.list({ prefix: 's:', limit: 30 });
      const out: Array<{ id: string; title: string; bc: number; updated: string }> = [];
      for (const k of list.keys) { const s = await env.IDEATE_KV.get(k.name, 'json') as Session; if (s) out.push({ id: s.id, title: s.title, bc: s.bubbles?.length || 0, updated: s.updated }); }
      out.sort((a, b) => b.updated.localeCompare(a.updated));
      return json(out);
    }

    // Create session
    if (url.pathname === '/api/session' && req.method === 'POST') {
      const { title } = await req.json() as { title: string };
      const s: Session = { id: uid(), title: title || 'Untitled', bubbles: [], credits: 0.02, config: {}, phase: 'idle', mode: 'parallel', created: new Date().toISOString(), updated: new Date().toISOString() };
      await env.IDEATE_KV.put('s:' + s.id, JSON.stringify(s));
      return json(s);
    }

    // Get session
    if (url.pathname.startsWith('/api/session/') && url.pathname.split('/').length === 4) {
      const s = await getSession(env.IDEATE_KV, url.pathname.split('/')[3]);
      return s ? json(s) : json({ error: 'not found' }, 404);
    }

    // Markdown export
    if (url.pathname.match(/\/api\/session\/[^/]+\/export$/)) {
      const s = await getSession(env.IDEATE_KV, url.pathname.split('/')[3]);
      if (!s) return json({ error: 'not found' }, 404);
      let md = `# ${s.title}\n\n*Ideation Engine export \u2014 ${new Date(s.updated).toLocaleString()}*\n\n---\n\n`;
      const roots = s.bubbles.filter((b: Bubble) => !b.parent);
      const byParent = new Map<string, Bubble[]>();
      for (const b of s.bubbles) { const p = b.parent || '_r'; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p)!.push(b); }
      for (const root of roots) {
        md += `## ${root.title}\n\n*${root.model} | temp ${root.temp} | tokens ${root.maxTokens}*\n\n${root.full}\n\n`;
        for (const c of byParent.get(root.id) || []) {
          md += `### ${c.title} ${c.selected ? '**[CANON]**' : ''}\n\n*${c.model} | temp ${c.temp}*\n\n${c.full}\n\n`;
          for (const g of byParent.get(c.id) || []) md += `#### ${g.title}\n\n${g.full}\n\n`;
        }
        for (const g of s.bubbles.filter((b: Bubble) => b.phase === 'ground')) {
          md += `### Ground: ${g.title}\n\n${g.full}\n\n`;
        }
      }
      return new Response(md, { headers: { 'Content-Type': 'text/markdown;charset=UTF-8' } });
    }

    // Pseudocode export
    if (url.pathname.match(/\/api\/session\/[^/]+\/export\/pseudo$/)) {
      const s = await getSession(env.IDEATE_KV, url.pathname.split('/')[3]);
      if (!s) return json({ error: 'not found' }, 404);
      let c = `# Ideation Session: ${s.title}\n# Generated: ${new Date(s.created).toLocaleString()}\n\n`;
      for (const root of s.bubbles.filter((b: Bubble) => !b.parent && b.phase === 'pro')) {
        c += `idea "${root.title}" {\n  model: "${root.model}"\n  temperature: ${root.temp}\n  max_tokens: ${root.maxTokens}\n  content: """\n${root.full}\n  """\n  variations: [\n`;
        const kids = s.bubbles.filter((b: Bubble) => b.parent === root.id);
        for (const k of kids) {
          c += `    {\n      title: "${k.title}"\n      canon: ${!!k.selected}\n      model: "${k.model}"\n      temperature: ${k.temp}\n      content: """\n${k.full}\n      """\n`;
          const gc = s.bubbles.filter((b: Bubble) => b.parent === k.id);
          if (gc.length) { c += `      refinements: [\n`; for (const g of gc) c += `        { title: "${g.title}", content: """\n${g.full}\n        """ },\n`; c += `      ]\n`; }
          c += `    },\n`;
        }
        c += `  ]\n}\n\n`;
      }
      for (const g of s.bubbles.filter((b: Bubble) => b.phase === 'ground')) {
        c += `ground_assessment "${g.title}" {\n  model: "${g.model}"\n  content: """\n${g.full}\n  """\n}\n\n`;
      }
      return new Response(c, { headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
    }

    // Toggle select
    if (url.pathname.match(/\/api\/bubble\/[^/]+\/toggle$/) && req.method === 'POST') {
      const id = url.pathname.split('/')[3]; const sid = req.headers.get('X-Session-Id');
      if (!sid) return json({ error: 'no session' }, 400);
      const s = await getSession(env.IDEATE_KV, sid);
      const b = s.bubbles.find((bb: Bubble) => bb.id === id);
      if (b) b.selected = !b.selected;
      await env.IDEATE_KV.put('s:' + sid, JSON.stringify(s));
      return json({ selected: b?.selected });
    }

    // Dream (single pro bubble)
    if (url.pathname === '/api/dream' && req.method === 'POST') {
      const { sessionId, prompt, modelChoice, temp, maxTokens } = await req.json() as { sessionId: string; prompt: string; modelChoice?: string; temp?: number; maxTokens?: number };
      const ep = modelChoice === 'chat' ? { ...FREE_CHAT } : { ...FREE_PRO };
      const out = await callModel(ep.baseUrl, ep.apiKey, ep.model,
        'Produce ONE bold idea with a short title (5-7 words) and a detailed description (3-5 sentences). Be specific and grounded. Start with "TITLE: " then title, newline, then description.', prompt, maxTokens || 1500, temp || 0.85);
      const st = stripFences(out); const tm = st.match(/TITLE:\s*(.+)/);
      const title = tm ? tm[1].trim().substring(0, 60) : st.substring(0, 50);
      const body = tm ? st.substring(st.indexOf('\n') + 1).trim() : st;
      const bubble: Bubble = { id: uid(), title, summary: body.substring(0, 200), full: body, model: ep.model, children: [], phase: 'pro', temp: temp || 0.85, maxTokens: maxTokens || 1500, ts: new Date().toISOString() };
      const s = await getSession(env.IDEATE_KV, sessionId);
      s.bubbles.push(bubble); s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('s:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // Pipeline: dream → spokes
    if (url.pathname === '/api/pipeline' && req.method === 'POST') {
      const { sessionId, prompt, spokes, mode, modelChoice, proTemp, miniTemp, proMaxTokens } = await req.json() as { sessionId: string; prompt: string; spokes?: number; mode?: string; modelChoice?: string; proTemp?: number; miniTemp?: number; proMaxTokens?: number };
      const s = await getSession(env.IDEATE_KV, sessionId);
      if (s.credits <= 0) return json({ error: 'Credits exhausted. Fork or configure BYOK to continue.' });
      const ep = modelChoice === 'chat' ? { ...FREE_CHAT } : { ...FREE_PRO };
      const proT = proTemp || 0.85, miniT = miniTemp || 0.9, proM = proMaxTokens || 1500, n = spokes || 8;

      // Dream
      const dreamOut = await callModel(ep.baseUrl, ep.apiKey, ep.model,
        'Produce ONE bold idea with a short title (5-7 words) and a detailed description (3-5 sentences). Be specific and grounded. Start with "TITLE: " then title, newline, then description.', prompt, proM, proT);
      const st = stripFences(dreamOut); const tm = st.match(/TITLE:\s*(.+)/);
      const hub: Bubble = { id: uid(), title: tm ? tm[1].trim().substring(0, 60) : st.substring(0, 50), summary: (tm ? st.substring(st.indexOf('\n') + 1) : st).substring(0, 200), full: tm ? st.substring(st.indexOf('\n') + 1).trim() : st, model: ep.model, children: [], phase: 'pro', temp: proT, maxTokens: proM, ts: new Date().toISOString() };

      // Spokes
      const miniEp = { ...FREE_MINI };
      const miniPrompt = `The central idea: "${hub.title}"\n${hub.full}\n\nProduce ONE distinct variation with a short title (3-6 words) and 2-3 sentence description. Be meaningfully different. Start with "TITLE: " then title, then newline, then description.`;
      for (let i = 0; i < n; i++) {
        const out = await callModel(miniEp.baseUrl, miniEp.apiKey, miniEp.model,
          `Variation ${i + 1} of ${n}.\n\n${miniPrompt}`, 600, miniT);
        const s2 = stripFences(out); const sm = s2.match(/TITLE:\s*(.+)/);
        const spoke: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : s2.substring(0, 50), summary: (sm ? s2.substring(s2.indexOf('\n') + 1) : s2).substring(0, 200), full: sm ? s2.substring(s2.indexOf('\n') + 1).trim() : s2, model: miniEp.model, parent: hub.id, children: [], phase: 'mini', temp: miniT, maxTokens: 600, ts: new Date().toISOString() };
        hub.children.push(spoke.id); s.bubbles.push(spoke);
      }
      s.bubbles.push(hub); s.credits = Math.max(0, s.credits - 0.018); s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('s:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // Riff (new spokes from selected)
    if (url.pathname === '/api/riff' && req.method === 'POST') {
      const { sessionId, parentIds, spokes, mode, modelChoice, miniTemp } = await req.json() as { sessionId: string; parentIds: string[]; spokes?: number; mode?: string; modelChoice?: string; miniTemp?: number };
      const s = await getSession(env.IDEATE_KV, sessionId);
      if (s.credits <= 0) return json({ error: 'Credits exhausted.' });
      const n = spokes || 8, mT = miniTemp || 0.9, miniEp = { ...FREE_MINI };
      for (const pid of parentIds) {
        const parent = s.bubbles.find((b: Bubble) => b.id === pid); if (!parent) continue;
        for (let i = 0; i < n; i++) {
          const out = await callModel(miniEp.baseUrl, miniEp.apiKey, miniEp.model,
            `Variation ${i + 1} of ${n}.\n\nVariation of: "${parent.title}"\n${parent.full}\n\nProduce ONE distinct variation with a short title (3-6 words) and 2-3 sentence description. Start with "TITLE: " then title, newline, then description.`, 600, mT);
          const s2 = stripFences(out); const sm = s2.match(/TITLE:\s*(.+)/);
          const spoke: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : s2.substring(0, 50), summary: (sm ? s2.substring(s2.indexOf('\n') + 1) : s2).substring(0, 200), full: sm ? s2.substring(s2.indexOf('\n') + 1).trim() : s2, model: miniEp.model, parent: pid, children: [], phase: 'mini', temp: mT, maxTokens: 600, ts: new Date().toISOString() };
          parent.children.push(spoke.id); s.bubbles.push(spoke);
        }
      }
      s.credits = Math.max(0, s.credits - 0.004 * parentIds.length); s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('s:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    // Ground
    if (url.pathname === '/api/ground' && req.method === 'POST') {
      const { sessionId, bubbleIds } = await req.json() as { sessionId: string; bubbleIds: string[] };
      const s = await getSession(env.IDEATE_KV, sessionId);
      if (s.credits <= 0) return json({ error: 'Credits exhausted.' });
      const targets = s.bubbles.filter((b: Bubble) => bubbleIds.includes(b.id));
      const ctx = targets.map((b: Bubble) => `[${b.title}] ${b.full}`).join('\n\n');
      const out = await callModel(FREE_CHAT.baseUrl, FREE_CHAT.apiKey, FREE_CHAT.model,
        'For each idea, assess: 1) Feasibility TODAY (1-10) 2) Simplest MVP 3) Biggest risk 4) One next step. Start with "TITLE: " then overall assessment title, newline, then assessment.',
        `Evaluate:\n\n${ctx}`, 1000, 0.3);
      const st = stripFences(out); const sm = st.match(/TITLE:\s*(.+)/);
      const gb: Bubble = { id: uid(), title: sm ? sm[1].trim().substring(0, 60) : 'Ground Assessment', summary: st.substring(0, 200), full: st, model: 'deepseek-chat', children: [], phase: 'ground', temp: 0.3, maxTokens: 1000, ts: new Date().toISOString() };
      s.bubbles.push(gb); s.credits = Math.max(0, s.credits - 0.003); s.updated = new Date().toISOString();
      await env.IDEATE_KV.put('s:' + sessionId, JSON.stringify(s));
      return json({ bubbles: s.bubbles, credits: s.credits });
    }

    return new Response(getLanding(), { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CSP } });
  }
};
