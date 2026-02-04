// public/js/clp.js
import { appState, updateState } from './state.js';
import * as storage from './storage.js';
import { showNotification } from './ui.js';

// --- ESTADO LOCAL ---
let visualDevices = [];
let memoryBlocks = [];
let positions = {};
let connections = [];

// Controle de Interação
let dragMode = null; 
let dragItem = null; 
let dragOffset = { x: 0, y: 0 };
let tempConnectionStart = null; 
let selectedObject = null; 

// Variáveis de Modais
let tempInputs = [], tempOutputs = [];

// --- INICIALIZAÇÃO SEGURA ---
console.log('CLP JS: Carregando...');

document.addEventListener('DOMContentLoaded', () => {
    try {
        loadData();
        // Cria blocos padrão apenas se não houver NADA salvo
        if (memoryBlocks.length === 0 && visualDevices.length === 0) {
            createDefaultClpBlocks();
        }
        renderAll();
        setupInteractions();
        console.log('CLP JS: Inicializado com sucesso.');
    } catch (e) {
        console.error('CLP JS: Erro na inicialização:', e);
        showNotification('Erro ao iniciar diagrama.', 'danger');
    }
});

// --- FUNÇÕES GLOBAIS (EXPOSTAS AO HTML) ---

window.addTagToList = function(listId, inputId) {
    const el = document.getElementById(inputId);
    if(!el) return;
    const val = el.value.trim();
    if(!val) return;
    
    if(listId === 'inputsList') tempInputs.push(val); 
    else tempOutputs.push(val);
    
    el.value = '';
    
    // Atualiza a lista visualmente
    const listEl = document.getElementById(listId);
    if(listEl) {
        const arr = listId === 'inputsList' ? tempInputs : tempOutputs;
        listEl.innerHTML = arr.map(t => `<span class="tag-badge">${t}</span>`).join(' ');
    }
};

window.saveNewDevice = function() {
    const name = document.getElementById('newDevName').value;
    if(!name) { showNotification('Nome é obrigatório', 'warning'); return; }
    
    const newId = `manual_${Date.now()}`;
    const terminals = [
        ...tempInputs.map((t,i) => ({ id: `${newId}_src_${i}`, label: t, type: 'source' })),
        ...tempOutputs.map((t,i) => ({ id: `${newId}_tgt_${i}`, label: t, type: 'target' }))
    ];
    
    visualDevices.push({ id: newId, name, type: 'manual', terminals });
    // Centraliza o novo bloco
    const viewport = document.getElementById('viewport');
    const cx = viewport ? viewport.scrollLeft + 100 : 100;
    const cy = viewport ? viewport.scrollTop + 100 : 100;
    
    positions[newId] = { x: cx, y: cy };
    
    resetModals();
    saveState(); // Salva no LocalStorage
    renderAll();
};

window.saveMemoryBlock = function() {
    const name = document.getElementById('memName').value;
    const prefix = document.getElementById('memPrefix').value || 'M';
    const start = parseInt(document.getElementById('memStart').value) || 0;
    
    let size = 8;
    const sizeEls = document.getElementsByName('memSize');
    for(let el of sizeEls) if(el.checked) size = parseInt(el.value);
    
    const direction = document.getElementById('memDirection').value;

    if(!name) { showNotification('Nome obrigatório', 'warning'); return; }

    const block = generateBlockData(name, prefix, start, size, direction);
    memoryBlocks.push(block);
    
    const viewport = document.getElementById('viewport');
    const cx = viewport ? viewport.scrollLeft + 300 : 300;
    const cy = viewport ? viewport.scrollTop + 100 : 100;
    positions[block.id] = { x: cx, y: cy };

    document.getElementById('addMemoryModal').style.display = 'none';
    saveState(); // Salva no LocalStorage
    renderAll();
};

window.resetLayout = function() {
    if(confirm('Isso irá reorganizar todos os blocos. Continuar?')) {
        // Lógica simples de cascade
        let y = 50;
        [...visualDevices, ...memoryBlocks].forEach((b, i) => {
            positions[b.id] = { x: 50 + (i%3)*300, y: y };
            if(i%3===2) y += 200;
        });
        saveState();
        renderAll();
    }
};

