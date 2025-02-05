const { sendMessageToODA } = require("../lib/odaClient");
const axios = require("axios");
require("dotenv").config();  // Carregar variáveis de ambiente do .env

// Função para responder ao comentário no Facebook
async function replyToComment(commentId, message) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;  // Token do Facebook no arquivo .env
  const url = `https://graph.facebook.com/${commentId}/comments`;

  try {
    const response = await axios.post(url, {
      message: message,
      access_token: accessToken
    });
    console.log("Comentário respondido com sucesso:", response.data);
  } catch (error) {
    console.error("Erro ao responder o comentário:", error);
  }
}

// Função que lida com os comentários e envia ao ODA
async function handleWebhook(req, res) {
  try {
    const entry = req.body.entry[0];

    // Verifica se há mudanças (comentários) na feed
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message; // Extrai a mensagem do comentário
          const commentId = change.value.comment_id;  // Extrai o comment_id
          console.log(`Comentário recebido: ${commentMessage}`);

          // Envia o comentário para o ODA e obtém a resposta
          const odaResponse = await sendMessageToODA(commentMessage);

          // Responde ao comentário no Facebook com a resposta do ODA
          await replyToComment(commentId, odaResponse);
        }
      }
    }
    res.status(200).send("Comentário processado e enviado ao ODA");
  } catch (error) {
    console.error("Erro ao processar o comentário:", error);
    res.status(500).send("Erro ao processar o comentário");
  }
}

module.exports = { handleWebhook };
