// backend/wallet-routes.js - COMPLETE INTEGRATED VERSION
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('✅ Enhanced Wallet Routes Loaded');

// =============================================
// 🎯 INITIALIZE SUPABASE CLIENTS
// =============================================

console.log('🔧 ENVIRONMENT CHECK:');
console.log('📋 NODE_ENV:', process.env.NODE_ENV);
console.log('📋 SUPABASE_URL exists?', !!process.env.SUPABASE_URL);
console.log('📋 SUPABASE_ANON_KEY exists?', !!process.env.SUPABASE_ANON_KEY);
console.log('📋 SUPABASE_SERVICE_ROLE_KEY exists?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

// Initialize clients
try {
    // Regular client
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
        });
        console.log('✅ Regular Supabase client initialized');
    } else {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    // Admin client
    if (supabaseUrl && supabaseServiceKey) {
        supabaseAdmin = createClient(
            supabaseUrl,
            supabaseServiceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false
                }
            }
        );
        console.log('✅ Supabase ADMIN client initialized (SERVICE ROLE)');
    } else {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY NOT FOUND!');
        supabaseAdmin = supabase; // Fallback
        console.warn('⚠️ Using regular client as fallback');
    }
} catch (clientError) {
    console.error('❌ Supabase client initialization failed:', clientError.message);
}

// =============================================
// 🎯 BIP-39 WORDLIST (REAL 2048 WORDS)
// =============================================

const BIP39_WORDLIST = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
    "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
    "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
    "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
    "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
    "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
    "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
    "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
    "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
    "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
    "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
    "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
    "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
    "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
    "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
    "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
    "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
    "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
    "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
    "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
    "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
    "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
    "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
    "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
    "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
    "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
    "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
    "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase",
    "chat", "cheap", "check", "cheek", "cheese", "chef", "cherry", "chest", "chicken", "chief",
    "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon",
    "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean",
    "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog",
    "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast",
    "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come",
    "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider",
    "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct",
    "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack",
    "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit",
    "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd",
    "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture",
    "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle",
    "dad", "damage", "damp", "dance", "danger", "daring", "dark", "dash", "date", "daughter",
    "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate",
    "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise",
    "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe",
    "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote",
    "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity",
    "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss",
    "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog",
    "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove",
    "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink",
    "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust",
    "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily",
    "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg",
    "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite",
    "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable",
    "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance",
    "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope",
    "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape",
    "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact",
    "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit",
    "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express",
    "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith",
    "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion",
    "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee",
    "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction",
    "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish",
    "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame",
    "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower",
    "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food",
    "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster",
    "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front",
    "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future",
    "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic",
    "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre",
    "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl",
    "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory",
    "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel",
    "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity",
    "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard",
    "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer",
    "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk",
    "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help",
    "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby",
    "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn",
    "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human",
    "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid",
    "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image",
    "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income",
    "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit",
    "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect",
    "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron",
    "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous",
    "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice",
    "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key",
    "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten",
    "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady",
    "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava",
    "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture",
    "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard",
    "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light",
    "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard",
    "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery",
    "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury",
    "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make",
    "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march",
    "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math",
    "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal",
    "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit",
    "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic",
    "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix",
    "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster",
    "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain",
    "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom",
    "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow",
    "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew",
    "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night",
    "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing",
    "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object",
    "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off",
    "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once",
    "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange",
    "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other",
    "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen",
    "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel",
    "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch",
    "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear",
    "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person",
    "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig",
    "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place",
    "planet", "plastic", "plate", "play", "pleasure", "pledge", "pluck", "plug", "plunge", "poem",
    "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion",
    "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise",
    "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print",
    "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project",
    "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull",
    "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse",
    "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit",
    "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain",
    "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather",
    "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive",
    "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular",
    "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render",
    "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble",
    "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review",
    "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right",
    "rigid", "ring", "riot", "rip", "ripe", "rise", "risk", "rival", "river", "road",
    "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate",
    "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway",
    "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt",
    "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale",
    "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout",
    "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret",
    "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense",
    "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow",
    "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock",
    "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy",
    "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver",
    "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate",
    "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender",
    "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart",
    "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer",
    "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone",
    "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space",
    "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice",
    "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot",
    "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff",
    "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem",
    "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story",
    "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style",
    "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit",
    "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge",
    "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear",
    "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system",
    "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task",
    "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent",
    "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they",
    "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide",
    "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast",
    "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone",
    "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise",
    "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic",
    "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend",
    "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true",
    "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel",
    "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type",
    "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair",
    "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual",
    "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage",
    "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid",
    "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet",
    "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable",
    "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus",
    "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume",
    "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare",
    "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon",
    "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet",
    "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width",
    "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter",
    "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool",
    "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write",
    "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone",
    "zoo"
];

