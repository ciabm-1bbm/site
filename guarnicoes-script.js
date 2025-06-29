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

    const cia1QuartersGrid = document.getElementById('cia1-quarters'); // ID atualizado para 'quarters'
    const cia2QuartersGrid = document.getElementById('cia2-quarters'); // ID atualizado para 'quarters'
    const companiesWrapper = document.getElementById('companies-wrapper'); // O novo container flex para as seções de companhia

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
    function createVehicleHtml(vehicle) {
        let crewHtml = '';
        if (vehicle.guarnicao && vehicle.guarnicao.length > 0) {
            crewHtml = '<div class="crew-list">';
            vehicle.guarnicao.forEach(member => {
                crewHtml += `
                    <p class="crew-member-item">
                        <i class="${getMilitarIcon(member.funcao)} crew-member-icon"></i>
                        <span class="font-semibold">${member.funcao}:</span> ${member.nomeGuerra}
                    </p>
                `;
            });
            crewHtml += '</div>';
        }

        const vehicleIconClass = getViaturaIcon(vehicle.tipo); // Agora retorna a classe FA

        return `
            <div class="vehicle-block">
                <div class="vehicle-main-info">
                    <i class="${vehicleIconClass} vehicle-icon"></i>
                    <div class="vehicle-details">
                        <span class="prefix-and-type">${vehicle.tipo} ${vehicle.prefixo}</span>
                        <span class="turno-info">${vehicle.turno}</span>
                    </div>
                </div>
                ${crewHtml}
            </div>
        `;
    }

    // Função para criar o HTML de um quartel
    function createQuarterHtml(quarterName, quarterData) {
        // Verifica se o quartel deve ser ocultado
        if (quartelsToHide.includes(quarterName)) {
            return ''; // Retorna string vazia para não renderizar o quartel
        }

        let vehiclesHtml = '';
        let tooltipVehicleList = ''; // Para o texto do tooltip
        if (quarterData.viaturas && quarterData.viaturas.length > 0) {
            quarterData.viaturas.forEach(vehicle => {
                vehiclesHtml += createVehicleHtml(vehicle);
                tooltipVehicleList += `${vehicle.tipo} ${vehicle.prefixo} (${vehicle.turno})<br>`;
            });
        } else {
            vehiclesHtml = '<p class="text-gray-400 text-center text-sm py-4">Nenhuma viatura escalada para este quartel.</p>';
            tooltipVehicleList = 'Nenhuma viatura escalada.';
        }

        // Divide o nome do quartel em duas linhas para o cabeçalho
        const nameParts = quarterName.split(' - ');
        let quarterNameLine1 = quarterName; // Default se não tiver '-'
        let quarterNameLine2 = '';

        if (nameParts.length > 1) {
            quarterNameLine1 = nameParts[0].trim();
            quarterNameLine2 = nameParts[1].trim();
        }

        return `
            <div class="quarter-card">
                <div class="quarter-header">
                    <span class="quarter-name-line1">${quarterNameLine1}</span>
                    ${quarterNameLine2 ? `<span class="quarter-name-line2">${quarterNameLine2}</span>` : ''}
                    <i class="fas fa-chevron-down quarter-toggle-icon"></i>
                </div>
                <span class="tooltip-text">${tooltipVehicleList}</span>
                <div class="quarter-content">
                    ${vehiclesHtml}
                </div>
            </div>
        `;
    }

    // Carregar e renderizar as guarnições
    function loadGuarnicoes() {
        if (cia1QuartersGrid) cia1QuartersGrid.innerHTML = '';
        if (cia2QuartersGrid) cia2QuartersGrid.innerHTML = '';

        if (typeof GUARNICOES === 'object' && GUARNICOES !== null) {
            // 1ª Companhia
            if (GUARNICOES['1ª CIA']) {
                for (const quarter in GUARNICOES['1ª CIA']) {
                    if (GUARNICOES['1ª CIA'].hasOwnProperty(quarter)) {
                        const quarterData = GUARNICOES['1ª CIA'][quarter];
                        cia1QuartersGrid.innerHTML += createQuarterHtml(quarter, quarterData);
                    }
                }
            }

            // 2ª Companhia
            if (GUARNICOES['2ª CIA']) {
                for (const quarter in GUARNICOES['2ª CIA']) {
                    if (GUARNICOES['2ª CIA'].hasOwnProperty(quarter)) {
                        const quarterData = GUARNICOES['2ª CIA'][quarter];
                        cia2QuartersGrid.innerHTML += createQuarterHtml(quarter, quarterData);
                    }
                }
            }

            // Seção "Outros Quartéis / Setores"
            let hasNonClassifiedToShow = false;
            if (GUARNICOES['NAO CLASSIFICADO']) {
                for (const quarter in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quarter) && !quartelsToHide.includes(quarter)) {
                        hasNonClassifiedToShow = true;
                        break;
                    }
                }
            }

            if (hasNonClassifiedToShow) {
                const nonClassifiedSection = document.createElement('section'); // Usando <section> para melhor semântica
                nonClassifiedSection.className = 'company-section non-classified-theme'; // Nova classe para outros
                nonClassifiedSection.innerHTML = `
                    <h2 class="company-title">OUTROS QUARTÉIS / SETORES</h2>
                    <div class="quarters-grid"></div>
                `;
                const nonClassifiedQuartersGrid = nonClassifiedSection.querySelector('.quarters-grid');

                for (const quarter in GUARNICOES['NAO CLASSIFICADO']) {
                    if (GUARNICOES['NAO CLASSIFICADO'].hasOwnProperty(quarter)) {
                        const quarterData = GUARNICOES['NAO CLASSIFICADO'][quarter];
                        if (!quartelsToHide.includes(quarter)) {
                           nonClassifiedQuartersGrid.innerHTML += createQuarterHtml(quarter, quarterData);
                        }
                    }
                }
                if(companiesWrapper) { // Adiciona ao container principal flex
                    companiesWrapper.appendChild(nonClassifiedSection);
                }
            }

            // Adiciona a funcionalidade de clique para expandir/colapsar (agora só no quartel clicado)
            document.querySelectorAll('.quarter-card').forEach(card => {
                card.addEventListener('click', (event) => {
                    // Impede que o clique no tooltip feche o card
                    if (event.target.closest('.tooltip-text')) {
                        return;
                    }
                    card.classList.toggle('active');
                });
            });

        } else {
            console.error("Variável GUARNICOES não encontrada ou não é um objeto válido.");
            if (companiesWrapper) {
                companiesWrapper.innerHTML = '<p class="text-red-500 text-center text-xl mt-10">Erro ao carregar dados das guarnições. Verifique o arquivo guarnicoes-data.js e o console do navegador para detalhes.</p>';
            }
        }
    }

    loadGuarnicoes();
});
