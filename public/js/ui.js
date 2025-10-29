// public/js/ui.js
// Contém todas as funções que manipulam o DOM (renderização).

import { checkProductCompatibility } from './motor.js';

/**
 * Mostra uma notificação flutuante.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo (success, warning, danger, info).
 */
export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

/**
 * Renderiza a lista de produtos no grid.
 * @param {Array} products - A lista de produtos filtrados para exibir.
 * @param {Array} motors - A lista de motores para checagem de compatibilidade.
 */
export function renderProducts(products, motors) {
    const grid = document.getElementById('productsGrid');

    if (!grid) return; // Sai se o elemento não existir

    if (products.length === 0) {
        renderEmpty(grid, "Nenhum produto encontrado.");
        return;
    }

    grid.innerHTML = products.map(product => {
        const compatibility = checkProductCompatibility(product, motors);
        let cardClass = 'product-card';
        if (compatibility.level === 'incompatible') cardClass += ' incompatible';
        if (compatibility.level === 'partial') cardClass += ' partial-compatible';

        return `
            <div class="${cardClass}" title="${compatibility.message}">
                ${compatibility.level !== 'compatible' ? `<div class="incompatible-badge ${compatibility.level === 'incompatible' ? 'danger' : 'warning'}">⚠️ ${compatibility.level === 'incompatible' ? 'Incompatível' : 'Parcial'}</div>` : ''}
                <div class="product-name">${product.nome}</div>
                <div class="product-specs">${getProductSpecs(product)}</div>
                <div class="product-code">Código: ${product.codigo}</div>
                <div class="product-specs">Preço: R$ ${product.preco.toFixed(2)}</div>
                ${compatibility.message ? `<div class="compatibility-message">${compatibility.message}</div>` : ''}
                <div class="product-actions">
                    ${!product.dependente_motor ? `<input type="number" class="quantity-input" value="1" min="1" id="qty-${product.codigo}">` : ''}
                    <button class="btn btn-primary" data-action="add-to-cart" data-code="${product.codigo}">Adicionar</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Renderiza os filtros estáticos (ex: checkbox de compatibilidade).
 * @param {boolean} isHideIncompatibleChecked - Se o checkbox deve estar marcado.
 */
export function renderFilters(isHideIncompatibleChecked) {
    const filtersDiv = document.getElementById('filters');
    if (!filtersDiv) return;

    filtersDiv.innerHTML = `
        <div class="filter-group compatibility-filter">
            <label class="checkbox-label">
                <input type="checkbox" id="hideIncompatible" ${isHideIncompatibleChecked ? 'checked' : ''}>
                Ocultar itens incompatíveis com motores
            </label>
        </div>
    `;
    // Os listeners para esses filtros são adicionados no app.js em setupStaticEventListeners
}

/**
 * Retorna uma string de especificações formatada para o card do produto.
 * @param {object} product - O objeto do produto.
 * @returns {string} - A string formatada.
 */
export function getProductSpecs(product) {
    if (product.dependente_motor) {
        const faixaAjuste = product.faixa_ajuste_A || product.detalhes?.faixa_ajuste_A;
        if (faixaAjuste) return `Faixa: ${faixaAjuste} A`;
        
        const correnteAC3 = product.corrente_ac3_A || product.detalhes?.corrente_ac3_A;
        if (correnteAC3) return `Corrente AC3: ${correnteAC3} A`;
    }
    return product.detalhes?.descricao || product.grupo || 'Sem detalhes';
}

/**
 * Atualiza o painel de resumo do projeto.
 * @param {Array} motors - Lista de motores.
 * @param {string} voltageType - Tipo de tensão.
 * @param {number} voltage - Valor da tensão.
 */
export function updateProjectSummary(motors, voltageType, voltage) {
    document.getElementById('summaryType').textContent = voltageType.charAt(0).toUpperCase() + voltageType.slice(1);
    document.getElementById('summaryVoltage').textContent = voltage + 'V';
    document.getElementById('summaryMotors').textContent = motors.length;
    const totalPower = motors.reduce((sum, motor) => sum + motor.power, 0);
    document.getElementById('summaryPower').textContent = totalPower.toFixed(1) + ' CV';
}

/**
 * Atualiza a lista de motores na UI.
 * @param {Array} motors - A lista de motores do appState.
 */
export function updateMotorList(motors) {
    const motorList = document.getElementById('motorList');
    if (!motorList) return;

    if (motors.length === 0) {
        renderEmpty(motorList, "Nenhum motor adicionado");
    } else {
        motorList.innerHTML = motors.map(motor => `
            <div class="motor-item" id="motor-item-${motor.id}">
                <div class="motor-info">
                    <div class="motor-name">${motor.name}</div>
                    <div class="motor-specs">${motor.power} CV (${motor.current}A)</div>
                </div>
                <div class="motor-components">
                    <div class="motor-component-item">
                        <span>Disjuntor:</span>
                        ${motor.disjuntor ? `<span>${motor.disjuntor.nome} <button class="btn btn-danger btn-sm" data-action="remove-component" data-id="${motor.id}" data-type="disjuntor">x</button></span>` : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                    <div class="motor-component-item">
                        <span>Contator:</span>
                        ${motor.contator ? `<span>${motor.contator.nome} <button class="btn btn-danger btn-sm" data-action="remove-component" data-id="${motor.id}" data-type="contator">x</button></span>` : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                </div>
                <button class="btn btn-danger" data-action="remove-motor" data-id="${motor.id}">Remover</button>
            </div>
        `).join('');
    }
}

/**
 * Atualiza o carrinho de compras na UI.
 * @param {Array} cart - A lista de itens gerais do carrinho.
 * @param {Array} motors - A lista de motores (para exibir seus componentes).
 */
export function updateCart(cart, motors) {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');
    const cartTotalEl = document.getElementById('cartTotal');

    if (!cartItemsEl || !cartCountEl || !cartTotalEl) return;

    const generalItems = cart.map(item => ({ ...item, quantity: item.quantity || 1 }));
    const motorItems = [];
    motors.forEach(motor => {
        if (motor.disjuntor) motorItems.push({ ...motor.disjuntor, quantity: 1, motorOwner: motor.name });
        if (motor.contator) motorItems.push({ ...motor.contator, quantity: 1, motorOwner: motor.name });
    });

    const allItems = [...generalItems, ...motorItems];
    cartCountEl.textContent = allItems.reduce((sum, item) => sum + item.quantity, 0);

    if (allItems.length === 0) {
        renderEmpty(cartItemsEl, "Nenhum componente selecionado");
        cartTotalEl.style.display = 'none';
    } else {
        cartItemsEl.innerHTML = allItems.map(item => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.nome}</div>
                    ${!item.motorOwner ? `<button class="btn btn-danger" data-action="remove-from-cart" data-code="${item.codigo}">×</button>` : ''}
                </div>
                <div class="cart-item-details">Código: ${item.codigo}<br>Quantidade: ${item.quantity}
                    ${item.motorOwner ? `<br><strong>Para Motor: ${item.motorOwner}</strong>` : ''}
                </div>
                <div class="cart-item-price">Total: R$ ${(item.preco * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
        const total = allItems.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
        document.getElementById('subtotal').textContent = `R$ ${total.toFixed(2)}`;
        document.getElementById('grandTotal').textContent = `R$ ${total.toFixed(2)}`;
        cartTotalEl.style.display = 'block';
    }
}

/**
 * Renderiza um estado de "vazio" em um container.
 * @param {HTMLElement} container - O elemento DOM.
 * @param {string} message - A mensagem a ser exibida.
 */
export function renderEmpty(container, message) {
    if (container) {
        container.innerHTML = `<div class="empty-state">${message}</div>`;
    }
}

/**
 * Renderiza um estado de "carregando" em um container.
 * @param {HTMLElement} container - O elemento DOM.
 * @param {string} message - A mensagem a ser exibida.
 */
export function renderLoading(container, message) {
    if (container) {
         container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>`;
    }
}
