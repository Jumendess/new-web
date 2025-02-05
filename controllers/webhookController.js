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
            content: "Você é um analista de sentimentos."
          },
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

// Função para enviar resposta no Messenger
async function enviarRespostaMessenger(senderId, mensagem) {
  try {
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN; // Seu token de acesso da página do Facebook

    await axios.post(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        recipient: { id: senderId },
        message: { text: mensagem },
      },
      {
        params: { access_token: accessToken },
      }
    );
    console.log("Mensagem enviada para o Messenger com sucesso.");
  } catch (error) {
    console.error("Erro ao enviar mensagem para o Messenger:", error);
  }
}

async function handleWebhook(req, res) {
  try {
    // Verifica se a propriedade 'entry' existe e tem pelo menos um item
    if (!req.body.entry || !Array.isArray(req.body.entry) || req.body.entry.length === 0) {
      return res.status(400).send("A propriedade 'entry' está ausente ou malformada.");
    }

    const entry = req.body.entry[0];

    // Verifica se há mudanças (comentários) na feed
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message; // Extrai a mensagem do comentário
          const senderId = change.value.sender.id; // Extrai o sender ID
          console.log(`Comentário recebido: ${commentMessage}`);

          // Verifica se o comentário é negativo usando a Groq
          const isNegative = await analisarSentimento(commentMessage);

          if (isNegative) {
            console.log("Comentário negativo identificado. Enviando ao ODA...");
            // Envia o comentário para o ODA
            const odaResposta = await sendMessageToODA(commentMessage);

            // Depois de enviar para o ODA, envia a resposta para o Messenger
            await enviarRespostaMessenger(senderId, odaResposta);
          } else {
            console.log("Comentário não é negativo. Não será enviado ao ODA.");
            // Você pode responder diretamente no Messenger ou apenas ignorar.
            await enviarRespostaMessenger(senderId, "Obrigado pelo seu comentário!");
          }
        }
      }
    }

    res.status(200).send("Comentário processado.");
  } catch (error) {
    console.error("Erro ao processar o comentário:", error);
    res.status(500).send("Erro ao processar o comentário");
  }
}

module.exports = { handleWebhook };
