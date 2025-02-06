const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// Função para enviar mensagem ao ODA e retornar a resposta
async function sendMessageToODA(message) {
  try {
    const response = await axios.post(process.env.ODA_URL, {
      text: message,
    });

    console.log("Resposta do ODA:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao se comunicar com o ODA:", error);
    return { text: "Desculpe, não consegui processar sua solicitação." };
  }
}

// Função para enviar mensagem ao Messenger
async function sendMessageToMessenger(recipientId, message) {
  const pageAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`,
      {
        messaging_type: "RESPONSE",
        recipient: { id: recipientId },
        message: { text: message },
      }
    );
    console.log("Mensagem enviada para o Messenger:", response.data);
  } catch (error) {
    console.error("Erro ao enviar mensagem para o Messenger:", error);
  }
}

// Função para analisar sentimento
async function analisarSentimento(text) {
  // Simulação de um sistema de análise de sentimento
  return text.includes("ruim") || text.includes("péssimo") || text.includes("horrível");
}

// Função para processar eventos do webhook
async function handleWebhook(req, res) {
  try {
    if (!req.body.entry || !Array.isArray(req.body.entry) || req.body.entry.length === 0) {
      return res.status(400).send("A propriedade 'entry' está ausente ou malformada.");
    }

    const entry = req.body.entry[0];

    // Processamento de comentários
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message;
          console.log(`Comentário recebido: ${commentMessage}`);

          if (await analisarSentimento(commentMessage)) {
            console.log("Comentário negativo identificado. Enviando ao ODA...");
            await sendMessageToODA(commentMessage);
          } else {
            console.log("Comentário não é negativo. Não será enviado ao ODA.");
          }
        }
      }
    }

    // Processamento de mensagens do Messenger
    if (entry.messaging) {
      const messagingEvent = entry.messaging[0];
      const userMessage = messagingEvent.message.text;
      console.log("Mensagem do usuário recebida no Messenger:", userMessage);

      const odaResponse = await sendMessageToODA(userMessage);
      console.log("Resposta do ODA recebida:", odaResponse);

      if (odaResponse && odaResponse.text) {
        await sendMessageToMessenger(messagingEvent.sender.id, odaResponse.text);
      } else {
        console.log("Resposta do ODA não foi recebida ou está vazia.");
      }
    }

    res.status(200).send("Evento processado com sucesso.");
  } catch (error) {
    console.error("Erro ao processar o evento:", error);
    res.status(500).send("Erro ao processar o evento");
  }
}

// Configuração das rotas
app.post("/webhook", handleWebhook);
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Falha na verificação do webhook");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
