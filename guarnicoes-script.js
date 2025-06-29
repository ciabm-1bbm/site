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

    // Lista de quartéis a serem ocultados
    const quartelsToHide = [
        'BBS - TERRESTRE',
        'BBS - CANIL',
        'BBS - AQUÁTICA',
        'BBS - MERGULHO',
        'AODCA',
        'COBOM-DCCI',
        '1º BBM / ESTADO MAIOR',
        'DA / DLP'
    ];

    // ATENÇÃO: As funções getViaturaIcon e getMilitarIcon devem ser definidas no guarnicoes-data.js
    // ou seja, o output do parser-guarnicoes.js deve incluir essas funções no guarnicoes-data.js.
    // Garanta que elas estejam lá para evitar erros de "função indefinida".

    // Função para criar o HTML de uma viatura e sua guarnição
    function createViaturaHtml(viatura) {
        let militaresHtml = '';
        if (viatura.guarnicao && viatura.guarnicao.length > 0) {
            militaresHtml = '<div class="militar-list">';
            viatura.guarnicao.forEach(militar => {
                militaresHtml += `
                    <p class="militar-item">
                        <i class="${getMilitarIcon(militar.funcao)} bombero-icon"></i>
                        <span class="font-semibold">${militar.funcao}:</span> ${militar.nomeGuerra}
                    </p>
                `;
            });
            militaresHtml += '</div>';
        }

        // Recupera o ícone da viatura. A função getViaturaIcon agora fornece a classe FA diretamente.
        const viaturaIconClass = getViaturaIcon(viatura.tipo);

        return `
            <div class="viatura-block">
                <div class="viatura-main-info">
                    <i class="${viaturaIconClass} viatura-icon"></i>
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
        // Verifica se o quartel deve ser ocultado
        if (quartelsToHide.includes(nomeQuartel)) {
            return ''; // Retorna string vazia para não renderizar o quartel
        }

        let viaturasHtml = '';
        if (quartelData.viaturas && quartelData.viaturas.length > 0) {
            quartelData.viaturas.forEach(viatura => {
                viaturasHtml += createViaturaHtml(viatura);
            });
        } else {
            viaturasHtml = '<p class="text-gray-400 text-center text-sm py-4">Nenhuma viatura escalada para este quartel.</p>';
        }

        // A seta para baixo (fa-chevron-down) é a nova padrão.
        // O CSS fará a rotação para cima quando 'active'.
        return `
            <div class="quartel-card">
                <div class="quartel-header">
                    <span>${nomeQuartel}</span>
                    <i class="fas fa-chevron-down quartel-toggle-icon"></i>
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
                        // Aplica a classe da companhia para controle de cor no CSS
                        if (!cia1QuartelsDiv.closest('.companhia-section').classList.contains('bg-cbmrs-blue')) {
                             cia1QuartelsDiv.closest('.companhia-section').classList.add('bg-cbmrs-blue');
                        }
                        cia1QuartelsDiv.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // 2ª CIA
            if (GUARNICOES['2ª CIA']) {
                for (const quartel in GUARNICOES['2ª CIA']) {
                    if (GUARNICOES['2ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['2ª CIA'][quartel];
                        // Aplica a classe da companhia para controle de cor no CSS
                        // Note que no HTML está 'bg-fire-red', mas o CSS customizado vai sobrescrever
                        if (!cia2QuartelsDiv.closest('.companhia-section').classList.contains('bg-fire-red')) {
                             cia2QuartelsDiv.closest('.companhia-section').classList.add('bg-fire-red');
                        }
                        cia2QuartelsDiv.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // Se houver quartéis "NAO CLASSIFICADO" e que não estão na lista de ocultar
            let hasNonClassifiedToShow = false;
            if (GUARNICOES['NAO CLASSIFICADO']) {
                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel) && !quartelsToHide.includes(quartel)) {
                        hasNonClassifiedToShow = true;
                        break;
                    }
                }
            }

            if (hasNonClassifiedToShow) {
                let naoClassificadoHtml = `
                    <div class="companhia-section bg-gray-700 p-6 rounded-lg shadow-xl lg:col-span-2 mt-8">
                        <h2 class="text-2xl font-bold text-center text-gray-300 mb-6 companhia-section-title">OUTROS QUARTÉIS / SETORES</h2>
                        <div class="quartels-grid">
                `;
                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['NAO CLASSIFICADO'][quartel];
                        if (!quartelsToHide.includes(quartel)) {
                           naoClassificadoHtml += createQuartelHtml(quartel, quartelData);
                        }
                    }
                }
                naoClassificadoHtml += `</div></div>`;
                const mainContainer = document.querySelector('main > .grid'); // Seleciona o grid principal dentro de main
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
