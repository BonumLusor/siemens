const express = require('express');
const pg = require('pg');
const cors = require('cors');

const { Pool } = pg;

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Configuração do Pool (sem alterações)
const pool = new Pool({
  user: 'postgres',
  host: 'db.portalnobilis.com.br',
  database: 'siemens_db',
  password: 'senha', // Lembre-se de usar sua senha real
  port: 443,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint para listar todos os Grupos de Produtos (sem alterações)
app.get('/api/grupos', async (req, res) => {
    console.log('Recebida requisição para listar grupos.');
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, nome FROM grupos_produtos ORDER BY nome');
        client.release();
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar grupos.' });
    }
});

// Endpoint de Produtos ATUALIZADO para a nova estrutura
app.get('/api/products', async (req, res) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'O parâmetro "groupId" é obrigatório.' });
  }

  try {
    const client = await pool.connect();
    // A consulta agora é mais simples: busca direto em 'produtos'
    const result = await client.query(
      `SELECT
          c.nome AS "categoria_nome",
          c.dependente_motor,
          p.nome, -- Este é o nome do produto final
          p.codigo,
          p.preco,
          p.detalhes
       FROM produtos p
       JOIN categorias c ON p.categoria_id = c.id
       WHERE c.grupo_id = $1
       ORDER BY p.nome`, // Adicionado ORDER BY para consistência
      [groupId]
    );
    client.release();

    // Formatamos os dados de saída para que o front-end (app.js) não precise mudar.
    // O front-end espera 'grupo', 'nome', 'codigo', 'preco', 'dependente_motor'
    // e que 'detalhes' sejam mesclados no objeto principal.
    const formattedData = result.rows.map(row => ({
      ...row.detalhes, // Espalha detalhes (ex: faixa_ajuste_A, corrente_ac3_A)
      grupo: row.categoria_nome,
      nome: row.nome, // O nome do produto (ex: "Tamanho S00 (Parafuso) 0,11-0,16A")
      codigo: row.codigo,
      preco: parseFloat(row.preco),
      dependente_motor: row.dependente_motor
    }));

    res.json(formattedData);

  } catch (error) {
    console.error('Erro ao buscar produtos no banco:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para adicionar novos produtos ATUALIZADO
app.post('/api/products', async (req, res) => {
    // Espera 'produto' com {nome, codigo, preco, detalhes}
    const { grupo, categoria, produto, dependencias } = req.body;

    // Validação para o novo formato 'produto'
    if (!grupo || !categoria || !produto || !produto.nome || !produto.codigo || !produto.preco) {
        return res.status(400).json({ error: 'Dados incompletos. "produto" deve conter nome, codigo e preco.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insere ou atualiza o Grupo
        const grupoRes = await client.query(
            'INSERT INTO grupos_produtos (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
            [grupo.nome]
        );
        const grupoId = grupoRes.rows[0].id;

        // 2. Insere ou atualiza a Categoria
        const categoriaRes = await client.query(
            `INSERT INTO categorias (grupo_id, nome, descricao, dependente_motor, dependente_tensao)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
            [
                grupoId, 
                categoria.nome, 
                categoria.descricao || '', 
                !!(dependencias && dependencias.motor), 
                !!(dependencias && dependencias.tensao)
            ]
        );
        const categoriaId = categoriaRes.rows[0].id;

        // 3. Insere o novo Produto (que agora tem código e preço)
        await client.query(
            `INSERT INTO produtos (categoria_id, nome, codigo, preco, detalhes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                categoriaId,
                produto.nome,
                produto.codigo,
                produto.preco,
                produto.detalhes || {}
            ]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Produto cadastrado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao inserir produto:', error);
        if (error.code === '23505') { // Conflito de chave única (código do produto)
            return res.status(409).json({ error: 'O código do produto já existe.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});


app.listen(port, () => {
  console.log(`API do Painel Elétrico a rodar em http://localhost:${port}`);
});
