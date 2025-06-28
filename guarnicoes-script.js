// guarnicoes-script.js

document.addEventListener('DOMContentLoaded', () => {
    const tituloGuarnicoes = document.getElementById('guarnicoes-data');
    if (tituloGuarnicoes && typeof DATA_GUARNA !== 'undefined') {
        tituloGuarnicoes.textContent = `DATA ${DATA_GUARNA}`;
    } else if (tituloGuarnicoes) {
        tituloGuarnicoes.textContent = `DATA INDEFINIDA`;
    }

    const cia1QuartelsDiv = document.getElementById('cia1-quartels');
    const cia2QuartelsDiv = document.getElementById('cia2-quartels');

    // Função para criar o HTML de uma viatura e sua guarnição
    function createViaturaHtml(viatura) {
        let militaresHtml = '';
        if (viatura.guarnicao && viatura.guarnicao.length > 0) {
            militaresHtml = '<div class="militar-info mt-2">';
            viatura.guarnicao.forEach(militar => {
                militaresHtml += `
                    <p class="militar-item">
                        <i class="${getMilitarIcon(militar.funcao)} text-cbmrs-light-blue bombero-icon"></i>
                        <span class="font-semibold">${militar.funcao}:</span> ${militar.nomeGuerra}
                    </p>
                `;
            });
            militaresHtml += '</div>';
        }

        // Determina o HTML do ícone da viatura
        // A função getViaturaIcon agora pode retornar tanto uma classe Font Awesome quanto um HTML de imagem
        let viaturaIconHtml;
        const iconResult = getViaturaIcon(viatura.tipo);
        if (iconResult.startsWith('<img')) { // Se for um HTML de imagem
            viaturaIconHtml = iconResult;
        } else { // Se for uma classe Font Awesome
            viaturaIconHtml = `<i class="${iconResult} text-bombeiros-yellow text-2xl viatura-icon"></i>`;
        }

        return `
            <div class="viatura-info mb-3">
                ${viaturaIconHtml}
                <div class="flex flex-col">
                    <span class="font-bold text-lg text-bombeiros-yellow">${viatura.tipo} ${viatura.prefixo}</span>
                    <span class="text-gray-300 text-sm">Turno: ${viatura.turno}</span>
                </div>
            </div>
            ${militaresHtml}
        `;
    }

    // Função para criar o HTML de um quartel
    function createQuartelHtml(nomeQuartel, quartelData) {
        let viaturasHtml = '';
        if (quartelData.viaturas && quartelData.viaturas.length > 0) {
            quartelData.viaturas.forEach(viatura => {
                viaturasHtml += createViaturaHtml(viatura);
            });
        } else {
            viaturasHtml = '<p class="text-gray-400 text-center">Nenhuma viatura escalada para este quartel.</p>';
        }

        return `
            <div class="quartel-card ${quartelData.colorClass || 'bg-gray-700'}">
                <h3 class="quartel-title">${nomeQuartel}</h3>
                ${viaturasHtml}
            </div>
        `;
    }

    // Carregar e renderizar as guarnições
    function loadGuarnicoes() {
        // Limpa os containers antes de renderizar
        if (cia1QuartelsDiv) cia1QuartelsDiv.innerHTML = '';
        if (cia2QuartelsDiv) cia2QuartelsDiv.innerHTML = '';

        // Certifica-se de que GUARNICOES existe e é um objeto
        if (typeof GUARNICOES === 'object' && GUARNICOES !== null) {
            // 1ª CIA
            if (GUARNICOES['1ª CIA']) {
                for (const quartel in GUARNICOES['1ª CIA']) {
                    if (GUARNICOES['1ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['1ª CIA'][quartel];
                        cia1QuartelsDiv.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // 2ª CIA
            if (GUARNICOES['2ª CIA']) {
                for (const quartel in GUARNICOES['2ª CIA']) {
                    if (GUARNICOES['2ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['2ª CIA'][quartel];
                        cia2QuartelsDiv.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // Se houver quartéis não classificados em 1ª ou 2ª CIA, adicione uma seção para eles (opcional)
            if (GUARNICOES['NAO CLASSIFICADO'] && Object.keys(GUARNICOES['NAO CLASSIFICADO']).length > 0) {
                let naoClassificadoHtml = `
                    <div class="companhia-section bg-gray-700 p-6 rounded-lg shadow-xl lg:col-span-2">
                        <h2 class="text-2xl font-bold text-center text-gray-300 mb-6">OUTROS QUARTÉIS / SETORES</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                `;
                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['NAO CLASSIFICADO'][quartel];
                        naoClassificadoHtml += createQuartelHtml(quartel, quartelData);
                    }
                }
                naoClassificadoHtml += `</div></div>`;
                const mainContainer = document.querySelector('main .container > div'); // Pega o grid principal
                if (mainContainer) {
                    mainContainer.innerHTML += naoClassificadoHtml;
                }
            }

        } else {
            console.error("Variável GUARNICOES não encontrada ou não é um objeto válido.");
            if (cia1QuartelsDiv) cia1QuartelsDiv.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js no console do navegador.</p>';
            if (cia2QuartelsDiv) cia2QuartelsDiv.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js no console do navegador.</p>';
        }
    }

    loadGuarnicoes();
});
