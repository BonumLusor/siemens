// public/js/storage.js
// Lida com salvar e carregar o estado do localStorage.

/**
 * Salva o estado relevante no localStorage.
 * @param {object} state - O appState completo.
 */
export function saveToLocalStorage(state) {
    try {
        const stateToSave = {
            voltageType: state.voltageType,
            voltage: state.voltage,
            motors: state.motors,
            cart: state.cart,
            hideIncompatible: state.hideIncompatible
        };
        localStorage.setItem('panelConfig', JSON.stringify(stateToSave));
    } catch (e) { 
        console.error("Erro ao salvar no LocalStorage:", e); 
    }
}

/**
 * Carrega o estado salvo do localStorage.
 * @returns {object | null} O estado salvo ou nulo se não houver nada.
 */
export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('panelConfig');
        if (saved) {
            const config = JSON.parse(saved);
            // Retorna um objeto limpo apenas com as chaves esperadas
            return {
                voltageType: config.voltageType || 'monofasica',
                voltage: config.voltage || 220,
                motors: config.motors || [],
                cart: config.cart || [],
                hideIncompatible: config.hideIncompatible || false,
            };
        }
    } catch (e) {
        console.error("Erro ao carregar do LocalStorage:", e);
    }
    return null;
}
