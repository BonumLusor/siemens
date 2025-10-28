const express = require('express');
const pg = require('pg');
const cors = require('cors');

const { Pool } = pg;

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'db.portalnobilis.com.br',
  database: 'siemens_db',
  password: 'senha',
  port: 443,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint para listar todos os Grupos de Produtos
app.get('/api/grupos', async (req, res) => {
    console.log('Recebida requisição para listar grupos.');
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, nome FROM grupos_produtos ORDER BY id');
        client.release();
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar grupos.' });
    }
});

// Endpoint de Produtos MODIFICADO para buscar por 'groupId'
app.get('/api/products', async (req, res) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'O parâmetro "groupId" é obrigatório.' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT
          c.nome AS "categoria_nome",
          c.dependente_motor,
          p.nome AS "produto_nome",
          v.codigo,
          v.preco,
          v.detalhes
       FROM variacoes v
       JOIN produtos p ON v.produto_id = p.id
       JOIN categorias c ON p.categoria_id = c.id
       WHERE c.grupo_id = $1`,
      [groupId]
    );
    client.release();

    const formattedData = result.rows.map(row => ({
      ...row.detalhes,
      grupo: row.categoria_nome,
      nome: row.produto_nome,
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

// Endpoint para adicionar novos produtos
app.post('/api/products', async (req, res) => {
    const { grupo, categoria, produto, variacao, dependencias } = req.body;

    if (!grupo || !categoria || !produto || !variacao) {
        return res.status(400).json({ error: 'Dados incompletos para cadastrar o produto.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const grupoRes = await client.query(
            'INSERT INTO grupos_produtos (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
            [grupo.nome]
        );
        const grupoId = grupoRes.rows[0].id;

        const categoriaRes = await client.query(
            `INSERT INTO categorias (grupo_id, nome, descricao, dependente_motor, dependente_tensao)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
            [grupoId, categoria.nome, categoria.descricao || '', !!(dependencias && dependencias.motor), !!(dependencias && dependencias.tensao)]
        );
        const categoriaId = categoriaRes.rows[0].id;

        const produtoRes = await client.query(
            'INSERT INTO produtos (categoria_id, nome) VALUES ($1, $2) RETURNING id',
            [categoriaId, produto.nome]
        );
        const produtoId = produtoRes.rows[0].id;

        await client.query(
            'INSERT INTO variacoes (produto_id, codigo, preco, detalhes) VALUES ($1, $2, $3, $4)',
            [produtoId, variacao.codigo, variacao.preco, variacao.detalhes || {}]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Produto cadastrado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao inserir produto:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'O código da variação já existe.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

app.listen(port, () => {
  console.log(`API do Painel Elétrico a rodar em http://localhost:${port}`);
});
