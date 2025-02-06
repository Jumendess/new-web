const { sendMessageToODA } = require("../lib/odaClient");
const axios = require("axios");
require("dotenv").config(); // Carregar variáveis de ambiente do .env

// Função para analisar o sentimento do comentário com Groq
async function analisarSentimento(comentario) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY; // Chave de API da Groq

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions", // Endpoint da Groq
      {
        model: "llama-3.3-70b-versatile", // Modelo Groq
        messages: [
          {
            role: "system",
            content: `Você é um analista de sentimentos altamente preciso. Sua tarefa é avaliar comentários de clientes em uma loja de mecânica, onde os produtos e serviços são variados. Seu objetivo é identificar se um comentário é **negativo** em relação aos **produtos, serviços ou a experiência de compra**. Lembre-se de que, ao analisar os comentários, você deve considerar os seguintes critérios:

            - **Negativo**: O comentário deve expressar insatisfação ou uma crítica direta ao produto ou serviço.
            - **Neutro**: O comentário não expressa claramente uma opinião negativa nem positiva, como um simples elogio ou uma observação neutra.
            - **Elogios ou Perguntas**: Comentários de agradecimento, elogios ao atendimento ou perguntas sobre produtos ou serviços não são considerados negativos, mesmo que contenham palavras que possam ser mal interpretadas como negativas.

            Não envie comentários que sejam elogios ou perguntas, mesmo que contenham palavras como 'ruim' ou 'pior'. Apenas envie comentários que indicam insatisfação com o produto ou serviço, como 'não gostei', 'não funciona', 'péssima experiência', etc.`},
          {
            role: "user",
            content: `Analise o seguinte comentário e determine se é negativo: "${comentario}"`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`, // Passando a chave de API
          "Content-Type": "application/json"
        }
      }
    );

    const resultado = response.data.choices[0].message.content.trim().toLowerCase();
    console.log("Resultado da análise de sentimento:", resultado);

    // Retorna se o comentário for negativo
    return resultado.includes("negativo");
  } catch (error) {
    console.error("Erro ao analisar o sentimento:", error);
    return false;
  }
}

// Função para enviar a resposta ao Messenger
async function sendMessageToMessenger(recipientId, message) {
  const pageAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`,
      {
        messaging_type: "RESPONSE",
        recipient: {
          id: recipientId,
        },
        message: {
          text: "Olá! Como posso ajudá-lo?",
        },
      }
    );
    console.log("Mensagem enviada para o Messenger:", response.data);
  } catch (error) {
    console.error("Erro ao enviar mensagem para o Messenger:", error);
  }
}

// Função para processar os eventos do webhook
async function handleWebhook(req, res) {
  try {
    // Verifica se a propriedade 'entry' existe e tem pelo menos um item
    if (!req.body.entry || !Array.isArray(req.body.entry) || req.body.entry.length === 0) {
      return res.status(400).send("A propriedade 'entry' está ausente ou malformada.");
    }

    const entry = req.body.entry[0];

    // Verifica se é um comentário
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message; // Extrai a mensagem do comentário
          console.log(`Comentário recebido: ${commentMessage}`);

          // Verifica se o comentário é negativo usando a Groq
          const isNegative = await analisarSentimento(commentMessage);

          if (isNegative) {
            console.log("Comentário negativo identificado. Enviando ao ODA...");
            // Envia o comentário para o ODA
            await sendMessageToODA(commentMessage);
          } else {
            console.log("Comentário não é negativo. Não será enviado ao ODA.");
          }
        }
      }
    }

    // Verifica se é uma mensagem do Messenger
    if (entry.messaging) {
      const messagingEvent = entry.messaging[0];
      const userMessage = messagingEvent.message.text; // Mensagem enviada pelo usuário
      console.log("Mensagem do usuário recebida no Messenger:", userMessage);

      // Envia a mensagem para o ODA
      const odaResponse = await sendMessageToODA(userMessage);

      // Responde ao Messenger com a resposta do ODA
      await sendMessageToMessenger(messagingEvent.sender.id, odaResponse);

      res.status(200).send("Mensagem do Messenger processada");
      return;
    }

    res.status(200).send("Evento processado com sucesso.");
  } catch (error) {
    console.error("Erro ao processar o evento:", error);
    res.status(500).send("Erro ao processar o evento");
  }
}

module.exports = { handleWebhook };
