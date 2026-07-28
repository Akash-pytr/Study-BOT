const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Subject Configuration ──────────────────────────────────────
const SUBJECTS = {
    mathematics:        { emoji: '🧮', label: 'Mathematics',        color: 0x3498DB },
    physics:            { emoji: '⚛️', label: 'Physics',            color: 0x9B59B6 },
    chemistry:          { emoji: '🧪', label: 'Chemistry',          color: 0xE74C3C },
    biology:            { emoji: '🧬', label: 'Biology',            color: 0x2ECC71 },
    computer_science:   { emoji: '💻', label: 'Computer Science',   color: 0x1ABC9C },
    history:            { emoji: '📜', label: 'History',            color: 0xE67E22 },
    geography:          { emoji: '🌍', label: 'Geography',          color: 0x27AE60 },
    economics:          { emoji: '💰', label: 'Economics',          color: 0xF1C40F },
    english:            { emoji: '📖', label: 'English & Literature', color: 0x8E44AD },
    political_science:  { emoji: '🏛️', label: 'Political Science',  color: 0x34495E },
    psychology:         { emoji: '🧠', label: 'Psychology',         color: 0xE91E63 },
    engineering:        { emoji: '⚙️', label: 'Engineering',        color: 0x95A5A6 },
    medical_science:    { emoji: '🏥', label: 'Medical Science',    color: 0xE74C3C },
    arts:               { emoji: '🎨', label: 'Arts & Performing Arts', color: 0xFF6F61 },
    law:                { emoji: '⚖️', label: 'Law',                color: 0x2C3E50 },
    philosophy:         { emoji: '💭', label: 'Philosophy & Ethics', color: 0x7F8C8D },
    agriculture:        { emoji: '🌾', label: 'Agriculture & Food', color: 0x27AE60 },
    environmental:      { emoji: '🌱', label: 'Environmental Science', color: 0x16A085 },
    business:           { emoji: '📊', label: 'Business & Commerce', color: 0x2980B9 },
    education:          { emoji: '🎓', label: 'Education',          color: 0x8E44AD },
    architecture:       { emoji: '🏗️', label: 'Architecture',       color: 0xBDC3C7 },
    sports:             { emoji: '🏅', label: 'Sports Science',     color: 0xF39C12 },
    media:              { emoji: '📡', label: 'Media & Communication', color: 0x3498DB },
    general:            { emoji: '📚', label: 'General Knowledge',  color: 0x5865F2 },
};

// ─── System Prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Study-BOT, an expert AI tutor for students. You help with ALL academic subjects:

Mathematics, Physics, Chemistry, Biology, Computer Science, Engineering, Medical Science, 
History, Geography, Economics, Political Science, Psychology, Philosophy, Law, 
English, Literature, Arts, Music, Business, Agriculture, Environmental Science, 
Architecture, Sports Science, Education, and more.

CRITICAL DISCORD & MATH FORMATTING RULES:
- Discord DOES NOT support LaTeX. Do NOT use LaTeX tags or commands like \\frac, \\int, \\rho, \\theta, \\phi, \\mathbf, \\left, \\right, \\cdot, $$, or $.
- Raw LaTeX code is unreadable in Discord. ALWAYS write math, equations, integrals, and formulas using clean plain text and Unicode math symbols:
  - Integral symbols: ∫, ∬, ∭ (e.g. ∫[0 to a] ρ⁴ dρ = [ρ⁵ / 5] from 0 to a = a⁵ / 5)
  - Greek letters: θ, φ (or phi), ρ (or rho), π, α, β, λ, etc.
  - Superscripts/Subscripts: ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, x₀, etc.
  - Clear division: (numerator) / (denominator) or (a / b).
  - Multiplication: · or ×
- Present every step clearly in clean, human-readable text so students can read it effortlessly without seeing raw code tags.

GENERAL RULES:
1. Answer in the SAME LANGUAGE as the question. If asked in Hindi/Hinglish, reply in Hindi/Hinglish.
2. For math/numerical problems: Show complete step-by-step solution with formulas.
3. For science concepts: Explain with examples, diagrams (text-based), and real-world applications.
4. For reactions/equations: Write balanced equations with proper formatting.
5. For theory/history: Give structured, concise answers with key points.
6. For code/programming: Provide clean code with comments and explanation.
7. Use markdown formatting (bold, italic, code blocks) for better readability.
8. Keep answers focused and under 1800 characters for Discord. If the topic needs more, give the most important parts.
9. If the question is unclear, still try your best to answer what you think they're asking.
10. Add relevant emojis to make answers engaging.
11. For competitive exam questions (JEE, NEET, UPSC, etc.), mention the correct option and explain why.

