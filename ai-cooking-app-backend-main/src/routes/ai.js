
import { Router } from 'express';
import { config } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db/index.js';

const router = Router();

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

function normalizeIngredientList(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((ing) => {
    if (typeof ing === 'string') return ing;
    const parts = [];
    if (ing.quantity != null) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    if (ing.name) parts.push(ing.name);
    return parts.join(' ').trim();
  });
}

// -------------------- External search helpers --------------------

async function searchYoutubeVideos(ingredients, apiKey) {
  if (!apiKey) return [];

  const searchQuery = `${ingredients.join(' ')} recipe cooking indian`;
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${encodeURIComponent(searchQuery)}` +
    `&type=video&maxResults=3&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return [];

    return data.items.map((item) => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelTitle: item.snippet.channelTitle
    }));
  } catch (err) {
    console.error('YouTube API error:', err);
    return [];
  }
}

async function searchSpoonacularRecipes(ingredients, apiKey) {
  if (!apiKey) return [];

  const ingredientParam = ingredients.join(',');
  const url =
    `https://api.spoonacular.com/recipes/findByIngredients` +
    `?ingredients=${encodeURIComponent(ingredientParam)}` +
    `&number=3&apiKey=${apiKey}&ranking=2`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data.map((recipe) => {
      const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        sourceUrl: `https://spoonacular.com/recipes/${slug}-${recipe.id}`,
        usedIngredients:
          recipe.usedIngredients?.map((i) => i.name) || [],
        missedIngredients:
          recipe.missedIngredients?.map((i) => i.name) || []
      };
    });
  } catch (err) {
    console.error('Spoonacular API error:', err);
    return [];
  }
}


router.post('/generate-recipe', async (req, res, next) => {
  try {
    const { ingredients, user_id } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res
        .status(400)
        .json({ error: 'ingredients must be a non-empty array of strings' });
    }

    // STUB mode: return AND persist a stub recipe
    if (process.env.STUB_AI === 'true' || config.STUB_AI === 'true') {
      const stubRecipe = {
        title: 'Stub Tomato Omelette',
        description: 'A simple omelette using tomato and onion.',
        ingredients: [
          { name: 'egg', quantity: 2, unit: 'pieces' },
          { name: 'tomato', quantity: 1, unit: 'medium' },
          { name: 'onion', quantity: 0.5, unit: 'medium' }
        ],
        steps: [
          'Beat the eggs.',
          'Chop tomato and onion.',
          'Cook everything together in a pan.'
        ],
        cook_time_minutes: 15,
        tags: ['under_30']
      };

      const ingredientTexts = normalizeIngredientList(stubRecipe.ingredients);

      const insertQuery = `
        insert into recipes
          (user_id, title, description, ingredients, steps, cook_time_minutes, tags, model_name, source)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning id, user_id, title, description, ingredients, steps,
                  cook_time_minutes, tags, model_name, source, created_at
      `;

      const values = [
        user_id || null,
        stubRecipe.title,
        stubRecipe.description,
        ingredientTexts,
        stubRecipe.steps,
        stubRecipe.cook_time_minutes,
        stubRecipe.tags,
        'gemini-3-flash-preview',
        'stub'
      ];

      const { rows } = await query(insertQuery, values);
      const saved = rows[0];

      return res.status(201).json({ recipe: saved });
    }

    // AI mode
    const prompt = `
You are an Indian home cooking assistant.
Given these ingredients: ${ingredients.join(', ')}

Return ONE simple recipe as JSON only, with this exact structure:
{
  "title": string,
  "description": string,
  "ingredients": [
    { "name": string, "quantity": number, "unit": string }
  ],
  "steps": [string],
  "cook_time_minutes": number,
  "tags": [string]
}
Do not include any text before or after the JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let recipe;
    try {
      recipe = JSON.parse(text);
    } catch (e) {
      return res
        .status(500)
        .json({ error: 'Failed to parse JSON from Gemini', raw: text });
    }

    if (
      !recipe ||
      !recipe.title ||
      !Array.isArray(recipe.ingredients) ||
      !Array.isArray(recipe.steps)
    ) {
      return res
        .status(502)
        .json({ error: 'AI returned an invalid recipe format', raw: recipe });
    }

    const ingredientTexts = normalizeIngredientList(recipe.ingredients);

    const insertQuery = `
      insert into recipes
        (user_id, title, description, ingredients, steps, cook_time_minutes, tags, model_name, source)
      values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, user_id, title, description, ingredients, steps,
                cook_time_minutes, tags, model_name, source, created_at
    `;

    const values = [
      user_id || null,
      recipe.title,
      recipe.description || null,
      ingredientTexts,
      recipe.steps,
      recipe.cook_time_minutes ?? null,
      recipe.tags || [],
      'gemini-3-flash-preview',
      'ai'
    ];

    const { rows } = await query(insertQuery, values);
    const saved = rows[0];

    return res.status(201).json({ recipe: saved });
  } catch (err) {
    next(err);
  }
});


router.post('/search-web-resources', async (req, res, next) => {
  try {
    const { ingredients, user_id } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res
        .status(400)
        .json({ error: 'ingredients must be a non-empty array of strings' });
    }

    let aiRecipe = null;

  
    if (process.env.STUB_AI !== 'true' && config.STUB_AI !== 'true') {
      const prompt = `
You are an Indian home cooking assistant.
Given these ingredients: ${ingredients.join(', ')}

Return ONE simple recipe as JSON only, with this exact structure:
{
  "title": string,
  "description": string,
  "ingredients": [
    { "name": string, "quantity": number, "unit": string }
  ],
  "steps": [string],
  "cook_time_minutes": number,
  "tags": [string]
}
Do not include any text before or after the JSON.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let recipe;
      try {
        recipe = JSON.parse(text);
      } catch (e) {
        recipe = null;
      }

      if (
        recipe &&
        recipe.title &&
        Array.isArray(recipe.ingredients) &&
        Array.isArray(recipe.steps)
      ) {
        const ingredientTexts = normalizeIngredientList(recipe.ingredients);

        const insertQuery = `
          insert into recipes
            (user_id, title, description, ingredients, steps, cook_time_minutes, tags, model_name, source)
          values
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning id, user_id, title, description, ingredients, steps,
                    cook_time_minutes, tags, model_name, source, created_at
        `;

        const values = [
          user_id || null,
          recipe.title,
          recipe.description || null,
          ingredientTexts,
          recipe.steps,
          recipe.cook_time_minutes ?? null,
          recipe.tags || [],
          'gemini-3-flash-preview',
          'ai'
        ];

        const { rows } = await query(insertQuery, values);
        aiRecipe = rows[0];
      }
    }

    const youtubeVideos = await searchYoutubeVideos(
      ingredients,
      config.youtubeApiKey
    );

    const blogRecipes = await searchSpoonacularRecipes(
      ingredients,
      config.spoonacularApiKey
    );

    return res.json({
      ai_recipe: aiRecipe,
      youtube_videos: youtubeVideos,
      blog_recipes: blogRecipes
    });
  } catch (err) {
    next(err);
  }
});

