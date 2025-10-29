// Importa as funções que agora estão nos módulos
import { fetchGroups } from './api.js';
import { showNotification } from './ui.js';

// Seleciona os elementos do DOM
const groupSelection = document.getElementById('groupSelection');
const existingGroupSection = document.getElementById('existing-group-section');
const newGroupSection = document.getElementById('new-group-section');
const form = document.getElementById('componentForm');
const groupSelect = document.getElementById('group');

/**
 * Carrega os grupos da API e preenche o select.
 */
async function loadGroups() {
    try {
        const grupos = await fetchGroups(); // Reutiliza a função da API

        groupSelect.innerHTML = '<option value="">Selecione um grupo...</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            // IMPORTANTE: O formulário original envia o NOME do grupo.
            // Se o seu endpoint POST /api/products espera um ID, 
            // você deve mudar 'option.value = grupo.nome' para 'option.value = grupo.id'
            option.value = grupo.nome; 
            option.textContent = grupo.nome;
            groupSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar grupos:", error);
        groupSelect.innerHTML = '<option value="">Não foi possível carregar</option>';
        showNotification("Não foi possível carregar os grupos.", "danger");
    }
}

/**
 * Alterna a visibilidade das seções de grupo (novo vs. existente).
 */
function handleGroupSelectionChange() {
    const isExisting = groupSelection.value === 'existente';
    existingGroupSection.style.display = isExisting ? 'block' : 'none';
    newGroupSection.style.display = isExisting ? 'none' : 'block';
    
    // Garante que a validação 'required' seja aplicada corretamente
    document.getElementById('group').required = isExisting;
    document.getElementById('new_group_name').required = !isExisting;
}

/**
 * Lida com o envio do formulário.
 */
async function handleFormSubmit(e) {
    e.preventDefault(); // Impede o recarregamento da página

    const formData = new FormData(form);
    let detalhesVariação = {};

    // Tenta parsear o JSON de detalhes
    try {
        const detalhesJson = formData.get('variacao_detalhes');
        if (detalhesJson) {
            detalhesVariação = JSON.parse(detalhesJson);
        }
    } catch (error) {
        showNotification('O JSON nos detalhes da variação é inválido.', 'danger');
        return;
    }
    
    // Determina o nome do grupo
    const groupName = groupSelection.value === 'existente'
        ? formData.get('group')
        : formData.get('new_group_name');

    // Monta o payload para a API
    const payload = {
        grupo: { nome: groupName },
        categoria: {
            nome: formData.get('categoria_nome'),
            descricao: formData.get('categoria_descricao')
        },
        produto: { nome: formData.get('produto_nome') },
        variacao: {
            codigo: formData.get('variacao_codigo'),
            preco: parseFloat(formData.get('variacao_preco')),
            detalhes: detalhesVariação
        },
        dependencias: {
            motor: formData.get('dependente_motor') === 'on',
            tensao: formData.get('dependente_tensao') === 'on'
        }
    };

    // Validação básica
    if (!payload.grupo.nome || !payload.categoria.nome || !payload.produto.nome || !payload.variacao.codigo || !payload.variacao.preco) {
        showNotification("Por favor, preencha todos os campos obrigatórios.", 'warning');
        return;
    }

    // Envia para a API
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Sucesso: ' + result.message, 'success');
            form.reset(); // Limpa o formulário
            groupSelection.value = 'existente'; // Reseta o select
            handleGroupSelectionChange(); // Reseta a visibilidade dos campos
            loadGroups(); // Recarrega os grupos (caso um novo tenha sido adicionado)
        } else {
            showNotification('Erro: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        showNotification('Falha de comunicação com a API.', 'danger');
    }
}

// --- INICIALIZAÇÃO DO MÓDULO ---
// Como 'type="module"' já adia a execução, podemos anexar os eventos diretamente.

groupSelection.addEventListener('change', handleGroupSelectionChange);
form.addEventListener('submit', handleFormSubmit);

// Carrega os grupos iniciais
loadGroups();
// Define o estado inicial dos campos de grupo
handleGroupSelectionChange();
