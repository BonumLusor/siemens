// Estado Global da Aplicação
const appState = {
    voltageType: 'monofasica',
    voltage: 220,
    motors: [],
    cart: [],
    groups: [], // Armazenará os grupos vindos da API: [{id, nome}]
    currentGroupId: null, // ID do grupo atualmente selecionado
    products: {}, // Armazenará os produtos cacheados por groupId: { "1": [...], "2": [...] }
    filters: {},
    searchQuery: '',
    hideIncompatible: false
};

const API_BASE_URL = '';

console.log("Sistema de Painéis Elétricos Dinâmico iniciado");

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configura os listeners para elementos que SEMPRE existem no HTML.
    setupStaticEventListeners(); 
    // 2. Carrega os grupos da API, cria as abas e carrega os produtos do primeiro grupo.
    await loadGroupsAndRenderTabs(); 
    // 3. Carrega os dados salvos do usuário (motores, carrinho, etc.)
    loadFromLocalStorage();
    // 4. Atualiza o resumo do projeto com os dados carregados.
    updateProjectSummary();
});


// --- CARREGAMENTO DE DADOS ---

async function loadGroupsAndRenderTabs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/grupos`);
        if (!response.ok) throw new Error('Falha ao buscar grupos da API.');
        
        appState.groups = await response.json();

        const tabsContainer = document.getElementById('tabs-container');
        if (!tabsContainer) return;

        if (appState.groups.length === 0) {
            tabsContainer.innerHTML = '<p>Nenhum grupo de produtos encontrado.</p>';
            return;
        }

        tabsContainer.innerHTML = appState.groups.map(group =>
            `<button class="tab" data-group-id="${group.id}">${group.nome}</button>`
        ).join('');

        // Adiciona os event listeners para as novas abas dinâmicas
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });

        // Seleciona e carrega a primeira aba por padrão
        const firstTab = tabsContainer.querySelector('.tab');
        if (firstTab) {
            firstTab.click();
        }
    } catch (error) {
        console.error('Erro ao carregar e renderizar grupos:', error);
        const tabsContainer = document.getElementById('tabs-container');
        if(tabsContainer) tabsContainer.innerHTML = '<p style="color:red;">Erro ao carregar categorias.</p>';
    }
}

async function handleTabClick(e) {
    const selectedTab = e.target;
    const groupId = selectedTab.dataset.groupId;

    if (appState.currentGroupId === groupId) return;

    appState.currentGroupId = groupId;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    selectedTab.classList.add('active');
    
    document.getElementById('searchInput').value = '';
    appState.searchQuery = '';

    await loadProductsForCurrentGroup();
}

async function loadProductsForCurrentGroup() {
    const groupId = appState.currentGroupId;
    if (!groupId) return;

    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando produtos...</p></div>';

    if (appState.products[groupId]) {
        renderProducts();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/products?groupId=${groupId}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Erro desconhecido da API');
        }

        appState.products[groupId] = await response.json();
        renderProducts();
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="empty-state">Erro ao carregar produtos: ${error.message}</div>`;
    }
}

// --- LÓGICA DE EVENTOS ---

function setupStaticEventListeners() {
    // Esta função configura listeners APENAS para elementos que existem no HTML desde o início.
    document.querySelectorAll('input[name="voltageType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.voltageType = e.target.value;
            appState.motors.forEach(motor => {
                motor.current = calculateMotorCurrent(motor.power);
            });
            updateAndRefreshUI();
        });
    });

    document.getElementById('voltage').addEventListener('change', (e) => {
        appState.voltage = parseInt(e.target.value);
        appState.motors.forEach(motor => {
            motor.current = calculateMotorCurrent(motor.power);
        });
        updateAndRefreshUI();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase();
        renderProducts();
    });

    document.getElementById('motorPower').addEventListener('keypress', (e) => { if (e.key === 'Enter') addMotor(); });
    document.getElementById('motorName').addEventListener('keypress', (e) => { if (e.key === 'Enter') addMotor(); });
}

