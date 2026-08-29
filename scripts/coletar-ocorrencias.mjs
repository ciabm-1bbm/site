/**
 * coletar-ocorrencias.mjs
 *
 * Lê o relatório E193 › Relatórios › Mapa › Calor BBM, filtrado no 1º BBM,
 * do dia 1 do mês corrente até hoje, e grava dados/PAINEL_MES_ATUAL.csv.
 *
 * O painel do CIOSP já procura esse arquivo primeiro — nada muda lá.
 *
 * Uso:
 *   E193_USUARIO=... E193_SENHA=... node coletar-ocorrencias.mjs
 *
 * Por que raspar a tabela e não chamar o endpoint direto: a consulta é feita
 * pelo ConsultarRel(3), cujo endereço está no mapa_calor_bbm.js. Enquanto esse
 * arquivo não estiver em mãos, ler a tabela pronta é o caminho seguro — e o
 * DataTables guarda TODAS as linhas do lado do navegador, então dá para pegar
 * as 735 de uma vez, sem paginar.
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://e193.cbm.rs.gov.br";
const SAIDA = "dados/PAINEL_MES_ATUAL.csv";
const BBM = "1";            // valor do 1º BBM no seletor de batalhão
const USUARIO = process.env.E193_USUARIO;
const SENHA = process.env.E193_SENHA;

if (!USUARIO || !SENHA) {
  console.error("Faltam E193_USUARIO e E193_SENHA no ambiente.");
  process.exit(1);
}

const doisDig = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;

const hoje = new Date();
const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

/* ---------------------------------------------------------------- */

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ locale: "pt-BR" });
const pagina = await contexto.newPage();

try {
  // ── 1. Login ───────────────────────────────────────────────────────
  // ATENÇÃO: troque este bloco pelo do seu scraper que já funciona.
  // Os seletores abaixo são a suposição mais provável para o signin.js;
  // se os nomes dos campos forem outros, é aqui que muda.
  await pagina.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await pagina.fill('input[name="usuario"], input[name="login"], #usuario', USUARIO);
  await pagina.fill('input[type="password"]', SENHA);
  await pagina.press('input[type="password"]', "Enter");
  await pagina.waitForSelector("#main_navbar", { timeout: 30000 });
  console.log("Autenticado.");

  // ── 2. Abrir o Mapa de Calor por BBM ───────────────────────────────
  // O E193 carrega os módulos por JS, então a navegação é pelo mesmo
  // caminho que o menu usa, e não por URL direta.
  await pagina.evaluate(() =>
    loadModulo("rel", "81", "relatorios/mapa_calor/mapa_calor_bbm.php"));
  await pagina.waitForSelector("#frm_param #dt_inicial", { timeout: 30000 });

  // ── 3. Preencher o filtro ──────────────────────────────────────────
  await pagina.fill("#frm_param #dt_inicial", iso(primeiroDoMes));
  await pagina.fill("#frm_param #dt_final", iso(hoje));

  // O seletor de BBM é um dropdown do Semantic UI: o <input> real fica
  // escondido e só é preenchido pelo componente. Setar o valor por fora
  // não basta — o Semantic precisa ser avisado da escolha.
  await pagina.evaluate(bbm => {
    const $sel = window.jQuery(".ui.dropdown.nr_batalhao");
    if ($sel.dropdown) $sel.dropdown("set exactly", [bbm]);
    else document.querySelector("#nr_batalhao").value = bbm;
  }, BBM);

  const marcado = await pagina.evaluate(() =>
    [...document.querySelectorAll(".nr_batalhao a.ui.label")].map(a => a.textContent.trim()));
  console.log("Batalhão no filtro:", marcado.join(", ") || "(nenhum)");
  if (!marcado.length) throw new Error("o filtro de BBM ficou vazio — o dropdown não aceitou a seleção");

  // ── 4. Consultar e esperar a tabela ────────────────────────────────
  await pagina.evaluate(() => ConsultarRel(3));
  await pagina.waitForFunction(() => {
    const t = window.jQuery && window.jQuery.fn.dataTable
      && window.jQuery("#oc_table").length
      && window.jQuery("#oc_table").DataTable();
    return t && t.rows().count() > 0;
  }, { timeout: 180000 });   // relatório de mês inteiro demora

  // ── 5. Ler TODAS as linhas do DataTables ───────────────────────────
  // rows().data() devolve o conjunto completo, não só a página visível.
  const linhas = await pagina.evaluate(() => {
    const dt = window.jQuery("#oc_table").DataTable();
    const limpar = html => {
      const d = document.createElement("div");
      d.innerHTML = html ?? "";
      return (d.textContent || "").replace(/\s+/g, " ").trim();
    };
    return dt.rows().data().toArray()
      .map(l => (Array.isArray(l) ? l : Object.values(l)).map(limpar))
      // A última coluna é o botão "Detalhar" e não interessa
      .map(c => c.slice(0, 6));
  });

  const info = await pagina.textContent("#oc_table_info").catch(() => "");
  console.log(`Tabela: ${linhas.length} linhas lidas. Rodapé do E193: ${info.trim()}`);

  // ── 6. Guarda de segurança ─────────────────────────────────────────
  // Nunca substituir um arquivo bom por um vazio. Se a consulta voltar sem
  // nada — sessão expirada, filtro perdido, sistema fora do ar —, é melhor
  // manter o arquivo de ontem do que zerar o painel da sala de operações.
  if (!linhas.length) throw new Error("consulta retornou zero linhas — arquivo anterior mantido");

  // ── 7. Gravar o CSV ────────────────────────────────────────────────
  const cabecalho = ["Nº Oc.", "Data", "Bairro", "Local", "Emergência", "Viaturas"];
  const escapar = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = [cabecalho, ...linhas].map(l => l.map(escapar).join(",")).join("\n");

  await fs.mkdir(path.dirname(SAIDA), { recursive: true });
  await fs.writeFile(SAIDA, csv, "utf8");

  const ocs = new Set(linhas.map(l => l[0])).size;
  console.log(`Gravado ${SAIDA}: ${linhas.length} linhas, ${ocs} ocorrências distintas ` +
              `(${iso(primeiroDoMes)} a ${iso(hoje)}).`);
} finally {
  await navegador.close();
}
