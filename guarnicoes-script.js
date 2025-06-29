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
        'BBS - MERGULHO', // Adicionado pois estava nos dados fornecidos
        'AODCA', // Adicionado pois estava nos dados fornecidos
        'COBOM-DCCI', // Adicionado pois estava nos dados fornecidos
        '1º BBM / ESTADO MAIOR', // Adicionado pois estava nos dados fornecidos
        'DA / DLP' // Adicionado pois estava nos dados fornecidos
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

        let viaturaIconHtml;
        const iconResult = getViaturaIcon(viatura.tipo);
        if (iconResult.startsWith('<img')) {
            viaturaIconHtml = iconResult;
        } else {
            viaturaIconHtml = `<i class="${iconResult} viatura-icon"></i>`;
        }

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

            // A seção "NAO CLASSIFICADO" só será exibida se houver quartéis não filtrados lá dentro
            let hasNonClassifiedToShow = false;
            if (GUARNICOES['NAO CLASSIFICADO']) {
                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel) && !quartelsToHide.includes(quartel)) {
                        hasNonClassifiedToShow = true;
                        break; // Basta um quartel para mostrar a seção
                    }
                }
            }

            if (hasNonClassifiedToShow) {
                let naoClassificadoHtml = `
                    <div class="companhia-section bg-gray-700 p-6 rounded-lg shadow-xl lg:col-span-2 mt-8">
                        <h2 class="text-2xl font-bold text-center text-gray-300 mb-6">OUTROS QUARTÉIS / SETORES</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                `;
                for (const quartel in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['NAO CLASSIFICADO'][quartel];
                        // Renderiza apenas se não estiver na lista de ocultar
                        if (!quartelsToHide.includes(quartel)) {
                           naoClassificadoHtml += createQuartelHtml(quartel, quartelData);
                        }
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
