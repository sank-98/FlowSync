const { GoogleGenerativeAI } = require('@google/generative-ai');

function createGeminiModel(apiKey) {
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

module.exports = { createGeminiModel };
