// Estado Global da Aplicação
const appState = {
    voltageType: 'monofasica',
    voltage: 220,
    motors: [], // Agora cada motor terá seus próprios componentes
    cart: [],   // O carrinho será para itens gerais (fontes, contatores aux, etc.)
    currentCategory: 'fontes',
    products: {
        fontes: [],
        disjuntores: [],
        contatoresPotencia: [],
        contatoresAuxiliares: []
    },
    filters: {},
    searchQuery: '',
    hideIncompatible: false
};

// A URL da API agora é relativa ao domínio atual.
const API_BASE_URL = '';

console.log("Sistema de Painéis Elétricos iniciado");

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupEventListeners();
    updateProjectSummary();
    renderProducts();
    loadFromLocalStorage();
});

// Carregamento dos dados via API
async function loadAllData() {
    try {
        console.log("Buscando dados da API...");
        const [fontesRes, disjuntoresRes, contatoresPotRes, contatoresAuxRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/products?category=fontes`),
            fetch(`${API_BASE_URL}/api/products?category=disjuntores`),
            fetch(`${API_BASE_URL}/api/products?category=contatoresPotencia`),
            fetch(`${API_BASE_URL}/api/products?category=contatoresAuxiliares`)
        ]);

        appState.products.fontes = await fontesRes.json();
        appState.products.disjuntores = await disjuntoresRes.json();
        appState.products.contatoresPotencia = await contatoresPotRes.json();
        appState.products.contatoresAuxiliares = await contatoresAuxRes.json();

        appState.products.fontes.forEach(p => p.tipo = 'fonte');
        appState.products.disjuntores.forEach(p => p.tipo = 'disjuntor');
        appState.products.contatoresPotencia.forEach(p => p.tipo = 'contator-potencia');
        appState.products.contatoresAuxiliares.forEach(p => p.tipo = 'contator-auxiliar');
        
        console.log("Dados carregados com sucesso pela API!");

    } catch (error) {
        console.error('Erro ao carregar dados da API:', error);
        showNotification('Falha ao conectar na API. Usando dados de demonstração.', 'danger');
        appState.products.fontes = generateMockFontes();
        appState.products.disjuntores = generateMockDisjuntores();
        appState.products.contatoresPotencia = generateMockContatoresPotencia();
        appState.products.contatoresAuxiliares = generateMockContatoresAuxiliares();
    }
}

// Funções de Mock (mantidas para fallback)
// CORREÇÃO: Dados de mock das fontes atualizados
function generateMockFontes() { 
    const fontesData = [{"descricao":"24 V DC/20 A/4 x 5 A","dimensoes":"125 x 125 x 150","corrente_saida":{"total":"20 A","por_saida":"5 A","quantidade_saidas":4},"tensao_entrada":{"AC":"100 ... 240 V","DC":"110 ... 220 V"},"grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"PSU8600 1 AC Unidade Básica","codigo":"6EP3336-8MB00-2CY0","preco":5826.14},{"descricao":"24 V CC/20 A","dimensoes":"80 x 125 x 150","corrente_saida":{"total":"20 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"PSU8600 Unidade básica 3AC","codigo":"6EP3436-8SB00-2AY0","preco":3810.69},{"descricao":"24 V CC/20 A/4 x 5 A","dimensoes":"100 x 125 x 150","corrente_saida":{"total":"20 A","por_saida":"5 A","quantidade_saidas":4},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"PSU8600 Unidade básica 3AC","codigo":"6EP3436-8MB00-2CY0","preco":5157.65},{"descricao":"24 V CC/40 A","dimensoes":"125 x 125 x 150","corrente_saida":{"total":"40 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"PSU8600 Unidade básica 3AC","codigo":"6EP3437-8SB00-2AY0","preco":4982.6},{"descricao":"24 V CC/40 A/4 x 10 A","dimensoes":"125 x 125 x 150","corrente_saida":{"total":"40 A","por_saida":"10 A","quantidade_saidas":4},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"PSU8600 Unidade básica 3AC","codigo":"6EP3437-8MB00-2CY0","preco":6575.25},{"descricao":"24 V CC/4 x 5 A","dimensoes":"60 x 125 x 150","corrente_saida":{"total":"20 A","por_saida":"5 A","quantidade_saidas":4},"tensao_entrada":"Alimentação da unidade básica PSU8600 via conexão 'System Clip Link'","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"CNX8600 Módulo de Expansão","codigo":"6EP4436-8XB00-0CY0","preco":1881.05},{"descricao":"24 V CC/4 x 10 A","dimensoes":"60 x 125 x 150","corrente_saida":{"total":"40 A","por_saida":"10 A","quantidade_saidas":4},"tensao_entrada":"Alimentação da unidade básica PSU8600 via conexão 'System Clip Link'","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"CNX8600 Módulo de Expansão","codigo":"6EP4437-8XB00-0CY0","preco":2093.32},{"descricao":"100 ms/40 A","dimensoes":"60 x 125 x 150","tensao_entrada":"N/A","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Módulo de buffer BUF8600","codigo":"6EP4297-8HB00-0XY0","preco":1738.4},{"descricao":"300 ms/40 A","dimensoes":"125 x 125 x 150","tensao_entrada":"N/A","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Módulo de buffer BUF8600","codigo":"6EP4297-8HB10-0XY0","preco":2940.64},{"descricao":"4 s/40 A","dimensoes":"60 x 125 x 150","tensao_entrada":"N/A","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Módulo de buffer BUF8600","codigo":"6EP4293-8HB00-0XY0","preco":3674.93},{"descricao":"10 s/40 A","dimensoes":"125 x 125 x 150","tensao_entrada":"N/A","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Módulo de buffer BUF8600","codigo":"6EP4295-8HB00-0XY0","preco":6412.27},{"descricao":"Módulo UPS DC UPS8600","dimensoes":"60 x 125 x 150","tensao_entrada":"N/A","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Componentes UPS","codigo":"6EP4197-8AB00-0XY0","preco":3136.7},{"descricao":"Módulo bateria BAT8600 Pb","dimensoes":"322 x 187 x 110","tensao_entrada":"Troca de energia com UPS8600","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Componentes UPS","codigo":"6EP4145-8GB00-0XY0","preco":3135.67},{"descricao":"Módulo bateria BAT8600 LiFePO4","dimensoes":"322 x 187 x 110","tensao_entrada":"Troca de energia com UPS8600","grupo":"SITOP PSU8600 – O sistema de fornecimento de energia para digitalização e Indústria 4.0","nome":"Componentes UPS","codigo":"6EP4143-8JB00-0XY0","preco":12086.44},{"descricao":"24 V CC/5 A, PSU8200","dimensoes":"45 x 125 x 125","corrente_saida":{"total":"5 A"},"tensao_entrada":"120/230 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3333-8SB00-0AY0","preco":1043.04},{"descricao":"24 V CC/10 A, PSU8200","dimensoes":"55 x 125 x 125","corrente_saida":{"total":"10 A"},"tensao_entrada":"120/230 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3334-8SB00-0AY0","preco":1355.23},{"descricao":"24 V CC/5 A, PSU200M","dimensoes":"70 x 125 x 125","corrente_saida":{"total":"5 A"},"tensao_entrada":"120 ... 230/230 ... 500 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP1333-3BA10","preco":1153.3},{"descricao":"24 V CC/10 A, PSU200M","dimensoes":"70 x 125 x 125","corrente_saida":{"total":"10 A"},"tensao_entrada":"120 ... 230/230 ... 500 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP1334-3BA10","preco":1510.33},{"descricao":"24 V CC/20 A, PSU8200","dimensoes":"90 x 125 x 125","corrente_saida":{"total":"20 A"},"tensao_entrada":"120/230 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP1336-3BA10","preco":1985.81},{"descricao":"24 V CC/40 A, PSU8200","dimensoes":"145 x 145 x 150","corrente_saida":{"total":"40 A"},"tensao_entrada":"120/230 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3337-8SB00-0AY0","preco":3081.22},{"descricao":"24 V CC/40 A, PSU8200 Ex","dimensoes":"145 x 145 x 150","corrente_saida":{"total":"40 A"},"tensao_entrada":"120/230 V CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3337-8SC00-0AY0","preco":4718.66},{"descricao":"24 V CC/20 A, PSU8200","dimensoes":"70 x 125 x 125","corrente_saida":{"total":"20 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3436-8SB00-0AY0","preco":1737.02},{"descricao":"24 V CC/40 A, PSU8200","dimensoes":"135 x 145 x 150","corrente_saida":{"total":"40 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3437-8SB00-0AY0","preco":2519.21},{"descricao":"36 V CC/13 A, PSU8200","dimensoes":"70 x 125 x 125","corrente_saida":{"total":"13 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3446-8SB10-0AY0","preco":1919.64},{"descricao":"48 V CC/10 A, PSU8200","dimensoes":"70 x 125 x 125","corrente_saida":{"total":"10 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3446-8SB00-0AY0","preco":1900.36},{"descricao":"48 V CC/20 A, PSU8200","dimensoes":"135 x 145 x 150","corrente_saida":{"total":"20 A"},"tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU8200 – Fonte de alimentação tecnológica para soluções exigentes","nome":"PSU8200 / PSU200M","codigo":"6EP3447-8SB00-0AY0","preco":3215.26},{"descricao":"12 V CC/2 A, PSU6200","dimensoes":"25 x 100 x 88","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3321-7SB00-0AX0","preco":517.21},{"descricao":"24 V CC/1,3 A, PSU6200","dimensoes":"25 x 100 x 88","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3331-7SB00-0AX0","preco":395.23},{"descricao":"24 V CC/2,5 A, PSU6200","dimensoes":"40 x 100 x 88","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3332-7SB00-0AX0","preco":517.21},{"descricao":"12 V CC/7 A, PSU6200","dimensoes":"35 x 135 x 125","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3323-7SB00-0AX0","preco":1064.4},{"descricao":"24 V CC/3.7 A, NEC Clase 2, PSU6200","dimensoes":"35 x 135 x 125","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3333-7LB00-0AX0","preco":912.78},{"descricao":"24 V CC/5 A, PSU6200","dimensoes":"35 x 135 x 125","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3333-7SB00-0AX0","preco":827.34},{"descricao":"24 V CC/5 A, PSU6200 Ex","dimensoes":"35 x 135 x 125","tensao_entrada":"120 ... 230 V CA/120 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3333-7SC00-0AX0","preco":1286.66},{"descricao":"12 V CC/12 A, PSU6200","dimensoes":"45 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3324-7SB00-3AX0","preco":1480.65},{"descricao":"24 V CC/10 A, PSU6200","dimensoes":"45 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3334-7SB00-3AX0","preco":1245.31},{"descricao":"24 V CC/10 A, PSU6200 Ex","dimensoes":"45 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3334-7SC00-3AX0","preco":1911.73},{"descricao":"48 V CC/5 A, PSU6200","dimensoes":"45 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3344-7SB00-3AX0","preco":1358.33},{"descricao":"24 V CC/20 A, PSU6200","dimensoes":"70 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3336-7SB00-3AX0","preco":1703.94},{"descricao":"24 V CC/20 A, PSU6200 Ex","dimensoes":"70 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3336-7SC00-3AX0","preco":3324.15},{"descricao":"48 V CC/10 A, PSU6200","dimensoes":"70 x 135 x 125","tensao_entrada":"120 ... 230V CA/110 ... 240 V CC","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3346-7SB00-3AX0","preco":1511.88},{"descricao":"24 V CC/5 A, PSU6200","dimensoes":"35 x 135 x 125","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3433-7SB00-0AX0","preco":1116.09},{"descricao":"24 V CC/5 A, PSU6200 Ex","dimensoes":"35 x 135 x 125","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3433-7SC00-0AX0","preco":1940.32},{"descricao":"24 V CC/10 A, PSU6200","dimensoes":"45 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3434-7SB00-3AX0","preco":1391.75},{"descricao":"24 V CC/10 A, PSU6200 Ex","dimensoes":"45 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3434-7SC00-3AX0","preco":2421.7},{"descricao":"48 V CC/5 A, PSU6200","dimensoes":"45 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3444-7SB00-3AX0","preco":1660.18},{"descricao":"24 V CC/20 A, PSU6200","dimensoes":"70 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3436-7SB00-3AX0","preco":1588.85},{"descricao":"24 V CC/20 A, PSU6200 Ex","dimensoes":"70 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3436-7SC00-3AX0","preco":2989.57},{"descricao":"48 V CC/10 A, PSU6200","dimensoes":"70 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3446-7SB00-3AX0","preco":1918.61},{"descricao":"24 V CC/40 A, PSU6200","dimensoes":"95 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3437-7SB00-3AX0","preco":2298.34},{"descricao":"24 V CC/40 A, PSU6200 Ex","dimensoes":"95 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3437-7SC00-3AX0","preco":4002.97},{"descricao":"48 V CC/20 A, PSU6200","dimensoes":"95 x 135 x 155","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU6200 – A fonte de alimentação multifuncional para uma ampla variedade de aplicações","nome":"PSU6200","codigo":"6EP3447-7SB00-3AX0","preco":2809.7},{"descricao":"12 V CC/7 A, PSU100S","dimensoes":"50 x 125 x 120","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1322-2BA00","preco":1011.68},{"descricao":"12 V CC/14 A, PSU100S","dimensoes":"70 x 125 x 120","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1323-2BA00","preco":1404.51},{"descricao":"24 V CC/2,5 A, PSU100S","dimensoes":"32.5 x 125 x 120","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1332-2BA20","preco":619.9},{"descricao":"24 V CC/5 A, PSU100S","dimensoes":"50 x 125 x 120","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1333-2BA20","preco":816.65},{"descricao":"24 V CC/10 A, PSU100S","dimensoes":"70 x 125 x 120","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1334-2BA20","preco":1137.8},{"descricao":"24 V CC/20 A, PSU100S","dimensoes":"115 x 145 x 150","tensao_entrada":"120/230 V CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1336-2BA10","preco":1524.08},{"descricao":"24 V CC/5 A, PSU300S","dimensoes":"50 x 125 x 120","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1433-2BA20","preco":944.14},{"descricao":"24 V CC/10 A, PSU300S","dimensoes":"70 x 125 x 120","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1434-2BA20","preco":1262.19},{"descricao":"24 V CC/20 A, PSU300S","dimensoes":"90 x 145 x 150","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1436-2BA10","preco":1414.5},{"descricao":"24 V CC/40 A, PSU300S","dimensoes":"150 x 145 x 150","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP smart – Poderosa fonte de alimentação padrão","nome":"PSU100S / PSU300S","codigo":"6EP1437-2BA20","preco":2070.57},{"descricao":"24 V CC/3 A, PSU4200","dimensoes":"50 x 135 x 125","tensao_entrada":"120/230 V CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3332-3SB00-0AX0","preco":236.93},{"descricao":"24 V CC/5 A, PSU4200","dimensoes":"50 x 135 x 125","tensao_entrada":"120/230 V CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3333-3SB00-0AX0","preco":290.32},{"descricao":"24 V CC/10 A, PSU4200","dimensoes":"70 x 135 x 125","tensao_entrada":"120/230 V CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3334-3SB00-0AX0","preco":409.34},{"descricao":"24 V CC/20 A, PSU4200","dimensoes":"70 x 135 x 125","tensao_entrada":"120/230 V CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3336-3SB00-0AX0","preco":668.15},{"descricao":"24 V CC/10 A, PSU4200","dimensoes":"70 x 135 x 125","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3434-3SB00-0AX0","preco":556.8},{"descricao":"24 V CC/20 A, PSU4200","dimensoes":"95 x 135 x 150","tensao_entrada":"400 ... 500 V 3 CA","grupo":"SITOP PSU4200","nome":"PSU4200","codigo":"6EP3436-3SB00-0AX0","preco":752.39}];
    fontesData.forEach(f => f.tipo = 'fonte');
    return fontesData;
}

function generateMockDisjuntores() { 
    const disjuntoresData = [{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,11-0,16","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0AA10","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,14-0,2","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0BA10","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,22-0,32","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0CA10","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,28-0,4","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0DA10","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,35-0,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0EA10","preco":174.48},{"tipo_conexao":"mola","faixa_ajuste_A":"0,35-0,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0FA20","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,45-0,63","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0FA10","preco":174.48},{"tipo_conexao":"mola","faixa_ajuste_A":"0,45-0,63","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0GA20","preco":174.48},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,55-0,8","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0GA10","preco":184.42},{"tipo_conexao":"mola","faixa_ajuste_A":"0,55-0,8","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0HA20","preco":184.42},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,7-1","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0HA10","preco":184.42},{"tipo_conexao":"mola","faixa_ajuste_A":"0,7-1","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0JA20","preco":184.42},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0,9-1,25","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0JA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"0,9-1,25","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0KA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1,1-1,6","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-0KA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"1,1-1,6","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1AA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1,4-2","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1AA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"1,4-2","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1BA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1,8-2,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1BA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"1,8-2,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1CA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"2,2-3,2","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1DA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"2,2-3,2","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1DA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"2,8-4","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1EA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"2,8-4","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1EA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"3,5-5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1FA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"3,5-5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1FA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"4,5-6,3","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1GA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"4,5-6,3","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1GA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"5,5-8","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1HA10","preco":200.8},{"tipo_conexao":"mola","faixa_ajuste_A":"5,5-8","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1HA20","preco":200.8},{"tipo_conexao":"parafuso","faixa_ajuste_A":"7-10","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1JA10","preco":235.11},{"tipo_conexao":"mola","faixa_ajuste_A":"7-10","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1JA20","preco":235.11},{"tipo_conexao":"parafuso","faixa_ajuste_A":"9-12,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1KA10","preco":235.11},{"tipo_conexao":"mola","faixa_ajuste_A":"9-12,5","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-1KA20","preco":235.11},{"tipo_conexao":"parafuso","faixa_ajuste_A":"10-16","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-4AA10","preco":235.11},{"tipo_conexao":"mola","faixa_ajuste_A":"10-16","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S00, Classe 10 (até 16A)","codigo":"3RV2011-4AA20","preco":235.11},{"tipo_conexao":"parafuso","faixa_ajuste_A":"13-20","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4BA10","preco":263.75},{"tipo_conexao":"mola","faixa_ajuste_A":"13-20","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4BA20","preco":263.75},{"tipo_conexao":"parafuso","faixa_ajuste_A":"16-22","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4CA10","preco":281.86},{"tipo_conexao":"mola","faixa_ajuste_A":"16-22","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4CA20","preco":281.86},{"tipo_conexao":"parafuso","faixa_ajuste_A":"18-25","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4DA10","preco":330.49},{"tipo_conexao":"mola","faixa_ajuste_A":"18-25","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4DA20","preco":330.49},{"tipo_conexao":"parafuso","faixa_ajuste_A":"23-28","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4NA10","preco":523.6},{"tipo_conexao":"mola","faixa_ajuste_A":"23-28","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4NA20","preco":523.6},{"tipo_conexao":"parafuso","faixa_ajuste_A":"27-32","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4EA10","preco":523.6},{"tipo_conexao":"mola","faixa_ajuste_A":"27-32","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4EA20","preco":523.6},{"tipo_conexao":"parafuso","faixa_ajuste_A":"34-40","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S0, Classe 10 (até 40A)","codigo":"3RV2021-4FA10","preco":603.02},{"faixa_ajuste_A":"32-40","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S2, Classe 10 (até 80A)","codigo":"3RV2031-4UA10","preco":683.42},{"faixa_ajuste_A":"35-45","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S2, Classe 10 (até 80A)","codigo":"3RV2031-4VA10","preco":821.79},{"faixa_ajuste_A":"42-52","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S2, Classe 10 (até 80A)","codigo":"3RV2031-4WA10","preco":821.79},{"faixa_ajuste_A":"54-65","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S2, Classe 10 (até 80A)","codigo":"3RV2031-4JA10","preco":845.3},{"faixa_ajuste_A":"62-73","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S2, Classe 10 (até 80A)","codigo":"3RV2031-4KA10","preco":929.64},{"faixa_ajuste_A":"65-84","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S3, Classe 10 (até 100A)","codigo":"3RV2041-4RA10","preco":1021.49},{"faixa_ajuste_A":"80-100","grupo":"Disjuntores-motores SIRIUS 3RV2 para proteção de motores","nome":"Tamanho S3, Classe 10 (até 100A)","codigo":"3RV2041-4MA10","preco":1057},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.11-0.16","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0AA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.11-0.16","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0AA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.14-0.2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0BA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.14-0.2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0BA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.18-0.25","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0CA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.18-0.25","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0CA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.22-0.32","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0DA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.22-0.32","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0DA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.28-0.4","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0EA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.28-0.4","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0EA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.35-0.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0FA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.35-0.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0FA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.45-0.63","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0GA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.45-0.63","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0GA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.55-0.8","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0HA10","preco":237.27},{"tipo_conexao":"mola","faixa_ajuste_A":"0.55-0.8","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0HA20","preco":237.27},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.7-1","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0JA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"0.7-1","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0JA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"0.9-1.25","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0KA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"0.9-1.25","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-0KA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1.1-1.6","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1AA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"1.1-1.6","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1AA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1.4-2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1BA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"1.4-2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1BA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"1.8-2.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1CA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"1.8-2.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1CA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"2.2-3.2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1DA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"2.2-3.2","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1DA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"2.8-4","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1EA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"2.8-4","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1EA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"3.5-5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1FA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"3.5-5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1FA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"4.5-6.3","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1GA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"4.5-6.3","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1GA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"5.5-8","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1HA10","preco":251.36},{"tipo_conexao":"mola","faixa_ajuste_A":"5.5-8","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1HA20","preco":251.36},{"tipo_conexao":"parafuso","faixa_ajuste_A":"7-10","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1JA10","preco":277.57},{"tipo_conexao":"mola","faixa_ajuste_A":"7-10","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1JA20","preco":277.57},{"tipo_conexao":"parafuso","faixa_ajuste_A":"9-12.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1KA10","preco":277.57},{"tipo_conexao":"mola","faixa_ajuste_A":"9-12.5","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-1KA20","preco":277.57},{"tipo_conexao":"parafuso","faixa_ajuste_A":"10-16","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-4AA10","preco":277.57},{"tipo_conexao":"mola","faixa_ajuste_A":"10-16","grupo":"Disjuntores SIRIUS 3RV2 para Proteção de transformadores","nome":"Tamanho S00 e S0","codigo":"3RV2411-4AA20","preco":277.57}];
    disjuntoresData.forEach(d => d.tipo = 'disjuntor');
    return disjuntoresData;
}

// CORREÇÃO: Dados de mock dos contatores de potência atualizados
function generateMockContatoresPotencia() { 
    const contatoresData = [{"dimensoes_mm":"45 x 74.4 x 81.8","corrente_ac1_A":25,"corrente_ac3_A":9,"potencia_motor_cv_kw":{"v220":"3/2.2","v380":"5/3,7","v440":"6/4,5"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 0","codigo":"3MT7010-0AA10-0AN2","preco":60.67},{"dimensoes_mm":"45 x 74.4 x 81.8","corrente_ac1_A":25,"corrente_ac3_A":12,"potencia_motor_cv_kw":{"v220":"4/3","v380":"7,5/5.5","v440":"10/7.5"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 0","codigo":"3MT7012-0AA10-0AN2","preco":65.97},{"dimensoes_mm":"45.5 x 74.5 x 86.6","corrente_ac1_A":32,"corrente_ac3_A":18,"potencia_motor_cv_kw":{"v220":"5/3,7","v380":"10/7,5","v440":"12,5/9,2"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 1","codigo":"3MT7018-1AA10-0AN2","preco":69.3},{"dimensoes_mm":"45.5 x 74.5 x 86.6","corrente_ac1_A":32,"corrente_ac3_A":22,"potencia_motor_cv_kw":{"v220":"6/4,5","v380":"12,5/9","v440":"15/11"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 1","codigo":"3MT7022-1AA10-0AN2","preco":97.45},{"dimensoes_mm":"56.0 x 82.9 x 95.0","corrente_ac1_A":40,"corrente_ac3_A":25,"potencia_motor_cv_kw":{"v220":"7,5/5,5","v380":"15/11","v440":"20/15"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 2","codigo":"3MT7025-2AA10-0AN2","preco":102.99},{"dimensoes_mm":"56.0 x 82.9 x 95.0","corrente_ac1_A":40,"corrente_ac3_A":32,"potencia_motor_cv_kw":{"v220":"12,5/9,2","v380":"20/15","v440":"25/18,5"},"contatos_auxiliares_integrados":{"NA":1,"NF":0},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 2","codigo":"3MT7032-2AA10-0AN2","preco":144.28},{"dimensoes_mm":"74.5 x 127.4 x 112.6","corrente_ac1_A":50,"corrente_ac3_A":40,"potencia_motor_cv_kw":{"v220":"15/11","v380":"25/18.5","v440":"30/22"},"contatos_auxiliares_integrados":{"NA":1,"NF":1},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 3","codigo":"3MT7040-3AA11-0AN2","preco":182.36},{"dimensoes_mm":"74.5 x 127.4 x 112.6","corrente_ac1_A":50,"corrente_ac3_A":50,"potencia_motor_cv_kw":{"v220":"20/15","v380":"30/22","v440":"40/30"},"contatos_auxiliares_integrados":{"NA":1,"NF":1},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 3","codigo":"3MT7050-3AA11-0AN2","preco":290.51},{"dimensoes_mm":"74.5 x 127.4 x 112.6","corrente_ac1_A":80,"corrente_ac3_A":65,"potencia_motor_cv_kw":{"v220":"25/18,5","v380":"40/30","v440":"50/37"},"contatos_auxiliares_integrados":{"NA":1,"NF":1},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 3","codigo":"3MT7065-3AA11-0AN2","preco":319.69},{"dimensoes_mm":"84.5 x 127.4 x 121.3","corrente_ac1_A":125,"corrente_ac3_A":80,"potencia_motor_cv_kw":{"v220":"30/22","v380":"50/37","v440":"60/45"},"contatos_auxiliares_integrados":{"NA":1,"NF":1},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 4","codigo":"3MT7080-4AA11-0AN2","preco":434.29},{"dimensoes_mm":"84.5 x 127.4 x 121.3","corrente_ac1_A":125,"corrente_ac3_A":95,"potencia_motor_cv_kw":{"v220":"40/30","v380":"60/45","v440":"75/55"},"contatos_auxiliares_integrados":{"NA":1,"NF":1},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 4","codigo":"3MT7095-4AA11-0AN2","preco":624.29},{"dimensoes_mm":"120.0 x 150.0 x 150.0","corrente_ac1_A":160,"corrente_ac3_A":120,"potencia_motor_cv_kw":{"v220":"50/37","v380":"75/55","v440":"100/75"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 5","codigo":"3MT7120-5AA00-0AN2","preco":740.37},{"dimensoes_mm":"135.0 x 180.0 x 185.0","corrente_ac1_A":210,"corrente_ac3_A":170,"potencia_motor_cv_kw":{"v220":"60/45","v380":"100/75","v440":"125/90"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 6","codigo":"3MT7170-6AA00-0AN2","preco":1205.84},{"dimensoes_mm":"135.0 x 180.0 x 185.0","corrente_ac1_A":220,"corrente_ac3_A":205,"potencia_motor_cv_kw":{"v220":"75/55","v380":"125/90","v440":"150/110"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 6","codigo":"3MT7205-6AA00-0AN2","preco":1483.61},{"dimensoes_mm":"150.0 x 205.0 x 198.0","corrente_ac1_A":300,"corrente_ac3_A":250,"potencia_motor_cv_kw":{"v220":"100/75","v380":"175/132","v440":"200/150"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 7","codigo":"3MT7250-7AA00-0AN2","preco":2300.97},{"dimensoes_mm":"150.0 x 205.0 x 198.0","corrente_ac1_A":300,"corrente_ac3_A":300,"potencia_motor_cv_kw":{"v220":"125/90","v380":"200/150","v440":"250/185"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 7","codigo":"3MT7300-7AA00-0AN2","preco":2908.02},{"dimensoes_mm":"160.0 x 204.0 x 222.0","corrente_ac1_A":400,"corrente_ac3_A":400,"potencia_motor_cv_kw":{"v220":"150/110","v380":"250/185","v440":"300/220"},"contatos_auxiliares_integrados":{},"grupo":"Contatores de potência SMART 3MT7","nome":"Tamanho 8","codigo":"3MT7400-8AA00-0AN2","preco":3519.06}];
    contatoresData.forEach(c => c.tipo = 'contator-potencia');
    return contatoresData;
}

function generateMockContatoresAuxiliares() { return [{ grupo: "Contatores SIRIUS 3RH2", nome: "Contator Auxiliar 4NA", codigo: "3RH2140-2AN20", preco: 180, tipo: 'contator-auxiliar' }]; }


// Event Listeners
function setupEventListeners() {
    document.querySelectorAll('input[name="voltageType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.voltageType = e.target.value;
            // Recalcula a corrente de todos os motores ao mudar a configuração
            appState.motors.forEach(motor => {
                motor.current = calculateMotorCurrent(motor.power);
                // Revalida os componentes existentes
                if (motor.disjuntor && !isProductCompatibleWithMotor(motor.disjuntor, motor)) {
                    showNotification(`Disjuntor de ${motor.name} se tornou incompatível.`, 'warning');
                    motor.disjuntor = null;
                }
                if (motor.contator && !isProductCompatibleWithMotor(motor.contator, motor)) {
                    showNotification(`Contator de ${motor.name} se tornou incompatível.`, 'warning');
                    motor.contator = null;
                }
            });
            updateMotorList();
            updateCart();
            updateProjectSummary();
            renderProducts();
            saveToLocalStorage();
        });
    });

    document.getElementById('voltage').addEventListener('change', (e) => {
        appState.voltage = parseInt(e.target.value);
        // Recalcula a corrente de todos os motores ao mudar a configuração
        appState.motors.forEach(motor => {
            motor.current = calculateMotorCurrent(motor.power);
            // Revalida os componentes existentes
            if (motor.disjuntor && !isProductCompatibleWithMotor(motor.disjuntor, motor)) {
                showNotification(`Disjuntor de ${motor.name} se tornou incompatível.`, 'warning');
                motor.disjuntor = null;
            }
            if (motor.contator && !isProductCompatibleWithMotor(motor.contator, motor)) {
                showNotification(`Contator de ${motor.name} se tornou incompatível.`, 'warning');
                motor.contator = null;
            }
        });
        updateMotorList();
        updateCart();
        updateProjectSummary();
        renderProducts();
        saveToLocalStorage();
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            appState.currentCategory = e.target.dataset.category;
            renderProducts();
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase();
        renderProducts();
    });

    document.getElementById('hideIncompatible').addEventListener('change', (e) => {
        appState.hideIncompatible = e.target.checked;
        renderProducts();
        saveToLocalStorage();
    });

    document.getElementById('motorPower').addEventListener('keypress', (e) => { if (e.key === 'Enter') addMotor(); });
    document.getElementById('motorName').addEventListener('keypress', (e) => { if (e.key === 'Enter') addMotor(); });
}


// --- LÓGICA DE MOTORES (MODIFICADA) ---
function addMotor() {
    const motorPower = parseFloat(document.getElementById('motorPower').value);
    const motorName = document.getElementById('motorName').value.trim();
    
    if (motorPower && motorPower > 0) {
        const motorDisplayName = motorName || `Motor ${appState.motors.length + 1}`;
        
        // Adiciona placeholders para os componentes obrigatórios
        appState.motors.push({
            id: Date.now(),
            name: motorDisplayName,
            power: motorPower,
            current: calculateMotorCurrent(motorPower),
            disjuntor: null,
            contator: null
        });
        
        document.getElementById('motorPower').value = '';
        document.getElementById('motorName').value = '';
        updateMotorList();
        updateProjectSummary();
        renderProducts();
        saveToLocalStorage();
        showNotification(`${motorDisplayName} adicionado com sucesso!`);
    } else {
        showNotification('Insira uma potência válida para o motor!', 'warning');
    }
}

function removeMotor(id) {
    const motor = appState.motors.find(m => m.id === id);
    appState.motors = appState.motors.filter(m => m.id !== id);
    updateMotorList();
    updateProjectSummary();
    updateCart(); // Atualiza o carrinho pois os componentes do motor são removidos
    renderProducts();
    saveToLocalStorage();
    if (motor) showNotification(`${motor.name} removido!`, 'info');
}

function calculateMotorCurrent(powerCV) {
    const powerW = powerCV * 736;
    let current;
    if (appState.voltageType === 'trifasica') {
        current = powerW / (appState.voltage * 1.732 * 0.85);
    } else if (appState.voltageType === 'bifasica') {
        current = powerW / (appState.voltage * 1.414 * 0.85);
    } else {
        current = powerW / (appState.voltage * 0.85);
    }
    return current.toFixed(2);
}

// ATUALIZADO: Renderiza a lista de motores com seus componentes
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
                        ${motor.disjuntor 
                            ? `<span>${motor.disjuntor.nome} <button class="btn btn-danger" onclick="removeComponentFromMotor(${motor.id}, 'disjuntor')">x</button></span>` 
                            : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                    <div class="motor-component-item">
                        <span>Contator:</span>
                        ${motor.contator 
                            ? `<span>${motor.contator.nome} <button class="btn btn-danger" onclick="removeComponentFromMotor(${motor.id}, 'contator')">x</button></span>`
                            : `<span style="color: var(--danger);">Pendente</span>`}
                    </div>
                </div>
                <button class="btn btn-danger" onclick="removeMotor(${motor.id})">Remover</button>
            </div>
        `).join('');
    }
}


