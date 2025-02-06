const { WebhookClient } = require("@oracle/bots-node-sdk");
const OracleBot = require('@oracle/bots-node-sdk');
const Config = require('../config/config');

const webhook = new OracleBot.Middleware.WebhookClient({
  channel: {
    url: Config.ODA_WEBHOOK_URL,
    secret: Config.ODA_WEBHOOK_SECRET
  }
});

// Função para enviar uma mensagem para o ODA e capturar o retorno
async function sendMessageToODA(comment) {
  const userId = 'unique-user-id'; // Substitua com um ID real ou um valor fixo

  const messageToSend = {
    userId: userId,
    messagePayload: {
      type: 'text',
      text: `${comment}`,
    },
  };

  try {
    // Envia a mensagem para o ODA
    const response = await webhook.send(messageToSend);

    // Exibe a resposta do ODA no console
    console.log("Resposta do ODA:", response);
  } catch (error) {
    console.error("Erro ao enviar comentário para o ODA:", error);
  }
}

module.exports = { sendMessageToODA };
