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

            Não envie comentários que sejam elogios ou perguntas, mesmo que contenham palavras como 'ruim' ou 'pior'. Apenas envie comentários que indicam insatisfação com o produto ou serviço, como 'não gostei', 'não funciona', 'péssima experiência', etc.`
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

    const resultado = response.data.choices?.[0]?.message?.content?.trim().toLowerCase() || "";
    console.log("Resultado da análise de sentimento:", resultado);

    // Retorna se o comentário for negativo
    return resultado.includes("negativo");
  } catch (error) {
    console.error("Erro ao analisar o sentimento:", error.response?.data || error.message);
    return false;
  }
}

// Função para capturar e exibir a resposta do ODA no console
async function obterRespostaODA(mensagem) {
  try {
    const respostaODA = await sendMessageToODA(mensagem);

    // Verifica se a resposta está no formato esperado
    if (!respostaODA || typeof respostaODA !== "object") {
      console.warn("Resposta inesperada do ODA:", respostaODA);
      return "Erro ao processar resposta do ODA.";
    }

    // Exibe a resposta bruta (raw) no console
    console.log("Resposta bruta do ODA:", JSON.stringify(respostaODA, null, 2));

    // Verifica se a resposta contém o campo "text"
    if (respostaODA.text) {
      console.log("Resposta formatada do ODA:", respostaODA.text);
      return respostaODA.text; // Retorna a resposta correta
    } else {
      console.warn("Resposta do ODA não contém 'text':", respostaODA);
      return "Erro ao processar resposta do ODA.";
    }
  } catch (error) {
    console.error("Erro ao obter resposta do ODA:", error.response?.data || error.message);
    return "Erro ao se comunicar com o ODA.";
  }
}

// Função para processar o webhook
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
          const commentMessage = change.value?.message; // Extrai a mensagem do comentário

          if (!commentMessage) {
            console.warn("Comentário recebido sem mensagem válida:", change.value);
            continue;
          }

          console.log(`Comentário recebido: ${commentMessage}`);

          // Verifica se o comentário é negativo usando a Groq
          const isNegative = await analisarSentimento(commentMessage);

          if (isNegative) {
            console.log("Comentário negativo identificado. Enviando ao ODA...");
            const respostaODA = await obterRespostaODA(commentMessage);
            console.log("Resposta final do ODA:", respostaODA);
          } else {
            console.log("Comentário não é negativo. Não será enviado ao ODA.");
          }
        }
      }
    }

    res.status(200).send("Comentário processado.");
  } catch (error) {
    console.error("Erro ao processar o comentário:", error.response?.data || error.message);
    res.status(500).send("Erro ao processar o comentário");
  }
}

module.exports = { handleWebhook };