function removeComponentFromMotor(motorId, componentType) {
    const motor = appState.motors.find(m => m.id === motorId);
    if (motor) {
        motor[componentType] = null;
        updateMotorList();
        updateCart();
        saveToLocalStorage();
    }
}

// --- LÓGICA DE COMPATIBILIDADE (MODIFICADA) ---
// Verifica compatibilidade de um produto com um motor específico
function isProductCompatibleWithMotor(product, motor) {
    const motorCurrent = parseFloat(motor.current);

    if (product.tipo === 'contator-potencia') {
        // CORREÇÃO: Lê a corrente de `corrente_ac3_A`
        return product.corrente_ac3_A >= motorCurrent;
    } 
    
    if (product.tipo === 'disjuntor') {
        // Lê a faixa de `faixa_ajuste_A` e `faixaAjuste` para retrocompatibilidade
        const faixaAjusteValue = product.faixa_ajuste_A || product.faixaAjuste;
        const faixa = String(faixaAjusteValue || '').replace(/,/g, '.');
        const parts = faixa.split('-').map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (parts.length === 2) {
            const [minA, maxA] = parts;
            // A corrente do motor deve estar dentro da faixa de ajuste do disjuntor.
            return motorCurrent >= minA && motorCurrent <= maxA;
        }
        // Se a faixa não puder ser lida, considera-se incompatível por segurança.
        return false;
    }
    
    // Para qualquer outro tipo de produto (fonte, contator auxiliar),
    // a compatibilidade não depende da corrente do motor, então retorna true.
    return true; 
}