// POST /ai/generate-family-meal-plan
router.post('/generate-family-meal-plan', async (req, res, next) => {
  try {
    const { user_id, family_members, ingredients } = req.body;

    if (!Array.isArray(family_members) || family_members.length === 0) {
      return res.status(400).json({ error: 'family_members must be a non-empty array of objects' });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'ingredients must be a non-empty array of strings' });
    }

    let mealPlan = null;

    // Check if STUB mode is enabled
    if (process.env.STUB_AI === 'true' || config.STUB_AI === 'true') {
      mealPlan = {
        breakfast: {
          recipe_title: "Spinach Paneer Paratha",
          cooking_steps: [
            "Finely chop the spinach and grate the paneer.",
            "Knead with wheat flour and spices to make dough.",
            "Roll out into parathas and cook on a hot tandoor/pan with ghee.",
            "Serve warm with curd."
          ],
          nutritional_value: {
            "calories": 850,
            "protein_g": 35,
            "carbs_g": 90,
            "fats_g": 25,
            "note": "Rich in iron from spinach and protein from paneer. Highly nutritious and energy-dense, perfect for the growing child and active parents."
          }
        },
        lunch: {
          recipe_title: "Jeera Aloo with Spinach Dal and Roti",
          cooking_steps: [
            "Boil potatoes and sauté with cumin seeds (jeera) and spices.",
            "Cook dal with chopped spinach and tomatoes.",
            "Prepare fresh rotis from wheat flour.",
            "Serve hot with dal and aloo."
          ],
          nutritional_value: {
            "calories": 1100,
            "protein_g": 40,
            "carbs_g": 160,
            "fats_g": 20,
            "note": "Well-balanced lunch with complex carbohydrates for sustained energy and dietary fiber to aid digestion for the whole family."
          }
        },
        snacks: {
          recipe_title: "Roasted Paneer Cubes",
          cooking_steps: [
            "Cut paneer into cubes and toss with pepper, salt, and lemon juice.",
            "Lightly pan-fry or roast until golden.",
            "Serve with mint chutney."
          ],
          nutritional_value: {
            "calories": 400,
            "protein_g": 24,
            "carbs_g": 8,
            "fats_g": 30,
            "note": "Low carb, high protein snack option. Great calcium source for the child's bone development and parents' bone health."
          }
        },
        dinner: {
          recipe_title: "Tomato Paneer Bhurji with Wheat Roti",
          cooking_steps: [
            "Sauté onions, tomatoes, and green chilies in a pan.",
            "Add crumbled paneer and spices, cooking for 5 minutes.",
            "Garnish with coriander and serve with soft wheat rotis."
          ],
          nutritional_value: {
            "calories": 950,
            "protein_g": 38,
            "carbs_g": 100,
            "fats_g": 28,
            "note": "Light yet protein-rich dinner that promotes muscle recovery overnight for both the child and parents."
          }
        },
        family_total_nutrients: {
          "calories": 3300,
          "protein_g": 137,
          "carbs_g": 358,
          "fats_g": 103,
          "dietary_recommendations": "Ensure adequate water intake. This meal plan meets 100% of the daily calcium and iron requirements for a family of three including a growing child."
        }
      };
    } else {
      const prompt = `
You are an expert nutritionist and cooking companion.
We have a family with the following members:
${family_members.map(m => `- ${m.name || 'Member'} (Age: ${m.age})`).join('\n')}

We have the following main ingredients available in our kitchen:
${ingredients.join(', ')}

Create a complete daily meal plan (Breakfast, Lunch, Snacks, Dinner) designed for this entire family.
The plan must focus on utilizing the available ingredients where possible, but can also include common pantry items.

For EACH meal (Breakfast, Lunch, Snacks, Dinner), provide:
1. Recipe Name
2. Briefly how to cook it (3-4 bullet steps)
3. Nutritious value breakdown for the entire family (Total Calories, Protein in grams, Carbs in grams, Fats in grams, and a brief note on suitability/nutrition for children/adults based on their ages).

Return the response as JSON only, with this exact structure:
{
  "breakfast": {
    "recipe_title": string,
    "cooking_steps": [string],
    "nutritional_value": {
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "note": string
    }
  },
  "lunch": {
    "recipe_title": string,
    "cooking_steps": [string],
    "nutritional_value": {
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "note": string
    }
  },
  "snacks": {
    "recipe_title": string,
    "cooking_steps": [string],
    "nutritional_value": {
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "note": string
    }
  },
  "dinner": {
    "recipe_title": string,
    "cooking_steps": [string],
    "nutritional_value": {
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "note": string
    }
  },
  "family_total_nutrients": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fats_g": number,
    "dietary_recommendations": string
  }
}
Do not include any text before or after the JSON.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        mealPlan = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        console.error('Failed to parse AI meal plan JSON, using fallback:', e);
        throw new Error('AI generated plan was not in standard format. Please try again.');
      }
    }

    // Persist to DB if user_id is provided
    let savedPlan = null;
    if (user_id) {
      const sql = `
        insert into family_meal_plans (user_id, family_members, ingredients, meal_plan)
        values ($1, $2, $3, $4)
        returning id, user_id, family_members, ingredients, meal_plan, created_at
      `;
      const values = [user_id, JSON.stringify(family_members), ingredients, JSON.stringify(mealPlan)];
      const { rows } = await query(sql, values);
      savedPlan = rows[0];
    } else {
      savedPlan = {
        family_members,
        ingredients,
        meal_plan: mealPlan,
        created_at: new Date()
      };
    }

    res.status(201).json({ family_meal_plan: savedPlan });
  } catch (err) {
    next(err);
  }
});

// GET /ai/family-meal-plans
router.get('/family-meal-plans', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const sql = `
      select id, family_members, ingredients, meal_plan, created_at
      from family_meal_plans
      where user_id = $1
      order by created_at desc
    `;
    const { rows } = await query(sql, [user_id]);
    res.json({ family_meal_plans: rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /ai/family-meal-plans/:id
router.delete('/family-meal-plans/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `delete from family_meal_plans where id = $1`;
    await query(sql, [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
