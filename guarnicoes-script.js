// guarnicoes-script.js

document.addEventListener('DOMContentLoaded', () => {
    const tituloGuarnicoes = document.getElementById('guarnicoes-data');
    if (tituloGuarnicoes && typeof DATA_GUARNA !== 'undefined') {
        tituloGuarnicoes.textContent = `DATA ${DATA_GUARNA}`;
    } else if (tituloGuarnicoes) {
        tituloGuarnicoes.textContent = `DATA INDEFINIDA`;
    }

    const cia1QuartelsGrid = document.getElementById('cia1-quartels'); // Referência para a GRID de quartéis da CIA 1
    const cia2QuartelsGrid = document.getElementById('cia2-quartels'); // Referência para a GRID de quartéis da CIA 2

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
        if (cia1QuartelsGrid) cia1QuartelsGrid.innerHTML = '';
        if (cia2QuartelsGrid) cia2QuartelsGrid.innerHTML = '';

        if (typeof GUARNICOES === 'object' && GUARNICOES !== null) {
            // 1ª CIA
            if (GUARNICOES['1ª CIA']) {
                // Adiciona a classe ao título da companhia para estilização
                const cia1Title = document.querySelector('.companhia-section.bg-cbmrs-blue .companhia-section-title');
                if(cia1Title) cia1Title.classList.add('companhia-section-title'); // Garante a classe de título

                for (const quartel in GUARNICOES['1ª CIA']) {
                    if (GUARNICOES['1ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['1ª CIA'][quartel];
                        cia1QuartelsGrid.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // 2ª CIA
            if (GUARNICOES['2ª CIA']) {
                // Adiciona a classe ao título da companhia para estilização
                const cia2Title = document.querySelector('.companhia-section.bg-fire-red .companhia-section-title');
                if(cia2Title) cia2Title.classList.add('companhia-section-title'); // Garante a classe de título


                for (const quartel in GUARNICOES['2ª CIA']) {
                    if (GUARNICOES['2ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['2ª CIA'][quartel];
                        cia2QuartelsGrid.innerHTML += createQuartelHtml(quartel, quartelData);
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
                // Cria a seção "Outros Quartéis / Setores" dinamicamente
                const outrosSection = document.createElement('div');
                outrosSection.className = 'companhia-section bg-gray-700 mt-8'; // Adiciona classes de estilo
                outrosSection.innerHTML = `
                    <h2 class="companhia-section-title">OUTROS QUARTÉIS / SETORES</h2>
                    <div class="quartels-grid"></div>
                `;
                const outrosQuartelsGrid = outrosSection.querySelector('.quartels-grid');

                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['NAO CLASSIFICADO'][quartel];
                        if (!quartelsToHide.includes(quartel)) {
                           outrosQuartelsGrid.innerHTML += createQuartelHtml(quartel, quartelData);
                        }
                    }
                }
                const companhiasContainer = document.getElementById('companhias-container');
                if(companhiasContainer) {
                    companhiasContainer.appendChild(outrosSection);
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
            const mainContainer = document.getElementById('companhias-container'); // Agora acessa o container geral
            if (mainContainer) {
                mainContainer.innerHTML = '<p class="text-red-500 text-center text-xl mt-10">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js e o console do navegador para detalhes.</p>';
            }
        }
    }

    loadGuarnicoes();
});