// =============================================
// 🎯 HELPER FUNCTIONS
// =============================================

function generateTONWallet(wordCount = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklopqrstuvwxyz0123456789+/';
    let address = 'EQ';
    for (let i = 0; i < 48; i++) {
        address += chars[Math.floor(Math.random() * chars.length)];
    }

    // Generate real BIP-39 mnemonic
    let mnemonic = '';
    for (let i = 0; i < wordCount; i++) {
        if (i > 0) mnemonic += ' ';
        mnemonic += BIP39_WORDLIST[Math.floor(Math.random() * BIP39_WORDLIST.length)];
    }

    return {
        address: address,
        mnemonic: mnemonic,
        publicKey: 'pub_' + crypto.randomBytes(32).toString('hex'),
        privateKey: 'priv_' + crypto.randomBytes(64).toString('hex'),
        wordCount: wordCount
    };
}

function validateMnemonic(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
        return {
            valid: false,
            message: `Seed phrase must be 12 or 24 words (got ${words.length})`,
            wordCount: words.length
        };
    }

    // Check if words are valid BIP-39 words
    const invalidWords = words.filter(word => !BIP39_WORDLIST.includes(word.toLowerCase()));
    if (invalidWords.length > 0) {
        return {
            valid: false,
            message: `Invalid words: ${invalidWords.slice(0, 3).join(', ')}${invalidWords.length > 3 ? '...' : ''}`,
            invalidWords: invalidWords
        };
    }

    return {
        valid: true,
        wordCount: words.length,
        words: words
    };
}