// Verifica a compatibilidade geral para a UI (cards)
function checkProductCompatibility(product) {
    const compatibility = { isCompatible: true, level: 'compatible', message: '' };

    if (appState.motors.length > 0 && (product.tipo === 'contator-potencia' || product.tipo === 'disjuntor')) {
        const incompatibleMotors = appState.motors
            .filter(motor => !isProductCompatibleWithMotor(product, motor))
            .map(motor => motor.name);

        if (incompatibleMotors.length === appState.motors.length) {
            compatibility.isCompatible = false;
            compatibility.level = 'incompatible';
            compatibility.message = 'Incompatível com todos os motores';
        } else if (incompatibleMotors.length > 0) {
            compatibility.isCompatible = false; // Parcialmente compatível ainda é "não totalmente compatível"
            compatibility.level = 'partial';
            compatibility.message = `Incompatível com: ${incompatibleMotors.join(', ')}`;
        }
    } else if (product.tipo === 'fonte') {
        // Lógica para fontes
        const entrada = product.tensao_entrada || product.tensaoEntrada;
        let tensaoStr = '';
        if (typeof entrada === 'string') {
            tensaoStr = entrada;
        } else if (typeof entrada === 'object') {
            tensaoStr = (entrada.AC || '') + ' ' + (entrada.DC || '');
        }

        if (appState.voltageType === 'trifasica' && !tensaoStr.includes('3') && appState.voltage >= 380) {
            compatibility.isCompatible = false;
            compatibility.level = 'incompatible';
            compatibility.message = 'Fonte não compatível com alimentação trifásica';
        }
        if ((appState.voltageType === 'monofasica' || appState.voltageType === 'bifasica') && tensaoStr.includes('400 ... 500 V 3')) {
            compatibility.isCompatible = false;
            compatibility.level = 'incompatible';
            compatibility.message = 'Fonte trifásica não compatível com alimentação mono/bifásica';
        }
    }

    return compatibility;
}

