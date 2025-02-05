require("dotenv").config();
const express = require("express");
const cors = require("cors");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

// Habilita o CORS para todas as requisições
app.use(cors());

// Permite o envio de JSON
app.use(express.json());

// Configura as rotas de webhook
app.use("/webhook", webhookRoutes);

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
