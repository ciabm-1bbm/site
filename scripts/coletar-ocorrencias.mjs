/**
 * coletar-ocorrencias.mjs
 *
 * Lê o relatório E193 › Relatórios › Mapa › Calor BBM, filtrado no 1º BBM,
 * do dia 1 do mês corrente até hoje, e grava dados/PAINEL_MES_ATUAL.csv.
 *
 * Este é o dado FECHADO: natureza confirmada pela guarnição depois do
 * atendimento. Não confundir com o /aodc/oc.php, que traz o que está em
 * aberto agora, ainda com a informação que veio pelo telefone.
 *
 * Uso:
 *   E193_USUARIO=<id funcional>  E193_SENHA=<senha>  node coletar-ocorrencias.mjs
 *
 * Em caso de falha, grava diagnostico/ com print e HTML da tela onde parou.
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://e193.cbm.rs.gov.br";
const SAIDA = "dados/PAINEL_MES_ATUAL.csv";
const DIAG = "diagnostico";
const BBM = "1";
/* A credencial do E193 já existe num Secret deste repositório, criado para o
   coletor da escala. Em vez de exigir um nome fixo, o script aceita qualquer
   um dos nomes abaixo e usa o primeiro que vier preenchido — assim o mesmo
   Secret serve para os dois coletores, sem senha duplicada.
   Se o seu nome não estiver na lista, é só acrescentar aqui. */
const NOMES_USUARIO = ["E193_USUARIO", "E193_USER", "E193_LOGIN", "E193_ID",
                       "ID_FUNCIONAL", "USUARIO_E193", "USUARIO", "LOGIN_E193"];
const NOMES_SENHA   = ["E193_SENHA", "E193_PASSWORD", "E193_PASS", "SENHA_E193",
                       "SENHA", "PASSWORD_E193"];

function daAmbiente(nomes) {
  for (const n of nomes) {
    const v = (process.env[n] || "").trim();
    if (v) return { nome: n, valor: v };
  }
  return null;
}

const usuario = daAmbiente(NOMES_USUARIO);
const senha = daAmbiente(NOMES_SENHA);

if (!usuario || !senha) {
  console.error("Não achei a credencial no ambiente.");
  console.error("Nomes procurados para o usuário:", NOMES_USUARIO.join(", "));
  console.error("Nomes procurados para a senha  :", NOMES_SENHA.join(", "));
  // Só os nomes das variáveis, nunca os valores.
  const presentes = Object.keys(process.env)
    .filter(k => /E193|CBM|SENHA|USUARIO|LOGIN|PASS/i.test(k));
  console.error("Variáveis parecidas que chegaram:", presentes.join(", ") || "(nenhuma)");
  process.exit(1);
}

const USUARIO = usuario.valor;
const SENHA = senha.valor;
console.log(`Credencial: usuário de ${usuario.nome}, senha de ${senha.nome}.`);

const doisDig = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;
const hoje = new Date();
const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ locale: "pt-BR" });
const pagina = await contexto.newPage();

// Erro de JS da própria página costuma explicar falha que parece de seletor
pagina.on("pageerror", e => console.log("  [erro na página]", e.message));

/** Print e HTML da tela onde parou, para a próxima tentativa não ser às cegas. */
async function diagnosticar(etapa) {
  try {
    await fs.mkdir(DIAG, { recursive: true });
    await pagina.screenshot({ path: `${DIAG}/${etapa}.png`, fullPage: true });
    await fs.writeFile(`${DIAG}/${etapa}.html`, await pagina.content(), "utf8");
    console.log(`\n--- diagnóstico em ${etapa} ---`);
    console.log("URL   :", pagina.url());
    console.log("Título:", await pagina.title());
    const texto = (await pagina.evaluate(() => document.body?.innerText || ""))
      .replace(/\s+/g, " ").trim().slice(0, 500);
    console.log("Texto :", texto);
  } catch (e) {
    console.log("Não foi possível gerar o diagnóstico:", e.message);
  }
}