// --- LÓGICA DO CARRINHO (REESTRUTURADA) ---
function addToCart(productCode) {
    const allProducts = [
        ...appState.products.fontes,
        ...appState.products.disjuntores,
        ...appState.products.contatoresPotencia,
        ...appState.products.contatoresAuxiliares
    ];
    const product = allProducts.find(p => p.codigo === productCode);
    if (!product) return;

    // Lógica para disjuntores e contatores de potência
    if (product.tipo === 'disjuntor' || product.tipo === 'contator-potencia') {
        const componentType = product.tipo === 'disjuntor' ? 'disjuntor' : 'contator';
        
        let assigned = false;
        // Tenta atribuir ao primeiro motor compatível que precisa deste componente
        for (const motor of appState.motors) {
            if (!motor[componentType] && isProductCompatibleWithMotor(product, motor)) {
                motor[componentType] = { ...product }; // Atribui uma cópia do produto
                showNotification(`${product.nome} foi atribuído ao ${motor.name}.`, 'success');
                assigned = true;
                break; // Para após a primeira atribuição bem-sucedida
            }
        }

        if (!assigned) {
            showNotification(`Nenhum motor compatível que precise de um ${componentType} foi encontrado.`, 'warning');
        }

    } else { // Lógica para outros itens (fontes, contatores auxiliares)
        const quantity = parseInt(document.getElementById(`qty-${productCode}`).value) || 1;
        const existingItem = appState.cart.find(item => item.codigo === productCode);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            appState.cart.push({ ...product, quantity });
        }
        showNotification(`${product.nome} adicionado ao painel!`);
    }

    updateMotorList();
    updateCart();
    saveToLocalStorage();
}