You are knowledgeable, friendly, and encouraging. Make learning fun! 🎯`;

// ─── LaTeX Sanitizer Helper for Discord ────────────────────────
function cleanLaTeX(text) {
    if (!text) return text;
    let cleaned = text;

    // Convert \frac{a}{b} -> (a / b)
    cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

    // Convert LaTeX math symbols to Unicode equivalents
    cleaned = cleaned.replace(/\\int/g, '∫')
                     .replace(/\\iint/g, '∬')
                     .replace(/\\iiint/g, '∭')
                     .replace(/\\rho/g, 'ρ')
                     .replace(/\\theta/g, 'θ')
                     .replace(/\\phi/g, 'φ')
                     .replace(/\\pi/g, 'π')
                     .replace(/\\alpha/g, 'α')
                     .replace(/\\beta/g, 'β')
                     .replace(/\\gamma/g, 'γ')
                     .replace(/\\delta/g, 'δ')
                     .replace(/\\lambda/g, 'λ')
                     .replace(/\\infty/g, '∞')
                     .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
                     .replace(/\\cdot/g, ' · ')
                     .replace(/\\times/g, ' × ')
                     .replace(/\\mathbf\{([^}]+)\}/g, '**$1**')
                     .replace(/\\text\{([^}]+)\}/g, '$1')
                     .replace(/\\left/g, '')
                     .replace(/\\right/g, '')
                     .replace(/\\implies/g, '⇒');

    // Remove $ and $$ wrappers
    cleaned = cleaned.replace(/\$\$/g, '').replace(/\$/g, '');

    return cleaned;
}

// ─── Rate Limiter ───────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 5;           // max requests
const RATE_WINDOW_MS = 60000;   // per minute

function checkRateLimit(userId) {
    const now = Date.now();
    const userHistory = rateLimitMap.get(userId) || [];

    // Filter out expired timestamps
    const recent = userHistory.filter(ts => now - ts < RATE_WINDOW_MS);

    if (recent.length >= RATE_LIMIT) {
        const oldestAllowed = recent[0] + RATE_WINDOW_MS;
        const waitSeconds = Math.ceil((oldestAllowed - now) / 1000);
        return { allowed: false, waitSeconds };
    }

    recent.push(now);
    rateLimitMap.set(userId, recent);
    return { allowed: true };
}

// ─── Gemini Client with Multi-Model Fallback ─────────────────────
const GEMINI_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
];

let genAI = null;

function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in .env file!');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

// ─── Ask Question ───────────────────────────────────────────────
async function askQuestion(question, subject = null, imageBuffer = null, mimeType = null) {
    const ai = getGenAI();

    const parts = [];

    let promptText = question || 'Please analyze and answer the question in this image in detail.';
    if (subject && SUBJECTS[subject]) {
        promptText = `[Subject: ${SUBJECTS[subject].label}]\n\n${promptText}`;
    }
    parts.push(promptText);

    if (imageBuffer && mimeType) {
        parts.push({
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: mimeType,
            },
        });
    }

    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
        try {
            const model = ai.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
            });

            const result = await model.generateContent(parts);
            const response = result.response;
            let text = response.text();

            // Clean LaTeX formatting for Discord
            text = cleanLaTeX(text);

            // Trim to Discord embed limit
            if (text.length > 3900) {
                text = text.substring(0, 3900) + '\n\n*... (answer truncated — ask a follow-up for more details!)*';
            }

            return text;
        } catch (err) {
            console.warn(`[Gemini AI] Model "${modelName}" failed or rate-limited (${err.status || err.message}). Trying fallback model...`);
            lastError = err;
        }
    }

    throw lastError || new Error('All Gemini AI models are currently busy. Please try again in a moment.');
}

// ─── Auto-detect Subject ────────────────────────────────────────
function detectSubject(question) {
    const q = question.toLowerCase();

    const keywords = {
        mathematics: ['math', 'solve', 'equation', 'algebra', 'calculus', 'integral', 'derivative', 'matrix', 'probability', 'statistics', 'trigonometry', 'sin', 'cos', 'tan', 'factorial', 'quadratic', 'polynomial', 'logarithm', 'differentiate', 'integration', 'permutation', 'combination', 'theorem', 'proof', 'arithmetic', 'geometry', 'area', 'volume', 'perimeter', 'circle', 'triangle', 'rectangle'],
        physics: ['physics', 'force', 'velocity', 'acceleration', 'momentum', 'energy', 'power', 'wave', 'frequency', 'newton', 'gravity', 'electric', 'magnetic', 'circuit', 'resistance', 'current', 'voltage', 'optics', 'lens', 'mirror', 'refraction', 'reflection', 'thermodynamics', 'heat', 'temperature', 'pressure', 'kinetic', 'potential'],
        chemistry: ['chemistry', 'reaction', 'element', 'compound', 'molecule', 'acid', 'base', 'salt', 'oxidation', 'reduction', 'mole', 'atomic', 'electron', 'proton', 'neutron', 'bond', 'organic', 'inorganic', 'periodic table', 'valence', 'ion', 'catalyst', 'equilibrium', 'ph', 'titration', 'electrochemistry'],
        biology: ['biology', 'cell', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'photosynthesis', 'respiration', 'mitosis', 'meiosis', 'evolution', 'ecosystem', 'species', 'organ', 'tissue', 'bacteria', 'virus', 'plant', 'animal', 'botany', 'zoology', 'genetics', 'mutation', 'hormone', 'nervous system', 'digestion'],
        computer_science: ['programming', 'code', 'algorithm', 'data structure', 'python', 'java', 'javascript', 'c++', 'html', 'css', 'database', 'sql', 'api', 'machine learning', 'ai', 'artificial intelligence', 'software', 'binary', 'loop', 'function', 'array', 'stack', 'queue', 'tree', 'graph', 'sort', 'search', 'oop', 'class', 'object', 'recursion', 'complexity'],
        history: ['history', 'war', 'revolution', 'empire', 'dynasty', 'king', 'queen', 'independence', 'freedom', 'movement', 'ancient', 'medieval', 'modern', 'civilization', 'mughal', 'british', 'french revolution', 'world war', 'cold war', 'constitution'],
        geography: ['geography', 'continent', 'ocean', 'river', 'mountain', 'climate', 'weather', 'earthquake', 'volcano', 'latitude', 'longitude', 'population', 'country', 'capital', 'map', 'desert', 'forest', 'island', 'plateau', 'peninsula', 'atmosphere', 'monsoon'],
        economics: ['economics', 'gdp', 'inflation', 'demand', 'supply', 'market', 'price', 'cost', 'profit', 'tax', 'budget', 'fiscal', 'monetary', 'trade', 'import', 'export', 'unemployment', 'growth', 'recession', 'stock', 'investment', 'banking', 'finance'],
        english: ['grammar', 'essay', 'poem', 'poetry', 'literature', 'novel', 'tense', 'verb', 'noun', 'adjective', 'adverb', 'pronoun', 'sentence', 'paragraph', 'figure of speech', 'metaphor', 'simile', 'summary', 'character analysis', 'shakespeare', 'writing', 'vocabulary'],
        political_science: ['political', 'government', 'democracy', 'parliament', 'legislature', 'judiciary', 'executive', 'election', 'voting', 'constitution', 'fundamental rights', 'directive', 'federalism', 'united nations', 'diplomacy'],
        psychology: ['psychology', 'behavior', 'cognitive', 'mental', 'emotion', 'motivation', 'perception', 'learning', 'memory', 'personality', 'disorder', 'therapy', 'freud', 'consciousness', 'stress', 'anxiety', 'depression'],
        engineering: ['engineering', 'design', 'structural', 'mechanical', 'civil', 'electrical', 'electronics', 'signal', 'control', 'manufacturing', 'material', 'strength', 'fluid', 'hydraulic', 'pneumatic', 'cad', 'robotics'],
        medical_science: ['medical', 'disease', 'symptom', 'diagnosis', 'treatment', 'surgery', 'anatomy', 'physiology', 'pathology', 'pharmacology', 'medicine', 'drug', 'patient', 'clinical', 'health', 'doctor', 'hospital', 'cardiac', 'cancer', 'diabetes'],
        law: ['law', 'legal', 'court', 'judge', 'lawyer', 'criminal', 'civil', 'contract', 'tort', 'constitution', 'amendment', 'section', 'act', 'bill', 'legislation', 'regulation', 'ipc', 'crpc'],
        business: ['business', 'management', 'marketing', 'accounting', 'audit', 'balance sheet', 'income statement', 'cash flow', 'brand', 'strategy', 'hr', 'human resource', 'supply chain', 'logistics', 'entrepreneurship', 'startup'],
        environmental: ['environment', 'pollution', 'climate change', 'global warming', 'renewable', 'solar', 'wind energy', 'deforestation', 'biodiversity', 'conservation', 'ozone', 'greenhouse', 'carbon', 'waste management', 'sustainability', 'recycling'],
    };

    for (const [subject, words] of Object.entries(keywords)) {
        for (const word of words) {
            if (q.includes(word)) {
                return subject;
            }
        }
    }

    return 'general';
}

module.exports = {
    SUBJECTS,
    askQuestion,
    checkRateLimit,
    detectSubject,
};
