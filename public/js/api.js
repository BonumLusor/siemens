// public/js/api.js
// Centraliza toda a comunicação com o backend (fetch).

const API_BASE_URL = ''; // Vazio para usar caminhos relativos (ex: /api/grupos)

/**
 * Busca a lista de grupos de produtos.
 * @returns {Promise<Array>} - Uma promessa que resolve para a lista de grupos.
 */
export async function fetchGroups() {
    const response = await fetch(`${API_BASE_URL}/api/grupos`);
    if (!response.ok) throw new Error('Falha ao buscar grupos da API.');
    return await response.json();
}

/**
 * Busca os produtos de um grupo específico.
 * @param {string} groupId - O ID do grupo.
 * @returns {Promise<Array>} - Uma promessa que resolve para a lista de produtos.
 */
export async function fetchProductsByGroup(groupId) {
    const response = await fetch(`${API_BASE_URL}/api/products?groupId=${groupId}`);
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro desconhecido da API');
    }
    return await response.json();
}