// --- RENDERIZAÇÃO E UI ---

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const groupId = appState.currentGroupId;
    let products = appState.products[groupId] || [];

    if (appState.searchQuery) {
        products = products.filter(p =>
            (p.codigo || '').toLowerCase().includes(appState.searchQuery) ||
            (p.nome || '').toLowerCase().includes(appState.searchQuery) ||
            (p.grupo || '').toLowerCase().includes(appState.searchQuery)
        );
    }
    
    if (appState.hideIncompatible && appState.motors.length > 0) {
        products = products.filter(product => checkProductCompatibility(product).level !== 'incompatible');
    }

    if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state">Nenhum produto encontrado.</div>';
    } else {
        grid.innerHTML = products.map(product => {
            const compatibility = checkProductCompatibility(product);
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
                        <button class="btn btn-primary" onclick="addToCart('${product.codigo}')">Adicionar</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    // Renderiza os filtros e adiciona seus listeners DEPOIS que os produtos foram renderizados.
    renderFilters(); 
}

function renderFilters() {
    const filtersDiv = document.getElementById('filters');
    if (!filtersDiv) return;

    filtersDiv.innerHTML = `
        <div class="filter-group compatibility-filter">
            <label class="checkbox-label">
                <input type="checkbox" id="hideIncompatible" ${appState.hideIncompatible ? 'checked' : ''}>
                Ocultar itens incompatíveis com motores
            </label>
        </div>
    `;

    // CORREÇÃO DEFINITIVA: O listener é adicionado aqui, logo após o elemento ser criado no HTML.
    // Isso garante que o elemento `hideIncompatible` sempre exista antes de tentarmos usá-lo.
    const hideIncompatibleCheckbox = document.getElementById('hideIncompatible');
    if (hideIncompatibleCheckbox) {
        hideIncompatibleCheckbox.addEventListener('change', (e) => {
            appState.hideIncompatible = e.target.checked;
            renderProducts();
            saveToLocalStorage();
        });
    }
}

function getProductSpecs(product) {
    if (product.dependente_motor) {
        const faixaAjuste = product.faixa_ajuste_A || product.detalhes?.faixa_ajuste_A;
        if (faixaAjuste) return `Faixa: ${faixaAjuste} A`;
        
        const correnteAC3 = product.corrente_ac3_A || product.detalhes?.corrente_ac3_A;
        if (correnteAC3) return `Corrente AC3: ${correnteAC3} A`;
    }
    return product.detalhes?.descricao || product.grupo || 'Sem detalhes';
}

// --- LÓGICA DE MOTORES E COMPATIBILIDADE ---

function addMotor() {
    const motorPowerInput = document.getElementById('motorPower');
    const motorNameInput = document.getElementById('motorName');
    const motorPower = parseFloat(motorPowerInput.value);
    const motorName = motorNameInput.value.trim();

    if (motorPower > 0) {
        appState.motors.push({
            id: Date.now(),
            name: motorName || `Motor ${appState.motors.length + 1}`,
            power: motorPower,
            current: calculateMotorCurrent(motorPower),
            disjuntor: null, contator: null
        });
        motorPowerInput.value = '';
        motorNameInput.value = '';
        updateAndRefreshUI();
    } else { 
        showNotification('Insira uma potência válida para o motor!', 'warning'); 
    }
}

function removeMotor(id) {
    appState.motors = appState.motors.filter(m => m.id !== id);
    updateAndRefreshUI();
}

function removeComponentFromMotor(motorId, componentType) {
    const motor = appState.motors.find(m => m.id === motorId);
    if (motor) {
        motor[componentType] = null;
        updateAndRefreshUI();
    }
}

function calculateMotorCurrent(powerCV) {
    const powerW = powerCV * 736;
    let current;
    if (appState.voltageType === 'trifasica') {
        current = powerW / (appState.voltage * 1.732 * 0.85);
    } else { // Monofásica e Bifásica
        current = powerW / (appState.voltage * 0.85);
    }
    return current.toFixed(2);
}

function isProductCompatibleWithMotor(product, motor) {
    const motorCurrent = parseFloat(motor.current);
    if (!product.dependente_motor) return true;
    
    const faixaAjuste = product.faixa_ajuste_A || product.detalhes?.faixa_ajuste_A;
    if (faixaAjuste) {
        const parts = String(faixaAjuste).replace(/,/g, '.').split('-').map(Number);
        if (parts.length === 2 && !parts.some(isNaN)) {
            return motorCurrent >= parts[0] && motorCurrent <= parts[1];
        }
    }
    
    const correnteAC3 = product.corrente_ac3_A || product.detalhes?.corrente_ac3_A;
    if (correnteAC3) {
        return parseFloat(correnteAC3) >= motorCurrent;
    }

    return false;
}

function checkProductCompatibility(product) {
    const compatibility = { isCompatible: true, level: 'compatible', message: '' };
    if (appState.motors.length > 0 && product.dependente_motor) {
        const incompatibleMotors = appState.motors
            .filter(motor => !isProductCompatibleWithMotor(product, motor))
            .map(motor => motor.name);
        if (incompatibleMotors.length === appState.motors.length) {
            compatibility.level = 'incompatible';
            compatibility.message = 'Incompatível com todos os motores';
        } else if (incompatibleMotors.length > 0) {
            compatibility.level = 'partial';
            compatibility.message = `Incompatível com: ${incompatibleMotors.join(', ')}`;
        }
    }
    return compatibility;
}

// --- LÓGICA DO CARRINHO ---

function addToCart(productCode) {
    let product = null;
    for (const groupId in appState.products) {
        const found = appState.products[groupId].find(p => p.codigo === productCode);
        if (found) { product = found; break; }
    }
    if (!product) {
        showNotification("Erro: Produto não encontrado.", "danger");
        return;
    }

    if (product.dependente_motor) {
        // CORREÇÃO: Usa 'main_group' para identificar o tipo de componente
        const isDisjuntor = product.main_group.toLowerCase().includes('disjuntor');
        const isContator = product.main_group.toLowerCase().includes('contator');
        const componentType = isDisjuntor ? 'disjuntor' : (isContator ? 'contator' : null);
        
        if (!componentType) {
             showNotification("Tipo de componente de motor não identificado.", "warning");
             return;
        }

        let assigned = false;
        for (const motor of appState.motors) {
            if (!motor[componentType] && isProductCompatibleWithMotor(product, motor)) {
                motor[componentType] = { ...product };
                showNotification(`${product.nome} foi atribuído ao ${motor.name}.`, 'success');
                assigned = true;
                break;
            }
        }
        if (!assigned) showNotification(`Nenhum motor compatível precisa de um ${componentType}.`, 'warning');
    } else {
        const quantityInput = document.getElementById(`qty-${productCode}`);
        const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
        const existingItem = appState.cart.find(item => item.codigo === productCode);
        if (existingItem) existingItem.quantity += quantity;
        else appState.cart.push({ ...product, quantity });
        showNotification(`${product.nome} adicionado ao painel!`);
    }
    updateAndRefreshUI();
}

function removeFromCart(productCode) {
    appState.cart = appState.cart.filter(item => item.codigo !== productCode);
    updateAndRefreshUI();
}

// --- ATUALIZAÇÃO GERAL E UTILITÁRIOS ---

function updateAndRefreshUI() {
    updateMotorList();
    updateCart();
    updateProjectSummary();
    renderProducts();
    saveToLocalStorage();
}

function updateCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');
    const cartTotalEl = document.getElementById('cartTotal');

    const generalItems = appState.cart.map(item => ({ ...item, quantity: item.quantity || 1 }));
    const motorItems = [];
    appState.motors.forEach(motor => {
        if (motor.disjuntor) motorItems.push({ ...motor.disjuntor, quantity: 1, motorOwner: motor.name });
        if (motor.contator) motorItems.push({ ...motor.contator, quantity: 1, motorOwner: motor.name });
    });

    const allItems = [...generalItems, ...motorItems];
    cartCountEl.textContent = allItems.reduce((sum, item) => sum + item.quantity, 0);

    if (allItems.length === 0) {
        cartItemsEl.innerHTML = '<div class="empty-state">Nenhum componente selecionado</div>';
        cartTotalEl.style.display = 'none';
    } else {
        cartItemsEl.innerHTML = allItems.map(item => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.nome}</div>
                    ${!item.motorOwner ? `<button class="btn btn-danger" onclick="removeFromCart('${item.codigo}')">×</button>` : ''}
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

function updateMotorList() {
    const motorList = document.getElementById('motorList');
    if (appState.motors.length === 0) {
        motorList.innerHTML = '<div class="empty-state">Nenhum motor adicionado</div>';
    } else {
        motorList.innerHTML = appState.motors.map(motor => `
            <div class="motor-item" id="motor-item-${motor.id}">
                <div class="motor-info">
                    <div class="motor-name">${motor.name}</div>
                    <div class="motor-specs">${motor.power} CV (${motor.current}A)</div>
                </div>
                <div class="motor-components">
                    <div class="motor-component-item">
                        <span>Disjuntor:</span>
                        ${motor.disjuntor ? `<span>${motor.disjuntor.nome} <button class="btn btn-danger btn-sm" onclick="removeComponentFromMotor(${motor.id}, 'disjuntor')">x</button></span>` : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                    <div class="motor-component-item">
                        <span>Contator:</span>
                        ${motor.contator ? `<span>${motor.contator.nome} <button class="btn btn-danger btn-sm" onclick="removeComponentFromMotor(${motor.id}, 'contator')">x</button></span>` : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                </div>
                <button class="btn btn-danger" onclick="removeMotor(${motor.id})">Remover</button>
            </div>
        `).join('');
    }
}

// --- LÓGICA DE EXPORTAÇÃO (VERSÃO FINAL COM AGRUPAMENTO DE AUXILIARES) ---
function exportList() {
    const incompleteMotors = appState.motors.filter(m => !m.disjuntor || !m.contator);
    if (incompleteMotors.length > 0) {
        const names = incompleteMotors.map(m => m.name).join(', ');
        showNotification(`Existem motores com componentes pendentes: ${names}`, 'danger');
        return;
    }

    if (appState.motors.length === 0 && appState.cart.length === 0) {
        showNotification('O painel está vazio!', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let grandTotal = 0;

    const addPageFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);
            doc.text('ACQUA NOBILIS | Rua Safira, 205 - Jardim Jóia | CEP: 07431-295 - Arujá - SP', 15, pageHeight - 20);
            doc.text('Tel. +55 11 4651-4008', 15, pageHeight - 15);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 20, { align: 'right' });
        }
    };

    const logoImg = new Image();
    logoImg.src = '/static/Logo-Acqua-Nobilis-nova-retangular-preta-2048x430.png'; // Verifique se este caminho está correto
    doc.addImage(logoImg, 'PNG', 15, 12, 70, 15);
    doc.setFontSize(14);
    doc.text('LISTA DE COMPONENTES DO PAINEL ELÉTRICO', 105, 40, { align: 'center' });

    const head = [['Item', 'Descrição', 'Potência', 'Tensão Entrada', 'Tensão Saída', 'Corrente (A)', 'Qtd.', 'Preço Unit.', 'Total']];
    const body = [];
    const groupHeaderStyles = { fontStyle: 'bold', fillColor: '#f0f0f0' };

    // 1. Processa os Motores
    if (appState.motors.length > 0) {
        body.push([{ content: 'Acionamento de Motores', colSpan: 9, styles: groupHeaderStyles }]);
        appState.motors.forEach(motor => {
            const motorTotal = (motor.disjuntor?.preco || 0) + (motor.contator?.preco || 0);
            grandTotal += motorTotal;

            body.push([
                { content: motor.name, styles: { fontStyle: 'italic', fillColor: '#fafafa' } },
                { content: `Motor ${appState.voltageType}`, styles: { fontStyle: 'italic', fillColor: '#fafafa' } },
                { content: `${motor.power} CV`, styles: { fontStyle: 'italic', fillColor: '#fafafa' } },
                { content: `${appState.voltage}V`, styles: { fontStyle: 'italic', fillColor: '#fafafa' } }, '',
                { content: `${motor.current} A`, styles: { fontStyle: 'italic', fillColor: '#fafafa' } }, '1', '',
                { content: `R$ ${motorTotal.toFixed(2)}`, styles: { fontStyle: 'italic', fillColor: '#fafafa' } }
            ]);

            if (motor.disjuntor) {
                const disjuntor = motor.disjuntor;
                body.push([disjuntor.codigo, disjuntor.nome, '', `${appState.voltage}V`, '', disjuntor.faixa_ajuste_A || disjuntor.detalhes?.faixa_ajuste_A + ' A', '1', `R$ ${disjuntor.preco.toFixed(2)}`, `R$ ${disjuntor.preco.toFixed(2)}`]);
            }
            if (motor.contator) {
                const contator = motor.contator;
                body.push([contator.codigo, contator.nome, '', `${appState.voltage}V`, '', contator.corrente_ac3_A || contator.detalhes?.corrente_ac3_A + ' A', '1', `R$ ${contator.preco.toFixed(2)}`, `R$ ${contator.preco.toFixed(2)}`]);
            }
        });
    }

    // 2. Processa dinamicamente outros componentes do carrinho
    const otherComponents = appState.cart;
    if (otherComponents.length > 0) {
        // Agrupa os itens pela sua categoria (propriedade 'grupo')
        const groupedItems = otherComponents.reduce((acc, item) => {
            const groupName = item.grupo || 'Componentes Gerais';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});

        Object.keys(groupedItems).forEach(groupName => {
            body.push([{ content: groupName, colSpan: 9, styles: groupHeaderStyles }]);
            groupedItems[groupName].forEach(item => {
                const total = item.preco * item.quantity;
                grandTotal += total;
                body.push([
                    item.codigo, item.nome, '', '', '', '', item.quantity, 
                    `R$ ${item.preco.toFixed(2)}`, `R$ ${total.toFixed(2)}`
                ]);
            });
        });
    }

    // 3. Adiciona a linha de TOTAL GERAL
    body.push([
        { content: 'TOTAL GERAL', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', fillColor: '#e0e0e0' } },
        { content: `R$ ${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: '#e0e0e0', halign: 'right' } }
    ]);

    doc.autoTable({
        head: head, body: body, startY: 50, theme: 'grid',
        headStyles: { fillColor: [41, 128, 186], textColor: 255 },
        columnStyles: { 6: { halign: 'center' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
        didDrawPage: addPageFooter
    });

    doc.save(`lista_componentes_${Date.now()}.pdf`);
    showNotification('PDF exportado com sucesso!');
}

function exportToExcel() {
    const incompleteMotors = appState.motors.filter(m => !m.disjuntor || !m.contator);
    if (incompleteMotors.length > 0) {
        showNotification(`Existem motores com componentes pendentes: ${incompleteMotors.map(m => m.name).join(', ')}`, 'danger');
        return;
    }

    if (appState.motors.length === 0 && appState.cart.length === 0) {
        showNotification('O painel está vazio!', 'warning');
        return;
    }

    let grandTotal = 0;
    const data = [];
    const header = ['Item', 'Descrição', 'Potência', 'Tensão Entrada', 'Tensão Saída', 'Corrente (A)', 'Qtd.', 'Preço Unit.', 'Total'];
    data.push(header);

    // 1. Processa Motores
    if (appState.motors.length > 0) {
        data.push(['Acionamento de Motores']); // Título do Grupo
        appState.motors.forEach(motor => {
            const motorTotal = (motor.disjuntor?.preco || 0) + (motor.contator?.preco || 0);
            grandTotal += motorTotal;

            data.push([motor.name, `Motor ${appState.voltageType}`, `${motor.power} CV`, `${appState.voltage}V`, '', `${motor.current} A`, 1, '', motorTotal]);
            if (motor.disjuntor) {
                const disjuntor = motor.disjuntor;
                data.push([disjuntor.codigo, disjuntor.nome, '', `${appState.voltage}V`, '', disjuntor.faixa_ajuste_A || disjuntor.detalhes?.faixa_ajuste_A + ' A', 1, disjuntor.preco, disjuntor.preco]);
            }
            if (motor.contator) {
                const contator = motor.contator;
                data.push([contator.codigo, contator.nome, '', `${appState.voltage}V`, '', contator.corrente_ac3_A || contator.detalhes?.corrente_ac3_A + ' A', 1, contator.preco, contator.preco]);
            }
        });
    }
    
    // 2. Processa dinamicamente outros componentes
    const otherComponents = appState.cart;
    if (otherComponents.length > 0) {
        const groupedItems = otherComponents.reduce((acc, item) => {
            const groupName = item.grupo || 'Componentes Gerais';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});

        Object.keys(groupedItems).forEach(groupName => {
            data.push([]); // Linha em branco como separador
            data.push([groupName]); // Título do Grupo
            groupedItems[groupName].forEach(item => {
                const total = item.preco * item.quantity;
                grandTotal += total;
                data.push([item.codigo, item.nome, '', '', '', '', item.quantity, item.preco, total]);
            });
        });
    }

    data.push([]);
    data.push(['', '', '', '', '', '', '', 'TOTAL GERAL', grandTotal]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [ { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 } ];
    for (let i = 2; i <= data.length +1; i++) { // +1 para incluir a linha de total
        if (worksheet[`H${i}`]) worksheet[`H${i}`].z = 'R$ #,##0.00';
        if (worksheet[`I${i}`]) worksheet[`I${i}`].z = 'R$ #,##0.00';
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Componentes");
    XLSX.writeFile(workbook, `lista_componentes_${Date.now()}.xlsx`);
    showNotification('Excel exportado com sucesso!');
}

function updateProjectSummary() {
    document.getElementById('summaryType').textContent = appState.voltageType.charAt(0).toUpperCase() + appState.voltageType.slice(1);
    document.getElementById('summaryVoltage').textContent = appState.voltage + 'V';
    document.getElementById('summaryMotors').textContent = appState.motors.length;
    const totalPower = appState.motors.reduce((sum, motor) => sum + motor.power, 0);
    document.getElementById('summaryPower').textContent = totalPower.toFixed(1) + ' CV';
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('panelConfig', JSON.stringify({
            voltageType: appState.voltageType,
            voltage: appState.voltage,
            motors: appState.motors,
            cart: appState.cart,
            hideIncompatible: appState.hideIncompatible
        }));
    } catch (e) { console.error("Erro ao salvar no LocalStorage:", e); }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('panelConfig');
    if (saved) {
        const config = JSON.parse(saved);
        appState.voltageType = config.voltageType || 'monofasica';
        appState.voltage = config.voltage || 220;
        appState.motors = config.motors || [];
        appState.cart = config.cart || [];
        appState.hideIncompatible = config.hideIncompatible || false;

        document.querySelector(`input[value="${appState.voltageType}"]`).checked = true;
        document.getElementById('voltage').value = appState.voltage;
        
        updateMotorList();
        updateCart();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

