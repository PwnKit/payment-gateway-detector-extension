
function escapeHtml(str){return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
const statusEl=document.getElementById('status'); const resultsEl=document.getElementById('results'); const metaEl=document.getElementById('meta');
function setStatus(text,tone){statusEl.textContent=text;statusEl.className=`status ${tone}`;}
function confidenceClass(confidence){if(confidence==='High') return 'conf-high'; if(confidence==='Medium') return 'conf-medium'; return 'conf-low';}
function render(data, scanLabel){
  const scannedAt=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  metaEl.innerHTML=`<div class="meta-card"><div class="meta-row"><strong>Title:</strong> ${escapeHtml(data.title||'(untitled)')}</div><div class="meta-row"><strong>URL:</strong> ${escapeHtml(data.url||'')}</div><div class="meta-row"><strong>Sources scanned:</strong> ${escapeHtml(data.scannedSources??'')}</div><div class="meta-row"><strong>Last scanned:</strong> ${escapeHtml(scannedAt)} (${escapeHtml(scanLabel)})</div>${data.note?`<div class="meta-row"><strong>Note:</strong> ${escapeHtml(data.note)}</div>`:''}</div>`;
  if(!data.results || !data.results.length){
    resultsEl.innerHTML=`<div class="empty"><strong>No specific gateway detected.</strong><br>Try the cart or checkout page, then reopen the extension.<br><br><strong>Generic signals:</strong> ${escapeHtml((data.genericSignals||[]).join(', ')||'None')}</div>`;
    return;
  }
  resultsEl.innerHTML=data.results.map(item=>{
    const groups=Object.keys(item.evidenceGroups||{}).filter(k=>(item.evidenceGroups[k]||[]).length);
    const verdictBadge=item.verdict==='Possible mention only'?`<span class="badge warn">${escapeHtml(item.verdict)}</span>`:`<span class="badge source">${escapeHtml(item.verdict)}</span>`;
    return `<div class="gateway"><h3>${escapeHtml(item.name)}</h3><div class="badges"><span class="badge ${confidenceClass(item.confidence)}">${escapeHtml(item.confidence)} confidence</span><span class="badge score">score ${escapeHtml(item.score)}</span>${verdictBadge}</div><div class="reason">${escapeHtml((item.reasons||[])[0]||'')}</div>${groups.map(group=>`<div class="group-block"><div class="group-title">${escapeHtml(group)} evidence</div><ul>${(item.evidenceGroups[group]||[]).map(ex=>`<li><code>${escapeHtml(ex)}</code></li>`).join('')}</ul></div>`).join('')}</div>`;
  }).join('');
}
async function runScan(label){
  try{
    const tabs=await chrome.tabs.query({active:true,currentWindow:true}); const tab=tabs&&tabs[0];
    if(!tab || !tab.id){ setStatus('No active tab found.','error'); return null; }
    const response=await chrome.scripting.executeScript({ target:{tabId:tab.id}, files:['content.js']});
    const data=response && response[0] && response[0].result ? response[0].result : null;
    if(!data){ setStatus('No data returned from page scan.','warning'); resultsEl.innerHTML=`<div class="empty">Try refreshing the page and reopening the extension.</div>`; return null; }
    setStatus(data.results&&data.results.length?`Detected ${data.results.length} likely payment gateway(s).`:'No specific gateway detected.', data.results&&data.results.length?'success':'warning');
    render(data,label); return data;
  }catch(err){
    setStatus('Scan failed.','error');
    resultsEl.innerHTML=`<div class="empty">${escapeHtml(err&&err.message?err.message:String(err))}<br><br>Try a normal http/https page, then reopen the extension.</div>`;
    return null;
  }
}
async function autoScanSequence(){
  setStatus('Scanning current page...','scanning'); resultsEl.innerHTML=''; metaEl.innerHTML='';
  await runScan('initial scan');
  setStatus('Running second scan for late-loading resources...','scanning');
  setTimeout(async()=>{ await runScan('second scan'); }, 1600);
  setTimeout(async()=>{ setStatus('Running third scan for deeper checkout clues...','scanning'); await runScan('third scan'); }, 4200);
}
document.addEventListener('DOMContentLoaded', autoScanSequence);
