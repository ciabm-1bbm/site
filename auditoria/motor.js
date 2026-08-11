/* Motor de Auditoria Prévia — 1º BBM/CBMRS
   Gerado a partir de auditoria-previa.html (mesma lógica validada da ferramenta web).
   Uso: const {auditar}=require('./motor'); const r=auditar(FILES);
   FILES = {e193:[{name,wb}], escala:[...], mapas:[...], trocas:[...], indisp:[...], ferias:[...], afast:[...], mestre:[...]}
   onde wb = XLSX.read(buffer,{cellDates:true})                                                     */
const XLSX=require('xlsx');

/* ================= util ================= */
const N=s=>String(s??'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[ºª°\.\-\/]/g,' ')
  .replace(/\d{1,2}\s*[HX]?\s*(X|AS|ÀS)\s*\d{1,2}\s*H?/g,' ')
  .replace(/\b(AL|SD|CB|SGT|TEN|CAP|MAJ|CEL|ST|PME|QPBM|QTBM|BM|ME)\b/g,' ')
  .replace(/\b[123]\b/g,' ').replace(/\s+/g,' ').trim();
const NC=s=>String(s??'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const matchNome=(a,b)=>{
  if(!a||!b)return false;
  if(a===b)return true;
  const A=a.split(' '),B=b.split(' ');
  const sub=(X,Y)=>X.every(x=>Y.includes(x));
  if(sub(A,B)||sub(B,A))return true;
  if(A.length===1&&B.length===1&&A[0].length>=5&&B[0].length>=5&&
     (A[0].startsWith(B[0])||B[0].startsWith(A[0])))return true;
  return false;
};
const rint=x=>{const f=Math.floor(x);return (x-f)<=0.5?f:f+1;};  // HE inteira: <=0,5 baixo, >0,5 cima
const fmtBRL=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtD=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
const dkey=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const excelDate=v=>{
  if(v instanceof Date)return v;
  if(typeof v==='number'&&v>20000&&v<80000){const d=XLSX.SSF.parse_date_code(v);return new Date(d.y,d.m-1,d.d);}
  if(typeof v==='string'){const m=v.match(/(\d{2})\/(\d{2})\/(\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);}
  return null;
};




/* ================= parsers ================= */
function sheetRows(ws){return XLSX.utils.sheet_to_json(ws,{header:1,defval:null});}

function parseE193(wb){
  const out=[];
  for(const nm of wb.SheetNames){
    const rows=sheetRows(wb.Sheets[nm]);
    const hi=rows.findIndex(r=>r&&r.some(c=>String(c??'').trim()==='N. Guerra'));
    if(hi<0)continue;
    const H=rows[hi].map(c=>String(c??'').trim());
    const col=n=>H.indexOf(n);
    const cId=col('Id/CPF'),cGu=col('N. Guerra'),cFn=col('Função'),cInt=col('Int.'),
          cIni=col('Início'),cFim=col('Fim'),cObm=col('Obm Escalado'),cVt=col('Viatura');
    for(const r of rows.slice(hi+1)){
      if(!r||r[cId]==null)continue;
      const pd=v=>{const m=String(v??'').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if(m)return new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]);
        return v instanceof Date? v : null;};
      const ini=pd(r[cIni]), fim=pd(r[cFim]);
      if(!ini)continue;
      out.push({id:+r[cId], guerra:String(r[cGu]??'').trim(), gN:N(r[cGu]),
        func:String(r[cFn]??'').trim(), int:+r[cInt]||0, ini, fim,
        dia:new Date(ini.getFullYear(),ini.getMonth(),ini.getDate()),
        obm:String(r[cObm]??'').trim(), viat:String(r[cVt]??'').trim()});
    }
  }
  // dedupe id+início (mesma jornada em várias viaturas)
  const seen=new Set(), ded=[];
  out.sort((a,b)=>b.int-a.int);
  for(const r of out){const k=r.id+'|'+r.ini.getTime();if(seen.has(k))continue;seen.add(k);ded.push(r);}
  ded.sort((a,b)=>a.ini-b.ini);
  return ded;
}

const ROLE=lbl=>{const u=N(lbl);
  if(u.startsWith('CMT'))return 'CMT';
  if(u.startsWith('COV'))return 'COV';
  if(u.startsWith('COMBATENTE'))return 'COMB';
  return null;};
const isPlaceholder=raw=>{const u=N(raw);
  return !u||u.startsWith('ALUNO')||u.startsWith('REFORCO')||/^[. ]+$/.test(u);};

function parseEscala(wb){
  const exp=[];  // {aba, dia, papel, nomeRaw, nomeN}
  for(const aba of wb.SheetNames){
    const rows=sheetRows(wb.Sheets[aba]);
    let i=0;
    while(i<rows.length){
      const first=String(rows[i]?.[0]??'').trim().toUpperCase();
      if(first==='DIA/MÊS'||first==='DIA/MES'){
        const dates=(rows[i].slice(1)||[]).map(excelDate);
        let j=i+1;
        while(j<rows.length){
          const lbl=String(rows[j]?.[0]??'').trim();
          const U=lbl.toUpperCase();
          if(U.startsWith('OBSERVA')||U==='DIA/MÊS'||U==='DIA/MES')break;
          const papel=ROLE(lbl);
          if(papel){
            dates.forEach((d,k)=>{
              if(!d)return;
              const cell=rows[j][k+1];
              if(cell==null||!String(cell).trim())return;
              const raw=String(cell).trim();
              if(isPlaceholder(raw))return;
              exp.push({aba, dia:d, papel, nomeRaw:raw, nomeN:N(raw)});
            });
          }
          j++;
        }
        i=j;
      } else i++;
    }
  }
  return exp;
}

