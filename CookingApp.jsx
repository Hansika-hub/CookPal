import React, { useState, useEffect, useCallback } from "react";
import {
  ChefHat,
  Search,
  Heart,
  Star,
  Calendar as CalendarIcon,
  User,
  Plus,
  Trash2,
  Clock,
  Youtube,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  BookOpen,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEFAULT_API_BASE = "http://localhost:4002";

async function api(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------
function Tag({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-stone-200 ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-amber-600 text-white hover:bg-amber-700",
    secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200",
    ghost: "text-stone-500 hover:text-stone-800 hover:bg-stone-100",
    danger: "text-red-500 hover:bg-red-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent ${props.className || ""}`}
    />
  );
}

function Spinner({ className = "" }) {
  return <Loader2 className={`animate-spin ${className}`} size={16} />;
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function CookingApp() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [user, setUser] = useState(null); // {id, email, name}
  const [tab, setTab] = useState("discover");

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-50 text-stone-800 font-sans">
      <Header apiBase={apiBase} user={user} tab={tab} setTab={setTab} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        {tab === "discover" && <DiscoverTab apiBase={apiBase} user={user} />}
        {tab === "recipes" && <RecipesTab apiBase={apiBase} user={user} />}
        {tab === "mealplans" && <MealPlansTab apiBase={apiBase} user={user} />}
        {tab === "profile" && (
          <ProfileTab apiBase={apiBase} setApiBase={setApiBase} user={user} setUser={setUser} />
        )}
      </main>
    </div>
  );
}

function Header({ apiBase, user, tab, setTab }) {
  const navItems = [
    { id: "discover", label: "Discover", icon: Sparkles },
    { id: "recipes", label: "Recipes", icon: BookOpen },
    { id: "mealplans", label: "Meal Plans", icon: CalendarIcon },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-amber-50/80 border-b border-amber-100">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 text-white rounded-xl p-2">
            <ChefHat size={18} />
          </div>
          <div>
            <p className="font-semibold leading-tight">AI Cooking Companion</p>
            <p className="text-xs text-stone-500 leading-tight">
              {user ? `Hi, ${user.name || user.email}` : "Not signed in"}
            </p>
          </div>
        </div>
        <nav className="flex gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                tab === id ? "bg-amber-600 text-white" : "text-stone-500 hover:bg-amber-100"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Discover tab — /ai/generate-recipe and /ai/search-web-resources
// ---------------------------------------------------------------------------
function DiscoverTab({ apiBase, user }) {
  const [ingredientText, setIngredientText] = useState("");
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [webResults, setWebResults] = useState(null);

  const ingredients = ingredientText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleGenerate() {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }
    setError("");
    setLoadingGen(true);
    setRecipe(null);
    try {
      const data = await api(apiBase, "/ai/generate-recipe", {
        method: "POST",
        body: JSON.stringify({ ingredients, user_id: user?.id || null }),
      });
      setRecipe(data.recipe);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGen(false);
    }
  }

  async function handleSearchResources() {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }
    setError("");
    setLoadingSearch(true);
    setWebResults(null);
    try {
      const data = await api(apiBase, "/ai/search-web-resources", {
        method: "POST",
        body: JSON.stringify({ ingredients, user_id: user?.id || null }),
      });
      setWebResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSearch(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-600" /> What's in your kitchen?
        </h2>
        <p className="text-sm text-stone-500 mb-3">
          Enter ingredients separated by commas, e.g. <em>tomato, onion, egg</em>
        </p>
        <ErrorBanner message={error} onClose={() => setError("")} />
        <Input
          placeholder="tomato, onion, egg..."
          value={ingredientText}
          onChange={(e) => setIngredientText(e.target.value)}
        />
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ingredients.map((ing, i) => (
              <Tag key={i}>{ing}</Tag>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={handleGenerate} disabled={loadingGen}>
            {loadingGen ? <Spinner /> : <Sparkles size={16} />}
            Generate AI recipe
          </Button>
          <Button onClick={handleSearchResources} variant="secondary" disabled={loadingSearch}>
            {loadingSearch ? <Spinner /> : <Search size={16} />}
            Find videos & recipes online
          </Button>
        </div>
      </Card>

      {recipe && <RecipeCard recipe={recipe} />}

      {webResults && (
        <div className="space-y-4">
          {webResults.ai_recipe && (
            <div>
              <p className="text-sm font-medium text-stone-500 mb-2">AI suggestion</p>
              <RecipeCard recipe={webResults.ai_recipe} />
            </div>
          )}

          {webResults.youtube_videos?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Youtube size={18} className="text-red-500" /> Video tutorials
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {webResults.youtube_videos.map((v) => (
                  <a
                    key={v.videoId}
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-stone-200 hover:shadow-md transition-shadow"
                  >
                    {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-full h-24 object-cover" />}
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{v.title}</p>
                      <p className="text-[11px] text-stone-400 mt-1">{v.channelTitle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {webResults.blog_recipes?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-amber-600" /> Recipes from the web
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {webResults.blog_recipes.map((r, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-stone-200">
                    {r.image && <img src={r.image} alt={r.title} className="w-full h-24 object-cover" />}
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{r.title}</p>
                      {r.usedIngredients?.length > 0 && (
                        <p className="text-[11px] text-green-600 mt-1">Uses: {r.usedIngredients.join(", ")}</p>
                      )}
                      {r.missedIngredients?.length > 0 && (
                        <p className="text-[11px] text-stone-400">Missing: {r.missedIngredients.join(", ")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!webResults.ai_recipe &&
            !webResults.youtube_videos?.length &&
            !webResults.blog_recipes?.length && (
              <p className="text-sm text-stone-500 text-center">No external results found.</p>
            )}
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{recipe.title}</h3>
        {recipe.cook_time_minutes != null && (
          <span className="flex items-center gap-1 text-xs text-stone-500 whitespace-nowrap">
            <Clock size={14} /> {recipe.cook_time_minutes} min
          </span>
        )}
      </div>
      {recipe.description && <p className="text-sm text-stone-600 mt-1">{recipe.description}</p>}
      {recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {recipe.tags.map((t, i) => (
            <Tag key={i}>{t}</Tag>
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm font-medium mb-1.5">Ingredients</p>
          <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
            {(recipe.ingredients || []).map((ing, i) => (
              <li key={i}>
                {typeof ing === "string"
                  ? ing
                  : [ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Steps</p>
          <ol className="text-sm text-stone-600 space-y-1.5 list-decimal list-inside">
            {(recipe.steps || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recipes tab — /recipes, /user-recipe-meta
// ---------------------------------------------------------------------------
function RecipesTab({ apiBase, user }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tagFilter.trim()) params.set("tag", tagFilter.trim());
      if (mineOnly && user?.id) params.set("user_id", user.id);
      params.set("limit", "30");
      const data = await api(apiBase, `/recipes?${params.toString()}`);
      setRecipes(data.recipes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, tagFilter, mineOnly, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (selectedId) {
    return (
      <RecipeDetail
        apiBase={apiBase}
        user={user}
        recipeId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Filter by tag (e.g. vegan)"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={load} variant="secondary">
            <Search size={16} /> Apply
          </Button>
          <label className="flex items-center gap-2 text-sm text-stone-600 ml-auto">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              disabled={!user}
            />
            My recipes only
          </label>
        </div>
      </Card>

      <ErrorBanner message={error} onClose={() => setError("")} />

      {loading ? (
        <div className="flex justify-center py-10 text-stone-400">
          <Spinner className="w-6 h-6" />
        </div>
      ) : recipes.length === 0 ? (
        <p className="text-center text-stone-500 text-sm py-10">No recipes found yet. Generate one in Discover!</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-amber-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                {r.cook_time_minutes != null && (
                  <span className="flex items-center gap-1 text-xs text-stone-400 whitespace-nowrap">
                    <Clock size={12} /> {r.cook_time_minutes}m
                  </span>
                )}
              </div>
              {r.description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{r.description}</p>}
              {r.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.slice(0, 4).map((t, i) => (
                    <Tag key={i}>{t}</Tag>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ apiBase, user, recipeId, onBack }) {
  const [recipe, setRecipe] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api(apiBase, `/recipes/${recipeId}`);
        if (!active) return;
        setRecipe(data.recipe);

        if (user?.id) {
          try {
            const m = await api(apiBase, `/user-recipe-meta/${user.id}/${recipeId}`);
            const row = Array.isArray(m.meta) ? m.meta[0] : m.meta;
            if (active && row) {
              setMeta(row);
              setRating(row.rating || 0);
              setNotes(row.notes || "");
            }
          } catch (e) {
            // no meta yet — fine
          }
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [apiBase, recipeId, user]);

  async function saveMeta(partial) {
    if (!user?.id) {
      setError("Sign in from the Profile tab to save favorites, ratings or notes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await api(apiBase, "/user-recipe-meta", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          recipe_id: recipeId,
          is_favorite: meta?.is_favorite ?? false,
          rating: rating || null,
          notes: notes || null,
          ...partial,
        }),
      });
      setMeta(data.meta);
      if (data.meta.rating != null) setRating(data.meta.rating);
      if (data.meta.notes != null) setNotes(data.meta.notes);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Back to recipes
      </Button>
      <ErrorBanner message={error} onClose={() => setError("")} />
      {loading ? (
        <div className="flex justify-center py-10 text-stone-400">
          <Spinner className="w-6 h-6" />
        </div>
      ) : recipe ? (
        <>
          <RecipeCard recipe={recipe} />
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Your notes</h3>
            <div className="flex items-center gap-3">
              <Button
                variant={meta?.is_favorite ? "primary" : "secondary"}
                onClick={() => saveMeta({ is_favorite: !meta?.is_favorite })}
                disabled={saving}
              >
                <Heart size={16} fill={meta?.is_favorite ? "currentColor" : "none"} />
                {meta?.is_favorite ? "Favorited" : "Favorite"}
              </Button>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)}>
                    <Star
                      size={18}
                      className={n <= rating ? "text-amber-500" : "text-stone-300"}
                      fill={n <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={3}
              placeholder="Personal notes about this recipe..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button onClick={() => saveMeta({})} disabled={saving}>
              {saving ? <Spinner /> : null} Save
            </Button>
          </Card>
        </>
      ) : (
        <p className="text-center text-stone-500 text-sm py-10">Recipe not found.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meal Plans tab — /meal-plans, /meal-plan-items
// ---------------------------------------------------------------------------
function MealPlansTab({ apiBase, user }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  // New plan form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api(apiBase, `/meal-plans/${user.id}`);
      setPlans(data.meal_plans || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function createPlan() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await api(apiBase, "/meal-plans", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          title,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function deletePlan(id) {
    try {
      await api(apiBase, `/meal-plans/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user) {
    return (
      <Card className="p-8 text-center text-stone-500">
        <CalendarIcon className="mx-auto mb-2 text-amber-500" />
        Sign in from the Profile tab to create and view meal plans.
      </Card>
    );
  }

  if (selectedPlan) {
    return (
      <MealPlanDetail apiBase={apiBase} planId={selectedPlan} onBack={() => setSelectedPlan(null)} />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Plus size={18} className="text-amber-600" /> New meal plan
        </h2>
        <ErrorBanner message={error} onClose={() => setError("")} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button className="mt-3" onClick={createPlan} disabled={creating}>
          {creating ? <Spinner /> : <Plus size={16} />} Create plan
        </Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10 text-stone-400">
          <Spinner className="w-6 h-6" />
        </div>
      ) : plans.length === 0 ? (
        <p className="text-center text-stone-500 text-sm py-6">No meal plans yet — create one above.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
              <button className="text-left flex-1" onClick={() => setSelectedPlan(p.id)}>
                <p className="font-medium">{p.title}</p>
                {p.description && <p className="text-xs text-stone-500">{p.description}</p>}
                <p className="text-xs text-stone-400 mt-1">
                  {p.start_date ? p.start_date.slice(0, 10) : "?"} → {p.end_date ? p.end_date.slice(0, 10) : "?"}
                </p>
              </button>
              <Button variant="danger" onClick={() => deletePlan(p.id)}>
                <Trash2 size={16} />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MealPlanDetail({ apiBase, planId, onBack }) {
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // add item form
  const [recipeId, setRecipeId] = useState("");
  const [mealDate, setMealDate] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(apiBase, `/meal-plans/detail/${planId}`);
      setPlan(Array.isArray(data.meal_plan) ? data.meal_plan[0] : data.meal_plan);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, planId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    if (!recipeId.trim() || !mealDate) {
      setError("Recipe ID and date are required.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await api(apiBase, "/meal-plan-items", {
        method: "POST",
        body: JSON.stringify({
          meal_plan_id: planId,
          recipe_id: recipeId.trim(),
          meal_date: mealDate,
          meal_type: mealType,
        }),
      });
      setRecipeId("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(id) {
    try {
      await api(apiBase, `/meal-plan-items/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Back to meal plans
      </Button>
      <ErrorBanner message={error} onClose={() => setError("")} />
      {loading ? (
        <div className="flex justify-center py-10 text-stone-400">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <>
          {plan && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold">{plan.title}</h2>
              {plan.description && <p className="text-sm text-stone-500">{plan.description}</p>}
              <p className="text-xs text-stone-400 mt-1">
                {plan.start_date ? plan.start_date.slice(0, 10) : "?"} → {plan.end_date ? plan.end_date.slice(0, 10) : "?"}
              </p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus size={16} className="text-amber-600" /> Add meal
            </h3>
            <p className="text-xs text-stone-400 mb-2">
              Tip: copy a recipe's ID from the Recipes tab (visit a recipe, the ID is in its URL/detail).
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input placeholder="Recipe ID" value={recipeId} onChange={(e) => setRecipeId(e.target.value)} />
              <Input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <Button className="mt-3" onClick={addItem} disabled={adding}>
              {adding ? <Spinner /> : <Plus size={16} />} Add to plan
            </Button>
          </Card>

          {items.length === 0 ? (
            <p className="text-center text-stone-500 text-sm py-6">No meals scheduled yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <Card key={it.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    <p className="text-xs text-stone-500">
                      {it.meal_date?.slice(0, 10)} · {it.meal_type || "meal"}
                      {it.cook_time_minutes != null ? ` · ${it.cook_time_minutes} min` : ""}
                    </p>
                    {it.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.tags.map((t, i) => (
                          <Tag key={i}>{t}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="danger" onClick={() => removeItem(it.id)}>
                    <Trash2 size={16} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile tab — /users, plus API base config
// ---------------------------------------------------------------------------
function ProfileTab({ apiBase, setApiBase, user, setUser }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [existingId, setExistingId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await api(apiBase, "/users", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
      });
      setUser(data.user);
      setInfo(`Account created! Save your user ID: ${data.user.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadById() {
    if (!existingId.trim()) {
      setError("Enter a user ID.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await api(apiBase, `/users/${existingId.trim()}`);
      setUser(data.user);
      setInfo("Signed in successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Settings size={18} className="text-amber-600" /> API connection
        </h2>
        <label className="text-xs text-stone-500">Backend URL</label>
        <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
      </Card>

      <ErrorBanner message={error} onClose={() => setError("")} />
      {info && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-3 py-2">
          {info}
        </div>
      )}

      {user ? (
        <Card className="p-5">
          <h3 className="font-semibold mb-2">Signed in</h3>
          <p className="text-sm">Name: {user.name || "—"}</p>
          <p className="text-sm">Email: {user.email}</p>
          <p className="text-xs text-stone-400 mt-1 break-all">User ID: {user.id}</p>
          <Button className="mt-3" variant="secondary" onClick={() => setUser(null)}>
            Sign out
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <h3 className="font-semibold mb-2">Create an account</h3>
            <div className="space-y-2">
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button className="mt-3" onClick={createAccount} disabled={loading}>
              {loading ? <Spinner /> : <User size={16} />} Create account
            </Button>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-2">Already have an account?</h3>
            <p className="text-xs text-stone-500 mb-2">Enter your saved user ID to sign in.</p>
            <Input placeholder="User ID" value={existingId} onChange={(e) => setExistingId(e.target.value)} />
            <Button className="mt-3" variant="secondary" onClick={loadById} disabled={loading}>
              {loading ? <Spinner /> : <User size={16} />} Sign in
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