function removeFromCart(productCode) {
    appState.cart = appState.cart.filter(item => item.codigo !== productCode);
    updateCart();
    saveToLocalStorage();
}

function updateCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');
    const cartTotalEl = document.getElementById('cartTotal');

    // Itens gerais (fontes, etc.)
    const generalItems = appState.cart.map(item => ({ ...item, quantity: item.quantity || 1 }));
    
    // Itens dos motores
    const motorItems = [];
    appState.motors.forEach(motor => {
        if (motor.disjuntor) {
            motorItems.push({ ...motor.disjuntor, quantity: 1, motorOwner: motor.name });
        }
        if (motor.contator) {
            motorItems.push({ ...motor.contator, quantity: 1, motorOwner: motor.name });
        }
    });

    const allItems = [...generalItems, ...motorItems];
    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalQuantity;

    if (allItems.length === 0) {
        cartItemsEl.innerHTML = '<div class="empty-state">Nenhum componente selecionado</div>';
        cartTotalEl.style.display = 'none';
    } else {
        cartItemsEl.innerHTML = allItems.map(item => {
            const isMotorComponent = !!item.motorOwner;
            return `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.nome}</div>
                    ${!isMotorComponent ? `<button class="btn btn-danger" onclick="removeFromCart('${item.codigo}')">×</button>` : ''}
                </div>
                <div class="cart-item-details">
                    Código: ${item.codigo}<br>
                    Quantidade: ${item.quantity}
                    ${isMotorComponent ? `<br><strong>Para Motor: ${item.motorOwner}</strong>` : ''}
                </div>
                <div class="cart-item-price">
                    Total: R$ ${(item.preco * item.quantity).toFixed(2)}
                </div>
            </div>
        `}).join('');

        const total = allItems.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
        document.getElementById('subtotal').textContent = `R$ ${total.toFixed(2)}`;
        document.getElementById('grandTotal').textContent = `R$ ${total.toFixed(2)}`;
        cartTotalEl.style.display = 'block';
    }
}


