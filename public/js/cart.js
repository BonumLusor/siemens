// public/js/cart.js
// Lógica de negócios pura para gerenciar o carrinho e associações de motor.

import { isProductCompatibleWithMotor } from './motor.js';
import { showNotification } from './ui.js';

/**
 * Adiciona um item ao carrinho ou o associa a um motor.
 * Retorna o *novo* estado (imexível).
 * @param {object} state - O appState atual.
 * @param {object} product - O produto a ser adicionado.
 * @param {number} quantity - A quantidade (para itens gerais).
 * @returns {object} - O novo estado (ou partes dele) para ser mesclado.
 */
export function addToCart(state, product, quantity) {
    // Se o produto depende de motor
    if (product.dependente_motor) {
        // Identifica o tipo de componente (ex: Disjuntor, Contator)
        // Isso depende da estrutura dos seus dados. Ajuste 'grupo' se necessário.
        const isDisjuntor = (product.grupo || '').toLowerCase().includes('disjuntor');
        const isContator = (product.grupo || '').toLowerCase().includes('contator');
        const componentType = isDisjuntor ? 'disjuntor' : (isContator ? 'contator' : null);

        if (!componentType) {
             showNotification("Tipo de componente de motor não identificado.", "warning");
             return {}; // Retorna um objeto vazio (sem alteração de estado)
        }

        let assigned = false;
        // Cria uma *nova* lista de motores para manter a imutabilidade
        const newMotors = state.motors.map(motor => {
            // Se já foi atribuído, ou este motor já tem o componente, ou é incompatível...
            if (assigned || motor[componentType] || !isProductCompatibleWithMotor(product, motor)) {
                return motor; // Retorna o motor como está
            }
            
            // ...Encontrou um motor compatível e sem o componente.
            assigned = true;
            showNotification(`${product.nome} foi atribuído ao ${motor.name}.`, 'success');
            // Retorna um *novo* objeto motor com o componente adicionado
            return {
                ...motor,
                [componentType]: { ...product } // Adiciona uma cópia do produto
            };
        });

        if (!assigned) {
            showNotification(`Nenhum motor compatível precisa de um ${componentType}.`, 'warning');
        }
        
        return { motors: newMotors }; // Retorna o novo array de motores
    } 
    
    // Se for um item geral (não depende de motor)
    const existingItem = state.cart.find(item => item.codigo === product.codigo);
    let newCart;

    if (existingItem) {
        // Atualiza a quantidade de um item existente
        newCart = state.cart.map(item => 
            item.codigo === product.codigo 
                ? { ...item, quantity: item.quantity + quantity } 
                : item
        );
    } else {
        // Adiciona um novo item ao carrinho
        newCart = [...state.cart, { ...product, quantity }];
    }
    
    showNotification(`${product.nome} adicionado ao painel!`);
    return { cart: newCart }; // Retorna o novo array de carrinho
}

/**
 * Remove um item geral do carrinho.
 * @param {object} state - O appState atual.
 * @param {string} productCode - O código do produto a remover.
 * @returns {object} - O novo estado com o carrinho atualizado.
 */
export function removeFromCart(state, productCode) {
    const newCart = state.cart.filter(item => item.codigo !== productCode);
    return { cart: newCart };
}

/**
 * Remove um motor da lista.
 * @param {object} state - O appState atual.
 * @param {number} motorId - O ID do motor a remover.
 * @returns {object} - O novo estado com os motores atualizados.
 */
export function removeMotor(state, motorId) {
    const newMotors = state.motors.filter(m => m.id !== motorId);
    return { motors: newMotors };
}

/**
 * Remove um componente (disjuntor/contator) de um motor.
 * @param {object} state - O appState atual.
 * @param {number} motorId - O ID do motor.
 * @param {string} componentType - 'disjuntor' ou 'contator'.
 * @returns {object} - O novo estado com os motores atualizados.
 */
export function removeComponentFromMotor(state, motorId, componentType) {
    const newMotors = state.motors.map(motor => {
        if (motor.id === motorId) {
            return {
                ...motor,
                [componentType]: null // Define o componente como nulo
            };
        }
        return motor;
    });
    return { motors: newMotors };
}
