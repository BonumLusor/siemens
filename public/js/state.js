// public/js/state.js
// Define o estado inicial e fornece funções para interagir com ele.

export const appState = {
    voltageType: 'monofasica',
    voltage: 220,
    motors: [],
    cart: [],
    groups: [], // Armazenará os grupos vindos da API: [{id, nome}]
    currentGroupId: null, // ID do grupo atualmente selecionado
    products: {}, // Armazenará os produtos cacheados por groupId: { "1": [...], "2": [...] }
    searchQuery: '',
    hideIncompatible: false
};

/**
 * Atualiza o estado global de forma segura.
 * @param {object} newState - Um objeto com as chaves do estado para atualizar.
 */
export function updateState(newState) {
    Object.assign(appState, newState);
}

/**
 * Encontra um produto em qualquer grupo pelo seu código.
 * @param {object} state - O appState completo.
 * @param {string} productCode - O código a ser encontrado.
 * @returns {object | null} O objeto do produto ou null se não for encontrado.
 */
export function findProductByCode(state, productCode) {
    for (const groupId in state.products) {
        const found = state.products[groupId].find(p => p.codigo === productCode);
        if (found) { 
            return { ...found }; // Retorna uma cópia
        }
    }
    return null;
}
