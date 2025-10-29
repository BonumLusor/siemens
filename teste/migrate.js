const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');

// --- 1. CONFIGURAÇÃO DO BANCO DE DADOS ---
// Copiado do seu 'api/index.js'
const pool = new Pool({
  user: 'postgres',
  host: 'db.portalnobilis.com.br',
  database: 'siemens_db',
  password: 'senha', // Use a senha correta
  port: 443,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- 2. DEFINIÇÃO DA ESTRUTURA DAS TABELAS (NOVA LÓGICA) ---
const createTablesQuery = `
  DROP TABLE IF EXISTS produtos, categorias, grupos_produtos CASCADE;

  CREATE TABLE grupos_produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) UNIQUE NOT NULL
  );

  CREATE TABLE categorias (
      id SERIAL PRIMARY KEY,
      grupo_id INT NOT NULL REFERENCES grupos_produtos(id) ON DELETE CASCADE,
      nome VARCHAR(255) UNIQUE NOT NULL,
      descricao TEXT,
      dependente_motor BOOLEAN DEFAULT false,
      dependente_tensao BOOLEAN DEFAULT false
  );

  CREATE TABLE produtos (
      id SERIAL PRIMARY KEY,
      categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      codigo VARCHAR(100) NOT NULL UNIQUE,
      preco DECIMAL(10, 2) NOT NULL,
      detalhes JSONB
  );
`;

// --- 3. FUNÇÃO DE INSERÇÃO GENÉRICA ---
async function insertData(client, { grupoNome, categoriaNome, categoriaDescricao, dependencias, produtos }) {
  try {
    // Insere o GRUPO
    const grupoRes = await client.query(
      'INSERT INTO grupos_produtos (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
      [grupoNome]
    );
    const grupoId = grupoRes.rows[0].id;

    // Insere a CATEGORIA
    const catRes = await client.query(
      `INSERT INTO categorias (grupo_id, nome, descricao, dependente_motor, dependente_tensao)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
      [
        grupoId,
        categoriaNome,
        categoriaDescricao || '',
        !!dependencias.motor,
        !!dependencias.tensao
      ]
    );
    const categoriaId = catRes.rows[0].id;

    // Insere os PRODUTOS
    for (const produto of produtos) {
      // Remove campos duplicados dos detalhes
      const { codigo, preco, ...detalhes } = produto.detalhes || {};

      await client.query(
        `INSERT INTO produtos (categoria_id, nome, codigo, preco, detalhes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (codigo) DO NOTHING`, // Ignora produtos com código duplicado
        [
          categoriaId,
          produto.nome,
          produto.codigo,
          produto.preco,
          detalhes
        ]
      );
    }
    console.log(`  -> OK: Grupo '${grupoNome}' > Categoria '${categoriaNome}' (${produtos.length} produtos).`);
  } catch (err) {
    console.error(`  -> ERRO ao processar Categoria '${categoriaNome}': ${err.message}`);
  }
}

// --- 4. FUNÇÕES DE PARSE (ADAPTAÇÃO DOS JSONS) ---

// Processa fontes.json
async function processFontes(client, data) {
  console.log('Processando Fontes de Alimentação...');
  const grupoNome = "Fontes de Alimentação";
  
  for (const categoria of data.fontes_alimentacao) {
    const categoriaNome = categoria.grupo;
    const categoriaDescricao = categoria.descricao_grupo;
    const dependencias = { motor: false, tensao: true };
    const produtos = [];

    for (const prodFamilia of categoria.produtos) {
      for (const variacao of prodFamilia.variacoes) {
        produtos.push({
          nome: `${prodFamilia.nome} - ${variacao.descricao}`,
          codigo: variacao.codigo,
          preco: variacao.preco,
          detalhes: variacao
        });
      }
    }
    await insertData(client, { grupoNome, categoriaNome, categoriaDescricao, dependencias, produtos });
  }
}

// Processa disjuntores_motor.json
async function processDisjuntores(client, data) {
  console.log('Processando Disjuntores Motor...');
  const grupoNome = "Disjuntores";

  for (const categoria of data.catalogo_disjuntores) {
    const categoriaNome = categoria.grupo;
    const categoriaDescricao = categoria.descricao_grupo;
    // Disjuntores de motor dependem de motor
    const dependencias = { motor: true, tensao: false };
    const produtos = [];

    for (const prodFamilia of categoria.produtos) {
      for (const variacao of prodFamilia.variacoes) {
        
        // Separa 'detalhes' de 'campos principais'
        const { codigo_parafuso, codigo_mola, codigo, preco, ...detalhes } = variacao;

        // Produto 1: Conexão Parafuso (se existir)
        const codParafuso = codigo_parafuso || codigo;
        if (codParafuso) {
          produtos.push({
            nome: `${prodFamilia.nome} (Parafuso) ${detalhes.faixa_ajuste_A}A`,
            codigo: codParafuso,
            preco: preco,
            detalhes: { ...detalhes, tipo_conexao: 'parafuso' }
          });
        }
        
        // Produto 2: Conexão Mola (se existir)
        if (codigo_mola) {
          produtos.push({
            nome: `${prodFamilia.nome} (Mola) ${detalhes.faixa_ajuste_A}A`,
            codigo: codigo_mola,
            preco: preco, // Assume mesmo preço
            detalhes: { ...detalhes, tipo_conexao: 'mola' }
          });
        }
      }
    }
    await insertData(client, { grupoNome, categoriaNome, categoriaDescricao, dependencias, produtos });
  }
}

// Processa contatores_potencia.json
async function processContatoresPotencia(client, data) {
  console.log('Processando Contatores de Potência...');
  const grupoNome = "Contatores de Potência";

  for (const categoria of data.contatores_potencia) {
    const categoriaNome = categoria.grupo;
    const categoriaDescricao = categoria.descricao_grupo;
    const dependencias = { motor: true, tensao: false };
    const produtos = [];

    for (const prodFamilia of categoria.produtos) {
      for (const variacao of prodFamilia.variacoes) {
        produtos.push({
          nome: `${prodFamilia.nome} ${variacao.corrente_ac3_A}A`,
          codigo: variacao.codigo,
          preco: variacao.preco,
          detalhes: variacao
        });
      }
    }
    await insertData(client, { grupoNome, categoriaNome, categoriaDescricao, dependencias, produtos });
  }
}

// Processa contatores_auxiliares.json
async function processContatoresAux(client, data) {
  console.log('Processando Contatores Auxiliares...');
  const grupoNome = "Contatores Auxiliares";

  for (const categoria of data.contatores_auxiliares) {
    const categoriaNome = categoria.grupo;
    const categoriaDescricao = categoria.descricao_grupo;
    // Auxiliares não dependem da corrente do motor
    const dependencias = { motor: false, tensao: false }; 
    const produtos = [];

    for (const prodFamilia of categoria.produtos) {
      for (const variacao of prodFamilia.variacoes) {
        produtos.push({
          nome: `${prodFamilia.nome} - ${variacao.descricao || variacao.tensao_comando}`,
          codigo: variacao.codigo,
          preco: variacao.preco,
          detalhes: variacao
        });
      }
    }
    await insertData(client, { grupoNome, categoriaNome, categoriaDescricao, dependencias, produtos });
  }
}


// --- 5. FUNÇÃO PRINCIPAL DE EXECUÇÃO ---
async function main() {
  const client = await pool.connect();
  console.log('Conectado ao banco de dados.');

  const dataDir = path.join(__dirname, '..', 'public', 'data');
  
  try {
    // Limpa e recria as tabelas
    console.log('Limpando e recriando tabelas (nova estrutura)...');
    await client.query(createTablesQuery);
    console.log('Tabelas criadas com sucesso.');

    // Inicia a transação principal
    await client.query('BEGIN');

    // Lê e processa cada arquivo JSON
    const fontesData = JSON.parse(await fs.readFile(path.join(dataDir, 'fontes.json'), 'utf-8'));
    await processFontes(client, fontesData);

    const disjuntoresData = JSON.parse(await fs.readFile(path.join(dataDir, 'disjuntores_motor.json'), 'utf-8'));
    await processDisjuntores(client, disjuntoresData);

    const contatoresPotData = JSON.parse(await fs.readFile(path.join(dataDir, 'contatores_potencia.json'), 'utf-8'));
    await processContatoresPotencia(client, contatoresPotData);

    const contatoresAuxData = JSON.parse(await fs.readFile(path.join(dataDir, 'contatores_auxiliares.json'), 'utf-8'));
    await processContatoresAux(client, contatoresAuxData);

    // Finaliza a transação
    await client.query('COMMIT');
    console.log('\n--- Migração concluída com sucesso! ---');

  } catch (err) {
    // Desfaz tudo em caso de erro
    await client.query('ROLLBACK');
    console.error('\n--- ERRO NA MIGRAÇÃO ---');
    console.error(err);
  } finally {
    // Libera a conexão
    client.release();
    await pool.end();
    console.log('Conexão com o banco de dados fechada.');
  }
}

// Executa o script
main();