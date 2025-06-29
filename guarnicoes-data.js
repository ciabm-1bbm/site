// ... (seu DATA_GUARNA e GUARNICOES aqui) ...

// Funções para obter o ícone da viatura
function getViaturaIcon(tipoViatura) {
    switch (tipoViatura.toUpperCase()) {
        case 'ABT':
            return 'fas fa-truck-fire'; // Caminhão de bombeiro (Fire Truck)
        case 'AR':
            return 'fas fa-ambulance'; // Ambulância
        case 'AEM':
            return 'fas fa-truck-ladder'; // Caminhão com escada (Ladder Truck)
        case 'ATP':
            return 'fas fa-car-side'; // Carro normal (ou pick-up se preferir 'fas fa-truck-pickup')
        case 'ABC': // Para o Canil
            return 'fas fa-dog';
        case 'AT': // Outra camionete normal
            return 'fas fa-truck-pickup';
        case 'ABTS': // Veículo de Salvamento
            return 'fas fa-hand-holding-medical';
        case 'EAL': // Embarcações Aquáticas
        case 'EIN':
        case 'EMN':
            return 'fas fa-life-buoy'; // Bóia salva-vidas
        case 'DCCI': // COBOM-DCCI
            return 'fas fa-headset';
        case 'NAO CLASSIFICADO': // Default para viaturas não classificadas
            return 'fas fa-truck';
        case 'NAVAL': // Genérico para naval
            return 'fas fa-life-ring';
        default:
            return 'fas fa-truck'; // Ícone padrão
    }
}

// Funções para obter o ícone do militar baseado na função
function getMilitarIcon(funcao) {
    switch (funcao.toUpperCase()) {
        case 'CMT DE GU':
            return 'fas fa-user-tie'; // Gravata (líder)
        case 'COV':
            return 'fas fa-helmet-safety'; // Capacete
        case 'COMBATENTE 1':
        case 'COMBATENTE 2':
        case 'COMBATENTE 3':
            return 'fas fa-user-firefighter'; // Bombeiro (Font Awesome 6)
        case 'MOTORISTA':
            return 'fas fa-steering-wheel'; // Volante
        case 'SOCORRISTA 1':
        case 'SOCORRISTA 2':
            return 'fas fa-medkit'; // Kit médico
        case 'ALFA 4':
            return 'fas fa-id-badge'; // Crachá
        case 'OPERADOR COBOM':
            return 'fas fa-headset';
        case 'OFICIAL SUPERVISOR':
            return 'fas fa-user-shield';
        case 'MERGULHADOR':
            return 'fas fa-diving-mask';
        case 'AUX. CONDUTOR NAVAL 2':
        case 'AUX. CONDUTOR NAVAL 1':
        case 'CONDUTOR NAVAL':
            return 'fas fa-life-ring';
        case 'CINOTÉCNICO':
            return 'fas fa-dog';
        default:
            return 'fas fa-user'; // Ícone padrão
    }
}
