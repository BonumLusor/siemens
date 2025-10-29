// public/js/motor.js
// Contém a lógica de negócios pura para motores.

/**
 * Cria um novo objeto motor.
 * @param {string} name - Nome do motor.
 * @param {number} power - Potência em CV.
 * @param {object} state - O appState (para obter tensão).
 * @returns {object} O novo objeto motor.
 */
export function createMotor(name, power, state) {
    return {
        id: Date.now(),
        name: name || `Motor ${state.motors.length + 1}`,
        power: power,
        current: calculateMotorCurrent(power, state.voltageType, state.voltage),
        disjuntor: null, 
        contator: null
    };
}

/**
 * Calcula a corrente de um motor com base na potência e tensão.
 * @param {number} powerCV - Potência em CV.
 * @param {string} voltageType - 'monofasica', 'bifasica', ou 'trifasica'.
 * @param {number} voltage - Tensão em Volts.
 * @returns {string} A corrente calculada, formatada com 2 casas decimais.
 */
export function calculateMotorCurrent(powerCV, voltageType, voltage) {
    const powerW = powerCV * 736;
    let current;
    if (voltageType === 'trifasica') {
        // Fórmula trifásica: I = P / (V * sqrt(3) * FP)
        current = powerW / (voltage * 1.732 * 0.85); // 0.85 = Fator de Potência estimado
    } else { 
        // Fórmula monofásica/bifásica: I = P / (V * FP)
        current = powerW / (voltage * 0.85); 
    }
    return current.toFixed(2);
}

/**
 * Recalcula a corrente para uma lista de motores (quando a tensão muda).
 * @param {Array} motors - A lista de motores.
 * @param {string} voltageType - O novo tipo de tensão.
 * @param {number} voltage - A nova tensão.
 * @returns {Array} Uma *nova* lista de motores com as correntes atualizadas.
 */
export function recalculateAllMotorCurrents(motors, voltageType, voltage) {
    return motors.map(motor => ({
        ...motor,
        current: calculateMotorCurrent(motor.power, voltageType, voltage)
    }));
}

/**
 * Verifica se um produto é compatível com um motor específico.
 * @param {object} product - O objeto do produto.
 * @param {object} motor - O objeto do motor.
 * @returns {boolean} True se for compatível, false caso contrário.
 */
export function isProductCompatibleWithMotor(product, motor) {
    const motorCurrent = parseFloat(motor.current);
    if (!product.dependente_motor) return true; // Compatível se não depende de motor
    
    // Tenta encontrar "faixa_ajuste_A" nos detalhes
    const faixaAjuste = product.faixa_ajuste_A || product.detalhes?.faixa_ajuste_A;
    if (faixaAjuste) {
        // Converte "0,11-0,16" para [0.11, 0.16]
        const parts = String(faixaAjuste).replace(/,/g, '.').split('-').map(Number);
        if (parts.length === 2 && !parts.some(isNaN)) {
            // Verifica se a corrente do motor está dentro da faixa
            return motorCurrent >= parts[0] && motorCurrent <= parts[1];
        }
    }
    
    // Tenta encontrar "corrente_ac3_A" nos detalhes
    const correnteAC3 = product.corrente_ac3_A || product.detalhes?.corrente_ac3_A;
    if (correnteAC3) {
        // Verifica se a corrente do produto é maior ou igual à do motor
        return parseFloat(correnteAC3) >= motorCurrent;
    }

    // Se não tiver informações de compatibilidade, assume-se que não é
    // (Poderia ser true se a regra de negócio for "compatível na dúvida")
    return false;
}

/**
 * Verifica a compatibilidade de um produto com *todos* os motores.
 * @param {object} product - O objeto do produto.
 * @param {Array} motors - A lista de motores.
 * @returns {object} - Um objeto { level: 'compatible'|'partial'|'incompatible', message: '...' }
 */
export function checkProductCompatibility(product, motors) {
    const compatibility = { level: 'compatible', message: '' };
    if (motors.length > 0 && product.dependente_motor) {
        const incompatibleMotors = motors
            .filter(motor => !isProductCompatibleWithMotor(product, motor))
            .map(motor => motor.name);
            
        if (incompatibleMotors.length === motors.length) {
            compatibility.level = 'incompatible';
            compatibility.message = 'Incompatível com todos os motores';
        } else if (incompatibleMotors.length > 0) {
            compatibility.level = 'partial';
            compatibility.message = `Incompatível com: ${incompatibleMotors.join(', ')}`;
        }
    }
    return compatibility;
}
