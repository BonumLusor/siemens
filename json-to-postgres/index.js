// cadastrar_produtos_v2.js - Versão com estrutura de Grupos e Categorias
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
// Altere com as suas credenciais do PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'db.portalnobilis.com.br',
  database: 'siemens_db', // O nome do banco que está a usar
  password: 'senha',     // A senha que definiu
  port: 443,
  ssl: {
    rejectUnauthorized: false
  }
});


// Mapeamento dos arquivos JSON para os seus respectivos grupos no banco de dados
const ARQUIVOS_E_GRUPOS = [
    { path: 'fontes.json', rootKey: 'fontes_alimentacao', grupoNome: 'Fontes' },
    { path: 'disjuntores_motor.json', rootKey: 'catalogo_disjuntores', grupoNome: 'Disjuntores' },
    { path: 'contatores_potencia.json', rootKey: 'contatores_potencia', grupoNome: 'Contatores de Potência' },
    { path: 'contatores_auxiliares.json', rootKey: 'contatores_auxiliares', grupoNome: 'Contatores Auxiliares' }
];

/**
 * Cria a nova estrutura de tabelas no banco de dados.
 * @param {import('pg').PoolClient} client
 */
async function setupDatabase(client) {
  console.log('A criar o novo esquema do banco de dados...');
  const schema = `
    DROP TABLE IF EXISTS variacoes, produtos, categorias, grupos_produtos CASCADE;

    CREATE TABLE grupos_produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) UNIQUE NOT NULL
    );

    CREATE TABLE categorias (
        id SERIAL PRIMARY KEY,
        grupo_id INTEGER NOT NULL REFERENCES grupos_produtos(id) ON DELETE CASCADE,
        nome VARCHAR(255) UNIQUE NOT NULL,
        descricao TEXT
    );

    CREATE TABLE produtos (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL
    );

    CREATE TABLE variacoes (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        codigo VARCHAR(255) UNIQUE NOT NULL,
        preco DECIMAL(10, 2) NOT NULL,
        detalhes JSONB
    );

    CREATE INDEX idx_categorias_grupo_id ON categorias(grupo_id);
    CREATE INDEX idx_produtos_categoria_id ON produtos(categoria_id);
    CREATE INDEX idx_variacoes_produto_id ON variacoes(produto_id);
  `;
  await client.query(schema);
  console.log('Banco de dados pronto com a nova estrutura.');
}

/**
 * Insere os dados de um arquivo JSON no banco de dados.
 * @param {import('pg').PoolClient} client
 * @param {object} fileInfo - Contém o caminho, a chave raiz e o nome do grupo.
 * @param {Map<string, number>} gruposMap - Mapa com os nomes e IDs dos grupos.
 */
async function processJsonFile(client, fileInfo, gruposMap) {
  const { path: filePath, rootKey, grupoNome } = fileInfo;
  console.log(`A processar arquivo: ${filePath}...`);
  
  const fullPath = path.join(__dirname, filePath);
  const data = await fs.readFile(fullPath, 'utf8');
  const json = JSON.parse(data);

  const grupoId = gruposMap.get(grupoNome);
  if (!grupoId) {
      throw new Error(`ID do grupo '${grupoNome}' não encontrado.`);
  }

  for (const categoriaJson of json[rootKey]) {
    // 1. Insere a Categoria detalhada, ligada ao Grupo principal
    const resCategoria = await client.query(
      'INSERT INTO categorias (grupo_id, nome, descricao) VALUES ($1, $2, $3) RETURNING id',
      [grupoId, categoriaJson.grupo, categoriaJson.descricao_grupo]
    );
    const categoriaId = resCategoria.rows[0].id;
    console.log(`  -> Categoria '${categoriaJson.grupo}' (ID: ${categoriaId}) inserida no grupo '${grupoNome}'`);

    for (const produto of categoriaJson.produtos) {
      // 2. Insere o Produto
      const resProduto = await client.query(
        'INSERT INTO produtos (categoria_id, nome) VALUES ($1, $2) RETURNING id',
        [categoriaId, produto.nome]
      );
      const produtoId = resProduto.rows[0].id;
      let variacoesCount = 0;

      for (const variacao of produto.variacoes) {
        // 3. Prepara e Insere a Variação (ou Variações)
        const { preco, ...detalhes } = variacao;
        const codigosParaInserir = [];

        if (detalhes.codigo_parafuso) codigosParaInserir.push({ codigo: detalhes.codigo_parafuso, tipo: 'parafuso' });
        if (detalhes.codigo_mola) codigosParaInserir.push({ codigo: detalhes.codigo_mola, tipo: 'mola' });
        if (detalhes.codigo && codigosParaInserir.length === 0) codigosParaInserir.push({ codigo: detalhes.codigo });
        
        delete detalhes.codigo_parafuso;
        delete detalhes.codigo_mola;
        delete detalhes.codigo;

        for (const item of codigosParaInserir) {
            const detalhesFinais = item.tipo ? { ...detalhes, tipo_conexao: item.tipo } : detalhes;
            await client.query(
                'INSERT INTO variacoes (produto_id, codigo, preco, detalhes) VALUES ($1, $2, $3, $4) ON CONFLICT (codigo) DO NOTHING',
                [produtoId, item.codigo, preco, detalhesFinais]
            );
            variacoesCount++;
        }
      }
      console.log(`    - Produto '${produto.nome}' inserido com ${variacoesCount} variações.`);
    }
  }
}

// Função principal que orquestra todo o processo
async function main() {
  const client = await pool.connect();
  try {
    await setupDatabase(client);

    await client.query('BEGIN'); // Inicia uma transação
    console.log("\nA iniciar transação para inserção de dados...");

    // 1. Criar os grupos principais e guardar os seus IDs
    const gruposMap = new Map();
    console.log('A criar grupos principais...');
    for (const fileInfo of ARQUIVOS_E_GRUPOS) {
        const res = await client.query(
            'INSERT INTO grupos_produtos (nome) VALUES ($1) RETURNING id, nome',
            [fileInfo.grupoNome]
        );
        gruposMap.set(res.rows[0].nome, res.rows[0].id);
        console.log(` - Grupo '${res.rows[0].nome}' criado com ID: ${res.rows[0].id}`);
    }

    // 2. Processar cada arquivo JSON, associando ao grupo correto
    for (const fileInfo of ARQUIVOS_E_GRUPOS) {
        await processJsonFile(client, fileInfo, gruposMap);
    }

    await client.query('COMMIT'); // Confirma a transação se tudo correu bem
    console.log('\nSUCESSO! Todos os dados foram cadastrados com a nova estrutura.');
  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
    console.error('\nERRO! Ocorreu um problema e a transação foi desfeita.', error);
  } finally {
    client.release(); // Libera o cliente de volta para o pool
    await pool.end(); // Fecha a conexão com o banco
    console.log('Conexão com o banco de dados encerrada.');
  }
}

main();
