/* =====================================================================
   COLETA E-193 — guarnição ordinária do mês inteiro
   1º BBM / CBMRS — alimenta o Sistema de Auditoria Prévia

   A tela "Consultar Guarnição Ordinária de Bombeiros" aceita Data Inicial
   e Data Final: uma única consulta cobre o mês todo. O resultado é obtido
   pelo botão Excel da própria tela — o mesmo arquivo que era exportado à
   mão — evitando a paginação de 100 em 100 registros.

   NENHUMA CREDENCIAL NESTE ARQUIVO — tudo vem de variáveis de ambiente.
   ===================================================================== */
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const E193_URL  = (process.env.E193_URL || 'https://e193.cbm.rs.gov.br/').replace(/\/?$/, '/');
const E193_USER = process.env.E193_USER;
const E193_PASS = process.env.E193_PASS;
const CIDADE    = process.env.E193_CIDADE || '325';        // PORTO ALEGRE
const OBMS      = (process.env.OBMS || '').split(',').map(s => s.trim()).filter(Boolean);

/* ------------------------------------------------------------ período */
function periodo() {
  const hoje = new Date();
  const mes = process.env.AUDIT_MES ? +process.env.AUDIT_MES : hoje.getMonth() + 1;
  const ano = process.env.AUDIT_ANO ? +process.env.AUDIT_ANO : hoje.getFullYear();
  const ini = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  const emCurso = (mes === hoje.getMonth() + 1 && ano === hoje.getFullYear());
  const fim = process.env.AUDIT_DATE ? new Date(process.env.AUDIT_DATE + 'T12:00:00')
            : (emCurso ? hoje : ultimo);
  return { ini, fim, mes, ano };
}
const dd  = n => String(n).padStart(2, '0');
const br  = d => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
const iso = d => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;

