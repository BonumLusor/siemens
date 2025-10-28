document.addEventListener('DOMContentLoaded', () => {
    const groupSelection = document.getElementById('groupSelection');
    const existingGroupSection = document.getElementById('existing-group-section');
    const newGroupSection = document.getElementById('new-group-section');
    const form = document.getElementById('componentForm');
    const groupSelect = document.getElementById('group');

    async function loadGroups() {
        try {
            const response = await fetch('/api/grupos');
            if (!response.ok) throw new Error('Falha ao buscar grupos');
            
            const grupos = await response.json();

            groupSelect.innerHTML = '<option value="">Selecione um grupo...</option>';
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo.nome;
                option.textContent = grupo.nome;
                groupSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
            groupSelect.innerHTML = '<option value="">Não foi possível carregar</option>';
        }
    }

    groupSelection.addEventListener('change', () => {
        const isExisting = groupSelection.value === 'existente';
        existingGroupSection.style.display = isExisting ? 'block' : 'none';
        newGroupSection.style.display = isExisting ? 'none' : 'block';
        document.getElementById('group').required = isExisting;
        document.getElementById('new_group_name').required = !isExisting;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        let detalhesVariação = {};
        try {
            const detalhesJson = formData.get('variacao_detalhes');
            if (detalhesJson) {
                detalhesVariação = JSON.parse(detalhesJson);
            }
        } catch (error) {
            alert('O JSON nos detalhes da variação é inválido.');
            return;
        }
        
        const groupName = groupSelection.value === 'existente'
            ? formData.get('group')
            : formData.get('new_group_name');

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

        if (!payload.grupo.nome || !payload.categoria.nome || !payload.produto.nome || !payload.variacao.codigo || !payload.variacao.preco) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Sucesso: ' + result.message);
                form.reset();
                groupSelection.value = 'existente';
                groupSelection.dispatchEvent(new Event('change'));
                loadGroups();
            } else {
                alert('Erro: ' + result.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Falha de comunicação com a API.');
        }
    });

    loadGroups();
    groupSelection.dispatchEvent(new Event('change'));
});
