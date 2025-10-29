// public/js/export.js
// Lida com a geração de arquivos PDF e Excel.

import { showNotification } from './ui.js';

/**
 * Exporta a lista de componentes para PDF.
 * @param {object} appState - O estado completo da aplicação.
 */
export function exportList(appState) {
    // Validação
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

    // Inicialização do PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let grandTotal = 0;

    // Função interna para adicionar rodapé
    const addPageFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30); // Linha
            doc.text('ACQUA NOBILIS | Rua Safira, 205 - Jardim Jóia | CEP: 07431-295 - Arujá - SP', 15, pageHeight - 20);
            doc.text('Tel. +55 11 4651-4008', 15, pageHeight - 15);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 20, { align: 'right' });
        }
    };

    // Cabeçalho
    const logoImg = new Image();
    logoImg.src = '/static/Logo-Acqua-Nobilis-nova-retangular-preta-2048x430.png';
    try {
        doc.addImage(logoImg, 'PNG', 15, 12, 70, 15);
    } catch(e) {
        console.error("Erro ao adicionar imagem do logo:", e);
        doc.text("Acqua Nobilis", 15, 20);
    }
    doc.setFontSize(14);
    doc.text('LISTA DE COMPONENTES DO PAINEL ELÉTRICO', 105, 40, { align: 'center' });

    // Definição da Tabela
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
                const faixa = disjuntor.faixa_ajuste_A || disjuntor.detalhes?.faixa_ajuste_A || '';
                body.push([disjuntor.codigo, disjuntor.nome, '', `${appState.voltage}V`, '', `${faixa} A`, '1', `R$ ${disjuntor.preco.toFixed(2)}`, `R$ ${disjuntor.preco.toFixed(2)}`]);
            }
            if (motor.contator) {
                const contator = motor.contator;
                const corrente = contator.corrente_ac3_A || contator.detalhes?.corrente_ac3_A || '';
                body.push([contator.codigo, contator.nome, '', `${appState.voltage}V`, '', `${corrente} A`, '1', `R$ ${contator.preco.toFixed(2)}`, `R$ ${contator.preco.toFixed(2)}`]);
            }
        });
    }

    // 2. Processa dinamicamente outros componentes do carrinho
    const otherComponents = appState.cart;
    if (otherComponents.length > 0) {
        const groupedItems = otherComponents.reduce((acc, item) => {
            const groupName = item.grupo || 'Componentes Gerais';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});

        Object.keys(groupedItems).sort().forEach(groupName => { // .sort() para ordenar os grupos alfabeticamente
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

    // Geração da Tabela
    doc.autoTable({
        head: head, body: body, startY: 50, theme: 'grid',
        headStyles: { fillColor: [41, 128, 186], textColor: 255 },
        columnStyles: { 
            0: { cellWidth: 30 }, // Item/Código
            1: { cellWidth: 60 }, // Descrição
            6: { halign: 'center' }, // Qtd
            7: { halign: 'right' }, // Preço Unit
            8: { halign: 'right' }  // Total
        },
        didDrawPage: addPageFooter
    });

    // Salva o arquivo
    doc.save(`lista_componentes_${Date.now()}.pdf`);
    showNotification('PDF exportado com sucesso!');
}

/**
 * Exporta a lista de componentes para Excel.
 * @param {object} appState - O estado completo da aplicação.
 */
export function exportToExcel(appState) {
    // Validação
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
                const faixa = disjuntor.faixa_ajuste_A || disjuntor.detalhes?.faixa_ajuste_A || '';
                data.push([disjuntor.codigo, disjuntor.nome, '', `${appState.voltage}V`, '', `${faixa} A`, 1, disjuntor.preco, disjuntor.preco]);
            }
            if (motor.contator) {
                const contator = motor.contator;
                const corrente = contator.corrente_ac3_A || contator.detalhes?.corrente_ac3_A || '';
                data.push([contator.codigo, contator.nome, '', `${appState.voltage}V`, '', `${corrente} A`, 1, contator.preco, contator.preco]);
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

        Object.keys(groupedItems).sort().forEach(groupName => { // .sort()
            data.push([]); // Linha em branco como separador
            data.push([groupName]); // Título do Grupo
            groupedItems[groupName].forEach(item => {
                const total = item.preco * item.quantity;
                grandTotal += total;
                data.push([item.codigo, item.nome, '', '', '', '', item.quantity, item.preco, total]);
            });
        });
    }

    // Linha de Total
    data.push([]);
    data.push(['', '', '', '', '', '', '', 'TOTAL GERAL', grandTotal]);

    // Geração da Planilha
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Define largura das colunas
    worksheet['!cols'] = [ { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 } ];
    
    // Formata as colunas de preço
    for (let i = 2; i <= data.length +1; i++) { // +1 para incluir a linha de total
        const cellH = worksheet[`H${i}`];
        if (cellH && typeof cellH.v === 'number') {
            cellH.t = 'n'; // Define o tipo como número
            cellH.z = 'R$ #,##0.00'; // Define o formato
        }
        const cellI = worksheet[`I${i}`];
         if (cellI && typeof cellI.v === 'number') {
            cellI.t = 'n';
            cellI.z = 'R$ #,##0.00';
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Componentes");
    
    // Salva o arquivo
    XLSX.writeFile(workbook, `lista_componentes_${Date.now()}.xlsx`);
    showNotification('Excel exportado com sucesso!');
}
