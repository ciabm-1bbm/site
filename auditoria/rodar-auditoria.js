/* =====================================================================
   AUDITORIA PRÉVIA — execução automática semanal
   Lê os documentos do Drive da CIA + a guarnição coletada do E-193,
   roda o motor e gera: relatório HTML, CSV e resumo por pelotão.
   ===================================================================== */
const fs = require('fs');
const XLSX = require('xlsx');
const { auditar, fmtBRL } = require('./motor.js');

const BRIDGE = process.env.DRIVE_BRIDGE_URL;   // Apps Script Web App (mesmo padrão do scraper)
const TOKEN  = process.env.DRIVE_BRIDGE_TOKEN;
const COTA   = +(process.env.COTA_HE || 0);

/* Pastas/arquivos esperados no Drive, por tipo. O Apps Script devolve
   [{name, b64}] para cada consulta.                                    */
const BUSCAS = {
  e193   : null,                                   // vem do coletor (JSON)
  escala : 'ESCALA ÚNICA',
  mapas  : 'MAPA',
  trocas : 'TROCAS',
  indisp : 'INDISP',
  ferias : 'FÉRIAS',
  afast  : 'AFASTAMENTOS',
  mestre : 'EFETIVO'
};

async function doDrive(termo){
  const u = `${BRIDGE}?token=${encodeURIComponent(TOKEN)}&q=${encodeURIComponent(termo)}`;
  const r = await fetch(u);
  if(!r.ok) throw new Error(`Drive bridge ${r.status}`);
  const j = await r.json();
  return (j.files||[]).map(f => ({
    name: f.name,
    wb: XLSX.read(Buffer.from(f.b64,'base64'), { cellDates:true })
  }));
}

/* E-193 coletado vira uma planilha em memória, com as mesmas colunas do expresso */
function e193ParaWb(){
  const regs = JSON.parse(fs.readFileSync('dados/e193.json','utf8'));
  const ws = XLSX.utils.json_to_sheet(regs);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'E193');
  return [{ name:'e193-coletado', wb }];
}

(async () => {
  const FILES = { e193: e193ParaWb() };
  for(const [k,termo] of Object.entries(BUSCAS)){
    if(!termo) continue;
    try{ FILES[k] = await doDrive(termo); console.log(`${k}: ${FILES[k].length} arquivo(s)`); }
    catch(e){ console.error(`${k}: falha — ${e.message}`); FILES[k] = []; }
  }

  const r = auditar(FILES, m => console.log(' ›', m));
  const sev = s => r.AP.filter(a => a.sev === s);
  const totHe = r.HE.reduce((s,h)=>s+h.custo,0), totH = r.HE.reduce((s,h)=>s+h.h,0);

  /* --- resumo por pelotão (para e-mail individual do sargenteante) --- */
  const porPel = {};
  r.AP.forEach(a => { (porPel[a.pel] = porPel[a.pel] || []).push(a); });

  fs.mkdirSync('saida', { recursive:true });
  fs.writeFileSync('saida/apontamentos.json', JSON.stringify({
    mes:r.MES, ano:r.ANO, ateDia:r.ultDia,
    graves:sev('R').length, leves:sev('A').length, justificados:sev('B').length,
    heHoras:totH, heCusto:totHe, cota:COTA,
    apontamentos:r.AP, he:r.HE, carga:r.CH
  }, null, 1));

  const esc = v => '"'+String(v).replace(/"/g,'""')+'"';
  fs.writeFileSync('saida/apontamentos.csv', '\ufeff'+
    ['Severidade;Pelotão;Militar;Verificação;Apontamento;Orientação',
     ...r.AP.map(a=>[{R:'GRAVE',A:'LEVE',B:'JUSTIFICADO'}[a.sev],a.pel,a.mil,a.ver,a.txt,a.orient].map(esc).join(';'))
    ].join('\n'));

  /* --- relatório HTML (mesmo padrão visual da ferramenta) --- */
  const cor = { R:'#E5484D', A:'#FFB224', B:'#5B9BFF' };
  const rows = r.AP.sort((a,b)=>({R:0,A:1,B:2}[a.sev]-{R:0,A:1,B:2}[b.sev]))
    .map((a,i)=>`<tr style="background:${i%2?'#0d1730':'transparent'}">
      <td><span style="color:${cor[a.sev]};font-weight:600">${{R:'GRAVE',A:'LEVE',B:'JUSTIFICADO'}[a.sev]}</span></td>
      <td><b>${a.pel}</b></td><td><b>${a.mil}</b></td><td>${a.ver}</td><td>${a.txt}</td><td style="color:#93A3C4">${a.orient}</td></tr>`).join('');
  fs.writeFileSync('saida/relatorio.html',
`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Auditoria Prévia ${String(r.MES).padStart(2,'0')}/${r.ANO} — 1º BBM</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Barlow&display=swap" rel="stylesheet">
<style>body{background:#070E1D;color:#E9EDF6;font-family:Barlow,sans-serif;margin:0;padding:28px}
h1{font-family:Oswald;letter-spacing:.05em;text-transform:uppercase;border-bottom:2px solid #C9A227;padding-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:14px}th{font-family:Oswald;color:#C9A227;text-align:left;
border-bottom:2px solid #8C7420;padding:8px;text-transform:uppercase;font-size:12px;letter-spacing:.1em}
td{padding:8px;border-bottom:1px solid #101E3C;vertical-align:top}
.k{display:inline-block;border:1px solid #22345E;border-radius:8px;padding:10px 16px;margin:0 10px 10px 0}
.k b{font-family:Oswald;font-size:26px;display:block}</style></head><body>
<h1>Auditoria Prévia — ${String(r.MES).padStart(2,'0')}/${r.ANO} · até ${String(r.ultDia).padStart(2,'0')}</h1>
<div>
 <span class="k" style="border-color:#5b2226"><b style="color:#E5484D">${sev('R').length}</b>Graves</span>
 <span class="k" style="border-color:#5b4416"><b style="color:#FFB224">${sev('A').length}</b>Leves</span>
 <span class="k" style="border-color:#274a7c"><b style="color:#5B9BFF">${sev('B').length}</b>Justificados</span>
 <span class="k"><b style="color:#E8C34A">${totH}h</b>HE · ${fmtBRL(totHe)}${COTA?` (${(totHe/COTA*100).toFixed(1)}% da cota)`:''}</span>
</div>
<table><thead><tr><th>Sev.</th><th>Pelotão</th><th>Militar</th><th>Verificação</th><th>Apontamento</th><th>Orientação</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="color:#5E6E92;font-size:12px;margin-top:26px">© 2026 — Sistema de Auditoria desenvolvido por Sd Medeiros · 1º BBM ·
Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p></body></html>`);

  console.log(`\nGRAVES ${sev('R').length} · LEVES ${sev('A').length} · JUSTIFICADOS ${sev('B').length}`);
  console.log(`HE ${totH}h = ${fmtBRL(totHe)}${COTA?` · ${(totHe/COTA*100).toFixed(1)}% da cota`:''}`);
  Object.entries(porPel).filter(([p])=>p!=='—').sort().forEach(([p,l])=>{
    const g=l.filter(a=>a.sev==='R').length;
    console.log(`  ${p.padEnd(16)} ${String(g).padStart(2)} grave(s) · ${l.length} apontamento(s)`);
  });
  // falha o job se houver grave — opcional, útil para notificação
  if(process.env.FALHAR_SE_GRAVE === '1' && sev('R').length) process.exitCode = 1;
})();