window.exportToExcel = function() {
    if (typeof XLSX === 'undefined') { showNotification('Erro: Biblioteca Excel não carregada.', 'danger'); return; }
    
    const wb = XLSX.utils.book_new();
    const ioList = generateIOList(); // Gera a tabela relacional

    const data = [['Bloco', 'Endereço', 'Função/Tag', 'Dispositivo Conectado', 'Status']];
    ioList.forEach(r => data.push([r.blockName, r.address, r.tag, r.device, r.status]));

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch:20}, {wch:15}, {wch:30}, {wch:30}, {wch:10}];

    XLSX.utils.book_append_sheet(wb, ws, "Mapeamento CLP");
    XLSX.writeFile(wb, "mapeamento_io.xlsx");
};

window.exportToPDF = function() {
    if (typeof window.jspdf === 'undefined') { showNotification('Erro: Biblioteca PDF não carregada.', 'danger'); return; }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const ioList = generateIOList();

    // Cabeçalho
    doc.setFontSize(16);
    doc.text('Mapeamento de I/O - Acqua Nobilis', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    // Tabela
    doc.autoTable({
        head: [['Bloco', 'Endereço', 'Tag', 'Dispositivo', 'Status']],
        body: ioList.map(r => [r.blockName, r.address, r.tag, r.device, r.status]),
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 186] }
    });

    doc.save("mapeamento_clp.pdf");
};

window.printDiagram = function() {
    if (typeof html2canvas === 'undefined') { showNotification('Erro: html2canvas não carregado.', 'danger'); return; }
    showNotification('Gerando impressão...', 'info');
    
    const el = document.getElementById('diagram-canvas');
    html2canvas(el, { backgroundColor: '#ffffff', scale: 1 }).then(canvas => {
        const win = window.open('');
        win.document.write(`<img src="${canvas.toDataURL()}" style="max-width:100%;">`);
        win.document.write('<script>window.onload=function(){window.print();window.close();}<\/script>');
        win.document.close();
    });
};

// --- FUNÇÕES INTERNAS DE LÓGICA ---

function resetModals() {
    tempInputs = []; tempOutputs = [];
    document.getElementById('newDevName').value = '';
    document.getElementById('inputsList').innerHTML = '';
    document.getElementById('outputsList').innerHTML = '';
    document.getElementById('addDeviceModal').style.display = 'none';
}

function createDefaultClpBlocks() {
    memoryBlocks.push(generateBlockData('Entradas Digitais', 'I', 0, 8, 'target', 'clp_di'));
    memoryBlocks.push(generateBlockData('Saídas Digitais', 'Q', 0, 8, 'source', 'clp_do'));
}

function generateBlockData(name, prefix, start, count, direction, fixedId = null) {
    const slots = [];
    for(let i=0; i<count; i++) {
        const byte = start + Math.floor(i/8);
        const bit = i % 8;
        slots.push(`${prefix}${byte}.${bit}`);
    }
    return { id: fixedId || `mem_${Date.now()}`, name, type: 'memory', direction, slots };
}

function generateIOList() {
    // Cruza dados de conexões com blocos de memória para relatório
    const list = [];
    memoryBlocks.forEach(block => {
        block.slots.forEach(addr => {
            const slotId = `clp_${addr}`;
            const conn = connections.find(c => c.from === slotId || c.to === slotId);
            let device = '', tag = '', status = 'Livre';
            
            if (conn) {
                const otherId = conn.from === slotId ? conn.to : conn.from;
                // Busca em dispositivos
                const dev = visualDevices.find(d => d.terminals.some(t => t.id === otherId));
                if (dev) {
                    device = dev.name;
                    const term = dev.terminals.find(t => t.id === otherId);
                    tag = term ? term.label : '';
                    status = 'Ocupado';
                }
            }
            list.push({ blockName: block.name, address: addr, tag, device, status });
        });
    });
    return list;
}

// --- INTERAÇÕES (MOUSE/TECLADO) ---

