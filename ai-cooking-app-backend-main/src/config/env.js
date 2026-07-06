import 'dotenv/config';

const requiredEnvVars = ['PORT', 'DATABASE_URL', 'GEMINI_API_KEY'];

requiredEnvVars.forEach((name) => {
  if (!process.env[name]) {
    console.warn(`[env] Warning: ${name} is not set`);
  }
});

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  spoonacularApiKey: process.env.SPOONACULAR_API_KEY
};