// --- LÓGICA DE EXPORTAÇÃO (ATUALIZADA) ---
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
    
    let total = appState.cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

    const date = new Date().toLocaleDateString('pt-BR');
    let content = `LISTA DE COMPONENTES - PAINEL ELÉTRICO\nData: ${date}\n\n`;
    content += `CONFIGURAÇÃO DO PROJETO:\n`;
    content += `Tipo: ${appState.voltageType}\nTensão: ${appState.voltage}V\nTotal de Motores: ${appState.motors.length}\n`;
    content += `Potência Total: ${appState.motors.reduce((sum, m) => sum + m.power, 0).toFixed(1)} CV\n\n`;

    if(appState.motors.length > 0) {
        content += `MOTORES E COMPONENTES ASSOCIADOS:\n${'='.repeat(60)}\n`;
        appState.motors.forEach((motor, index) => {
            content += `${index + 1}. MOTOR: ${motor.name} (${motor.power} CV / ${motor.current}A)\n`;
            content += `   - Disjuntor: ${motor.disjuntor.nome} (Código: ${motor.disjuntor.codigo}) - R$ ${motor.disjuntor.preco.toFixed(2)}\n`;
            content += `   - Contator:  ${motor.contator.nome} (Código: ${motor.contator.codigo}) - R$ ${motor.contator.preco.toFixed(2)}\n\n`;
            total += motor.disjuntor.preco + motor.contator.preco;
        });
    }
    
    if(appState.cart.length > 0) {
        content += `OUTROS COMPONENTES:\n${'='.repeat(60)}\n`;
        appState.cart.forEach(item => {
            content += `${item.nome}\n`;
            content += `  Código: ${item.codigo}\n`;
            content += `  Quantidade: ${item.quantity}\n`;
            content += `  Preço Unit.: R$ ${item.preco.toFixed(2)}\n`;
            content += `  Subtotal: R$ ${(item.preco * item.quantity).toFixed(2)}\n\n`;
        });
    }

    content += `\nTOTAL GERAL DO PAINEL: R$ ${total.toFixed(2)}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `painel_eletrico_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    showNotification('Lista exportada com sucesso!');
}