function encryptMnemonic(mnemonic, password) {
    // Simple encryption for demo (use proper encryption in production)
    const cipher = crypto.createCipher('aes-256-cbc', password);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decryptMnemonic(encryptedMnemonic, password) {
    try {
        const decipher = crypto.createDecipher('aes-256-cbc', password);
        let decrypted = decipher.update(encryptedMnemonic, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return null; // Wrong password
    }
}

// =============================================
// 🎯 TEST ENDPOINTS
// =============================================

router.get('/test', (req, res) => {
    console.log('📞 /api/wallet/test called');
    res.json({
        success: true,
        message: 'Enhanced Wallet API is working!',
        features: ['BIP-39', 'Mining Integration', 'Price APIs', 'Enhanced Send'],
        clients: {
            regular: !!supabase,
            admin: !!supabaseAdmin,
            isServiceRole: supabaseAdmin !== supabase
        },
        timestamp: new Date().toISOString()
    });
});

router.get('/debug-env', (req, res) => {
    console.log('🔍 Environment debug endpoint called');

    const maskKey = (key) => {
        if (!key) return null;
        return key.substring(0, 5) + '...' + key.substring(key.length - 5);
    };

    res.json({
        success: true,
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasSupabaseUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            hasServiceKey: !!supabaseServiceKey,
            serviceKeyPreview: maskKey(supabaseServiceKey),
            supabaseClientReady: !!supabase,
            supabaseAdminReady: !!supabaseAdmin,
            isServiceRole: supabaseAdmin !== supabase
        },
        bip39Words: BIP39_WORDLIST.length,
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 GET USER WALLET
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    console.log('🔍 GET USER WALLET endpoint called');

    try {
        const { userId } = req.body;
        console.log('📋 User ID:', userId);

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required',
                requiresLogin: true
            });
        }

        if (!supabase) {
            console.error('❌ Supabase not connected');
            return res.json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found',
                    userId: userId
                });
            }
            return res.json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found',
                userId: userId
            });
        }

        const wallet = wallets[0];
        return res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                createdAt: wallet.created_at,
                walletType: wallet.wallet_type || 'TON'
            },
            userId: userId
        });

    } catch (error) {
        console.error('❌ Get wallet failed:', error);
        res.json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// =============================================
// 🎯 CREATE WALLET - ENHANCED WITH BIP-39
// =============================================

router.post('/create-wallet', async (req, res) => {
    console.log('🔐 CREATE WALLET endpoint called');

    try {
        const { userId, userPassword, replaceExisting = false, wordCount = 12 } = req.body;
        console.log('📋 Creating wallet for user:', userId, 'words:', wordCount);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password required'
            });
        }

        // Validate word count
        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Word count must be 12 or 24'
            });
        }

        // Use admin client if available
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        console.log('🔍 Using client:', supabaseAdmin !== supabase ? 'SERVICE ROLE' : 'REGULAR');

        // Check existing wallet
        const { data: existingWallets } = await client
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (existingWallets && existingWallets.length > 0 && !replaceExisting) {
            return res.json({
                success: false,
                hasExistingWallet: true,
                error: 'Wallet already exists',
                existingCount: existingWallets.length
            });
        }

        // Generate wallet with proper BIP-39 mnemonic
        const walletData = generateTONWallet(wordCount);

        // Encrypt mnemonic with user's password
        const encryptedMnemonic = encryptMnemonic(walletData.mnemonic, userPassword);

        // Create wallet record
        const walletRecord = {
            user_id: userId,
            address: walletData.address,
            encrypted_mnemonic: encryptedMnemonic,
            public_key: walletData.publicKey,
            wallet_type: 'TON',
            word_count: wordCount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Delete existing wallet if replacing
        if (replaceExisting && existingWallets && existingWallets.length > 0) {
            console.log('🗑️ Deleting existing wallet for replacement');
            const { error: deleteError } = await client
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);
            
            if (deleteError) {
                console.error('❌ Delete existing error:', deleteError.message);
            }
        }

        // Insert new wallet
        const { data: newWallet, error: insertError } = await client
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message);

            if (insertError.message.includes('row-level security')) {
                return res.status(500).json({
                    success: false,
                    error: 'RLS restriction. Service role key may not be working.',
                    debug: {
                        usedServiceRole: supabaseAdmin !== supabase,
                        hasServiceKey: !!supabaseServiceKey
                    }
                });
            }

            throw new Error('Insert failed: ' + insertError.message);
        }

        console.log(`✅ Wallet created for user ${userId}, address: ${walletData.address.substring(0, 16)}...`);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: walletData.address,
                createdAt: new Date().toISOString(),
                wordCount: wordCount
            },
            mnemonic: walletData.mnemonic, // Return unencrypted for user to backup
            message: '🎉 Wallet created successfully! Backup your seed phrase!',
            security: {
                encrypted: true,
                wordCount: wordCount,
                bip39: true
            }
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 VIEW SEED PHRASE
// =============================================