try {
  /* ── 1. Login ────────────────────────────────────────────────────────
     Sem adivinhar nome de campo: acha o input de senha, sobe até o
     formulário dele e pega o primeiro campo de texto visível como Id
     Funcional. Funciona mesmo que o E193 renomeie os campos. */
  await pagina.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  const campos = await pagina.evaluate(() => {
    const senha = document.querySelector('input[type="password"]');
    if (!senha) return null;
    const form = senha.closest("form") || document;
    const texto = [...form.querySelectorAll("input")].find(i =>
      i !== senha && !["hidden", "submit", "button", "checkbox"].includes(i.type) &&
      i.offsetParent !== null);
    if (!texto) return { usuario: null };
    texto.setAttribute("data-coletor", "sim");
    senha.setAttribute("data-coletor-senha", "sim");
    return {
      usuario: { name: texto.name || "(sem name)", id: texto.id || "(sem id)", type: texto.type },
      senha: { name: senha.name || "(sem name)", id: senha.id || "(sem id)" }
    };
  });

  if (!campos || !campos.usuario) {
    await diagnosticar("01-login-sem-formulario");
    throw new Error("não encontrei o formulário de login na página inicial");
  }
  console.log("Campos do login:", JSON.stringify(campos));

  await pagina.fill('input[data-coletor="sim"]', USUARIO);
  await pagina.fill('input[data-coletor-senha="sim"]', SENHA);

  // Prefere clicar no botão a apertar Enter: alguns formulários só disparam
  // a validação pelo onclick, e o Enter não faz nada.
  const botao = pagina.locator(
    'form button[type="submit"], form input[type="submit"], ' +
    'form button:has-text("Entrar"), form input[value="Entrar"]').first();
  if (await botao.count()) await botao.click();
  else await pagina.press('input[data-coletor-senha="sim"]', "Enter");

  // Ou aparece o menu (deu certo), ou continua na tela de login (deu errado).
  await pagina.waitForTimeout(6000);
  if (!(await pagina.locator("#main_navbar").count())) {
    await diagnosticar("02-login-recusado");
    throw new Error("o login não passou — veja o diagnóstico acima e o print no artefato");
  }
  console.log("Autenticado.");

  // O mural de avisos abre por cima e atrapalha os cliques seguintes
  await pagina.evaluate(() => {
    document.querySelectorAll("#popup, .msg_bpopup, .bModal, .b-modal").forEach(p => p.remove());
  });

  /* ── 2. Abrir o Mapa de Calor por BBM ────────────────────────────── */
  await pagina.evaluate(() =>
    loadModulo("rel", "81", "relatorios/mapa_calor/mapa_calor_bbm.php"));
  try {
    await pagina.waitForSelector("#frm_param #dt_inicial", { timeout: 30000 });
  } catch (e) {
    await diagnosticar("03-relatorio-nao-abriu");
    throw new Error("o Mapa de Calor não abriu — pode ser falta de permissão no perfil");
  }

  /* ── 3. Preencher o filtro ───────────────────────────────────────── */
  await pagina.fill("#frm_param #dt_inicial", iso(primeiroDoMes));
  await pagina.fill("#frm_param #dt_final", iso(hoje));

  // O seletor de BBM é um dropdown do Semantic UI: o input real fica
  // escondido e só é preenchido pelo componente, então é ele que precisa
  // ser avisado da escolha.
  await pagina.evaluate(bbm => {
    const $sel = window.jQuery(".ui.dropdown.nr_batalhao");
    if ($sel.dropdown) $sel.dropdown("set exactly", [bbm]);
    else document.querySelector("#nr_batalhao").value = bbm;
  }, BBM);

  const marcado = await pagina.evaluate(() =>
    [...document.querySelectorAll(".nr_batalhao a.ui.label")].map(a => a.textContent.trim()));
  console.log("Batalhão no filtro:", marcado.join(", ") || "(nenhum)");
  if (!marcado.length) {
    await diagnosticar("04-filtro-vazio");
    throw new Error("o filtro de BBM ficou vazio");
  }

  /* ── 4. Consultar e esperar a tabela ─────────────────────────────── */
  await pagina.evaluate(() => ConsultarRel(3));
  try {
    await pagina.waitForFunction(() => {
      const $ = window.jQuery;
      if (!$ || !$.fn.dataTable || !$("#oc_table").length) return false;
      if (!$.fn.dataTable.isDataTable("#oc_table")) return false;
      return $("#oc_table").DataTable().rows().count() > 0;
    }, { timeout: 180000 });
  } catch (e) {
    await diagnosticar("05-tabela-vazia");
    throw new Error("a consulta não devolveu tabela dentro do tempo");
  }

  /* ── 5. Ler todas as linhas ──────────────────────────────────────── */
  const linhas = await pagina.evaluate(() => {
    const dt = window.jQuery("#oc_table").DataTable();
    const limpar = html => {
      const d = document.createElement("div");
      d.innerHTML = html ?? "";
      return (d.textContent || "").replace(/\s+/g, " ").trim();
    };
    return dt.rows().data().toArray()
      .map(l => (Array.isArray(l) ? l : Object.values(l)).map(limpar))
      .map(c => c.slice(0, 6));   // a 7ª coluna é o botão "Detalhar"
  });

  const info = (await pagina.textContent("#oc_table_info").catch(() => "")) || "";
  console.log(`Tabela: ${linhas.length} linhas. Rodapé do E193: ${info.trim()}`);

  // Nunca substituir um arquivo bom por um vazio.
  if (!linhas.length) throw new Error("zero linhas — arquivo anterior mantido");

  /* ── 6. Gravar o CSV ─────────────────────────────────────────────── */
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