// --- Funções de Renderização e Filtros (sem grandes alterações) ---
function updateProjectSummary() {
    document.getElementById('summaryType').textContent = appState.voltageType.charAt(0).toUpperCase() + appState.voltageType.slice(1);
    document.getElementById('summaryVoltage').textContent = appState.voltage + 'V';
    document.getElementById('summaryMotors').textContent = appState.motors.length;
    const totalPower = appState.motors.reduce((sum, motor) => sum + motor.power, 0);
    document.getElementById('summaryPower').textContent = totalPower.toFixed(1) + ' CV';
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    let products = [];

    switch (appState.currentCategory) {
        case 'fontes':
            products = appState.products.fontes;
            break;
        case 'disjuntores':
            products = appState.products.disjuntores;
            break;
        case 'contatores-potencia':
            products = appState.products.contatoresPotencia;
            break;
        case 'contatores-auxiliares':
            products = appState.products.contatoresAuxiliares;
            break;
        default:
            products = [];
    }

    if (appState.searchQuery) {
        products = products.filter(p =>
            (p.codigo || '').toLowerCase().includes(appState.searchQuery) ||
            (p.nome || '').toLowerCase().includes(appState.searchQuery) ||
            (p.descricao || '').toLowerCase().includes(appState.searchQuery)
        );
    }
    
    if (appState.hideIncompatible && appState.motors.length > 0) {
        products = products.filter(product => checkProductCompatibility(product).level !== 'incompatible');
    }

    if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
    } else {
        grid.innerHTML = products.map(product => {
            const compatibility = checkProductCompatibility(product);
            let cardClass = 'product-card';
            let badgeHTML = '';

            if (compatibility.level === 'incompatible') {
                cardClass += ' incompatible';
                badgeHTML = '<div class="incompatible-badge danger">⚠️ Incompatível</div>';
            } else if (compatibility.level === 'partial') {
                cardClass += ' partial-compatible';
                badgeHTML = '<div class="incompatible-badge warning">⚠️ Parcial</div>';
            }

            return `
                <div class="${cardClass}" title="${compatibility.message}">
                    ${badgeHTML}
                    <div class="product-name">${product.nome}</div>
                    <div class="product-specs">${getProductSpecs(product)}</div>
                    <div class="product-code">Código: ${product.codigo}</div>
                    <div class="product-specs">Preço: R$ ${product.preco.toFixed(2)}</div>
                    ${compatibility.message ? `<div class="compatibility-message">${compatibility.message}</div>` : ''}
                    <div class="product-actions">
                        ${product.tipo !== 'disjuntor' && product.tipo !== 'contator-potencia' ? `<input type="number" class="quantity-input" value="1" min="1" id="qty-${product.codigo}">` : ''}
                        <button class="btn btn-primary" onclick="addToCart('${product.codigo}')">Adicionar</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    renderFilters(appState.currentCategory);
}

function getProductSpecs(product) {
    const faixaAjusteValue = product.faixa_ajuste_A || product.faixaAjuste;
    const correnteAC3Value = product.corrente_ac3_A || product.correnteAC3;

    // CORREÇÃO: Lógica aprimorada para exibir especificações das fontes
    if (product.tipo === 'fonte') {
        let entradaStr = 'N/A';
        const entrada = product.tensao_entrada || product.tensaoEntrada;
        if (typeof entrada === 'string') {
            entradaStr = entrada;
        } else if (typeof entrada === 'object' && entrada !== null) {
            const ac = entrada.AC ? `AC: ${entrada.AC}` : '';
            const dc = entrada.DC ? `DC: ${entrada.DC}` : '';
            entradaStr = [ac, dc].filter(Boolean).join(' / ');
        }

        let saidaStr = '';
        const saida = product.corrente_saida || product.correnteSaida;
        if (typeof saida === 'object' && saida !== null && saida.total) {
            saidaStr = saida.total;
            if (saida.quantidade_saidas && saida.por_saida) {
                saidaStr += ` (${saida.quantidade_saidas} x ${saida.por_saida})`;
            }
        }
        
        return `Entrada: ${entradaStr}<br>Saída: ${saidaStr || 'N/A'}`;
    }

    switch (product.tipo) {
        case 'disjuntor': return `Faixa: ${faixaAjusteValue} A`;
        case 'contator-potencia': return `AC3: ${correnteAC3Value}A`;
        case 'contator-auxiliar': return `${product.tensaoComando || ''}<br>${product.tipoConexao || ''}`;
        default: return product.descricao || '';
    }
}

function renderFilters(category) {
    const filtersDiv = document.getElementById('filters');
    let filterHTML = `
        <div class="filter-group compatibility-filter">
            <label class="checkbox-label">
                <input type="checkbox" id="hideIncompatible" ${appState.hideIncompatible ? 'checked' : ''}>
                Ocultar itens incompatíveis com todos os motores
            </label>
        </div>
    `;

    filtersDiv.innerHTML = filterHTML;

    document.getElementById('hideIncompatible').addEventListener('change', (e) => {
        appState.hideIncompatible = e.target.checked;
        renderProducts();
        saveToLocalStorage();
    });
}

function applyFilter(filterType, value) {
    if (value) {
        appState.filters[filterType] = value;
    } else {
        delete appState.filters[filterType];
    }
    renderProducts();
}


// --- LocalStorage e Notificações ---
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
        updateProjectSummary();
        updateCart();
        renderProducts();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

