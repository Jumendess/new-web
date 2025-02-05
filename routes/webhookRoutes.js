const express = require("express");
const router = express.Router();
const { handleWebhook } = require("../controllers/webhookController");
const verifyWebhook = require("../middleware/verifyWebhook");

// Rota para verificar o webhook do Facebook
router.get("/", verifyWebhook);  // Apenas "/" para não duplicar /webhook

// Rota para receber eventos (comentários) do Facebook
router.post("/", handleWebhook);  // Apenas "/" para não duplicar /webhook

module.exports = router;
