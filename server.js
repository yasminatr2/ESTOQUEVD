const express = require('express');
const fs = require('fs');
const XLSX = require('xlsx');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Servir o arquivo CSS diretamente se ele estiver na mesma pasta que o server.js
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css')); // Nome do arquivo CSS
});

// Rota para servir o formulário HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pallet_simulator.html')); // Nome do arquivo HTML
});

app.get('/pesquisar', (req, res) => {
    res.sendFile(path.join(__dirname, 'pesquisar.html')); // Nome do arquivo HTML
});

app.get('/styleP.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styleP.css')); // Nome do arquivo CSS
});

// Corrigindo a rota para servir o index.html dentro da pasta pastaInicial
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname,  'index.html')); // Corrigido para apontar para o diretório correto
});

app.get('/styleindex.css', (req, res) => {
    res.sendFile(path.join(__dirname,  'styleindex.css')); // Corrigido para apontar para o diretório correto
});

// Rota para cadastrar produto
app.post('/cadastrar', (req, res) => {
    const novoProduto = {
        rua: req.body.rua.trim(),
        rack: req.body.rack.trim(),
        altura: req.body.altura.trim(),
        posicao: req.body.posicao.trim(),
        codigo: req.body.codigo.trim(),
        produto: req.body.produto.trim(),
        quantidade: req.body.quantidade.trim(),
        categoria: req.body.categoria.trim()
    };

    console.log("Dados recebidos:", novoProduto);

    try {
        let workbook;
        if (fs.existsSync('estoque.xlsx')) {
            workbook = XLSX.readFile('estoque.xlsx');
        } else {
            workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([['rua', 'rack', 'altura', 'posicao', 'codigo', 'produto', 'quantidade', 'categoria']]);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Base');
            XLSX.writeFile(workbook, 'estoque.xlsx');
        }

        const worksheet = workbook.Sheets['Base'];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        data.push(novoProduto);

        // Remover entradas vazias
        const novosDados = data.filter(item => item.codigo); // Filtra para remover produtos sem código

        const newWorksheet = XLSX.utils.json_to_sheet(novosDados);
        workbook.Sheets['Base'] = newWorksheet;

        XLSX.writeFile(workbook, 'estoque.xlsx');
        res.json({ message: 'Produto cadastrado com sucesso!' });
    } catch (error) {
        console.error("Erro ao processar a planilha:", error);
        res.status(500).json({ message: 'Erro ao cadastrar o produto. \n Feche a planilha para prosseguir' });
    }
});

// Rota para pesquisar produto pelo código
app.get('/pesquisar/:codigo', (req, res) => {
    const codigoPesquisado = req.params.codigo.trim();  // Remove espaços em branco

    try {
        if (fs.existsSync('estoque.xlsx')) {
            const workbook = XLSX.readFile('estoque.xlsx');
            const worksheet = workbook.Sheets['Base'];
            const data = XLSX.utils.sheet_to_json(worksheet);

            // Filtrar itens pelo código
            const resultados = data.filter(item => 
                item.codigo && item.codigo.trim() === codigoPesquisado
            );

            if (resultados.length > 0) {
                // Agrupar posições em uma única linha
                const agrupados = {};
                resultados.forEach(item => {
                    const key = `${item.rua}-${item.rack}-${item.altura}-${item.codigo}-${item.quantidade}-${item.categoria}`;
                    if (!agrupados[key]) {
                        agrupados[key] = {
                            posicoes: [] // Inicializa um array para armazenar posições
                        };
                    }
                    agrupados[key].posicoes.push(item.posicao); // Aqui use item.posicao sem acento
                });

                // Converte o objeto agrupado de volta para um array
                const resposta = Object.keys(agrupados).map(key => {
                    const [rua, rack, altura, codigo, quantidade, categoria] = key.split('-');
                    return {
                        rua: rua,
                        rack: rack,
                        altura: altura,
                        codigo: codigo,
                        quantidade: quantidade,
                        categoria: categoria,
                        posicao: agrupados[key].posicoes.join(', ') // Converte posições em uma string
                    };
                });

                res.json({ success: true, dados: resposta });
            } else {
                res.json({ success: false, message: 'Produto não encontrado.' });
            }
        } else {
            res.json({ success: false, message: 'Planilha de estoque não encontrada.' });
        }
    } catch (error) {
        console.error("Erro ao pesquisar o produto:", error);
        res.status(500).json({ message: 'Erro ao pesquisar o produto.' });
    }
});

// Rota para deletar produto
app.delete('/deletar/:codigo', (req, res) => {
    const codigoParaDeletar = req.params.codigo.trim();

    try {
        if (fs.existsSync('estoque.xlsx')) {
            const workbook = XLSX.readFile('estoque.xlsx');
            const worksheet = workbook.Sheets['Base'];
            const data = XLSX.utils.sheet_to_json(worksheet);

            // Filtrar itens, mantendo aqueles que não têm o código a ser deletado
            const novosDados = data.filter(item => item.codigo !== codigoParaDeletar);

            // Se a quantidade de dados não mudou, significa que não há produto para deletar
            if (novosDados.length === data.length) {
                return res.json({ success: false, message: 'Produto não encontrado para deleção.' });
            }

            const newWorksheet = XLSX.utils.json_to_sheet(novosDados);
            workbook.Sheets['Base'] = newWorksheet;

            XLSX.writeFile(workbook, 'estoque.xlsx');
            res.json({ success: true, message: 'Produto deletado com sucesso!' });
        } else {
            res.json({ success: false, message: 'Planilha de estoque não encontrada.' });
        }
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        res.status(500).json({ message: 'Erro ao deletar o produto.' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