function pelotaoDoMapa(wb,fname){
  // tenta pela linha do cabeçalho do Anexo B; senão, pelo nome do arquivo
  const abaB=wb.SheetNames.find(n=>/anexo\s*b/i.test(n));
  if(abaB){
    const rows=sheetRows(wb.Sheets[abaB]).slice(0,8);
    for(const r of rows)for(const c of (r||[]))
      if(typeof c==='string'&&/PEL/i.test(c)){
        const m=c.match(/PelBM\s*[–\-\/]?\s*([A-ZÀ-Úa-zà-ú' ]+)$/)||c.match(/CiaBM.*?[–\-]\s*(.+)$/);
        if(m)return m[1].trim();
      }
  }
  return fname.replace(/^.*MAPA[_ ]?/i,'').replace(/[_\-]?AGOSTO.*$/i,'')
    .replace(/[_]+/g,' ').replace(/\.xlsx?$/i,'').replace(/[\s\-–]+$/,'').trim()||fname;
}
function parseMapa(wb,fname){
  const pel=pelotaoDoMapa(wb,fname);
  const ef={};
  const abaE=wb.SheetNames.find(n=>/^EFETIVO/i.test(n));
  if(abaE)for(const r of sheetRows(wb.Sheets[abaE]).slice(1)){
    if(r&&typeof r[1]==='number'&&r[2])
      ef[Math.round(r[1])]={nome:String(r[2]).trim(),posto:String(r[3]??'').trim(),
        valorHE:typeof r[7]==='number'?r[7]:0};
  }
  const esc={};
  const abaB=wb.SheetNames.find(n=>/anexo\s*b/i.test(n));
  if(abaB){
    const rows=sheetRows(wb.Sheets[abaB]);
    const hdrs=rows.map((r,i)=>String(r?.[4]??'')==='Escala'?i:-1).filter(i=>i>=0);
    const start=hdrs[0], end=hdrs.length>1?hdrs[1]:rows.length;
    if(start!=null&&start>=0){
      const dates=(rows[start].slice(5)||[]).map(excelDate);
      let cur=null;
      for(const r of rows.slice(start+1,end)){
        const tipo=String(r?.[4]??'');
        if(tipo==='ORD/EFE'&&typeof r[3]==='number'){cur=Math.round(r[3]);esc[cur]=esc[cur]||{ORD:{},COM:{},HE:{}};}
        const key={'ORD/EFE':'ORD','EXP/COM':'COM','HE':'HE'}[tipo];
        if(key&&cur!=null)dates.forEach((d,k)=>{
          if(!d)return;let v=r[5+k];if(v==null)return;
          if(typeof v==='number'&&Number.isFinite(v))v=String(Math.round(v)===v?Math.round(v):v);
          v=String(v).trim();if(v)esc[cur][key][dkey(d)]={cod:v,d};
        });
      }
    }
  }
  const horas={};
  const abaH=wb.SheetNames.find(n=>/^HORAS/i.test(n));
  if(abaH)for(const r of sheetRows(wb.Sheets[abaH]).slice(3)){
    if(r&&typeof r[3]==='number')
      horas[Math.round(r[3])]={trab:typeof r[5]==='number'?r[5]:0, he:typeof r[7]==='number'?r[7]:0};
  }
  return {pel, ef, esc, horas};
}
const isStartCod=c=>/^[1-4]+$/.test(c)&&/[234]/.test(c);
const horasCod=c=>{if(/^[1-4]+$/.test(c))return 6*c.length;
  const m=c.match(/^CM\s*(\d+)$/i);return m?+m[1]:0;};
const SIGLAS_ABATE=['FER','F','FC','FE','LTS','LTIP','LP','LU','LG','LC','LM','LN','RSP','LAA','CED','DIS','EDT','TRA','LSI'];
const abateHoras=c=>{  // FC6 -> 6h (banco de horas); FER/LTS sem número -> 5,7h/dia
  const m=String(c).toUpperCase().match(/^([A-Z]+)\s*(\d+(?:[.,]\d+)?)?$/);
  if(!m||!SIGLAS_ABATE.includes(m[1]))return 0;
  return m[2]?parseFloat(m[2].replace(',','.')):5.7;
};
const abateCod=c=>abateHoras(c)>0;
const fcHoras=c=>{const m=String(c).toUpperCase().match(/^FC\s*(\d+(?:[.,]\d+)?)?$/);
  return m?(m[1]?parseFloat(m[1].replace(',','.')):5.7):0;};

function parseTrocas(wbs, mes, ano){
  const out=[], avisos=[];
  for(const {wb,name} of wbs){
    // escolhe aba do mês/ano; senão a que mais tiver datas do mês; senão 1ª com DATA
    const cand=[];
    for(const nm of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[nm]);
      const hi=rows.findIndex(r=>r&&String(r[0]??'').trim().toUpperCase()==='DATA');
      if(hi<0)continue;
      let nMes=0,nOut=0;const linhas=[];
      const H=rows[hi].map(c=>String(c??'').toUpperCase());
      let prev=1,tir=3;
      if(/SUBSTITUTO/.test(H[1]||'')&&!/ESCALADO|SUBSTITU[IÍ]DO/.test(H[1]||'')){prev=3;tir=1;}
      for(const r of rows.slice(hi+1)){
        const d=excelDate(r?.[0]); if(!d)continue;
        const p=r[prev],t=r[tir]; if(!p||!t)continue;
        if(d.getFullYear()===ano&&d.getMonth()+1===mes){nMes++;
          linhas.push({dia:d, previsto:String(p).trim(), tirou:String(t).trim(),
            prevN:N(p), tirouN:N(t), turno:String(r[2]??'').trim(), fonte:name});
        } else nOut++;
      }
      cand.push({nm,nMes,nOut,linhas});
    }
    if(!cand.length){avisos.push(name+': tabela de trocas (coluna DATA) não encontrada');continue;}
    cand.sort((a,b)=>b.nMes-a.nMes);
    const best=cand[0];
    if(best.nMes===0){
      const soOutro=cand.find(c=>c.nOut>0&&/AGO|AGOSTO/i.test(c.nm));
      avisos.push(name+(soOutro?': aba de agosto contém apenas datas de outro mês — corrigir lançamento'
                               :': nenhuma troca registrada no mês auditado'));
    } else out.push(...best.linhas);
  }
  return {trocas:out, avisos};
}

function parseIndisp(wbs){
  const out=[];
  for(const {wb,name} of wbs){
    const aba=wb.SheetNames.find(n=>/^INDISP/i.test(n));
    if(!aba)continue;
    const rows=sheetRows(wb.Sheets[aba]);
    const pelM=String(rows[0]?.[0]??'').match(/PELOT[AÃ]O\s+([A-ZÀ-Ú' ]+)/i);
    const pel=pelM?pelM[1].trim():name;
    const hi=rows.findIndex(r=>r&&String(r[0]??'').toUpperCase().includes('GRAD'));
    for(const r of rows.slice(hi+1)){
      if(!r||(!r[1]&&!r[2]))continue;
      const id=typeof r[1]==='number'?Math.round(r[1]):null;
      const nome=String(r[2]??'').trim(); if(!nome)continue;
      const motivo=String(r[3]??'').trim(), dias=+r[4]||0, obs=String(r[6]??'').trim();
      // extrai período "DE dd/mm/aaaa A dd/mm/aaaa" ou "A CONTAR DE dd/mm"
      let ini=null,fim=null;
      let m=obs.match(/DE\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+A\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
      if(m){ini=new Date(+m[3],+m[2]-1,+m[1]);fim=new Date(+m[6],+m[5]-1,+m[4]);}
      else{m=obs.match(/CONTAR DE\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
        if(m){ini=new Date(+m[3],+m[2]-1,+m[1]);fim=dias?new Date(ini.getTime()+(dias-1)*864e5):null;}}
      out.push({pel, id, nome, nomeN:N(nome), motivo, dias, obs, ini, fim, fonte:name});
    }
  }
  return out;
}

function parseFerias(wbs){
  // Confirmação de Férias: seções com header ORD|PelBM/Seção|ID FUNC|...|Nome|Período(ini)|(fim)|Dias|SITUAÇÃO
  const out=[];
  for(const {wb,name} of wbs){
    for(const nm of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[nm]);
      const temSit=rows.some(r=>r&&r.some(c=>/SITUA[ÇC][AÃ]O/i.test(String(c??''))));
      if(!temSit)continue;
      for(const r of rows){
        if(!r)continue;
        const id=typeof r[2]==='number'?Math.round(r[2]):null;
        const nome=String(r[5]??'').trim();
        const ini=excelDate(r[6]), fim=excelDate(r[7]);
        if(!id||!nome||!ini)continue;
        out.push({pel:String(r[1]??'').trim(), id, nome, nomeN:N(nome),
          ini, fim:fim||ini, dias:+r[8]||0,
          confirmado:/^CONFIRMO/i.test(String(r[9]??'').trim()),
          situacao:String(r[9]??'').trim(), fonte:name});
      }
    }
  }
  return out;
}
/* Controle de Afastamentos HBM: header PELOTÃO|DATA ATEND.|GRAD.|PACIENTE|ID FUNC|PARECER|LICENÇA|DIAS|Início|Fim */
const AFAST_TOTAL=['LTS','LTIP','LNJ','LG','LM','LP','LSI','LGT'];   // afastam de fato
const AFAST_REST=['DEFIM','LFC'];                                     // apto c/ restrição — serve normalmente
function siglaAfast(txt){
  const u=String(txt??'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const m=u.match(/^([A-Z]{2,5})\b/); if(!m)return null;
  const s=m[1];
  if(AFAST_TOTAL.includes(s))return {sigla:s, tipo:'TOTAL'};
  if(AFAST_REST.includes(s))return {sigla:s, tipo:'REST'};
  if(/^APTO/.test(u))return {sigla:'APTO', tipo:'REST'};
  return null;
}
function parseAfast(wbs){
  const out=[], vis=new Set();
  for(const {wb,name} of wbs){
    for(const nm of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[nm]);
      const hi=rows.findIndex(r=>r&&r.some(c=>/PACIENTE/i.test(String(c??''))));
      if(hi<0)continue;
      const H=rows[hi].map(c=>String(c??'').toUpperCase().replace(/\s+/g,' ').trim());
      const idx=re=>H.findIndex(c=>re.test(c));
      const cPel=idx(/PELOT/), cGrad=idx(/GRAD/), cNome=idx(/PACIENTE/), cId=idx(/ID FUNC/),
            cPar=idx(/PARECER/), cLic=idx(/LICEN|AFASTEM/), cIni=idx(/^IN[IÍ]CIO/), cFim=idx(/^FIM$|^FINAL/),
            cAnx=idx(/ANEXO/);
      if(cNome<0||cLic<0)continue;
      for(const r of rows.slice(hi+1)){
        if(!r)continue;
        const nome=String(r[cNome]??'').trim(); if(!nome)continue;
        const sg=siglaAfast(r[cLic]); if(!sg)continue;
        const ini=cIni>=0?excelDate(r[cIni]):null, fim=cFim>=0?excelDate(r[cFim]):null;
        if(!ini)continue;
        const id=(cId>=0&&typeof r[cId]==='number')?Math.round(r[cId]):null;
        const k=(id||N(nome))+'|'+sg.sigla+'|'+dkey(ini)+'|'+(fim?dkey(fim):'');
        if(vis.has(k))continue; vis.add(k);
        out.push({pel:cPel>=0?String(r[cPel]??'').trim():'', id, nome, nomeN:N(nome),
          grad:cGrad>=0?String(r[cGrad]??'').trim():'', sigla:sg.sigla, tipo:sg.tipo,
          parecer:cPar>=0?String(r[cPar]??'').trim():'',
          ini, fim:fim&&fim>=ini?fim:ini, fimBruto:fim,
          invertido:!!(fim&&fim<ini),
          anexo:cAnx>=0?String(r[cAnx]??'').trim():'', fonte:name});
      }
    }
  }
  return out;
}
/* Controle/Extrato de Folgas Compensatórias — colunas: Militar | Id Func | Pelotão |
   Horas devidas | Mês de origem | Dias de FC | Parte nº                                */
function parseFC(wbs){
  const out=[], vis=new Set();
  for(const {wb,name} of wbs){
    for(const nm of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[nm]);
      const hi=rows.findIndex(r=>r&&r.some(c=>/PARTE/i.test(String(c??'')))
                                 &&r.some(c=>/ID\s*FUNC/i.test(String(c??''))));
      if(hi<0)continue;
      const H=rows[hi].map(c=>String(c??'').toUpperCase().replace(/\s+/g,' ').trim());
      const ix=re=>H.findIndex(c=>re.test(c));
      const cNome=ix(/MILITAR|NOME/), cId=ix(/ID\s*FUNC/), cPel=ix(/PELOT/),
            cHrs=ix(/HORAS/), cOrig=ix(/ORIGEM/), cDias=ix(/DIAS/), cParte=ix(/PARTE/);
      if(cId<0)continue;
      for(const r of rows.slice(hi+1)){
        if(!r)continue;
        const id=typeof r[cId]==='number'?Math.round(r[cId]):parseInt(String(r[cId]??'').replace(/\D/g,''),10);
        if(!id)continue;
        const parte=cParte>=0?String(r[cParte]??'').trim():'';
        const k=id+'|'+parte+'|'+nm;
        if(vis.has(k))continue; vis.add(k);
        out.push({id, nome:cNome>=0?String(r[cNome]??'').trim():'', nomeN:N(cNome>=0?r[cNome]:''),
          pel:cPel>=0?String(r[cPel]??'').trim():'',
          horas:cHrs>=0?(parseFloat(String(r[cHrs]??'').replace(/[^\d.,]/g,'').replace(',','.'))||0):0,
          origem:cOrig>=0?String(r[cOrig]??'').trim():'',
          dias:cDias>=0?String(r[cDias]??'').trim():'',
          parte, aba:nm, fonte:name});
      }
    }
  }
  return out;
}
function parseMestre(wb){
  const M={porId:{}, porNome:{}};
  for(const nm of wb.SheetNames){
    const rows=sheetRows(wb.Sheets[nm]);
    const hi=rows.findIndex(r=>r&&r.some(c=>/Id\.?\s*Func/i.test(String(c??''))));
    if(hi<0)continue;
    const H=rows[hi].map(c=>String(c??''));
    const ci=H.findIndex(c=>/Id\.?\s*Func/i.test(c)),
          cg=H.findIndex(c=>/Nome\s*Guerra/i.test(c)),
          cn=H.findIndex(c=>/Nome\s*Completo/i.test(c));
    for(const r of rows.slice(hi+1)){
      if(!r||r[ci]==null)continue;
      const rec={id:+r[ci], guerra:String(r[cg]??'').trim(), nome:String(r[cn]??'').trim()};
      M.porId[rec.id]=rec; M.porNome[NC(rec.nome)]=rec;
    }
  }
  return M;
}


/* ================= motor de auditoria ================= */
const SEV={R:'R',A:'A',B:'B'};   // vermelho, amarelo, azul
let AP=[], HE=[], CH=[], PELSTATS={}, CSVROWS=[], MAPA_ATE=0;

const PELCANON={};
function canonPel(p){
  if(!p||p==='—')return '—';
  let k=N(p).replace(/['`´]/g,'').replace(/\s+/g,' ').trim();
  // aliases comuns entre documentos
  if(/^PASSO\s*D/.test(k))k='PASSO DAREIA';
  if(/AEM|AUTO ESCADA|AT\b/.test(k)&&!/TERR/.test(k))k='AEM + AT';
  if(/^TERESOPOLIS/.test(k))k='TERESOPOLIS';
  if(/^BELEM/.test(k))k='BELEM NOVO';
  if(/^ACORIANOS/.test(k))k='ACORIANOS';
  const DISPLAY={'PASSO DAREIA':"Passo D'Areia",'AEM + AT':'AEM + AT','TERESOPOLIS':'Teresópolis',
    'BELEM NOVO':'Belém Novo','ACORIANOS':'Açorianos','ASSUNCAO':'Assunção','RESTINGA':'Restinga',
    'FLORESTA':'Floresta','PARTENON':'Partenon'};
  if(!PELCANON[k])PELCANON[k]=DISPLAY[k]||p.trim();
  return PELCANON[k];
}
function uidOf(s){let x=5381;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))>>>0;return x.toString(36);}
function push(sev, pel, mil, ver, txt, orient){
  pel=canonPel(pel);
  AP.push({sev, pel:pel||'—', mil:mil||'—', ver, txt, orient:orient||'',
    uid:uidOf((pel||'')+'|'+(mil||'')+'|'+ver+'|'+txt)});
  const p=PELSTATS[pel||'—']=PELSTATS[pel||'—']||{R:0,A:0,B:0,ok:0};
  p[sev]++;
}
function metaCarga(nDias){return {28:160,29:165,30:171,31:177}[nDias]||Math.round(nDias*5.7);}

function auditar(FILES,log=()=>{}){
  AP=[];HE=[];CH=[];PELSTATS={};
  const e193=parseE193(FILES.e193.find(a=>a.wb).wb);
  if(!e193.length){alert('Não foi possível ler o extrato do E-193.');return;}
  // mês auditado = mês predominante
  const cont={};e193.forEach(r=>{const k=r.dia.getFullYear()+'-'+(r.dia.getMonth()+1);cont[k]=(cont[k]||0)+1;});
  const [anoS,mesS]=Object.entries(cont).sort((a,b)=>b[1]-a[1])[0][0].split('-');
  const ANO=+anoS, MES=+mesS;
  const nDiasMes=new Date(ANO,MES,0).getDate();
  const diasCob=[...new Set(e193.filter(r=>r.dia.getMonth()+1===MES).map(r=>r.dia.getDate()))].sort((a,b)=>a-b);
  const ultDia=diasCob[diasCob.length-1]||nDiasMes;
  const janIni=new Date(ANO,MES-1,1), janFim=new Date(ANO,MES-1,ultDia);
  const inJ=d=>d>=janIni&&d<=janFim;
  log(`Mês auditado: ${String(MES).padStart(2,'0')}/${ANO} · extrato cobre dias ${diasCob[0]}–${ultDia} · ${e193.length} jornadas (dedup.)`);

  const e193M=e193.filter(r=>r.dia.getMonth()+1===MES&&r.dia.getFullYear()===ANO);
  const porId={}; e193M.forEach(r=>(porId[r.id]=porId[r.id]||[]).push(r));
  const guerraDeId={}; e193.forEach(r=>{guerraDeId[r.id]=guerraDeId[r.id]||r.guerra;});

  /* ---- trocas ---- */
  const twbs=(FILES.trocas||[]).filter(a=>a.wb);
  const {trocas,avisos:avT}=twbs.length?parseTrocas(twbs,MES,ANO):{trocas:[],avisos:[]};
  avT.forEach(a=>push(SEV.A,'—','—','Trocas',a,'Ajustar a planilha de trocas do pelotão'));
  const temTrocasGlobais=trocas.length>0;
  const buscaTroca=(dia,nomeN,comoPrevisto)=>{
    for(const t of trocas){
      if(dkey(t.dia)!==dkey(dia))continue;
      if(matchNome(nomeN,comoPrevisto?t.prevN:t.tirouN))return t;
    }
    return null;
  };

  /* ---- indisponibilidades / férias ---- */
  const iwbs=(FILES.indisp||[]).filter(a=>a.wb);
  const indisp=iwbs.length?parseIndisp(iwbs.map(a=>({wb:a.wb,name:a.name}))):[];
  const awbs=(FILES.afast||[]).filter(a=>a.wb);
  const afast=awbs.length?parseAfast(awbs.map(a=>({wb:a.wb,name:a.name}))):[];
  const afastJan=afast.filter(x=>x.ini<=janFim&&x.fim>=janIni);
  // afastamentos TOTAIS entram no pipeline de indisponibilidade (escalado durante afastamento = grave)
  for(const x of afastJan) if(x.tipo==='TOTAL')
    indisp.push({pel:x.pel, id:x.id, nome:x.nome, nomeN:x.nomeN,
      motivo:x.sigla+' (HBM)', dias:0, obs:`${fmtD(x.ini)} a ${fmtD(x.fim)}`,
      ini:x.ini, fim:x.fim, fonte:x.fonte});
  const AFID={}; afastJan.forEach(x=>{const k=x.id||x.nomeN;(AFID[k]=AFID[k]||[]).push(x);});
  // datas invertidas no controle do HBM — verificado no mês inteiro
  afast.filter(x=>x.invertido&&x.ini.getMonth()+1===MES&&x.ini.getFullYear()===ANO).forEach(x=>
    push(SEV.A,x.pel,x.nome,'Afastamento HBM',
      `${x.sigla} com período invertido no controle do HBM: início ${fmtD(x.ini)} e fim ${fmtD(x.fimBruto)}`,
      'Corrigir as datas no Controle de Afastamentos — período errado altera o abate de carga horária e pode ocultar dias de afastamento'));
  const cwbs=(FILES.fc||[]).filter(a=>a.wb);
  const fcCtrl=cwbs.length?parseFC(cwbs.map(a=>({wb:a.wb,name:a.name}))):[];
  const FCID={}; fcCtrl.forEach(x=>{(FCID[x.id]=FCID[x.id]||[]).push(x);});
  const fwbs=(FILES.ferias||[]).filter(a=>a.wb);
  const ferias=fwbs.length?parseFerias(fwbs.map(a=>({wb:a.wb,name:a.name}))):[];
  const FERID={}; ferias.forEach(f=>{(FERID[f.id]=FERID[f.id]||[]).push(f);});
  // férias CONFIRMADAS entram no pipeline de indisponibilidade (escalado em férias = grave)
  for(const f of ferias) if(f.confirmado)
    indisp.push({pel:f.pel, id:f.id, nome:f.nome, nomeN:f.nomeN,
      motivo:'FÉRIAS (confirmadas)', dias:f.dias,
      obs:`${fmtD(f.ini)} a ${fmtD(f.fim)}`, ini:f.ini, fim:f.fim, fonte:f.fonte});
  // NÃO CONFIRMO com período tocando a janela: pendência a regularizar antes do lançamento
  for(const f of ferias) if(!f.confirmado && f.ini<=janFim && f.fim>=janIni)
    push(SEV.A, f.pel, f.nome, 'Férias',
      `Férias de ${fmtD(f.ini)} a ${fmtD(f.fim)} com situação "${f.situacao||'NÃO CONFIRMO'}"`,
      'Regularizar a confirmação antes de lançar FER no mapa/sistema — sem confirmação, o abate de carga fica sem amparo');
  const indispDe=(id,gN,nomeCivilN)=>indisp.filter(x=>
    x.id?(id&&x.id===id):(matchNome(gN,x.nomeN)||matchNome(nomeCivilN||'',x.nomeN)));

  /* ---- mestre ---- */
  const mestre=(FILES.mestre||[]).find(a=>a.wb);
  const M=mestre?parseMestre(mestre.wb):null;

  /* ================= 1) Dobra de serviço (E-193) ================= */
  for(const [id,regs] of Object.entries(porId)){
    const rs=[...regs].sort((a,b)=>a.ini-b.ini);
    if(rs.some(r=>r.int>24))
      push(SEV.R,obmCurta(rs[0].obm),rs[0].guerra,'Dobra de serviço',
        `Jornada única acima de 24h registrada no E-193 (${rs.find(r=>r.int>24).int}h em ${fmtD(rs.find(r=>r.int>24).dia)})`,
        'Vedado pela IR 003 (máx. 24h): corrigir lançamento no E-193');
    let bIni=null,bFim=null,bH=0,bDias=[];
    const flush=()=>{ if(bH>24)
      push(SEV.R,obmCurta(rs[0].obm),rs[0].guerra,'Dobra de serviço',
        `Turnos emendados sem folga somando ${bH}h (${bDias.join(', ')})`,
        'Verificar descanso entre jornadas — dobra sem intervalo interfere na carga e no pagamento');
      bIni=bFim=null;bH=0;bDias=[];};
    for(const r of rs){
      const f=r.fim||new Date(r.ini.getTime()+r.int*36e5);
      if(bFim&&r.ini<=bFim){bH+=r.int;bFim=f>bFim?f:bFim;bDias.push(fmtD(r.dia));}
      else{flush();bIni=r.ini;bFim=f;bH=r.int;bDias=[fmtD(r.dia)];}
    }
    flush();
  }

  /* ================= 2) Escalado durante férias / indisponibilidade ================= */
  if(indisp.length){
    const vistos=new Set();
    for(const [id,regs] of Object.entries(porId)){
      const g=guerraDeId[id]||'';
      for(const x of indispDe(+id,N(g))){
        if(!x.ini)continue;
        const fim=x.fim||janFim;
        for(const r of regs){
          const k=id+'|'+dkey(r.dia)+'|'+(x.motivo||'');
          if(vistos.has(k))continue;
          if(r.dia>=x.ini&&r.dia<=fim){vistos.add(k);
            push(SEV.R,x.pel||obmCurta(r.obm),g||x.nome,'Escala × indisponibilidade',
              `Serviço no E-193 em ${fmtD(r.dia)} dentro do período de ${x.motivo||'afastamento'} (${x.obs||x.dias+' dias'})`,
              'Militar de '+(x.motivo||'afastamento').toLowerCase()+' não pode ser escalado — corrigir E-193 ou a relação de indisponibilidades');}
        }
      }
    }
  }
  if(!afast.length)push(SEV.A,'—','—','Afastamento HBM','Controle de Afastamentos do HBM não carregado — checagem de LTS/licenças médicas não executada','Anexar a planilha de afastamentos (FSR/Junta HBM)');
  if(!indisp.length)push(SEV.A,'—','—','Indisponibilidades','Nenhuma planilha mensal de indisponibilidades/férias carregada — checagem de "escalado em férias" não executada','Anexar as planilhas INDISP e a Confirmação de Férias');

  /* ================= 3) Mapas × E-193 ================= */
  let mapaAte=0;   // maior dia com lançamento no Anexo B (indica se o mapa cobre o mês todo)
  const mwbs=(FILES.mapas||[]).filter(a=>a.wb);
  const mapas=mwbs.map(a=>parseMapa(a.wb,a.name));
  const idsMapa=new Set();
  const cargaMeta=metaCarga(nDiasMes);
  for(const mp of mapas){
    const pel=canonPel(mp.pel);
    PELSTATS[pel]=PELSTATS[pel]||{R:0,A:0,B:0,ok:0};
    const temTrocasPel=trocas.some(t=>true); // trocas não separadas por pelotão no upload — validação global
    for(const [idS,info] of Object.entries(mp.ef)){
      const id=+idS; idsMapa.add(id);
      const e=mp.esc[id]||{ORD:{},COM:{},HE:{}};
      const guerra=guerraDeId[id]||info.nome;
      const gN=N(guerra), civN=N(info.nome);
      /* cadastro */
      if(M){
        if(!M.porId[id]){
          const alt=M.porNome[NC(info.nome)];
          if(alt)push(SEV.R,pel,info.nome,'Cadastro',`Id Func ${id} não confere — no Efetivo Geral este nome tem Id ${alt.id}`,'Corrigir Id Func no EFETIVO do mapa (afeta pagamento)');
          else push(SEV.A,pel,info.nome,'Cadastro',`Id ${id} não consta no Efetivo Geral`,'Confirmar cedência ou atualizar o Efetivo Geral');
        } else if(NC(M.porId[id].nome)!==NC(info.nome)&&!NC(M.porId[id].nome).includes(NC(info.nome))&&!NC(info.nome).includes(NC(M.porId[id].nome)))
          push(SEV.A,pel,info.nome,'Cadastro',`Nome difere do mestre: "${M.porId[id].nome}"`,'Padronizar grafia conforme o RHE');
      }
      /* dias e horas */
      Object.values(e.ORD).forEach(o=>{
        if(o.d.getMonth()+1===MES&&o.d.getFullYear()===ANO&&String(o.cod).trim()&&o.d.getDate()>mapaAte)
          mapaAte=o.d.getDate();
      });
      const ords=Object.values(e.ORD).filter(o=>inJ(o.d));
      const dmArr=ords.filter(o=>isStartCod(o.cod)).map(o=>o.d).sort((a,b)=>a-b);
      const dm=dmArr.map(d=>d.getDate());
      let hm=0;
      for(const d of dmArr){
        hm+=horasCod(e.ORD[dkey(d)].cod)+(e.COM[dkey(d)]?horasCod(e.COM[dkey(d)].cod):0);
        const nx=new Date(d.getTime()+864e5), kn=dkey(nx);
        if(e.ORD[kn]&&/^1+$/.test(e.ORD[kn].cod))
          hm+=horasCod(e.ORD[kn].cod)+(e.COM[kn]?horasCod(e.COM[kn].cod):0);
      }
      const regs=(porId[id]||[]).filter(r=>r.dia<=janFim);
      const de=[...new Set(regs.map(r=>r.dia.getDate()))].sort((a,b)=>a-b);
      const he193=regs.reduce((s,r)=>s+r.int,0);
      const seD=dm.join(','), seE=de.join(',');
      if(!dm.length&&!de.length&&hm===0&&he193===0){PELSTATS[pel].ok++;}
      else if(seD===seE){
        if(Math.abs(hm-he193)<=2)PELSTATS[pel].ok++;
        else push(SEV.R,pel,guerra,'Mapa × E-193',`Dias conferem (${seD||'—'}) mas horas divergem: mapa ${hm}h × E-193 ${he193}h`,'Conferir códigos de turno/CM no Anexo B — interfere na carga e na HE');
      } else {
        const faltaE=dm.filter(d=>!de.includes(d)), faltaM=de.filter(d=>!dm.includes(d));
        let doc=[],ndoc=[];
        for(const d of faltaE){const t=buscaTroca(new Date(ANO,MES-1,d),gN,true)||buscaTroca(new Date(ANO,MES-1,d),civN,true);(t?doc:ndoc).push({d,t});}
        for(const d of faltaM){const t=buscaTroca(new Date(ANO,MES-1,d),gN,false)||buscaTroca(new Date(ANO,MES-1,d),civN,false);(t?doc:ndoc).push({d,t});}
        if(doc.length&&!ndoc.length)
          push(SEV.B,pel,guerra,'Mapa × E-193',`Divergência de dias justificada por parte de troca: ${doc.map(x=>String(x.d).padStart(2,'0')+'/'+String(MES).padStart(2,'0')+' ('+x.t.tirou+' × '+x.t.previsto+')').join('; ')}`,'Atualizar o Anexo B conforme a parte — nenhuma pendência');
        else if(!dm.length&&de.length)
          push(SEV.R,pel,guerra,'Mapa × E-193',`Serviu pelo E-193 (dias ${seE}, ${he193}h) sem lançamento no mapa`,'Lançar códigos no Anexo B — militar trabalharia sem computar carga/HE');
        else if(dm.length&&!de.length)
          push(SEV.R,pel,guerra,'Mapa × E-193',`Lançado no mapa (dias ${seD}, ${hm}h) sem registro no E-193`,'Cadastrar no E-193 ou remover do mapa — pagamento sem comprovação');
        else if(temTrocasGlobais)
          push(SEV.R,pel,guerra,'Mapa × E-193',`Há divergência sem parte ou troca de serviço: Mapa dias ${seD.split(',').join(', ')} / E-193 dias ${seE.split(',').join(', ')}${doc.length?` (com parte: ${doc.map(x=>x.d).join(', ')})`:''}`,'Registrar a troca na planilha do pelotão e corrigir o mapa');
        else
          push(SEV.A,pel,guerra,'Mapa × E-193',`Há divergência (provável troca): Mapa dias ${seD.split(',').join(', ')} / E-193 dias ${seE.split(',').join(', ')}`,'Anexar a planilha de trocas do pelotão para validar');
      }
      const fcBanco=ords.reduce((s,o)=>s+fcHoras(o.cod),0);
      /* conformidade do registro no HBM (ata e período) */
      for(const x of (AFID[id]||AFID[N(info.nome)]||[])){
        const anx=String(x.anexo||'').toUpperCase();
        const temAta=/(^|[^A-Z])ATA([^A-Z]|$)/.test(anx.replace(/ATESTADO/g,' '));
        const temAtestado=/ATESTADO/.test(anx);
        if(!temAta&&temAtestado)
          push(SEV.A,pel,info.nome,'Afastamento HBM',
            `${x.sigla} de ${fmtD(x.ini)} a ${fmtD(x.fim)} com atestado anexado, mas sem ata de saúde do HBM`,
            'Atestado (mesmo de médico particular) precisa ser abonado no HBM e sair em ata: o ME comparece à visita médica OU o setor de pessoal envia e-mail ao HBM com o atestado anexo solicitando o lançamento no RHE');
        else if(!temAta)
          push(SEV.A,pel,info.nome,'Afastamento HBM',
            `${x.sigla} de ${fmtD(x.ini)} a ${fmtD(x.fim)} sem ata de saúde do HBM anexada no controle`,
            'Anexar a ata padrão do HBM ao controle — sem ata o afastamento não tem amparo para abater carga horária');
      }
      /* folga compensatória × Parte do pelotão */
      if(fcBanco>0){
        const partes=(FCID[id]||[]).filter(x=>x.parte);
        if(!fcCtrl.length)
          push(SEV.A,pel,info.nome,'Folga compensatória',
            `FC de ${fcBanco}h lançada no Anexo B — controle de Folgas Compensatórias não carregado`,
            'Anexar o controle/Extrato de FC para validar a Parte de referência');
        else if(!partes.length)
          push(SEV.R,pel,info.nome,'Folga compensatória',
            `FC de ${fcBanco}h lançada no Anexo B sem Parte de Folga Compensatória de referência`,
            'Toda FC exige Parte do pelotão comprovando a carga excedida e não paga no mês anterior — juntar a Parte ou retirar o lançamento');
        else {
          const dev=partes.reduce((s,x)=>s+(x.horas||0),0);
          const ref=partes.map(x=>'Parte '+x.parte+(x.origem?' ('+x.origem+')':'')).join('; ');
          if(dev&&Math.abs(dev-fcBanco)>0.6)
            push(SEV.A,pel,info.nome,'Folga compensatória',
              `FC lançada (${fcBanco}h) diverge das horas devidas na Parte (${dev}h) — ${ref}`,
              'Acertar o lançamento no Anexo B ou corrigir a Parte');
          else
            push(SEV.B,pel,info.nome,'Folga compensatória',
              `FC de ${fcBanco}h amparada por ${ref}`,
              'Lançamento regular — conferir se consta do Extrato mensal para publicação em BI');
        }
      }
      /* Parte de FC sem lançamento correspondente no mapa */
      if(fcCtrl.length&&fcBanco===0&&(FCID[id]||[]).length)
        push(SEV.A,pel,info.nome,'Folga compensatória',
          `Parte de Folga Compensatória registrada (${(FCID[id]||[]).map(x=>x.horas+'h'+(x.parte?' · Parte '+x.parte:'')).join('; ')}) sem sigla FC lançada no Anexo B`,
          'Lançar a FC nos dias devidos — sem o lançamento o militar não recebe a compensação');
      /* afastamento HBM × mapa (LTS abate 5,7h/dia) */
      for(const x of (AFID[id]||AFID[N(info.nome)]||[])){
        const ini=x.ini>janIni?x.ini:janIni, fim=x.fim<janFim?x.fim:janFim;
        const diasJan=Math.floor((fim-ini)/864e5)+1;
        if(diasJan<=0)continue;
        if(x.tipo==='REST'){
          push(SEV.A,pel,info.nome,'Afastamento HBM',
            `Restrição vigente (${x.sigla}) de ${fmtD(x.ini)} a ${fmtD(x.fim)} — ${x.parecer||'apto com restrição'}`,
            'Militar apto com restrição: serve normalmente e NÃO abate carga — conferir compatibilidade da função escalada');
          continue;
        }
        // conta dias com sigla de afastamento lançada no Anexo B dentro do período
        let comSigla=0;
        for(let d=new Date(ini);d<=fim;d=new Date(d.getTime()+864e5)){
          const o=e.ORD[dkey(d)];
          if(o&&abateHoras(o.cod)>0)comSigla++;
        }
        if(comSigla===0)
          push(SEV.R,pel,info.nome,'Afastamento HBM',
            `${x.sigla} de ${fmtD(x.ini)} a ${fmtD(x.fim)} (${diasJan} dia(s) na janela) sem lançamento da sigla no Anexo B`,
            `Lançar ${x.sigla} nos dias do período — cada dia abate 5,7h da carga; sem isso o militar fica devendo horas`);
        else if(comSigla<diasJan)
          push(SEV.A,pel,info.nome,'Afastamento HBM',
            `${x.sigla} de ${fmtD(x.ini)} a ${fmtD(x.fim)}: ${comSigla} de ${diasJan} dia(s) com sigla lançada no Anexo B`,
            `Completar o lançamento de ${x.sigla} nos dias restantes (5,7h/dia)`);
      }
      /* sigla de afastamento no mapa sem amparo no controle HBM */
      if(afast.length){
        const temAmparo=(AFID[id]||AFID[N(info.nome)]||[]);
        const diasSigla=ords.filter(o=>/^(LTS|LTIP)/i.test(o.cod));
        if(diasSigla.length&&!temAmparo.some(x=>x.tipo==='TOTAL'))
          push(SEV.R,pel,info.nome,'Afastamento HBM',
            `LTS lançada no Anexo B (${diasSigla.length} dia(s)) sem registro no Controle de Afastamentos do HBM`,
            'Atestado particular precisa ser abonado no HBM, sair em ata de saúde e ser lançado no RHE: o ME comparece à visita médica OU o setor de pessoal envia e-mail ao HBM com o atestado anexo solicitando o lançamento');
      }
      /* férias × mapa */
      const fers=FERID[id]||[];
      const abatesNoPeriodo=(f)=>ords.filter(o=>abateCod(o.cod)&&o.d>=f.ini&&o.d<=f.fim).length;
      for(const f of fers){
        if(!(f.ini<=janFim&&f.fim>=janIni))continue;
        const servNoPer=dmArr.some(d=>d>=f.ini&&d<=f.fim);
        if(f.confirmado&&servNoPer)
          push(SEV.R,pel,info.nome,'Férias × mapa',
            `Escalado no Anexo B dentro de férias confirmadas (${fmtD(f.ini)}–${fmtD(f.fim)})`,
            'Retirar da escala/mapa no período ou revisar as férias — interfere na carga e no direito ao descanso');
        if(f.confirmado&&!servNoPer&&abatesNoPeriodo(f)===0)
          push(SEV.A,pel,info.nome,'Férias × mapa',
            `Férias confirmadas (${fmtD(f.ini)}–${fmtD(f.fim)}) sem sigla de afastamento lançada no Anexo B na janela auditada`,
            'Lançar FER nos dias do período — cada dia abate 5,7h da carga');
        if(!f.confirmado&&abatesNoPeriodo(f)>0)
          push(SEV.R,pel,info.nome,'Férias × mapa',
            `Sigla de afastamento lançada no período ${fmtD(f.ini)}–${fmtD(f.fim)}, mas férias NÃO confirmadas`,
            'Abate de carga sem confirmação — confirmar as férias ou corrigir o Anexo B');
      }
      /* HE e custos */
      const heMes=mp.horas[id]?mp.horas[id].he:0;
      const heInt=rint(heMes);
      if(heInt>0)HE.push({pel:canonPel(pel), mil:info.nome, id, valor:info.valorHE, h:heInt, custo:heInt*info.valorHE});
      if(heInt>40)push(SEV.R,pel,info.nome,'Limite de HE',`${heInt}h de HE lançadas no mapa — acima do limite de 40h`,'Só admissível se todo o pelotão já cumpriu 40HE (IR 003, ressalva COV) — juntar justificativa');
      /* carga horária (prévia proporcional) */
      const ordJan=ords.reduce((s,o)=>s+horasCod(o.cod),0)
        +Object.values(e.COM).filter(o=>inJ(o.d)).reduce((s,o)=>s+horasCod(o.cod),0);
      const abates=ords.reduce((s,o)=>s+abateHoras(o.cod),0);
      const totalCarga=ordJan+abates;
      const metaParcial=cargaMeta*(ultDia/nDiasMes);
      let sit='ok';
      const deficit=metaParcial-totalCarga;
      const capacidadeRestante=(nDiasMes-ultDia)*8.5; // ritmo máx. plausível 24h/72h ≈ 6h/dia + margem
      if(totalCarga<metaParcial-24){sit=deficit>capacidadeRestante?'grave':'atencao';}
      CH.push({pel:canonPel(pel), mil:info.nome, ord:Math.round(ordJan), aba:Math.round(abates*10)/10,
        fc:Math.round(fcBanco*10)/10,
        tot:Math.round(totalCarga*10)/10, meta:cargaMeta, metaP:Math.round(metaParcial), sit});
      if(sit==='grave')push(SEV.R,pel,info.nome,'Carga horária',`Apenas ${Math.round(totalCarga)}h computadas até ${String(ultDia).padStart(2,'0')}/${String(MES).padStart(2,'0')} — matematicamente difícil fechar ${cargaMeta}h no mês`,'Escalar/ajustar antes do fechamento ou lançar sigla de afastamento devida');
    }
  }

  /* ================= 4) Escala × E-193 ================= */
  const ewb=(FILES.escala||[]).find(a=>a.wb);
  if(ewb){
    const exp=parseEscala(ewb.wb).filter(x=>inJ(x.dia));
    const ROLEOK={CMT:['COMANDANTE DE GUARNIÇÃO','COMANDANTE DE SOCORRO'],
      COV:['COV / OPERADOR / CONDUTOR'],
      COMB:['CHEFE DE LINHA DIREITA','CHEFE DE LINHA ESQUERDA','AUXILIAR DE LINHA DIREITA','AUXILIAR DE LINHA ESQUERDA']};
    const usados=new Set();
    // pré-checagem: abas com OBM correspondente no E-193 (evita falsas faltas em abas fora do escopo)
    const abasOk=new Set(), abasFora=new Set();
    for(const aba of new Set(exp.map(x=>x.aba))){
      const tok=N(aba).split(' ')[0];
      if(e193M.some(r=>N(r.obm).includes(tok)))abasOk.add(aba);else abasFora.add(aba);
    }
    for(const aba of abasFora)
      push(SEV.A,aba,'—','Escala × E-193','Aba sem OBM correspondente no extrato do E-193 — fora do escopo desta prévia','Conferir manualmente ou anexar extrato que cubra essa OBM');
    for(const x of exp){
      if(!abasOk.has(x.aba))continue;
      const pel=canonPel(x.aba);
      PELSTATS[pel]=PELSTATS[pel]||{R:0,A:0,B:0,ok:0};
      const pool=e193M.filter(r=>N(r.obm).includes(N(pel).split(' ')[0])&&dkey(r.dia)===dkey(x.dia));
      const okf=pool.filter(r=>ROLEOK[x.papel].includes(r.func));
      const hit=okf.find(r=>matchNome(x.nomeN,r.gN));
      if(hit){PELSTATS[pel].ok++;usados.add(hit.id+'|'+hit.ini.getTime());continue;}
      const hit2=pool.find(r=>matchNome(x.nomeN,r.gN));
      if(hit2){push(SEV.A,pel,x.nomeRaw,'Escala × E-193',`${fmtD(x.dia)} previsto como ${x.papel} — E-193 registra "${hit2.func}"`,'Alinhar função na escala ou no E-193');usados.add(hit2.id+'|'+hit2.ini.getTime());continue;}
      const t=buscaTroca(x.dia,x.nomeN,true);
      if(t)push(SEV.B,pel,x.nomeRaw,'Escala × E-193',`${fmtD(x.dia)}: substituído conforme parte (${t.tirou} tirou o serviço)`,'Atualizar a grade da escala — troca documentada');
      else if(temTrocasGlobais)push(SEV.R,pel,x.nomeRaw,'Escala × E-193',`${fmtD(x.dia)}: previsto na escala, sem registro no E-193 e sem parte de troca`,'Registrar a troca ou cadastrar o serviço no E-193');
      else push(SEV.A,pel,x.nomeRaw,'Escala × E-193',`${fmtD(x.dia)}: previsto na escala, sem registro no E-193 (trocas não anexadas)`,'Anexar planilha de trocas para validar');
    }
  }

  return {AP,HE,CH,PELSTATS,MES,ANO,ultDia,nDiasMes,mapaAte};
}
function obmCurta(o){const p=o.split('/');return p[p.length-1].trim();}

module.exports={auditar,rint,fmtBRL};