/* -------------------------------------------------------------- login */
async function login(page) {
  await page.goto(E193_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[name="usuario"]', { timeout: 25000 });
  await page.fill('[name="usuario"]', E193_USER);
  await page.fill('[name="senha"]', E193_PASS);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  if (await page.locator('[name="senha"]').count())
    throw new Error('Login recusado pelo E-193 — confira E193_USER / E193_PASS');
}

/* --------------------------------------------------- consulta do mês */
async function consultar(page, ini, fim) {
  await page.goto(`${E193_URL}cons_guarnicao.php`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // cidade sede (campo com busca; o valor 325 corresponde a PORTO ALEGRE)
  try {
    const cid = await page.$('#id_cidade');
    if (cid) {
      const tag = await cid.evaluate(e => e.tagName.toLowerCase());
      if (tag === 'select') await page.selectOption('#id_cidade', CIDADE).catch(() => {});
      else { await cid.fill(''); await cid.type(CIDADE, { delay: 60 }); }
    }
  } catch (e) { console.warn('Aviso: não foi possível ajustar a cidade — seguindo com o padrão.'); }

  // datas: a tela tem dois campos type=date (inicial e final)
  const datas = await page.$$('input[type="date"]');
  if (datas.length >= 2) {
    await datas[0].fill(iso(ini));
    await datas[1].fill(iso(fim));
  } else {
    // formato alternativo (texto dd/mm/aaaa)
    const alt = await page.$$('input[name*="data" i], input[id*="data" i]');
    if (alt.length >= 2) { await alt[0].fill(br(ini)); await alt[1].fill(br(fim)); }
    else throw new Error('Campos de Data Inicial/Final não encontrados na tela de guarnição');
  }

  await page.click('button:has-text("Filtrar"), input[value="Filtrar"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('table tbody tr', { timeout: 40000 }).catch(() => {});

  // amplia a paginação para trazer tudo em memória (quando o processamento é local)
  await page.evaluate(() => {
    const $ = window.jQuery || window.$;
    if (!$ || !$.fn || !$.fn.DataTable) return;
    try {
      const dt = $.fn.dataTable.tables({ visible: true, api: true });
      const st = dt.settings()[0];
      if (st && !(st.oFeatures && st.oFeatures.bServerSide)) dt.page.len(-1).draw(false);
    } catch (e) {}
  }).catch(() => {});
  await page.waitForTimeout(2500);

  const info = await page.locator('text=/Mostrando de .* registros/').first()
                          .textContent().catch(() => '');
  if (info) console.log('  ' + info.replace(/\s+/g, ' ').trim());
  return info;
}

/* ------------------- caminho 1: API do DataTables (todas as linhas) ----
   A tabela é um DataTables com 14 colunas — algumas ocultas na tela, como
   "Obm Escalado" e "Viatura". Lendo pela API pegamos tudo de uma vez,
   sem paginação e sem depender de download.                              */
async function lerViaDataTables(page) {
  const r = await page.evaluate(() => {
    const $ = window.jQuery || window.$;
    if (!$ || !$.fn || !$.fn.DataTable) return { erro: 'DataTables não disponível na página' };
    const tabelas = $.fn.dataTable.tables({ visible: true, api: true });
    if (!tabelas || !tabelas.context || !tabelas.context.length)
      return { erro: 'Nenhuma tabela DataTables inicializada' };
    const dt = tabelas;
    const st = dt.settings()[0];
    const serverSide = !!(st.oFeatures && st.oFeatures.bServerSide);

    // títulos das colunas (inclui as ocultas)
    const titulos = st.aoColumns.map(c =>
      String((c.sTitle || '').replace(/<[^>]*>/g, '')).replace(/[▲▼\s]+/g, ' ').trim());

    // dados de todas as linhas que passaram no filtro
    const linhas = dt.rows({ search: 'applied' }).data().toArray().map(d => {
      if (Array.isArray(d)) return d.map(v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim());
      return titulos.map((t, i) => {
        const chave = st.aoColumns[i] && st.aoColumns[i].mData;
        const v = (chave != null && d[chave] != null) ? d[chave] : d[i];
        return String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
      });
    });
    return { titulos, linhas, serverSide, total: dt.page.info().recordsDisplay };
  });

  if (r.erro) { console.warn('  ' + r.erro); return null; }
  console.log(`  DataTables: ${r.linhas.length} linha(s) em memória de ${r.total} no filtro` +
              (r.serverSide ? ' (processamento no servidor)' : ''));
  if (r.serverSide && r.linhas.length < r.total) {
    console.warn('  A tabela carrega por página no servidor — usando outro caminho.');
    return null;
  }
  if (!r.linhas.length) return null;

  const idx = {}; r.titulos.forEach((t, i) => { if (t && idx[t] == null) idx[t] = i; });
  const pega = (L, nome) => (idx[nome] != null ? L[idx[nome]] : '');
  const out = [];
  for (const L of r.linhas) {
    const id = +String(pega(L, 'Id/CPF')).replace(/\D/g, '');
    if (!id) continue;
    out.push({
      'Id/CPF'      : id,
      'N. Guerra'   : pega(L, 'N. Guerra'),
      'Função'      : String(pega(L, 'Função')).replace(/\s+/g, ' ').trim(),
      'Int.'        : +String(pega(L, 'Int.')).replace(/\D/g, '') || 0,
      'Início'      : String(pega(L, 'Início')).replace(/\s+/g, ' ').trim(),
      'Fim'         : String(pega(L, 'Fim')).replace(/\s+/g, ' ').trim(),
      'Obm Escalado': pega(L, 'Obm Escalado'),
      'Viatura'     : pega(L, 'Viatura')
    });
  }
  return out.length ? out : null;
}

/* ------------------------------------- caminho 2: botão Excel da tela */
async function baixarExcel(page) {
  const botao = page.locator('button:has-text("Excel"), a:has-text("Excel"), .buttons-excel').first();
  if (!(await botao.count())) return null;
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    botao.click()
  ]);
  const destino = path.join('dados', 'e193_export.xlsx');
  fs.mkdirSync('dados', { recursive: true });
  await download.saveAs(destino);
  const wb = XLSX.read(fs.readFileSync(destino), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // localiza a linha de cabeçalho (a exportação costuma trazer título antes)
  const hi = linhas.findIndex(r => r && r.some(c => String(c || '').trim() === 'N. Guerra'));
  if (hi < 0) return null;
  const H = linhas[hi].map(c => String(c || '').trim());
  const col = n => H.indexOf(n);
  const out = [];
  for (const r of linhas.slice(hi + 1)) {
    if (!r || r[col('Id/CPF')] == null) continue;
    const reg = {};
    ['Id/CPF','N. Guerra','Função','Int.','Início','Fim','Obm Escalado','Viatura']
      .forEach(k => { const i = col(k); reg[k] = i >= 0 ? r[i] : ''; });
    if (reg['Início'] instanceof Date) reg['Início'] = fmtDataHora(reg['Início']);
    if (reg['Fim']    instanceof Date) reg['Fim']    = fmtDataHora(reg['Fim']);
    reg['Id/CPF'] = +String(reg['Id/CPF']).replace(/\D/g, '') || 0;
    reg['Int.']   = +String(reg['Int.']).replace(/\D/g, '') || 0;
    out.push(reg);
  }
  return out.length ? out : null;
}
const fmtDataHora = d => `${br(d)} ${dd(d.getHours())}:${dd(d.getMinutes())}`;

/* ------------------- caminho 2: ler a tabela inteira (sem paginação) */
async function lerTabela(page) {
  // amplia a paginação ao máximo, se houver seletor de quantidade
  try {
    const sel = page.locator('select[name*="length" i]').first();
    if (await sel.count()) {
      const vals = await sel.locator('option').evaluateAll(os => os.map(o => o.value));
      const maior = vals.map(Number).filter(n => !isNaN(n)).sort((a, b) => b - a)[0];
      if (maior) { await sel.selectOption(String(maior)); await page.waitForLoadState('networkidle'); }
    }
  } catch (e) { /* segue */ }

  const registros = [];
  let pagina = 1;
  while (true) {
    const linhas = await page.$$eval('table tbody tr', trs => {
      const out = []; let obm = '', vtr = '';
      for (const tr of trs) {
        const cls = tr.className || '';
        const txt = tr.innerText.trim();
        if (cls.includes('dtrg-level-1') || (tr.querySelectorAll('td').length === 1 && /\//.test(txt))) {
          if (/\(/.test(txt)) vtr = txt.split('(')[0].trim(); else obm = txt;
          continue;
        }
        if (cls.includes('dtrg-level-2')) { vtr = txt.split('(')[0].trim(); continue; }
        const td = [...tr.querySelectorAll('td')].map(t => t.innerText.trim());
        if (td.length < 6) continue;
        if (!/^\d{5,9}$/.test(td[0])) continue;              // 1ª coluna = Id/CPF
        out.push({ obm, vtr, td });
      }
      return out;
    });

    linhas.forEach(L => {
      const [id, guerra, func, int, ini, fim] = L.td;
      registros.push({
        'Id/CPF': +id, 'N. Guerra': guerra, 'Função': func.replace(/\s+/g, ' '),
        'Int.': +String(int).replace(/\D/g, '') || 0,
        'Início': ini.replace(/\s+/g, ' '), 'Fim': fim.replace(/\s+/g, ' '),
        'Obm Escalado': L.obm, 'Viatura': L.vtr
      });
    });
    console.log(`  página ${pagina}: ${linhas.length} registro(s) · acumulado ${registros.length}`);

    const prox = page.locator('a.paginate_button.next:not(.disabled), li.next:not(.disabled) a').first();
    if (!(await prox.count())) break;
    const cls = await prox.evaluate(e => e.className + ' ' + (e.parentElement ? e.parentElement.className : ''));
    if (/disabled/.test(cls)) break;
    await prox.click();
    await page.waitForTimeout(900);
    pagina++;
    if (pagina > 80) { console.warn('  limite de páginas atingido'); break; }
  }
  return registros;
}

/* ---------------------------------------------------------------- run */
(async () => {
  if (!E193_USER || !E193_PASS) { console.error('Defina E193_USER e E193_PASS.'); process.exit(1); }
  const { ini, fim, mes, ano } = periodo();
  console.log(`Consultando guarnição de ${br(ini)} a ${br(fim)}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();

  let registros = [];
  try {
    await login(page);
    console.log('Login efetuado.');
    await consultar(page, ini, fim);

    console.log('Lendo os dados pela API do DataTables…');
    registros = await lerViaDataTables(page).catch(e => {
      console.warn('  falhou: ' + e.message); return null;
    }) || [];

    if (!registros.length) {
      console.log('Tentando exportar pelo botão Excel…');
      registros = await baixarExcel(page).catch(e => {
        console.warn('  exportação falhou: ' + e.message); return null;
      }) || [];
    }
    if (!registros.length) {
      console.log('Lendo a tabela página a página…');
      registros = await lerTabela(page);
    }
  } catch (e) {
    console.error('ERRO: ' + e.message);
    await browser.close();
    process.exit(1);
  }
  await browser.close();

  if (!registros.length) {
    console.error('Nenhum registro obtido. Verifique se o período tem lançamentos e se a ' +
                  'tela de guarnição está acessível para este usuário.');
    process.exit(1);
  }

  const filtrados = OBMS.length
    ? registros.filter(r => OBMS.some(o => String(r['Obm Escalado']).toUpperCase().includes(o.toUpperCase())))
    : registros;

  // dedupe: a mesma jornada aparece repetida quando há mais de uma viatura
  const vis = new Set(), ded = [];
  for (const r of filtrados.sort((a, b) => b['Int.'] - a['Int.'])) {
    const k = (r['Id/CPF'] || r['N. Guerra']) + '|' + r['Início'];
    if (vis.has(k)) continue; vis.add(k); ded.push(r);
  }

  fs.mkdirSync('dados', { recursive: true });
  fs.writeFileSync('dados/e193.json', JSON.stringify(ded, null, 1));
  console.log(`\nColetados ${registros.length} registro(s) · ${filtrados.length} nas OBMs auditadas · ` +
              `${ded.length} jornadas após remover repetições`);

  const semId = ded.filter(r => !r['Id/CPF']).length;
  if (semId) console.warn(`Atenção: ${semId} registro(s) sem Id Func.`);

  /* Envia ao sistema de auditoria, que grava na base do Drive. */
  const APP = process.env.APP_URL, TOKEN = process.env.APP_TOKEN;
  if (APP && TOKEN) {
    try {
      const r = await fetch(APP, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, mes, ano, ate: br(fim), registros: ded })
      });
      const j = await r.json().catch(() => ({}));
      console.log(j.ok ? `Enviado ao sistema: ${j.gravados} jornadas na aba ${j.aba}`
                       : `Falha no envio: ${j.erro || r.status}`);
      if (!j.ok) process.exitCode = 1;
    } catch (e) { console.error('Falha ao enviar ao sistema:', e.message); process.exitCode = 1; }
  } else {
    console.log('APP_URL/APP_TOKEN não definidos — envio ao sistema não realizado.');
  }
})();
