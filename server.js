const express = require('express');
const fs = require('fs');
const XLSX = require('xlsx');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

// Rota para servir o formulário HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});
app.get('/pallet_simulator.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pallet_simulator.html')); // Nome do arquivo HTML
});

app.get('/pesquisar.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pesquisar.html')); // Nome do arquivo HTML
});

app.get('/styleP.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styleP.css')); // Nome do arquivo CSS
});



app.get('/styleindex.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styleindex.css')); 
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

        const novosDados = data.filter(item => item.codigo); 

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


            const resultados = data.filter(item =>
                item.codigo && item.codigo.trim() === codigoPesquisado
            );

            if (resultados.length > 0) {
                const resposta = resultados.map(item => ({
                    rua: item.rua,
                    rack: item.rack,
                    altura: item.altura,
                    codigo: item.codigo,
                    produto: item.produto,
                    quantidade: item.quantidade,
                    categoria: item.categoria,
                    posicao: item.posicao 
                }));

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
app.delete('/deletar/:codigo/:posicao', (req, res) => {
    const codigoParaDeletar = req.params.codigo.trim();
    const posicaoParaDeletar = req.params.posicao.trim();

    try {
        if (fs.existsSync('estoque.xlsx')) {
            const workbook = XLSX.readFile('estoque.xlsx');
            const worksheet = workbook.Sheets['Base'];
            const data = XLSX.utils.sheet_to_json(worksheet);

            
            const novosDados = data.filter(item => !(item.codigo === codigoParaDeletar && item.posicao === posicaoParaDeletar));

         
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
