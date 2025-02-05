const axios = require('axios');
const { sendMessageToODA } = require("../lib/odaClient");

async function handleWebhook(req, res) {
  try {
    const entry = req.body.entry[0];

    // Verifica se há mudanças (comentários) na feed
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message; // Extrai a mensagem do comentário
          const commentId = change.value.comment_id;  // Obtém o ID do comentário
          const senderId = change.value.from.id; // Obtém o ID do usuário que fez o comentário
          console.log(`Comentário recebido: ${commentMessage}`);
          console.log(`ID do usuário: ${senderId}`);

          // Envia o comentário para o ODA
          const odaResponse = await sendMessageToODA(commentMessage);

          // Resposta do ODA (exemplo simples, pode ser adaptado conforme o retorno do ODA)
          const odaReply = odaResponse || "Desculpe, não entendi sua pergunta. Pode reformular?";

          // Envia a resposta para o Messenger com a Tag de Mensagem
          await sendMessageToMessenger(senderId, odaReply);

          console.log("Comentário enviado ao ODA e resposta enviada ao Messenger.");
        }
      }
    }
    res.status(200).send("Comentário processado e enviado ao ODA");
  } catch (error) {
    console.error("Erro ao processar o comentário:", error);
    res.status(500).send("Erro ao processar o comentário");
  }
}

// Função para enviar uma mensagem no Messenger com a Tag
async function sendMessageToMessenger(senderId, message) {
  try {
    const accessToken = process.env.FB_ACCESS_TOKEN;  // Puxa o token de acesso do .env

    const response = await axios.post(
      `https://graph.facebook.com/v16.0/me/messages`,
      {
        recipient: {
          id: senderId, // Envia a mensagem para o usuário que fez o comentário
        },
        message: {
          text: message, // O conteúdo da mensagem
        },
        metadata: {
          "#messagePurpose": "POST_PURCHASE_UPDATE",  // Adiciona a Tag de Mensagem
        },
        access_token: accessToken,
      }
    );

    console.log("Mensagem enviada ao Messenger:", response.data);
  } catch (error) {
    console.error("Erro ao enviar mensagem ao Messenger:", error);
  }
}

module.exports = { handleWebhook };