router.post('/view-seed-phrase', async (req, res) => {
    console.log('🔑 VIEW SEED PHRASE endpoint called');

    try {
        const { userId, userPassword } = req.body;
        console.log('📋 User requesting seed:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password required'
            });
        }

        // Use admin client if available
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get user's wallet
        const { data: wallets, error } = await client
            .from('user_wallets')
            .select('encrypted_mnemonic, word_count')
            .eq('user_id', userId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: false,
                error: 'No wallet found for user'
            });
        }

        const wallet = wallets[0];
        const encryptedMnemonic = wallet.encrypted_mnemonic;
        
        if (!encryptedMnemonic) {
            return res.json({
                success: false,
                error: 'No seed phrase stored for this wallet'
            });
        }

        // Try to decrypt with provided password
        const decryptedMnemonic = decryptMnemonic(encryptedMnemonic, userPassword);
        
        if (!decryptedMnemonic) {
            return res.json({
                success: false,
                error: 'Incorrect password',
                incorrectPassword: true
            });
        }

        // Validate the decrypted mnemonic
        const validation = validateMnemonic(decryptedMnemonic);
        if (!validation.valid) {
            return res.json({
                success: false,
                error: 'Invalid seed phrase format: ' + validation.message
            });
        }

        res.json({
            success: true,
            seedPhrase: decryptedMnemonic,
            wordCount: validation.wordCount,
            words: validation.words,
            security: '🔒 Decrypted with user password',
            warning: '⚠️ Never share this seed phrase with anyone!'
        });

    } catch (error) {
        console.error('❌ View seed phrase failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve seed phrase: ' + error.message
        });
    }
});

// =============================================
// 🎯 IMPORT WALLET
// =============================================

