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

          // Após o envio, nem o comentário nem o resultado da análise são armazenados em lugar algum
          // Não há necessidade de limpeza ou deleção explícita, pois não estamos mantendo os dados.
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
