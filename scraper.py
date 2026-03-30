# scraper.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
import json
import time

URL = "https://e193.cbm.rs.gov.br/"
USER = "2822130"
PASS = "E193@Gus"
URL_PONTE = "https://script.google.com/macros/s/AKfycbyJtHsY61b2wj8ZATEAZGoYeNx4-3G2GqDCds1RA8nF8JBHR2FVXRuEEzoq9MmyMONF/exec"

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
driver = webdriver.Chrome(options=options)

try:
    driver.get(URL)
    wait = WebDriverWait(driver, 20)

    # Login
    usuario = wait.until(EC.presence_of_element_located((By.NAME, "usuario")))
    usuario.send_keys(USER)
    senha = driver.find_element(By.NAME, "senha")
    senha.send_keys(PASS)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # Ir para a escala
    driver.get(URL + "cons_guarnicao.php")

    # Filtrar pela cidade 325
    cidade = wait.until(EC.presence_of_element_located((By.ID, "id_cidade")))
    cidade.send_keys("325")
    driver.find_element(By.CSS_SELECTOR, "input[value='Filtrar']").click()

    # Aguardar a tabela carregar
    tabela = wait.until(EC.presence_of_element_located((By.ID, "lista_escala")))

    # Extrair dados (similar ao Tampermonkey)
    dados = []
    linhas = tabela.find_elements(By.TAG_NAME, "tr")
    obm = "GERAL"
    vtr = "IND"

    for tr in linhas:
        classes = tr.get_attribute("class") or ""
        if "dtrg-level-1" in classes:
            obm = tr.text.strip()
            continue
        if "dtrg-level-2" in classes:
            vtr = tr.text.split('(')[0].strip()
            continue
        if "odd" in classes or "even" in classes:
            cells = tr.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 7:
                nome = cells[1].text.strip()
                func = cells[2].text.strip()
                horaIni = cells[4].text.strip()
                horaFim = cells[6].text.strip()
                horario = f"{horaIni} {horaFim}".strip()
                if nome and nome != "ND":
                    dados.append({
                        "obm": obm,
                        "vtr": vtr,
                        "nome": nome,
                        "func": func,
                        "horario": horario,
                        "timestamp_extracao": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                    })

    # Enviar para o Google Apps Script
    if dados:
        response = requests.post(URL_PONTE, json=dados)
        print("Enviado:", response.status_code)
    else:
        print("Nenhum dado extraído.")
finally:
    driver.quit()
