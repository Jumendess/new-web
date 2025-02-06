const { sendMessageToODA } = require("../lib/odaClient");
const axios = require("axios");

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
            content: `Você é um analista de sentimentos altamente preciso. Sua tarefa é avaliar comentários de clientes em uma loja de mecânica...`
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

    return resultado.includes("negativo");
  } catch (error) {
    console.error("Erro ao analisar o sentimento:", error);
    return false;
  }
}

async function handleWebhook(req, res) {
  try {
    if (!req.body.entry || !Array.isArray(req.body.entry) || req.body.entry.length === 0) {
      return res.status(400).send("A propriedade 'entry' está ausente ou malformada.");
    }

    const entry = req.body.entry[0];

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
            const odaResponse = await sendMessageToODA(commentMessage);
            console.log("Resposta do ODA:", odaResponse); // Captura e exibe a resposta do ODA
          } else {
            console.log("Comentário não é negativo. Não será enviado ao ODA.");
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