function setupInteractions() {
    const canvas = document.getElementById('diagram-canvas');

    window.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT') return;
        if(e.key === 'Delete' || e.key === 'Backspace') {
            if(selectedObject) {
                if(selectedObject.type === 'connection') {
                    connections = connections.filter(c => c.id !== selectedObject.id);
                } else if(selectedObject.type === 'block') {
                    deleteBlock(selectedObject.id);
                }
                selectedObject = null;
                saveState(); // Salva após deletar
                renderAll();
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        // 1. Terminal -> Iniciar Conexão
        if(e.target.classList.contains('terminal-point')) {
            e.preventDefault(); e.stopPropagation();
            const termId = e.target.id;
            const row = e.target.closest('.terminal-row');
            const type = row.classList.contains('is-output') ? 'source' : 'target';
            
            const rect = e.target.getBoundingClientRect();
            const cRect = canvas.getBoundingClientRect();
            tempConnectionStart = {
                id: termId, type, 
                x: rect.left + rect.width/2 - cRect.left,
                y: rect.top + rect.height/2 - cRect.top
            };
            dragMode = 'connection';
            return;
        }

        // 2. Header -> Iniciar Drag Bloco
        const header = e.target.closest('.device-header');
        if(header) {
            e.preventDefault();
            const block = header.closest('.device-block');
            selectObject('block', block.id.replace('blk_', ''));
            dragMode = 'block';
            dragItem = block;
            const rect = block.getBoundingClientRect();
            dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            block.style.zIndex = 100;
            return;
        }

        // 3. Seleção de Linha
        if(e.target.tagName === 'path' && e.target.id !== 'temp-line') {
            e.stopPropagation();
            selectObject('connection', e.target.dataset.id);
            renderAll();
            return;
        }

        // 4. Clicou no vazio -> Deselecionar
        selectObject(null, null);
        renderAll();
    });

    window.addEventListener('mousemove', (e) => {
        const cRect = canvas.getBoundingClientRect();
        const mx = e.clientX - cRect.left;
        const my = e.clientY - cRect.top;

        if(dragMode === 'block' && dragItem) {
            e.preventDefault();
            let nx = Math.max(0, Math.round((mx - dragOffset.x)/10)*10);
            let ny = Math.max(0, Math.round((my - dragOffset.y)/10)*10);
            dragItem.style.left = nx+'px'; dragItem.style.top = ny+'px';
            drawConnections(); // Redesenha linhas
        }

        if(dragMode === 'connection' && tempConnectionStart) {
            e.preventDefault();
            const line = document.getElementById('temp-line');
            line.style.display = 'block';
            const x1 = tempConnectionStart.x, y1 = tempConnectionStart.y;
            const cp = Math.abs(mx - x1)*0.5 + 30;
            line.setAttribute('d', `M ${x1} ${y1} C ${x1+cp} ${y1}, ${mx-cp} ${my}, ${mx} ${my}`);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if(dragMode === 'connection' && tempConnectionStart) {
            document.getElementById('temp-line').style.display = 'none';
            const el = document.elementFromPoint(e.clientX, e.clientY);
            
            if(el && el.classList.contains('terminal-point')) {
                const row = el.closest('.terminal-row');
                const endType = row.classList.contains('is-output') ? 'source' : 'target';
                
                if(tempConnectionStart.id !== el.id && tempConnectionStart.type !== endType) {
                    const src = tempConnectionStart.type === 'source' ? tempConnectionStart.id : el.id;
                    const tgt = tempConnectionStart.type === 'target' ? tempConnectionStart.id : el.id;
                    
                    // Valida duplicidade e ocupação
                    const exists = connections.some(c => c.from === src && c.to === tgt);
                    const occupied = connections.some(c => c.to === tgt); // Entradas aceitam só 1 fio? Geralmente sim.
                    
                    if(!exists && !occupied) {
                        connections.push({ id: `c_${Date.now()}`, from: src, to: tgt });
                        saveState(); // Salva ao conectar
                    } else if(occupied) {
                        showNotification('Entrada já conectada.', 'warning');
                    }
                }
            }
        }

        if(dragMode === 'block' && dragItem) {
            // Salva posição final
            const id = dragItem.id.replace('blk_', '');
            positions[id] = { x: parseInt(dragItem.style.left), y: parseInt(dragItem.style.top) };
            dragItem.style.zIndex = '';
            saveState(); // Salva ao soltar
        }

        dragMode = null; dragItem = null; tempConnectionStart = null;
        renderAll();
    });
}

function selectObject(type, id) { selectedObject = type ? { type, id } : null; }

function deleteBlock(id) {
    if(confirm('Apagar bloco?')) {
        memoryBlocks = memoryBlocks.filter(b => b.id !== id);
        visualDevices = visualDevices.filter(d => d.id !== id);
        delete positions[id];
        connections = connections.filter(c => !c.from.includes(id) && !c.to.includes(id));
        saveState();
        renderAll();
    }
}

// --- DATA MANAGEMENT ---

function loadData() {
    const s = storage.loadFromLocalStorage();
    if(s) {
        updateState(s);
        // Regenera blocos de Motores (dados quentes do projeto)
        const autos = (s.motors||[]).map(m => ({
            id: `motor_${m.id}`, name: m.name || `Motor ${m.id}`, type: 'auto',
            terminals: [
                {id:`t_trip_${m.id}`, label:'Falha', type:'source'},
                {id:`t_cmd_${m.id}`, label:'Comando', type:'target'},
                ...(m.contator ? [{id:`t_sts_${m.id}`, label:'Status', type:'source'}] : [])
            ]
        }));
        
        visualDevices = [...autos, ...(s.visualManualDevices || [])];
        memoryBlocks = s.memoryBlocks || [];
        positions = s.visualPositions || {};
        connections = s.visualConnections || [];
    }
}

function saveState() {
    // AQUI É O PULO DO GATO: Salva no localStorage usando a lib storage.js
    const manuals = visualDevices.filter(d => d.type === 'manual');
    updateState({
        visualManualDevices: manuals,
        memoryBlocks: memoryBlocks,
        visualPositions: positions,
        visualConnections: connections
    });
    storage.saveToLocalStorage(appState);
    // showNotification('Salvo.', 'info'); // Opcional: Feedback visual
}

// --- RENDERIZAÇÃO ---
function renderAll() {
    const layer = document.getElementById('blocks-layer');
    if(!layer) return; layer.innerHTML = '';

    const renderList = (list, isMem) => {
        list.forEach(item => {
            if(!positions[item.id]) positions[item.id] = { x: 50, y: 50 };
            const pos = positions[item.id];
            const sel = selectedObject?.type==='block' && selectedObject.id===item.id ? 'selected' : '';
            
            let cls = 'card-dev';
            if(isMem) {
                if(item.id.includes('di')) cls='card-di';
                else if(item.id.includes('do')) cls='card-do';
                else cls='card-mem';
            }

            const body = isMem ? renderMemorySlots(item) : renderTerminals(item.terminals);
            
            layer.innerHTML += `
            <div class="device-block ${cls} ${sel}" id="blk_${item.id}" style="left:${pos.x}px; top:${pos.y}px;">
                <div class="device-header">${item.name}</div>
                <div class="device-body">${body}</div>
            </div>`;
        });
    };
    
    renderList(visualDevices, false);
    renderList(memoryBlocks, true);
    drawConnections();
}

function renderTerminals(terms) {
    return terms.map(t => {
        const d = t.type==='source'?'is-output':'is-input';
        return `<div class="terminal-row ${d}">
            ${t.type==='source'?`<span class="io-label">${t.label}</span>`:''}
            <div class="terminal-point" id="${t.id}" title="${t.label}"></div>
            ${t.type==='target'?`<span class="io-label">${t.label}</span>`:''}
        </div>`;
    }).join('');
}
function renderMemorySlots(b) {
    return b.slots.map(a => {
        const d = b.direction==='target'?'is-input':'is-output';
        return `<div class="terminal-row ${d}">
            ${b.direction==='source'?`<span class="io-label">${a}</span>`:''}
            <div class="terminal-point" id="clp_${a}" title="${b.name} ${a}"></div>
            ${b.direction==='target'?`<span class="io-label">${a}</span>`:''}
        </div>`;
    }).join('');
}

function drawConnections() {
    const svg = document.getElementById('connections-svg');
    const canvas = document.getElementById('diagram-canvas');
    if(!svg || !canvas) return;
    
    // Limpa linhas antigas
    svg.querySelectorAll('path:not(#temp-line)').forEach(p => p.remove());
    document.querySelectorAll('.terminal-point').forEach(e => e.classList.remove('connected'));
    
    const cRect = canvas.getBoundingClientRect();
    
    connections.forEach(c => {
        const e1 = document.getElementById(c.from);
        const e2 = document.getElementById(c.to);
        if(e1 && e2) {
            e1.classList.add('connected'); e2.classList.add('connected');
            const r1 = e1.getBoundingClientRect();
            const r2 = e2.getBoundingClientRect();
            
            const x1 = r1.left + r1.width/2 - cRect.left;
            const y1 = r1.top + r1.height/2 - cRect.top;
            const x2 = r2.left + r2.width/2 - cRect.left;
            const y2 = r2.top + r2.height/2 - cRect.top;
            
            const cp = Math.abs(x2-x1)*0.5 + 40;
            const d = `M ${x1} ${y1} C ${x1+cp} ${y1}, ${x2-cp} ${y2}, ${x2} ${y2}`;
            
            const p = document.createElementNS('http://www.w3.org/2000/svg','path');
            p.setAttribute('d', d);
            p.dataset.id = c.id;
            if(selectedObject?.type==='connection' && selectedObject.id===c.id) p.classList.add('selected');
            svg.appendChild(p);
        }
    });
}