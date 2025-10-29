// public/js/app.js (O Orquestrador)
// Este arquivo coordena todos os módulos, lida com eventos e atualiza a UI.

import { appState, updateState, findProductByCode } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import * as motorLogic from './motor.js';
import * as cartLogic from './cart.js';
import * as exporter from './export.js';
import * as storage from './storage.js';

console.log("Sistema de Painéis Elétricos Modular iniciado");

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carrega o estado salvo (se houver)
    const savedState = storage.loadFromLocalStorage();
    if (savedState) {
        updateState(savedState);
        // Garante que os elementos de UI reflitam o estado carregado
        document.querySelector(`input[name="voltageType"][value="${appState.voltageType}"]`).checked = true;
        document.getElementById('voltage').value = appState.voltage;
        const hideIncompatibleCheckbox = document.getElementById('hideIncompatible');
        if (hideIncompatibleCheckbox) {
            hideIncompatibleCheckbox.checked = appState.hideIncompatible;
        }
    }

    // 2. Configura os listeners para elementos que SEMPRE existem no HTML.
    setupStaticEventListeners(); 
    
    // 3. Configura listeners para elementos dinâmicos (como botões em cards)
    setupDynamicEventListeners();

    // 4. Carrega os grupos da API, cria as abas e carrega os produtos do primeiro grupo.
    await loadGroupsAndRenderTabs(); 
    
    // 5. Atualiza o resumo do projeto com os dados carregados.
    updateAllUI();
});


// --- CARREGAMENTO DE DADOS ---

async function loadGroupsAndRenderTabs() {
    try {
        const groups = await api.fetchGroups();
        updateState({ groups });

        const tabsContainer = document.getElementById('tabs-container');
        if (!tabsContainer) return;

        if (appState.groups.length === 0) {
            tabsContainer.innerHTML = '<p>Nenhum grupo de produtos encontrado.</p>';
            return;
        }

        // Renderiza as abas
        tabsContainer.innerHTML = appState.groups.map(group =>
            `<button class="tab" data-group-id="${group.id}">${group.nome}</button>`
        ).join('');

        // Adiciona os event listeners para as novas abas dinâmicas
        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => handleTabClick(tab.dataset.groupId));
        });

        // Seleciona e carrega a primeira aba por padrão
        const firstTab = tabsContainer.querySelector('.tab');
        if (firstTab) {
            firstTab.click();
        }
    } catch (error) {
        console.error('Erro ao carregar e renderizar grupos:', error);
        ui.showNotification("Erro ao carregar categorias.", "danger");
        const tabsContainer = document.getElementById('tabs-container');
        if(tabsContainer) tabsContainer.innerHTML = '<p style="color:red;">Erro ao carregar categorias.</p>';
    }
}

