// guarnicoes-data.js
// ATENÇÃO: ESTE ARQUIVO É GERADO AUTOMATICAMENTE E SUBSTITUIRÁ QUALQUER EDIÇÃO MANUAL
// A linha 'export' foi adicionada para compatibilidade com módulos JS

export const DATA_GUARNA = "28/06/2025"; // Data atualizada para o dia de hoje

export const GUARNICOES = {
    // ESTE É O BLOCO DE DADOS DAS GUARNIÇÕES QUE VOCÊ COLO DA ÚLTIMA VEZ.
    // DEVE ESTAR AQUI COMPLETAMENTE COM TODAS AS 1ª CIA, 2ª CIA, NAO CLASSIFICADO.
    // Exemplo de como começa:
    "1ª CIA": {
        "BBS - CANIL": {
            "colorClass": "bg-gray-600",
            "viaturas": [
                {
                    "tipo": "ABC",
                    "prefixo": "793",
                    "turno": "24h",
                    "guarnicao": [
                        { "funcao": "CINOTÉCNICO", "nomeGuerra": "SD TRINDADE" },
                        { "funcao": "CINOTÉCNICO", "nomeGuerra": "SD BERTAZZO" }
                    ]
                }
            ]
        },
        // ... (todo o resto dos seus dados de guarnições) ...
    },
    // ... (fechamento do objeto GUARNICOES) ...
};

// Funções para obter o ícone da viatura
export function getViaturaIcon(tipoViatura) {
    switch (tipoViatura.toUpperCase()) {
        case 'ABT': return 'fas fa-truck-fire';
        case 'AR': return 'fas fa-ambulance';
        case 'AEM': return 'fas fa-truck-ladder';
        case 'ATP': return 'fas fa-car-side';
        case 'ABC': return 'fas fa-dog';
        case 'AT': return 'fas fa-truck-pickup';
        case 'ABTS': return 'fas fa-hand-holding-medical';
        case 'EAL':
        case 'EIN':
        case 'EMN': return 'fas fa-life-buoy';
        case 'DCCI': return 'fas fa-headset';
        case 'NAO CLASSIFICADO': return 'fas fa-truck';
        case 'NAVAL': return 'fas fa-life-ring';
        default: return 'fas fa-truck';
    }
}

// Funções para obter o ícone do militar baseado na função
export function getMilitarIcon(funcao) {
    switch (funcao.toUpperCase()) {
        case 'CMT DE GU': return 'fas fa-user-tie';
        case 'COV': return 'fas fa-helmet-safety';
        case 'COMBATENTE 1':
        case 'COMBATENTE 2':
        case 'COMBATENTE 3': return 'fas fa-user-firefighter';
        case 'MOTORISTA': return 'fas fa-steering-wheel';
        case 'SOCORRISTA 1':
        case 'SOCORRISTA 2': return 'fas fa-medkit';
        case 'ALFA 4': return 'fas fa-id-badge';
        case 'OPERADOR COBOM': return 'fas fa-headset';
        case 'OFICIAL SUPERVISOR': return 'fas fa-user-shield';
        case 'MERGULHADOR': return 'fas fa-diving-mask';
        case 'AUX. CONDUTOR NAVAL 2':
        case 'AUX. CONDUTOR NAVAL 1':
        case 'CONDUTOR NAVAL': return 'fas fa-life-ring';
        case 'CINOTÉCNICO': return 'fas fa-dog';
        default: return 'fas fa-user';
    }
}
