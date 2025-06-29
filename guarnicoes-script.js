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

    // AVISO: As funções getViaturaIcon e getMilitarIcon devem vir do guarnicoes-data.js
    // Verifique se elas foram coladas corretamente lá pelo parser.

    // Função para criar o HTML de uma viatura e sua guarnição
    function createViaturaHtml(viatura) {
        let militaresHtml = '';
        if (viatura.guarnicao && viatura.guarnicao.length > 0) {
            militaresHtml = '<div class="militar-list">';
            viatura.guarnicao.forEach(militar => {
                militaresHtml += `
                    <p class="militar-item">
                        <i class="${getMilitarIcon(militar.funcao)}"></i>
                        <span class="font-semibold">${militar.funcao}:</span> ${militar.nomeGuerra}
                    </p>
                `;
            });
            militaresHtml += '</div>';
        }

        let viaturaIconHtml;
        const iconResult = getViaturaIcon(viatura.tipo);
        if (iconResult.startsWith('<img')) {
            viaturaIconHtml = iconResult;
        } else {
            viaturaIconHtml = `<i class="${iconResult} viatura-icon"></i>`; // Classe 'viatura-icon' agora está no CSS
        }

        // A estrutura para o turno agora está junto do prefixo
        return `
            <div class="viatura-block">
                <div class="viatura-main-info">
                    ${viaturaIconHtml}
                    <div class="viatura-details">
                        <span class="prefixo-turno">${viatura.tipo} ${viatura.prefixo}</span>
                        <span class="text-gray-300 text-sm">${viatura.turno}</span>
                    </div>
                </div>
                ${militaresHtml}
            </div>
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
            viaturasHtml = '<p class="text-gray-400 text-center text-sm py-4">Nenhuma viatura escalada para este quartel.</p>';
        }

        // Adiciona a estrutura de header para o clique e o content para o deslizamento
        return `
            <div class="quartel-card ${quartelData.colorClass || 'bg-gray-700'}">
                <div class="quartel-header">
                    <span>${nomeQuartel}</span>
                    <i class="fas fa-chevron-right quartel-toggle-icon"></i>
                </div>
                <div class="quartel-content">
                    ${viaturasHtml}
                </div>
            </div>
        `;
    }

    // Carregar e renderizar as guarnições
    function loadGuarnicoes() {
        if (cia1QuartelsDiv) cia1QuartelsDiv.innerHTML = '';
        if (cia2QuartelsDiv) cia2QuartelsDiv.innerHTML = '';

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

            // Se houver quartéis não classificados em 1ª ou 2ª CIA, adicione uma seção para eles
            if (GUARNICOES['NAO CLASSIFICADO'] && Object.keys(GUARNICOES['NAO CLASSIFICADO']).length > 0) {
                let naoClassificadoHtml = `
                    <div class="companhia-section bg-gray-700 p-6 rounded-lg shadow-xl lg:col-span-2 mt-8">
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
                const mainContainer = document.querySelector('main .container > div');
                if (mainContainer) {
                    mainContainer.innerHTML += naoClassificadoHtml;
                }
            }

            // Adiciona a funcionalidade de clique para expandir/colapsar
            document.querySelectorAll('.quartel-card').forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('active');
                });
            });

        } else {
            console.error("Variável GUARNICOES não encontrada ou não é um objeto válido.");
            const mainContainer = document.querySelector('main .container');
            if (mainContainer) {
                mainContainer.innerHTML = '<p class="text-red-500 text-center text-xl mt-10">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js e o console do navegador para detalhes.</p>';
            }
        }
    }

    loadGuarnicoes();
});