async function handleTabClick(groupId) {
    if (appState.currentGroupId === groupId) return;

    updateState({ currentGroupId: groupId, searchQuery: '' });
    
    // Atualiza UI das abas
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-group-id="${groupId}"]`).classList.add('active');
    
    document.getElementById('searchInput').value = '';
    
    // Mostra o loading
    ui.renderLoading(document.getElementById('productsGrid'), "Carregando produtos...");

    // Busca produtos se não estiverem em cache
    if (!appState.products[groupId]) {
        try {
            const products = await api.fetchProductsByGroup(groupId);
            // Salva os produtos no estado
            updateState({ 
                products: { ...appState.products, [groupId]: products } 
            });
        } catch (error) {
            console.error(error);
            ui.showNotification(`Erro ao carregar produtos: ${error.message}`, 'danger');
            ui.renderEmpty(document.getElementById('productsGrid'), `Erro ao carregar produtos.`);
            return;
        }
    }

    // Renderiza os produtos
    updateAllUI();
}

// --- LÓGICA DE EVENTOS ---

function setupStaticEventListeners() {
    // Tipo de Alimentação
    document.querySelectorAll('input[name="voltageType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateState({ voltageType: e.target.value });
            // Recalcula a corrente de todos os motores
            const updatedMotors = motorLogic.recalculateAllMotorCurrents(appState.motors, appState.voltageType, appState.voltage);
            updateState({ motors: updatedMotors });
            updateAllUI();
        });
    });

    // Tensão
    document.getElementById('voltage').addEventListener('change', (e) => {
        updateState({ voltage: parseInt(e.target.value) });
        const updatedMotors = motorLogic.recalculateAllMotorCurrents(appState.motors, appState.voltageType, appState.voltage);
        updateState({ motors: updatedMotors });
        updateAllUI();
    });

    // Busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        updateState({ searchQuery: e.target.value.toLowerCase() });
        ui.renderProducts(getFilteredProducts(), appState.motors);
    });

    // Adicionar Motor
    // Remove o 'onclick' e adiciona um ID para facilitar
    const addMotorButton = document.querySelector('button[onclick="addMotor()"]');
    if (addMotorButton) {
        addMotorButton.id = 'addMotorBtn';
        addMotorButton.removeAttribute('onclick');
        addMotorButton.addEventListener('click', handleAddMotor);
    }
    
    document.getElementById('motorPower').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddMotor(); });
    document.getElementById('motorName').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddMotor(); });

    // Filtro de Compatibilidade - Adicionado após renderFilters
    
    // Exportar
    // Remove 'onclick' e adiciona IDs
    const exportListButton = document.querySelector('button[onclick="exportList()"]');
    if (exportListButton) {
        exportListButton.id = 'exportListBtn';
        exportListButton.removeAttribute('onclick');
        exportListButton.addEventListener('click', () => exporter.exportList(appState));
    }
    
    const exportExcelButton = document.querySelector('button[onclick="exportToExcel()"]');
    if (exportExcelButton) {
        exportExcelButton.id = 'exportExcelBtn';
        exportExcelButton.removeAttribute('onclick');
        exportExcelButton.addEventListener('click', () => exporter.exportToExcel(appState));
    }

    // Renderiza os filtros estáticos e adiciona listener
    ui.renderFilters(appState.hideIncompatible);
    const hideIncompatibleCheckbox = document.getElementById('hideIncompatible');
    if (hideIncompatibleCheckbox) {
        hideIncompatibleCheckbox.addEventListener('change', (e) => {
            updateState({ hideIncompatible: e.target.checked });
            ui.renderProducts(getFilteredProducts(), appState.motors);
            storage.saveToLocalStorage(appState);
        });
    }
}

function handleAddMotor() {
    const motorPowerInput = document.getElementById('motorPower');
    const motorNameInput = document.getElementById('motorName');
    const motorPower = parseFloat(motorPowerInput.value);
    const motorName = motorNameInput.value.trim();

    if (motorPower > 0) {
        const newMotor = motorLogic.createMotor(motorName, motorPower, appState);
        updateState({ motors: [...appState.motors, newMotor] });
        
        motorPowerInput.value = '';
        motorNameInput.value = '';
        updateAllUI();
    } else { 
        ui.showNotification('Insira uma potência válida para o motor!', 'warning'); 
    }
}

/**
 * Configura listeners em containers-pai para lidar com cliques
 * em elementos dinâmicos (botões de adicionar, remover, etc.)
 */
function setupDynamicEventListeners() {
    
    // Listener para a lista de motores (remover motor, remover componente)
    document.getElementById('motorList').addEventListener('click', (e) => {
        const removeMotorBtn = e.target.closest('[data-action="remove-motor"]');
        const removeCompBtn = e.target.closest('[data-action="remove-component"]');

        if (removeMotorBtn) {
            const motorId = parseInt(removeMotorBtn.dataset.id);
            const newState = cartLogic.removeMotor(appState, motorId);
            updateState(newState);
            updateAllUI();
            return;
        }

        if (removeCompBtn) {
            const motorId = parseInt(removeCompBtn.dataset.id);
            const componentType = removeCompBtn.dataset.type; // 'disjuntor' ou 'contator'
            const newState = cartLogic.removeComponentFromMotor(appState, motorId, componentType);
            updateState(newState);
            updateAllUI();
            return;
        }
    });

    // Listener para o grid de produtos (adicionar ao carrinho)
    document.getElementById('productsGrid').addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-action="add-to-cart"]');
        if (addBtn) {
            const productCode = addBtn.dataset.code;
            const product = findProductByCode(appState, productCode);
            if (!product) {
                ui.showNotification("Erro: Produto não encontrado.", "danger");
                return;
            }
            
            const quantityInput = document.getElementById(`qty-${productCode}`);
            const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

            const newState = cartLogic.addToCart(appState, product, quantity);
            updateState(newState); // Atualiza o estado global com a resposta da lógica do carrinho
            updateAllUI();
        }
    });

    // Listener para o carrinho (remover item geral)
    document.getElementById('cartItems').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-action="remove-from-cart"]');
        if (removeBtn) {
            const productCode = removeBtn.dataset.code;
            const newState = cartLogic.removeFromCart(appState, productCode);
            updateState(newState);
            updateAllUI();
        }
    });
}

// --- FUNÇÕES DE SINCRONIZAÇÃO E UI ---

/**
 * Retorna a lista de produtos filtrados com base no estado atual.
 */
function getFilteredProducts() {
    let products = appState.products[appState.currentGroupId] || [];

    if (appState.searchQuery) {
        products = products.filter(p =>
            (p.codigo || '').toLowerCase().includes(appState.searchQuery) ||
            (p.nome || '').toLowerCase().includes(appState.searchQuery) ||
            (p.grupo || '').toLowerCase().includes(appState.searchQuery)
        );
    }
    
    if (appState.hideIncompatible && appState.motors.length > 0) {
        products = products.filter(product => 
            motorLogic.checkProductCompatibility(product, appState.motors).level !== 'incompatible'
        );
    }
    return products;
}

/**
 * Função central chamada sempre que o estado muda para redesenhar a UI.
 */
function updateAllUI() {
    // 1. Renderiza os produtos (filtrados)
    ui.renderProducts(getFilteredProducts(), appState.motors);
    
    // 2. Atualiza a lista de motores
    ui.updateMotorList(appState.motors);
    
    // 3. Atualiza o carrinho
    ui.updateCart(appState.cart, appState.motors);
    
    // 4. Atualiza o resumo do projeto
    ui.updateProjectSummary(appState.motors, appState.voltageType, appState.voltage);
    
    // 5. Salva o estado atual no localStorage
    storage.saveToLocalStorage(appState);
}
