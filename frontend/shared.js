export const USER_API_BASE = 'http://localhost:4000';
export const SESSION_API_BASE = 'http://localhost:4002';
export function $(id){ return document.getElementById(id); }
export function logTo(el, msg){ if(!el) return; const t=new Date().toLocaleTimeString(); el.textContent = `[${t}] ${typeof msg==='string'?msg:JSON.stringify(msg,null,2)}\n` + el.textContent; }
export function setJwt(token){ if(token) localStorage.setItem('sb_jwt', token); else localStorage.removeItem('sb_jwt'); }
export function getJwt(){ return localStorage.getItem('sb_jwt') || ''; }
export function setUserLabel(el, s){ if(el) el.textContent = s || '—'; }
export async function api(base, path, opts={}){
  const headers = Object.assign({}, opts.headers||{}); const body = opts.body;
  const jwt = getJwt(); if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method: opts.method || (body?'POST':'GET'), headers, body: body && !(body instanceof FormData) ? JSON.stringify(body) : body });
  const text = await res.text(); try { return { status: res.status, json: JSON.parse(text) }; } catch(e){ return { status: res.status, text }; }
}
export function escapeHtml(s){ return (s+'').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\\':'&#39;'}[c])); }
