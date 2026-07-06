# CookPal - AI Cooking Companion

CookPal is a modern, full-stack application designed to be your ultimate kitchen assistant. Powered by Gemini AI, CookPal generates personalized recipes, suggests custom daily family meal plans with comprehensive nutrition breakdowns, and pulls video/blog resources from YouTube and Spoonacular.

---

## Key Features

1. **AI Recipe Generator**: Enter ingredients currently available in your kitchen to generate custom recipes tailored to those ingredients.
2. **Web Resources Search**: Automatically search YouTube for video tutorials and Spoonacular for recipe blogs matching your available ingredients.
3. **AI Family Meal Planner**: Specify family members, their ages, and available ingredients. The system generates a complete daily meal plan (Breakfast, Lunch, Snacks, Dinner) along with family nutritional summaries (Calories, Carbs, Protein, Fats) and customized dietary advice.
4. **Recipe Log & Favorites**: Sign in to save recipes, add personal cooking notes, rate them, and filter recipes by tags.

---

## Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React (optimized for individual imports)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase / local pg)
- **AI Integration**: Google Generative AI (Gemini SDK)
- **APIs**: YouTube Data API v3, Spoonacular API

---

## Project Structure

```text
├── CookingApp.jsx                 # Legacy standalone React component backup
├── ai-cooking-app-backend-main/   # Node.js backend application
│   ├── src/
│   │   ├── config/                # Environment configuration
│   │   ├── db/                    # Database client initialization
│   │   ├── middleware/            # Custom express middlewares (Error handler, etc.)
│   │   ├── routes/                # API endpoints (AI, recipes, users, meal plans)
│   │   └── server.js              # Server entry point & DB schema migration script
│   ├── .env                       # Environment credentials (excluded from Git)
│   └── package.json
└── frontend/                      # React frontend application
    ├── src/
    │   ├── assets/                # Visual assets
    │   ├── App.jsx                # Core UI & state management
    │   ├── main.jsx               # Application entry point
    │   └── index.css              # Global styling configuration
    ├── index.html
    └── package.json
```

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A PostgreSQL database (e.g., Supabase or a local installation)
- API Keys for:
  - Gemini AI (Google AI Studio)
  - YouTube Data API v3
  - Spoonacular API

### 1. Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd ai-cooking-app-backend-main
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the backend root directory and configure the environment variables:
   ```env
   PORT=4002
   DATABASE_URL=your-postgresql-connection-string
   GEMINI_API_KEY=your-gemini-api-key
   YOUTUBE_API_KEY=your-youtube-api-key
   SPOONACULAR_API_KEY=your-spoonacular-api-key
   STUB_AI=false
   ```
   *(Note: Set `STUB_AI=true` to simulate recipes and meal planning without making real API calls to Gemini.)*

### 2. Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## Running the Application

### Start the Backend
From the `ai-cooking-app-backend-main` folder:
```bash
npm run dev
```
The server will start on port `4002` (or the port defined in your `.env`) and automatically verify or create the required database tables.

### Start the Frontend
From the `frontend` folder:
```bash
npm run dev
```
Vite will start the dev server, usually on `http://localhost:5173`. Open this URL in your web browser. You can configure the backend URL link dynamically within the application's **Profile** tab under *API Connection*.
