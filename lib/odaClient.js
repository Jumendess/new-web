const Config = require('../config/config');
const { WebhookClient } = require("@oracle/bots-node-sdk");

const OracleBot = require('@oracle/bots-node-sdk');
const webhook = new OracleBot.Middleware.WebhookClient({
  channel: {
    url: Config.ODA_WEBHOOK_URL,
    secret: Config.ODA_WEBHOOK_SECRET
  }
});

// Função para enviar uma mensagem para o ODA
async function sendMessageToODA(comment) {
  // Definindo um userId único
  const userId = 'unique-user-id'; // Substitua com um ID real ou um valor fixo

  // Criando a mensagem com o userId e outros parâmetros possíveis
  const messageToSend = {
    userId: userId,
    messagePayload: {
      type: 'text',
      text: `Novo comentário no Facebook: ${comment}`,
    },
  };

  try {
    await webhook.send(messageToSend);
    console.log("Comentário enviado ao ODA:", comment);
  } catch (error) {
    console.error("Erro ao enviar comentário para o ODA:", error);
  }
}

module.exports = {
  sendMessageToODA,
};
