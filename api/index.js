const express = require('express');
const pg = require('pg');
const cors = require('cors');

const { Pool } = pg;

const app = express();
const port = 3000;

app.use(cors());

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

// Endpoint principal de produtos
app.get('/api/products', async (req, res) => {
  const { category } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'O parâmetro "category" é obrigatório.' });
  }
  
  // Mapeamento robusto e eficiente: do nome da categoria para o ID do grupo no banco de dados.
  const categoryIdMap = {
      fontes: 1,
      disjuntores: 2,
      contatoresPotencia: 3,
      contatoresAuxiliares: 4
  };

  const groupId = categoryIdMap[category];
  if (!groupId) {
      return res.status(400).json({ error: 'Categoria inválida.' });
  }

  console.log(`A buscar dados para a categoria: ${category} (Grupo ID: ${groupId})`);

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT
          c.nome AS "grupo",
          p.nome AS "nome",
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
      grupo: row.grupo,
      nome: row.nome,
      codigo: row.codigo,
      preco: parseFloat(row.preco)
    }));

    res.json(formattedData);

  } catch (error) {
    console.error('Erro ao buscar dados no banco:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(port, () => {
  console.log(`API do Painel Elétrico a rodar em http://localhost:3000`);
});

