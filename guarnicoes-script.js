// guarnicoes-script.js

// Importa as variáveis e funções do guarnicoes-data.js
import { DATA_GUARNA, GUARNICOES, getViaturaIcon, getMilitarIcon } from './guarnicoes-data.js';

document.addEventListener('DOMContentLoaded', () => {
    const tituloGuarnicoes = document.getElementById('guarnicoes-data');
    if (tituloGuarnicoes && typeof DATA_GUARNA !== 'undefined') {
        tituloGuarnicoes.textContent = `DATA ${DATA_GUARNA}`;
    } else if (tituloGuarnicoes) {
        tituloGuarnicoes.textContent = `DATA INDEFINIDA`;
    }

    const cia1QuartelsGrid = document.getElementById('cia1-quartels');
    const cia2QuartelsGrid = document.getElementById('cia2-quartels');
    const companhiasContainer = document.getElementById('companhias-container'); // O container principal das companhias

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
            return '';
        }

        let viaturasHtml = '';
        let tooltipViaturaList = ''; // Para o texto do tooltip
        if (quartelData.viaturas && quartelData.viaturas.length > 0) {
            quartelData.viaturas.forEach(viatura => {
                viaturasHtml += createViaturaHtml(viatura);
                tooltipViaturaList += `${viatura.tipo} ${viatura.prefixo} (${viatura.turno})<br>`;
            });
        } else {
            viaturasHtml = '<p class="text-gray-400 text-center text-sm py-4">Nenhuma viatura escalada para este quartel.</p>';
            tooltipViaturaList = 'Nenhuma viatura escalada.';
        }

        // Divide o nome do quartel em duas linhas para o cabeçalho
        const nomeParts = nomeQuartel.split(' - ');
        let quartelNameLine1 = nomeQuartel; // Default se não tiver '-'
        let quartelNameLine2 = '';

        if (nomeParts.length > 1) {
            quartelNameLine1 = nomeParts[0].trim();
            quartelNameLine2 = nomeParts[1].trim();
        }

        return `
            <div class="quartel-card" style="position: relative;">
                <div class="quartel-header">
                    <span class="quartel-name-line1">${quartelNameLine1}</span>
                    ${quartelNameLine2 ? `<span class="quartel-name-line2">${quartelNameLine2}</span>` : ''}
                    <i class="fas fa-chevron-down quartel-toggle-icon"></i>
                </div>
                <span class="tooltip-text">${tooltipViaturaList}</span>
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
                for (const quartel in GUARNICOES['1ª CIA']) {
                    if (GUARNICOES['1ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['1ª CIA'][quartel];
                        cia1QuartelsGrid.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

            // 2ª CIA
            if (GUARNICOES['2ª CIA']) {
                for (const quartel in GUARNICOES['2ª CIA']) {
                    if (GUARNICOES['2ª CIA'].hasOwnProperty(quartel)) {
                        const quartelData = GUARNICOES['2ª CIA'][quartel];
                        cia2QuartelsGrid.innerHTML += createQuartelHtml(quartel, quartelData);
                    }
                }
            }

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
                const outrosSection = document.createElement('div');
                outrosSection.className = 'companhia-section bg-gray-700 mt-8';
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
                const companhiasFlexContainer = document.querySelector('.companhias-flex-container'); // Adicionado ao container flex
                if(companhiasFlexContainer) {
                    companhiasFlexContainer.appendChild(outrosSection);
                }
            }

            // Adiciona a funcionalidade de clique para expandir/colapsar
            document.querySelectorAll('.quartel-card').forEach(card => {
                card.addEventListener('click', (event) => {
                    // Evita que o tooltip feche o card se o clique for sobre ele
                    if (!event.target.closest('.tooltip-text')) {
                        card.classList.toggle('active');
                    }
                });
            });

        } else {
            console.error("Variável GUARNICOES não encontrada ou não é um objeto válido.");
            const mainContainer = document.getElementById('companhias-container');
            if (mainContainer) {
                mainContainer.innerHTML = '<p class="text-red-500 text-center text-xl mt-10">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js e o console do navegador para detalhes.</p>';
            }
        }
    }

    loadGuarnicoes();
});