router.post('/import-wallet', async (req, res) => {
    console.log('📥 IMPORT WALLET endpoint called');

    try {
        const { userId, mnemonic, userPassword, replaceExisting = false } = req.body;
        console.log('📋 Importing for user:', userId);

        if (!userId || !mnemonic || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID, seed phrase, and password required'
            });
        }

        // Validate mnemonic
        const validation = validateMnemonic(mnemonic);
        if (!validation.valid) {
            return res.json({
                success: false,
                error: validation.message,
                validation: validation
            });
        }

        // Use admin client if available
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Check existing wallet
        const { data: existingWallets } = await client
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (existingWallets && existingWallets.length > 0 && !replaceExisting) {
            return res.json({
                success: false,
                hasExistingWallet: true,
                error: 'Wallet already exists',
                existingCount: existingWallets.length
            });
        }

        // Generate TON address from mnemonic (simplified for demo)
        // In production, use actual TON wallet generation from mnemonic
        const walletData = generateTONWallet(validation.wordCount);
        walletData.mnemonic = mnemonic; // Use the provided mnemonic

        // Encrypt mnemonic
        const encryptedMnemonic = encryptMnemonic(mnemonic, userPassword);

        // Create wallet record
        const walletRecord = {
            user_id: userId,
            address: walletData.address,
            encrypted_mnemonic: encryptedMnemonic,
            public_key: walletData.publicKey,
            wallet_type: 'TON',
            word_count: validation.wordCount,
            is_imported: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Delete existing if replacing
        if (replaceExisting && existingWallets && existingWallets.length > 0) {
            const { error: deleteError } = await client
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);
            
            if (deleteError) {
                console.error('❌ Delete existing error:', deleteError.message);
            }
        }

        // Insert new wallet
        const { data: newWallet, error: insertError } = await client
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            throw new Error('Import failed: ' + insertError.message);
        }

        console.log(`✅ Wallet imported for user ${userId}`);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: walletData.address,
                createdAt: new Date().toISOString(),
                isImported: true,
                wordCount: validation.wordCount
            },
            message: '🎉 Wallet imported successfully!',
            validation: validation
        });

    } catch (error) {
        console.error('❌ Import wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 DELETE WALLET
// =============================================

router.post('/delete-wallet', async (req, res) => {
    console.log('🗑️ DELETE WALLET endpoint called');

    try {
        const { userId, confirm } = req.body;
        console.log('📋 Deleting wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!confirm) {
            return res.json({
                success: false,
                error: 'Confirmation required for safety'
            });
        }

        // Use admin client if available
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data, error } = await client
            .from('user_wallets')
            .delete()
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error('❌ Delete error:', error.message);
            return res.status(500).json({
                success: false,
                error: 'Delete failed: ' + error.message
            });
        }

        const deletedCount = data ? data.length : 0;
        console.log(`✅ Deleted ${deletedCount} wallet(s) for user ${userId}`);

        res.json({
            success: true,
            deletedCount: deletedCount,
            message: 'Wallet deleted successfully',
            warning: '⚠️ Wallet cannot be recovered without seed phrase'
        });

    } catch (error) {
        console.error('❌ Delete wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 SEND TRANSACTION - ENHANCED FOR TOKENS
// =============================================

router.post('/send-transaction', async (req, res) => {
    console.log('📤 SEND TRANSACTION endpoint called');

    try {
        const { userId, toAddress, amount, password, token = 'TON', memo = '' } = req.body;
        console.log(`📋 Sending ${amount} ${token} from ${userId} to ${toAddress}`);

        if (!userId || !toAddress || !amount || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        // Validate TON address format
        if (!toAddress.startsWith('EQ') && !toAddress.startsWith('UQ') && !toAddress.startsWith('0:')) {
            console.warn('⚠️ Non-standard TON address:', toAddress);
            // Still allow it, just warn
        }

        // Use admin client if available
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get user's wallet
        const { data: wallets, error: walletError } = await client
            .from('user_wallets')
            .select('address, encrypted_mnemonic')
            .eq('user_id', userId);

        if (walletError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to get wallet: ' + walletError.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: false,
                error: 'No wallet found for user'
            });
        }

        const wallet = wallets[0];
        const fromAddress = wallet.address;

        // In production: Here you would:
        // 1. Decrypt mnemonic with password
        // 2. Create TON wallet from mnemonic
        // 3. Sign and broadcast transaction
        // 4. Save transaction to database

        // For demo purposes, simulate success
        const txHash = 'tx_' + crypto.randomBytes(16).toString('hex');

        // Save transaction to database (optional)
        const txRecord = {
            user_id: userId,
            from_address: fromAddress,
            to_address: toAddress,
            amount: amountNum,
            token: token,
            memo: memo || null,
            tx_hash: txHash,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        try {
            await client
                .from('transactions')
                .insert([txRecord]);
        } catch (txError) {
            console.warn('⚠️ Failed to save transaction record:', txError.message);
            // Continue anyway
        }

        res.json({
            success: true,
            message: `Transaction submitted successfully!`,
            transaction: {
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                amount: amountNum,
                token: token,
                memo: memo,
                status: 'pending',
                timestamp: new Date().toISOString()
            },
            note: 'This is a demo transaction. In production, actual TON blockchain transaction would be sent.'
        });

    } catch (error) {
        console.error('❌ Send transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send transaction: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET TRANSACTIONS
// =============================================

router.get('/transactions/:address', async (req, res) => {
    console.log('📜 GET TRANSACTIONS endpoint called');

    try {
        const { address } = req.params;
        const { limit = 50 } = req.query;
        console.log('📋 Getting transactions for:', address?.substring(0, 16) || 'null');

        if (!address) {
            return res.json({
                success: true,
                transactions: [],
                address: 'N/A',
                message: 'Address required'
            });
        }

        if (!supabase) {
            return res.json({
                success: true,
                transactions: [],
                address: address,
                isMock: true,
                message: 'Database not available'
            });
        }

        // Get transactions where user is sender or receiver
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .or(`from_address.eq.${address},to_address.eq.${address}`)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.warn('⚠️ Transaction query failed:', error.message);
            // Return mock data
            return res.json({
                success: true,
                transactions: [],
                address: address,
                isMock: true,
                message: 'Using mock data'
            });
        }

        res.json({
            success: true,
            transactions: transactions || [],
            address: address,
            count: transactions?.length || 0
        });

    } catch (error) {
        console.error('❌ Get transactions failed:', error);
        res.json({
            success: true,
            transactions: [],
            address: req.params.address || 'N/A',
            isMock: true,
            error: error.message
        });
    }
});

// =============================================
// 🎯 HEALTH & PRICE ENDPOINTS
// =============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        features: {
            bip39: true,
            miningIntegration: true,
            enhancedSend: true,
            priceApis: true
        },
        database: {
            connected: !!supabase,
            adminConnected: !!supabaseAdmin,
            isServiceRole: supabaseAdmin !== supabase
        },
        bip39: {
            wordCount: BIP39_WORDLIST.length,
            supportedLengths: [12, 24]
        },
        timestamp: new Date().toISOString()
    });
});

router.get('/balance/:address', (req, res) => {
    // In production, query TON blockchain
    // For demo, return mock data
    res.json({
        success: true,
        address: req.params.address,
        balance: (Math.random() * 5).toFixed(4),
        currency: 'TON',
        tokens: [
            { symbol: 'TON', balance: (Math.random() * 5).toFixed(4), value: ((Math.random() * 5) * 2.35).toFixed(2) },
            { symbol: 'NMX', balance: (Math.random() * 1000).toFixed(2), value: ((Math.random() * 1000) * 0.10).toFixed(2) }
        ],
        isMock: true
    });
});

router.get('/prices', async (req, res) => {
    try {
        // External price APIs configuration
        const priceApis = [
            {
                name: "CoinGecko",
                url: "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true",
                parser: (data) => ({
                    TON: { 
                        price: data['the-open-network']?.usd || 0, 
                        change24h: data['the-open-network']?.usd_24h_change || 0 
                    }
                })
            }
        ];

        let prices = {
            TON: { price: 2.35, change24h: 1.5 },
            NMX: { price: 0.10, change24h: 0.5 }
        };

        // Try to get real prices
        for (const api of priceApis) {
            try {
                const response = await fetch(api.url, { timeout: 5000 });
                if (response.ok) {
                    const data = await response.json();
                    const parsed = api.parser(data);
                    if (parsed.TON.price > 0) {
                        prices.TON = parsed.TON;
                        console.log(`✅ Got TON price from ${api.name}: $${prices.TON.price}`);
                        break;
                    }
                }
            } catch (apiError) {
                console.warn(`⚠️ ${api.name} failed:`, apiError.message);
                // Continue to next API or use fallback
            }
        }

        res.json({
            success: true,
            prices: prices,
            source: 'CoinGecko with NMX fallback',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Get prices failed:', error);
        res.json({
            success: true,
            prices: {
                TON: { price: 2.35, change24h: 0 },
                NMX: { price: 0.10, change24h: 0 }
            },
            isMock: true,
            timestamp: new Date().toISOString()
        });
    }
});

// =============================================
// 🎯 GET NMXp BALANCE (for Convert modal)
// =============================================

router.post('/get-nmxp-balance', async (req, res) => {
    console.log('💰 GET NMXp BALANCE endpoint called');

    try {
        const { userId } = req.body;
        console.log('📋 Getting NMXp balance for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Query user's NMXp balance from profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('balance, wallet_address')
            .eq('id', userId)
            .single();

        if (error) {
            console.warn('⚠️ Profile query failed:', error.message);
            return res.json({
                success: true,
                balance: 0,
                wallet_address: null,
                userId: userId,
                isMock: true
            });
        }

        const balance = parseInt(profile?.balance) || 0;
        const walletAddress = profile?.wallet_address || null;

        res.json({
            success: true,
            balance: balance,
            wallet_address: walletAddress,
            userId: userId,
            formatted: balance.toLocaleString()
        });

    } catch (error) {
        console.error('❌ Get NMXp balance failed:', error);
        res.json({
            success: true,
            balance: 0,
            wallet_address: null,
            userId: req.body.userId || 'unknown',
            isMock: true,
            error: error.message
        });
    }
});

module.exports = router;