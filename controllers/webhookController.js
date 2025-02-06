const { sendMessageToODA } = require("../lib/odaClient");
const axios = require("axios");
require("dotenv").config(); // Carregar variáveis de ambiente do .env

class ODAHandler {
    constructor() {
        this.odaQueue = [];
    }

    async analisarSentimento(comentario) {
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
                        Authorization: `Bearer ${groqApiKey}`,
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

    async obterRespostaODA(mensagem) {
        try {
            console.log(`Enviando mensagem ao ODA: "${mensagem}"`);

            // Enviar mensagem ao ODA
            const respostaODA = await sendMessageToODA(mensagem);

            console.log("Resposta bruta do ODA:", JSON.stringify(respostaODA, null, 2));

            if (respostaODA && respostaODA.text) {
                console.log("Resposta formatada do ODA:", respostaODA.text);

                // Simulação de envio ao WhatsApp
                this.enviarParaWhatsApp(respostaODA.text);

                return respostaODA.text;
            } else {
                console.warn("Resposta do ODA não contém 'text':", respostaODA);
                return "Erro ao processar resposta do ODA.";
            }
        } catch (error) {
            console.error("Erro ao obter resposta do ODA:", error.response?.data || error.message);
            return "Erro ao se comunicar com o ODA.";
        }
    }

    enviarParaWhatsApp(mensagem) {
        console.log(`📲 Enviando ao WhatsApp: "${mensagem}"`);
        // Aqui você poderia acionar um evento para enviar a mensagem via API do WhatsApp
    }

    async handleWebhook(req, res) {
        try {
            if (!req.body.entry || !Array.isArray(req.body.entry) || req.body.entry.length === 0) {
                return res.status(400).send("A propriedade 'entry' está ausente ou malformada.");
            }

            const entry = req.body.entry[0];

            if (entry.changes) {
                for (const change of entry.changes) {
                    if (change.field === "feed") {
                        const commentMessage = change.value?.message;

                        if (!commentMessage) {
                            console.warn("Comentário recebido sem mensagem válida:", change.value);
                            continue;
                        }

                        console.log(`📝 Comentário recebido: "${commentMessage}"`);

                        const isNegative = await this.analisarSentimento(commentMessage);

                        if (isNegative) {
                            console.log("⚠️ Comentário negativo identificado. Enviando ao ODA...");
                            const respostaODA = await this.obterRespostaODA(commentMessage);
                            console.log("💬 Resposta final do ODA:", respostaODA);
                        } else {
                            console.log("✅ Comentário não é negativo. Ignorando.");
                        }
                    }
                }
            }

            res.status(200).send("Comentário processado.");
        } catch (error) {
            console.error("❌ Erro ao processar o comentário:", error.response?.data || error.message);
            res.status(500).send("Erro ao processar o comentário");
        }
    }
}

module.exports = new ODAHandler();
