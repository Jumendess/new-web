const { sendMessageToODA } = require("../lib/odaClient");

async function handleWebhook(req, res) {
  try {
    const entry = req.body.entry[0];

    // Verifica se há mudanças (comentários) na feed
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "feed") {
          const commentMessage = change.value.message; // Extrai a mensagem do comentário
          console.log(`Comentário recebido: ${commentMessage}`);

          // Envia o comentário para o ODA
          await sendMessageToODA(commentMessage);
        }
      }
    }
    res.status(200).send("Comentário processado e enviado ao ODA");
  } catch (error) {
    console.error("Erro ao processar o comentário:", error);
    res.status(500).send("Erro ao processar o comentário");
  }
}

module.exports = { handleWebhook };
