// backend/wallet-routes.js - STABLE FIXED VERSION v32.0
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');

// ============================================
// 🎯 TON IMPORTS - OFFICIAL SDK ONLY
// ============================================
console.log('🔄 Loading TON libraries...');

let tonCrypto, tonSDK;
let mnemonicNew, mnemonicToPrivateKey;
let WalletContractV4, Address, TonClient, internal, toNano, fromNano;

try {
    console.log('🔍 Attempting to load @ton/crypto...');
    tonCrypto = require('@ton/crypto');
    console.log('✅ @ton/crypto loaded');

    console.log('🔍 Attempting to load @ton/ton...');
    tonSDK = require('@ton/ton');
    console.log('✅ @ton/ton loaded');

    mnemonicNew = tonCrypto.mnemonicNew;
    mnemonicToPrivateKey = tonCrypto.mnemonicToPrivateKey;
    WalletContractV4 = tonSDK.WalletContractV4;
    Address = tonSDK.Address;
    TonClient = tonSDK.TonClient;
    internal = tonSDK.internal;
    toNano = tonSDK.toNano;
    fromNano = tonSDK.fromNano;

    console.log('✅ TON libraries loaded successfully');

} catch (error) {
    console.error('❌❌❌ TON SDK IMPORT FAILED!');
    console.error('❌ Error:', error.message);
    throw new Error(`TON SDK failed to load: ${error.message}`);
}

// ============================================
// 🎯 LOAD ENVIRONMENT VARIABLES - FIXED!
// ============================================
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('🚀 WALLET ROUTES v32.0 - DUAL API FIXED VERSION');

// ============================================
// 🎯 API KEYS CONFIGURATION - FIXED!
// ============================================
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
// FIX: Handle multiple possible environment variable names
const TON_CONSOLE_API_KEY = process.env.TON_CONSOLE_API_KEY || process.env.TON_API_TOKEN || process.env.TONAPI_KEY || '';
const TON_API_URL = process.env.TON_API_URL || 'https://tonapi.io/v2';

console.log('🔑 API Keys Status:');
console.log(`   - TON Center: ${TONCENTER_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   - TON Console: ${TON_CONSOLE_API_KEY ? '✓ Loaded' : '✗ Missing'}`);

if (!TON_CONSOLE_API_KEY) {
    console.warn('⚠️ WARNING: TON_CONSOLE_API_KEY is missing! Transactions may fail.');
    console.warn('   Get one from: https://tonconsole.com/');
    console.warn('   Or add to .env: TON_CONSOLE_API_KEY=bearer_your_token_here');
}

// ============================================
// 🎯 CORS MIDDLEWARE
// ============================================
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// ============================================
// 🎯 SUPABASE SETUP
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;
let dbStatus = 'not_initialized';

async function initializeSupabase() {
    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('❌ SUPABASE CREDENTIALS MISSING');
            dbStatus = 'credentials_missing';
            return false;
        }

        supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { error } = await supabase
            .from('user_wallets')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            dbStatus = 'connection_error';
            return false;
        }

        console.log('✅ Supabase connected successfully!');
        dbStatus = 'connected';
        return true;
    } catch (error) {
        console.error('❌ Supabase initialization error:', error.message);
        dbStatus = 'initialization_error';
        return false;
    }
}

// Initialize Supabase immediately
(async () => {
    await initializeSupabase();
})();

// ============================================
// 🎯 COMPLETE BIP39 WORD LIST (2048 WORDS) - FULLY INTACT
// ============================================

const BIP39_WORDS = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
    "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
    "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album",
    "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone",
    "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among",
    "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
    "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april",
    "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army",
    "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist",
    "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma",
    "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit",
    "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid",
    "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby",
    "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo",
    "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic",
    "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef",
    "before", "begin", "behave", "behind", "believe", "below", "belt", "bench",
    "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid",
    "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame",
    "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse",
    "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone",
    "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom",
    "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
    "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli",
    "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy",
    "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker",
    "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer",
    "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
    "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon",
    "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon",
    "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino",
    "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught",
    "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
    "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter",
    "charge", "chase", "chat", "cheap", "check", "cheek", "cheese", "chef",
    "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose",
    "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen",
    "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean",
    "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip",
    "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump",
    "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil",
    "coin", "collect", "color", "column", "combine", "come", "comfort", "comic",
    "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider",
    "control", "convince", "cook", "cool", "copper", "copy", "coral", "core",
    "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course",
    "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane",
    "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew",
    "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd",
    "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal",
    "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve",
    "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance",
    "danger", "daring", "dark", "dash", "date", "daughter", "dawn", "day",
    "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate",
    "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver",
    "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit",
    "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair",
    "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial",
    "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity",
    "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease",
    "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce",
    "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate",
    "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon",
    "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink",
    "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune",
    "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle",
    "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology",
    "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either",
    "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite",
    "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower",
    "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy",
    "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich",
    "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal",
    "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape",
    "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke",
    "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse",
    "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic",
    "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra",
    "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith",
    "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy",
    "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite",
    "feature", "february", "federal", "fee", "feed", "feel", "female", "fence",
    "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure",
    "file", "film", "filter", "final", "find", "fine", "finger", "finish",
    "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix",
    "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip",
    "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam",
    "focus", "fog", "foil", "fold", "follow", "food", "foot", "force",
    "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster",
    "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe",
    "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun",
    "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery",
    "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas",
    "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre",
    "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger",
    "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide",
    "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat",
    "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern",
    "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity",
    "great", "green", "grid", "grief", "grit", "grocery", "group", "grow",
    "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym",
    "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor",
    "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head",
    "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help",
    "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire",
    "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home",
    "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host",
    "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor",
    "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid",
    "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal",
    "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve",
    "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor",
    "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject",
    "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect",
    "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite",
    "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket",
    "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job",
    "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle",
    "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key",
    "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen",
    "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab",
    "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop",
    "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn",
    "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture",
    "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length",
    "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library",
    "license", "life", "lift", "light", "like", "limb", "limit", "link",
    "lion", "liquid", "list", "little", "live", "lizard", "load", "loan",
    "lobby", "local", "lock", "logic", "lonely", "long", "loop", "lottery",
    "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar",
    "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid",
    "mail", "main", "major", "make", "mammal", "man", "manage", "mandate",
    "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine",
    "market", "marriage", "mask", "mass", "master", "match", "material", "math",
    "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat",
    "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention",
    "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal",
    "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum",
    "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix",
    "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor",
    "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito",
    "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much",
    "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must",
    "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow",
    "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect",
    "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never",
    "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle",
    "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel",
    "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object",
    "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october",
    "odor", "off", "offer", "office", "often", "oil", "okay", "old",
    "olive", "olympic", "omit", "once", "one", "onion", "online", "only",
    "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard",
    "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other",
    "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own",
    "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair",
    "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade",
    "parent", "park", "parrot", "party", "pass", "patch", "path", "patient",
    "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear",
    "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect",
    "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano",
    "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink",
    "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic",
    "plate", "play", "pleasure", "pledge", "pluck", "plug", "plunge", "poem",
    "poet", "point", "polar", "pole", "police", "pond", "pony", "pool",
    "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty",
    "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present",
    "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison",
    "private", "prize", "problem", "process", "produce", "profit", "program", "project",
    "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public",
    "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy",
    "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid",
    "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote",
    "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain",
    "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare",
    "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason",
    "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce",
    "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax",
    "release", "relief", "rely", "remain", "remember", "remind", "remove", "render",
    "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require",
    "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat",
    "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon",
    "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring",
    "riot", "rip", "ritual", "rival", "river", "road", "roast", "robot",
    "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate",
    "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule",
    "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail",
    "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand",
    "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan",
    "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion",
    "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season",
    "seat", "second", "secret", "section", "security", "seed", "seek", "segment",
    "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service",
    "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share",
    "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver",
    "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp",
    "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight",
    "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since",
    "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch",
    "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep",
    "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow",
    "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake",
    "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda",
    "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song",
    "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south",
    "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell",
    "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split",
    "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring",
    "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage",
    "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel",
    "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach",
    "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong",
    "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway",
    "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "sun",
    "sunny", "sunset", "super", "supply", "support", "sure", "surface", "surge",
    "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap",
    "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword",
    "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail",
    "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo",
    "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent",
    "term", "test", "text", "thank", "that", "theme", "then", "theory",
    "there", "they", "thing", "this", "thought", "three", "thrive", "throw",
    "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time",
    "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today",
    "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone",
    "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch",
    "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town",
    "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap",
    "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe",
    "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true",
    "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble",
    "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice",
    "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable",
    "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy",
    "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual",
    "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban",
    "urge", "usage", "use", "used", "useful", "useless", "usual", "utility",
    "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish",
    "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture",
    "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable",
    "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin",
    "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal",
    "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon",
    "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior",
    "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon",
    "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome",
    "west", "wet", "whale", "what", "wheat", "wheel", "when", "where",
    "whip", "whisper", "wide", "width", "wife", "wild", "will", "win",
    "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom",
    "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool",
    "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle",
    "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young",
    "youth", "zebra", "zero", "zone", "zoo"
];

console.log(`✅ BIP39 word list loaded: ${BIP39_WORDS.length} words`);

// ============================================
// 🎯 DATABASE HELPER - CLEANED VERSION
// ============================================

async function getWalletFromDatabase(userId) {
    try {
        console.log(`🔍 Fetching wallet for user: ${userId}`);

        if (!supabase || dbStatus !== 'connected') {
            throw new Error('Database not connected');
        }

        const cleanUserId = String(userId).trim();

        const { data, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', cleanUserId)
            .maybeSingle();

        if (error) {
            console.error('❌ Database query error:', error.message);
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
            console.log(`❌ No wallet found for user ${userId}`);
            return null;
        }

        console.log(`✅ Wallet found for user ${userId}`);
        return data;

    } catch (error) {
        console.error('❌ Failed to get wallet from database:', error.message);
        throw error;
    }
}

// ============================================
// 🎯 REAL TON WALLET GENERATION
// ============================================
async function generateRealTONWallet() {
    try {
        console.log('🎯 Generating REAL TON wallet...');
        const mnemonicArray = await mnemonicNew();
        const mnemonic = mnemonicArray.join(' ');
        console.log('✅ Mnemonic generated');

        const keyPair = await mnemonicToPrivateKey(mnemonicArray);
        console.log('✅ Key pair derived');

        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        const addressObj = wallet.address;
        const uqAddress = addressObj.toString({
            urlSafe: true,
            bounceable: false,
            testOnly: false
        });

        const eqAddress = addressObj.toString({
            urlSafe: true,
            bounceable: true,
            testOnly: false
        });

        if (uqAddress.length !== 48) {
            throw new Error(`INVALID ADDRESS LENGTH: ${uqAddress.length} characters`);
        }

        console.log('✅ Address validation passed');

        return {
            mnemonic: mnemonic,
            address: uqAddress,
            eqAddress: eqAddress,
            publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
            privateKey: Buffer.from(keyPair.secretKey).toString('hex'),
            wordCount: 24,
            source: 'ton-v4-official-sdk-uq'
        };

    } catch (error) {
        console.error('❌❌❌ TON wallet generation FAILED:');
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// ============================================
// 🎯 ADDRESS VALIDATION
// ============================================
function validateTONAddress(address) {
    try {
        if (!address || typeof address !== 'string') {
            return { valid: false, error: 'Address is empty', isRealTON: false };
        }

        const cleanAddress = address.trim();
        if (cleanAddress.length !== 48) {
            return {
                valid: false,
                error: `Invalid length: ${cleanAddress.length} characters (must be 48)`,
                isRealTON: false
            };
        }

        if (!cleanAddress.startsWith('EQ') && !cleanAddress.startsWith('UQ')) {
            return {
                valid: false,
                error: `Invalid prefix: "${cleanAddress.substring(0, 2)}" (must be EQ or UQ)`,
                isRealTON: false
            };
        }

        try {
            const addr = Address.parse(cleanAddress);
            const uqFormat = addr.toString({ urlSafe: true, bounceable: false, testOnly: false });
            const eqFormat = addr.toString({ urlSafe: true, bounceable: true, testOnly: false });

            return {
                valid: true,
                address: cleanAddress,
                uqAddress: uqFormat,
                eqAddress: eqFormat,
                format: cleanAddress.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
                isRealTON: true
            };
        } catch (parseError) {
            return {
                valid: false,
                error: `Failed to parse address: ${parseError.message}`,
                isRealTON: false
            };
        }

    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`,
            isRealTON: false
        };
    }
}

// ============================================
// 🎯 PASSWORD & ENCRYPTION FUNCTIONS
// ============================================
async function hashWalletPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

async function verifyWalletPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

function encryptMnemonic(mnemonic, password) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, 'nemex-salt', 32);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex'),
        algorithm: algorithm
    };
}

// ============================================
// 🎯 FIXED: GET REAL BALANCE WITH DUAL APIS
// ============================================
async function getRealBalance(address, userId = null) {
    try {
        console.log(`💰 Checking balance for: ${address}`);

        let queryAddress = address;
        if (queryAddress.startsWith('UQ')) {
            try {
                const addr = Address.parse(queryAddress);
                queryAddress = addr.toString({ urlSafe: true, bounceable: true, testOnly: false });
                console.log(`🔄 Converted UQ → EQ: ${queryAddress}`);
            } catch (error) {
                console.log('⚠️ Could not convert UQ to EQ, using original');
            }
        }

        console.log(`🔍 Querying balance for: ${queryAddress}`);

        // ============================================
        // 🔥 DUAL API SYSTEM - TON CONSOLE + TON CENTER
        // ============================================
        const apiEndpoints = [
            // 1. TON Console API (Primary)
            {
                name: 'TON Console',
                url: `${TON_API_URL}/accounts/${queryAddress}`,
                headers: TON_CONSOLE_API_KEY ? { 
                    'Authorization': `Bearer ${TON_CONSOLE_API_KEY.replace('bearer_', '')}`,
                    'Accept': 'application/json'
                } : {},
                parser: async (data) => {
                    if (data.balance !== undefined) {
                        const balanceNano = BigInt(data.balance);
                        return {
                            balance: Number(balanceNano) / 1_000_000_000,
                            status: data.status || 'active',
                            rawBalance: balanceNano.toString(),
                            isActive: data.status === 'active' || balanceNano > 0n
                        };
                    }
                    return null;
                }
            },
            // 2. TON Center API (Fallback)
            {
                name: 'TON Center',
                url: `https://toncenter.com/api/v2/getAddressInformation`,
                params: { address: queryAddress },
                headers: TONCENTER_API_KEY ? { 'X-API-Key': TONCENTER_API_KEY } : {},
                parser: async (data) => {
                    if (data.ok !== undefined) {
                        data = data.result;
                    }
                    if (data && data.balance !== undefined) {
                        const balanceNano = BigInt(data.balance);
                        return {
                            balance: Number(balanceNano) / 1_000_000_000,
                            status: data.status || 'unknown',
                            rawBalance: balanceNano.toString(),
                            isActive: data.status === 'active' || balanceNano > 0n
                        };
                    }
                    return null;
                }
            },
            // 3. Tonkeeper API (Public Fallback)
            {
                name: 'Tonkeeper',
                url: `https://api.tonkeeper.com/address/${queryAddress}/balance`,
                parser: async (data) => {
                    if (data.balance !== undefined) {
                        return {
                            balance: data.balance / 1_000_000_000,
                            status: 'active',
                            rawBalance: data.balance.toString(),
                            isActive: true
                        };
                    }
                    return null;
                }
            }
        ];

        // Try each API until one works
        for (const api of apiEndpoints) {
            try {
                console.log(`🔍 Trying ${api.name}...`);
                
                let response;
                if (api.params) {
                    response = await axios.get(api.url, {
                        params: api.params,
                        headers: api.headers || {},
                        timeout: 5000
                    });
                } else {
                    response = await axios.get(api.url, {
                        headers: api.headers || {},
                        timeout: 5000
                    });
                }

                const result = await api.parser(response.data);
                if (result && result.balance !== undefined) {
                    console.log(`✅ ${api.name} successful: ${result.balance.toFixed(4)} TON`);
                    
                    // Update database cache if userId provided
                    if (userId && result.balance > 0) {
                        await updateWalletBalanceInDB(userId, {
                            balance: result.balance.toFixed(4),
                            status: result.status,
                            isActive: result.isActive,
                            source: api.name.toLowerCase()
                        });
                    }
                    
                    return {
                        success: true,
                        balance: result.balance.toFixed(4),
                        status: result.status,
                        isActive: result.isActive || false,
                        isReal: true,
                        rawBalance: result.rawBalance,
                        source: api.name,
                        apiUsed: api.name
                    };
                }
            } catch (apiError) {
                console.log(`❌ ${api.name} failed: ${apiError.message}`);
                continue;
            }
        }

        // ============================================
        // 🗄️ DATABASE FALLBACK
        // ============================================
        if (userId) {
            try {
                console.log(`🔍 Checking database for user ${userId}...`);
                const wallet = await getWalletFromDatabase(userId);
                
                if (wallet && wallet.last_known_balance) {
                    console.log(`✅ Using last known balance from database: ${wallet.last_known_balance} TON`);
                    
                    return {
                        success: true,
                        balance: parseFloat(wallet.last_known_balance).toFixed(4),
                        status: wallet.last_status || 'unknown',
                        isActive: wallet.is_active || false,
                        isReal: true,
                        source: 'database_cache',
                        apiUsed: 'database_cache'
                    };
                }
            } catch (dbError) {
                console.log('⚠️ Database fallback failed:', dbError.message);
            }
        }

        // Final fallback
        console.log('❌ All APIs failed, using fallback balance');
        return {
            success: true,
            balance: "0.0000",
            isActive: false,
            status: 'uninitialized',
            isReal: true,
            source: 'fallback',
            apiUsed: 'fallback'
        };

    } catch (error) {
        console.error('❌ Balance check failed:', error.message);
        return {
            success: false,
            balance: "0.0000",
            error: error.message,
            isReal: true,
            source: 'error'
        };
    }
}

// ============================================
// 🗄️ UPDATE WALLET BALANCE IN DATABASE
// ============================================
async function updateWalletBalanceInDB(userId, balanceData) {
    try {
        if (!supabase || dbStatus !== 'connected') return false;
        
        const updates = {
            last_known_balance: balanceData.balance,
            last_status: balanceData.status || 'unknown',
            is_active: balanceData.isActive || false,
            last_source: balanceData.source || 'unknown',
            last_balance_check: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('user_wallets')
            .update(updates)
            .eq('user_id', userId);
            
        if (error) {
            console.log('⚠️ Failed to update wallet balance in DB:', error.message);
            return false;
        }
        
        console.log(`✅ Updated wallet balance in DB for user ${userId}: ${balanceData.balance} TON (Source: ${balanceData.source})`);
        return true;
    } catch (error) {
        console.log('⚠️ Error updating wallet balance in DB:', error.message);
        return false;
    }
}

// ============================================
// 🎯 MULTI-EXCHANGE PRICE FETCHING
// ============================================
let priceCache = { data: null, timestamp: 0 };
const PRICE_CACHE_DURATION = 30000; // 30 seconds

async function fetchRealTONPrice() {
    const now = Date.now();
    if (priceCache.data && (now - priceCache.timestamp) < PRICE_CACHE_DURATION) {
        return priceCache.data;
    }

    console.log('💰 Fetching TON price from multiple exchanges...');

    const priceApis = [
        // 1. Binance (Most reliable)
        {
            name: 'Binance',
            url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT',
            parser: (data) => ({
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                volume: parseFloat(data.volume)
            })
        },
        // 2. Bybit
        {
            name: 'Bybit',
            url: 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=TONUSDT',
            parser: (data) => {
                if (data.result && data.result.list && data.result.list.length > 0) {
                    const ticker = data.result.list[0];
                    return {
                        price: parseFloat(ticker.lastPrice),
                        change24h: parseFloat(ticker.price24hPcnt) * 100,
                        volume: parseFloat(ticker.volume24h)
                    };
                }
                return null;
            }
        },
        // 3. Bitget
        {
            name: 'Bitget',
            url: 'https://api.bitget.com/api/v2/spot/public/ticker?symbol=TONUSDT',
            parser: (data) => {
                if (data.data && data.data.length > 0) {
                    const ticker = data.data[0];
                    return {
                        price: parseFloat(ticker.close),
                        change24h: parseFloat(ticker.change24h),
                        volume: parseFloat(ticker.quoteVolume)
                    };
                }
                return null;
            }
        },
        // 4. MEXC
        {
            name: 'MEXC',
            url: 'https://api.mexc.com/api/v3/ticker/24hr?symbol=TONUSDT',
            parser: (data) => ({
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                volume: parseFloat(data.volume)
            })
        },
        // 5. CoinGecko
        {
            name: 'CoinGecko',
            url: 'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true',
            parser: (data) => ({
                price: data['the-open-network'].usd,
                change24h: data['the-open-network'].usd_24h_change,
                volume: 0
            })
        }
    ];

    let successfulPrices = [];

    // Try all APIs in parallel with timeout
    const promises = priceApis.map(async (api) => {
        try {
            console.log(`🔍 Trying ${api.name}...`);
            const response = await axios.get(api.url, { timeout: 3000 });
            const parsed = api.parser(response.data);
            
            if (parsed && parsed.price && parsed.price > 0) {
                console.log(`✅ ${api.name}: $${parsed.price.toFixed(4)}`);
                return {
                    source: api.name,
                    price: parsed.price,
                    change24h: parsed.change24h || 0,
                    volume: parsed.volume || 0,
                    timestamp: now
                };
            }
        } catch (error) {
            console.log(`❌ ${api.name} failed: ${error.message}`);
            return null;
        }
    });

    try {
        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                successfulPrices.push(result.value);
            }
        });

        // If we have successful prices, calculate average
        if (successfulPrices.length > 0) {
            // Sort by volume (higher volume = more reliable)
            successfulPrices.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            
            // Take weighted average of top 3
            const topPrices = successfulPrices.slice(0, 3);
            const totalVolume = topPrices.reduce((sum, p) => sum + (p.volume || 1), 0);
            
            let weightedPrice = 0;
            let weightedChange = 0;
            
            topPrices.forEach(p => {
                const weight = (p.volume || 1) / totalVolume;
                weightedPrice += p.price * weight;
                weightedChange += (p.change24h || 0) * weight;
            });

            console.log(`✅ Average price from ${topPrices.length} sources: $${weightedPrice.toFixed(4)}`);
            
            priceCache.data = {
                price: weightedPrice,
                change24h: weightedChange,
                source: topPrices.map(p => p.source).join(', '),
                timestamp: now,
                sourcesCount: successfulPrices.length
            };
            
            return priceCache.data;
        }
    } catch (error) {
        console.log('❌ All price APIs failed:', error.message);
    }

    // Final fallback
    console.log('✅ Using static fallback price: $2.35');
    priceCache.data = {
        price: 2.35,
        change24h: 0,
        source: 'fallback',
        timestamp: now,
        sourcesCount: 0
    };
    
    return priceCache.data;
}

// ============================================
// 🎯 FIXED: AUTO WALLET DEPLOYMENT & INITIALIZATION
// ============================================

// 🧪 TON JSON-RPC HELPERS - fetch reliable on-chain values when SDK falls short
async function runGetMethodJSONRPC(address, method) {
    try {
        const payload = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'runGetMethod',
            params: {
                address: address,
                method: method,
                stack: []
            }
        };

        const headers = { 'Content-Type': 'application/json' };
        if (TONCENTER_API_KEY) headers['X-API-Key'] = TONCENTER_API_KEY;

        const resp = await axios.post('https://toncenter.com/api/v2/jsonRPC', payload, {
            headers,
            timeout: 10000
        });

        if (resp && resp.data && resp.data.result) return resp.data.result;
        throw new Error('No result from runGetMethod');

    } catch (error) {
        console.log('⚠️ runGetMethod failed:', method, error.message);
        throw error;
    }
}

async function runGetSeqno(address) {
    try {
        const result = await runGetMethodJSONRPC(address, 'seqno');
        const stack = result.stack || [];
        if (stack.length && stack[0][1]) {
            const raw = stack[0][1]; // e.g. '0x1'
            if (typeof raw === 'string' && raw.startsWith('0x')) {
                return Number(BigInt(raw));
            }
            return Number(raw);
        }
        return null;
    } catch (error) {
        console.log('⚠️ runGetSeqno failed:', error.message);
        return null;
    }
}

function isLikelyPublicKeyHex(hex) {
    if (!hex || typeof hex !== 'string') return false;
    const cleaned = hex.replace(/^0x/, '').toLowerCase();
    // Accept exactly 64 hex chars (32 bytes) as valid public key
    return /^[0-9a-f]{64}$/.test(cleaned);
}

async function runGetPublicKey(address) {
    try {
        const result = await runGetMethodJSONRPC(address, 'get_public_key');
        const stack = result.stack || [];
        if (stack.length && stack[0][1]) {
            const raw = stack[0][1]; // might be '0x80fd4c...' or a small numeric like '0x1339c'
            const str = typeof raw === 'string' ? raw : String(raw);
            const cleaned = str.replace(/^0x/, '').toLowerCase();

            if (isLikelyPublicKeyHex(cleaned)) {
                return cleaned;
            }

            console.log('⚠️ runGetPublicKey: returned value does not look like a 32-byte public key:', cleaned);
            return null;
        }
        return null;
    } catch (error) {
        console.log('⚠️ runGetPublicKey failed:', error.message);
        return null;
    }
}

async function deployWalletIfNeeded(keyPair, walletContract, tonClient = null) {
    try {
        console.log('🔍 Checking if wallet needs deployment/initialization...');

        // Create tonClient with TON Console if not provided
        if (!tonClient) {
            tonClient = new TonClient({
                endpoint: 'https://tonapi.io/v2/jsonRPC',
                apiKey: TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : undefined,
                timeout: 30000
            });
        }

        const deployed = await tonClient.isContractDeployed(walletContract.address);

        if (!deployed) {
            console.log('⚠️ Wallet not deployed. Attempting deployment...');

            const balance = await tonClient.getBalance(walletContract.address);
            const minDeployBalance = toNano('0.05');

            if (BigInt(balance) < minDeployBalance) {
                throw new Error(
                    `Wallet needs at least 0.05 TON for deployment. Current: ${fromNano(balance)} TON`
                );
            }

            console.log('🔐 Creating deployment transfer...');
            const deployTransfer = walletContract.createTransfer({
                secretKey: keyPair.secretKey,
                seqno: 0,
                messages: [],
                sendMode: 3
            });

            console.log('📤 Sending deployment transaction...');
            await tonClient.sendExternalMessage(walletContract, deployTransfer);

            console.log('⏳ Waiting for deployment confirmation...');
            let attempts = 0;
            while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const nowDeployed = await tonClient.isContractDeployed(walletContract.address);

                if (nowDeployed) {
                    console.log('✅ Wallet successfully deployed!');
                    break;
                }
                attempts++;
                console.log(`⏳ Attempt ${attempts}/30 - still deploying...`);
            }

            if (attempts >= 30) {
                throw new Error('Wallet deployment timeout. Check in 1-2 minutes.');
            }
        } else {
            console.log('✅ Wallet already deployed');
        }

        console.log('🔧 Ensuring wallet is fully initialized...');

        let seqno = 0;
        try {
            const walletState = await tonClient.getContractState(walletContract.address);
            seqno = walletState.seqno || 0;
            console.log(`📝 Current seqno after deployment: ${seqno}`);
        } catch (seqnoError) {
            console.log('⚠️ Could not get seqno:', seqnoError.message);
            seqno = 0;
        }

        if (seqno === 0) {
            console.log('🔄 Seqno is 0 - sending initialization transaction...');

            const initTransfer = walletContract.createTransfer({
                secretKey: keyPair.secretKey,
                seqno: 0,
                messages: [
                    internal({
                        to: walletContract.address,
                        value: toNano('0'),
                        body: 'Initialization',
                        bounce: false
                    })
                ],
                sendMode: 3
            });

            console.log('📤 Sending initialization transaction...');
            try {
                await tonClient.sendExternalMessage(walletContract, initTransfer);
                console.log('✅ Initialization transaction sent');

                console.log('⏳ Waiting for seqno update...');
                await new Promise(resolve => setTimeout(resolve, 10000));

                const updatedState = await tonClient.getContractState(walletContract.address);
                const updatedSeqno = updatedState.seqno || 0;
                console.log(`📝 Updated seqno after initialization: ${updatedSeqno}`);

                if (updatedSeqno === 0) {
                    console.log('⚠️ Seqno still 0 after initialization, may need more time');
                }

            } catch (initError) {
                console.log('⚠️ Initialization transaction failed:', initError.message);
            }
        } else {
            console.log('✅ Wallet already initialized (seqno > 0)');
        }

        return { 
            success: true, 
            deployed: true,
            initialized: true
        };

    } catch (error) {
        console.error('❌ Deployment/initialization failed:', error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// 🎯 FIXED: SEND TON TRANSACTION WITH DUAL APIS
// ============================================
async function sendTONTransaction(userId, walletPassword, toAddress, amount, memo = '') {
    console.log('🚀 SEND TRANSACTION STARTED');

    try {
        const wallet = await getWalletFromDatabase(userId);
        if (!wallet) {
            throw new Error(`Wallet not found in database for user_id: "${userId}".`);
        }

        console.log('✅ Wallet found:', wallet.address?.substring(0, 15) + '...');

        if (!wallet.password_hash) {
            console.error('❌ Wallet missing password_hash in database');
            throw new Error('Wallet not properly set up. Password hash missing.');
        }

        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            throw new Error('Invalid wallet password');
        }
        console.log('✅ Password verified');

        if (!wallet.encrypted_mnemonic) {
            throw new Error('Wallet recovery phrase not found in database.');
        }

        let mnemonic;
        try {
            const encryptedData = JSON.parse(wallet.encrypted_mnemonic);
            const key = crypto.scryptSync(walletPassword, 'nemex-salt', 32);

            const decipher = crypto.createDecipheriv(
                encryptedData.algorithm,
                key,
                Buffer.from(encryptedData.iv, 'hex')
            );
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            mnemonic = decrypted.split(' ');

            console.log('✅ Mnemonic decrypted successfully');
        } catch (decryptError) {
            console.error('❌ Mnemonic decryption failed:', decryptError.message);
            throw new Error('Failed to decrypt wallet. Wrong password or corrupted data.');
        }

        const keyPair = await mnemonicToPrivateKey(mnemonic);
        console.log('✅ Key pair derived');

        const walletContract = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        console.log('✅ Wallet contract created');

        // ============================================
        // 🔥 DUAL API STRATEGY FOR SENDING (select RPC before deployment)
        // ============================================
        const rpcEndpoints = [
            {
                name: 'TON Console',
                endpoint: 'https://tonapi.io/v2/jsonRPC',
                apiKey: TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : undefined
            },
            {
                name: 'TON Center',
                endpoint: 'https://toncenter.com/api/v2/jsonRPC',
                apiKey: TONCENTER_API_KEY || undefined
            },
            {
                name: 'Public RPC',
                endpoint: 'https://ton.rpc.thirdweb.com',
                apiKey: undefined
            }
        ];

        let tonClient;
        let lastError;

        // Try each RPC endpoint until one works
        for (const rpc of rpcEndpoints) {
            try {
                console.log(`🔍 Trying RPC endpoint: ${rpc.name}`);

                tonClient = new TonClient({
                    endpoint: rpc.endpoint,
                    apiKey: rpc.apiKey,
                    timeout: 30000
                });

                // Test connection
                await tonClient.getBalance(walletContract.address);
                console.log(`✅ Connected to ${rpc.name} RPC`);
                break;
            } catch (rpcError) {
                console.log(`❌ ${rpc.name} RPC failed: ${rpcError.message}`);
                lastError = rpcError;
                continue;
            }
        }

        if (!tonClient) {
            throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`);
        }

        console.log('🔧 Checking wallet deployment/initialization status using selected RPC...');
        const deploymentCheck = await deployWalletIfNeeded(keyPair, walletContract, tonClient);

        if (!deploymentCheck.success) {
            console.log('⚠️ Deployment may have issues, but continuing...');
        }



        let seqno = 0;
        try {
            const walletState = await tonClient.getContractState(walletContract.address);
            seqno = walletState.seqno || 0;
            console.log(`📝 Final seqno for transaction: ${seqno}`);

            if (seqno === 0) {
                console.log('⚠️ Seqno is 0 after initial check — wallet may be uninitialized');

                // Attempt a safeguard initialization using the same RPC client
                try {
                    console.log('🔄 Attempting re-init via deployWalletIfNeeded with selected RPC...');
                    const reinit = await deployWalletIfNeeded(keyPair, walletContract, tonClient);
                    if (!reinit.success) console.log('⚠️ Re-init attempt reported an error:', reinit.error);
                } catch (reinitErr) {
                    console.log('⚠️ Re-init attempt threw:', reinitErr.message);
                }

                // Wait a bit then re-fetch seqno
                await new Promise(resolve => setTimeout(resolve, 5000));
                try {
                    const updatedState = await tonClient.getContractState(walletContract.address);
                    seqno = updatedState.seqno || 0;
                    console.log(`📝 Seqno after re-init attempt: ${seqno}`);
                } catch (e) {
                    console.log('⚠️ Could not re-fetch seqno after re-init:', e.message);
                }

                if (seqno === 0) {
                    throw new Error('Wallet seqno is still 0 after deployment/init attempts. The transaction would likely be rejected (exitcode 33). Ensure the wallet is deployed, funded, and its seqno > 0 before retrying.');
                }
            }

        } catch (seqnoError) {
            console.log('⚠️ Could not get seqno, using 0:', seqnoError.message);
            seqno = 0;
        }

        // --- Additional safety: prefer authoritative on-chain seqno and verify public key ---
        try {
            console.log('🔎 Fetching authoritative seqno via runGetMethod JSON-RPC...');
            const rpcSeqno = await runGetSeqno(walletContract.address.toString({ urlSafe: true, bounceable: false }));
            if (rpcSeqno !== null && typeof rpcSeqno === 'number') {
                console.log('✅ Authoritative seqno from runGetMethod:', rpcSeqno);
                // If there's a mismatch, adopt the on-chain seqno (safer)
                if (rpcSeqno !== seqno) {
                    console.log(`⚠️ Seqno mismatch (SDK:${seqno} vs RPC:${rpcSeqno}) - using RPC seqno`);
                    seqno = rpcSeqno;
                }
            } else {
                console.log('⚠️ Could not obtain seqno via runGetMethod JSON-RPC, continuing with SDK seqno');
            }

            console.log('🔎 Verifying derived public key against on-chain public key...');
            let onChainPub = await runGetPublicKey(walletContract.address.toString({ urlSafe: true, bounceable: false }));
            const derivedPubHex = Buffer.from(keyPair.publicKey).toString('hex').toLowerCase();

            if (onChainPub) {
                if (derivedPubHex !== onChainPub) {
                    console.log('⚠️ Public key mismatch detected. Attempting to re-initialize the wallet and re-check public key...');
                    try {
                        await deployWalletIfNeeded(keyPair, walletContract, tonClient);
                        // allow some time for the chain to index
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        onChainPub = await runGetPublicKey(walletContract.address.toString({ urlSafe: true, bounceable: false }));
                        if (onChainPub && derivedPubHex !== onChainPub) {
                            throw new Error(`Derived public key does NOT match on-chain get_public_key AFTER initialization. On-chain: ${onChainPub}, Derived: ${derivedPubHex}. This suggests a wrong mnemonic or corrupted wallet data.`);
                        }
                    } catch (initErr) {
                        console.log('❌ Re-initialization attempt failed or did not resolve mismatch:', initErr.message);
                        throw initErr;
                    }
                }

                console.log('✅ Public key verified against on-chain state');
            } else {
                console.log('⚠️ On-chain public key not available via runGetMethod. Attempting to initialize the wallet (if needed) and re-check...');
                try {
                    await deployWalletIfNeeded(keyPair, walletContract, tonClient);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    onChainPub = await runGetPublicKey(walletContract.address.toString({ urlSafe: true, bounceable: false }));
                    if (onChainPub) {
                        if (derivedPubHex !== onChainPub) {
                            throw new Error(`Derived public key does NOT match on-chain get_public_key AFTER initialization. On-chain: ${onChainPub}, Derived: ${derivedPubHex}.`);
                        }
                        console.log('✅ Public key verified after initialization');
                    } else {
                        console.log('⚠️ Public key still not available after initialization - proceeding cautiously');
                    }
                } catch (verifyErr) {
                    console.error('❌ Pre-send verification failed:', verifyErr.message);
                    throw verifyErr;
                }
            }
        } catch (verifyError) {
            console.error('❌ Pre-send verification failed:', verifyError.message);
            throw verifyError;
        }

        let recipientAddress;
        try {
            recipientAddress = Address.parse(toAddress);
            console.log('✅ Recipient address parsed');
        } catch (error) {
            throw new Error('Invalid recipient address: ' + error.message);
        }

        const amountNano = toNano(amount.toString());
        console.log(`💰 Amount: ${amount} TON (${amountNano} nanoton)`);

        console.log('💰 Checking final balance...');
        const balance = await tonClient.getBalance(walletContract.address);
        const balanceTON = Number(BigInt(balance)) / 1_000_000_000;

        if (balanceTON < parseFloat(amount) + 0.01) {
            throw new Error(`Insufficient balance. Need ${amount} TON + ~0.01 TON fee, but only have ${balanceTON.toFixed(4)} TON.`);
        }

        console.log(`✅ Sufficient balance: ${balanceTON.toFixed(4)} TON`);

        const internalMsg = internal({
            to: recipientAddress,
            value: amountNano,
            body: memo || '',
            bounce: false
        });

        // 14. Create transfer (mutable so we can retry with refreshed seqno)
        let transfer = walletContract.createTransfer({
            secretKey: keyPair.secretKey,
            seqno: seqno,
            messages: [internalMsg],
            sendMode: 3
        });

        // 15. Send transaction with a single retry for transient RPC/seqno failures
        console.log("📤 Sending transaction to TON blockchain...");
        console.log("📋 Transaction Details:", {
            from: walletContract.address.toString({ bounceable: false }),
            to: toAddress,
            amount: amountNano.toString() + " nanoton",
            seqno: seqno,
            sendMode: 3
        });

        let lastSendError = null;
        const maxSendAttempts = 2;
        for (let attempt = 1; attempt <= maxSendAttempts; attempt++) {
            try {
                const sendResult = await tonClient.sendExternalMessage(walletContract, transfer);
                console.log(`✅ Transaction broadcasted successfully on attempt ${attempt}!`, sendResult);

                // Generate transaction hash (placeholder until indexed hash is available)
                const txHash = crypto.createHash('sha256')
                    .update(walletContract.address.toString() + toAddress + amountNano.toString() + Date.now().toString())
                    .digest('hex')
                    .toUpperCase()
                    .substring(0, 64);

                console.log("🔗 Generated transaction hash:", txHash);

                // Wait briefly for indexing
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Get current price for USD value
                const priceData = await fetchRealTONPrice();
                const usdValue = (parseFloat(amount) * priceData.price).toFixed(2);

                // Record transaction in DB (mark as pending) so history shows immediately
                try {
                    const record = {
                        user_id: userId,
                        wallet_address: walletContract.address.toString({ urlSafe: true, bounceable: false }),
                        transaction_hash: txHash,
                        type: 'send',
                        token: 'TON',
                        amount: Number(parseFloat(amount).toFixed(8)),
                        to_address: toAddress,
                        from_address: walletContract.address.toString({ urlSafe: true, bounceable: false }),
                        status: 'pending',
                        network_fee: Number((process.env.TX_FEE_TON || 0.001).toString()),
                        description: memo || null,
                        created_at: new Date().toISOString()
                    };

                    const { data: inserted, error: insertErr } = await supabase
                        .from('transactions')
                        .upsert(record, { onConflict: 'transaction_hash' });

                    if (insertErr) {
                        console.warn('⚠️ Failed to record outgoing transaction in DB:', insertErr.message);
                    } else {
                        console.log('✅ Recorded outgoing transaction in DB (pending):', inserted && inserted[0]?.transaction_hash || txHash);
                    }
                } catch (e) {
                    console.warn('⚠️ Exception while recording transaction in DB:', e.message);
                }

                // Return success
                return {
                    success: true,
                    message: 'Transaction sent successfully!',
                    transactionHash: txHash,
                    fromAddress: walletContract.address.toString({ urlSafe: true, bounceable: false, testOnly: false }),
                    toAddress: toAddress,
                    amount: parseFloat(amount),
                    memo: memo || '',
                    timestamp: new Date().toISOString(),
                    explorerLink: `https://tonviewer.com/${walletContract.address.toString({ urlSafe: true, bounceable: true, testOnly: false })}`,
                    usdValue: usdValue,
                    tonPrice: priceData.price.toFixed(4)
                };

            } catch (sendError) {
                lastSendError = sendError;
                console.error(`❌ TON send attempt ${attempt} failed:`, sendError.message);

                if (sendError.response) {
                    console.error('❌ TON API Response:', {
                        status: sendError.response.status,
                        data: sendError.response.data
                    });
                }

                // If we can retry (attempt 1 of 2), refresh seqno and recreate transfer
                if (attempt < maxSendAttempts) {
                    console.log('🔄 Retrying: refreshing seqno and recreating transfer...');
                    try {
                        const walletState = await tonClient.getContractState(walletContract.address);
                        seqno = walletState.seqno || 0;
                        console.log('📝 Refreshed seqno:', seqno);
                    } catch (seqnoRefreshError) {
                        console.log('⚠️ Could not refresh seqno before retry:', seqnoRefreshError.message);
                        // continue and retry anyway
                    }

                    // Recreate transfer with updated seqno
                    transfer = walletContract.createTransfer({
                        secretKey: keyPair.secretKey,
                        seqno: seqno,
                        messages: [internalMsg],
                        sendMode: 3
                    });

                    // small backoff
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                // No more retries
                break;
            }
        }

        // If we reach here, all attempts failed - include RPC payload if available
        const rpcStatus = lastSendError?.response?.status;
        const rpcData = lastSendError?.response?.data;

        let rpcInfo = '';
        try {
            rpcInfo = rpcData ? (typeof rpcData === 'object' ? JSON.stringify(rpcData) : String(rpcData)) : '';
        } catch (e) {
            rpcInfo = String(rpcData);
        }

        console.error('❌❌❌ TON Transaction ultimately FAILED:', lastSendError?.message);

        // Parse exitcode if present to provide actionable advice
        let exitcode = null;
        try {
            const exitMatch = rpcInfo ? String(rpcInfo).match(/exitcode=(\d+)/) : null;
            if (exitMatch) exitcode = parseInt(exitMatch[1], 10);
        } catch (e) {
            // ignore parsing errors
        }

        let advice = '';
        if (exitcode === 33) {
            advice = ' Contract execution returned exitcode 33 (THROW) — this usually means the contract rejected the external message (wrong seqno, uninitialized wallet, or failing contract checks). Ensure the wallet is deployed, funded, and seqno > 0 before retrying.';
        }

        throw new Error(`TON Blockchain Error: ${lastSendError?.message}${rpcStatus ? ` (status ${rpcStatus})` : ''}. Seqno: ${seqno}, Balance: ${balanceTON}. RPC: ${rpcInfo}${advice}`);
        
        
    } catch (error) {
        console.error('❌❌❌ SEND TRANSACTION FAILED:', error.message);
        throw error;
    }
}

// ============================================
// 🎯 MAIN ENDPOINTS - UPDATED
// ============================================

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API v32.0 - DUAL API FIXED',
        database: dbStatus,
        ton_libraries: WalletContractV4 ? 'loaded' : 'MISSING',
        ton_console_api: TON_CONSOLE_API_KEY ? '✓ Configured' : '✗ Missing',
        ton_center_api: TONCENTER_API_KEY ? '✓ Configured' : '✗ Missing',
        has_auto_deploy: true,
        timestamp: new Date().toISOString()
    });
});

// Health endpoint
router.get('/health', async (req, res) => {
    try {
        const priceData = await fetchRealTONPrice();

        res.json({
            status: WalletContractV4 ? 'operational' : 'ERROR',
            database: dbStatus,
            send_enabled: true,
            auto_deploy_enabled: true,
            price_fetching: priceData.source,
            price: priceData.price,
            ton_console_api: TON_CONSOLE_API_KEY ? 'configured' : 'missing',
            ton_center_api: TONCENTER_API_KEY ? 'configured' : 'missing',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: WalletContractV4 ? 'operational' : 'ERROR',
            database: dbStatus,
            send_enabled: true,
            auto_deploy_enabled: true,
            price_fetching: 'fallback',
            price: 2.35,
            ton_console_api: TON_CONSOLE_API_KEY ? 'configured' : 'missing',
            ton_center_api: TONCENTER_API_KEY ? 'configured' : 'missing',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔍 Diagnostic endpoint to fetch on-chain seqno, public key, and balance
router.get('/diagnose/:address', async (req, res) => {
    const address = req.params.address;
    console.log('🔎 Diagnosing address:', address);

    try {
        // Select a working RPC
        const rpcList = [
            { name: 'TON Console', endpoint: 'https://tonapi.io/v2/jsonRPC', apiKey: TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : undefined },
            { name: 'TON Center', endpoint: 'https://toncenter.com/api/v2/jsonRPC', apiKey: TONCENTER_API_KEY || undefined },
            { name: 'Public RPC', endpoint: 'https://ton.rpc.thirdweb.com', apiKey: undefined }
        ];

        let tonClient = null;
        let lastErr = null;
        for (const rpc of rpcList) {
            try {
                const candidate = new TonClient({ endpoint: rpc.endpoint, apiKey: rpc.apiKey, timeout: 10000 });
                await candidate.getBalance(address);
                tonClient = candidate;
                break;
            } catch (e) {
                lastErr = e;
                continue;
            }
        }

        if (!tonClient) {
            return res.status(503).json({ success: false, error: 'No RPC available', details: lastErr?.message });
        }

        const balance = await tonClient.getBalance(address);
        let contractState = null;
        try {
            contractState = await tonClient.getContractState(address);
        } catch (e) {
            contractState = null;
        }

        const rpcSeqno = await runGetSeqno(address);
        const rpcPubKey = await runGetPublicKey(address);

        res.json({
            success: true,
            address,
            balance: Number(BigInt(balance)) / 1_000_000_000,
            sdkSeqno: contractState ? contractState.seqno : null,
            rpcSeqno,
            rpcPublicKey: rpcPubKey,
            state: contractState ? contractState.state : 'unknown'
        });

    } catch (error) {
        console.error('❌ Diagnose failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 Endpoint: Get user's NMXp balance and wallet address
router.get('/nmxp/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({ success: false, error: 'Database unavailable' });
        }

        // Fetch user profile balance (NMXp) - adjust table/column names if your schema differs
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, balance')
            .eq('id', userId)
            .maybeSingle();

        if (profileError) {
            console.error('❌ Error fetching profile balance:', profileError.message);
            return res.status(500).json({ success: false, error: profileError.message });
        }

        const wallet = await getWalletFromDatabase(userId).catch(() => null);

        const balance = profile && typeof profile.balance !== 'undefined' ? parseFloat(profile.balance) : 0;

        res.json({ success: true, balance, wallet_address: wallet ? wallet.address : null });

    } catch (error) {
        console.error('❌ /nmxp error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 Create wallet endpoint
router.post('/create', async (req, res) => {
    console.log('🎯 CREATE TON WALLET REQUEST');

    try {
        const { userId, walletPassword } = req.body;

        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }

        if (walletPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Wallet password must be at least 6 characters'
            });
        }

        if (!WalletContractV4) {
            return res.status(503).json({
                success: false,
                error: 'TON SDK NOT LOADED',
                isRealTON: false
            });
        }

        if (dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        console.log('🔍 Processing request for user:', userId);

        const existingWallet = await getWalletFromDatabase(userId);

        if (existingWallet) {
            console.log('✅ Wallet already exists');
            const validation = validateTONAddress(existingWallet.address);

            const balanceResult = await getRealBalance(existingWallet.address, userId);

            return res.json({
                success: true,
                message: 'Wallet already exists',
                wallet: {
                    id: existingWallet.id,
                    userId: userId,
                    address: existingWallet.address,
                    format: validation.format,
                    createdAt: existingWallet.created_at,
                    source: existingWallet.source,
                    wordCount: existingWallet.word_count,
                    isReal: validation.isRealTON,
                    balance: balanceResult.balance,
                    isActive: balanceResult.isActive || false,
                    status: balanceResult.status
                },
                note: 'Wallet will auto-deploy on first transaction'
            });
        }

        console.log('🆕 Generating TON wallet...');

        const wallet = await generateRealTONWallet();
        const validation = validateTONAddress(wallet.address);

        if (!validation.valid) {
            throw new Error('Generated invalid address: ' + validation.error);
        }

        console.log('✅ Valid TON address generated:', wallet.address);

        const passwordHash = await hashWalletPassword(walletPassword);
        const encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);

        const walletRecord = {
            user_id: userId,
            address: wallet.address,
            encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
            public_key: wallet.publicKey,
            wallet_type: 'TON',
            source: wallet.source,
            word_count: 24,
            password_hash: passwordHash,
            address_format: 'UQ',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + insertError.message
            });
        }

        console.log('✅ Wallet saved with ID:', insertedWallet.id);

        // Post-insert verification: if the address already has on-chain data, verify public key matches derived key
        try {
            // pick a working RPC
            const rpcCandidates = [
                { endpoint: 'https://tonapi.io/v2/jsonRPC', apiKey: TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : undefined },
                { endpoint: 'https://toncenter.com/api/v2/jsonRPC', apiKey: TONCENTER_API_KEY || undefined },
                { endpoint: 'https://ton.rpc.thirdweb.com', apiKey: undefined }
            ];

            let client = null;
            for (const r of rpcCandidates) {
                try {
                    const c = new TonClient({ endpoint: r.endpoint, apiKey: r.apiKey, timeout: 10000 });
                    await c.getBalance(insertedWallet.address);
                    client = c;
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (client) {
                const onChainPub = await runGetPublicKey(insertedWallet.address);
                if (onChainPub) {
                    const derived = insertedWallet.public_key ? String(insertedWallet.public_key).toLowerCase() : null;
                    if (derived && derived !== onChainPub) {
                        console.error('❌ Post-create public key mismatch detected. Rolling back inserted wallet.');
                        await supabase.from('user_wallets').delete().eq('user_id', userId);
                        return res.status(500).json({ success: false, error: 'Public key mismatch detected on newly created wallet. Please try again.' });
                    }
                }
            }
        } catch (pvError) {
            console.log('⚠️ Post-insert verification skipped/failed:', pvError.message);
        }

        return res.json({
            success: true,
            message: 'TON wallet created successfully!',
            wallet: {
                id: insertedWallet.id,
                userId: userId,
                address: wallet.address,
                format: 'non-bounceable (UQ)',
                createdAt: insertedWallet.created_at,
                source: wallet.source,
                wordCount: 24,
                isReal: true
            },
            explorerLink: `https://tonviewer.com/${validation.eqAddress}`,
            activationNote: 'Wallet will auto-deploy when you send your first transaction'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// 🎯 Check wallet endpoint
router.post('/check', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (dbStatus !== 'connected') {
            return res.json({
                success: false,
                error: 'Database not available'
            });
        }

        const wallet = await getWalletFromDatabase(userId);

        if (!wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }

        const validation = validateTONAddress(wallet.address);

        const balanceResult = await getRealBalance(wallet.address, userId);

        return res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                userId: userId,
                address: wallet.address,
                format: validation.format,
                createdAt: wallet.created_at,
                source: wallet.source,
                wordCount: wallet.word_count,
                balance: balanceResult.balance,
                isActive: balanceResult.isActive || false,
                isReal: validation.isRealTON,
                status: balanceResult.status
            },
            note: 'Wallet will auto-deploy on first transaction if needed'
        });

    } catch (error) {
        console.error('❌ Check wallet failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Check failed: ' + error.message
        });
    }
});

// ============================================
// 🎯 FIXED CRITICAL: Login endpoint WITHOUT price fetch
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { userId, walletPassword } = req.body;

        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }

        if (dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        const wallet = await getWalletFromDatabase(userId);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'No wallet found for this user'
            });
        }

        if (!wallet.password_hash) {
            return res.status(401).json({
                success: false,
                error: 'Wallet not properly set up. Please recreate wallet.'
            });
        }

        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect wallet password'
            });
        }

        const validation = validateTONAddress(wallet.address);

        const balanceResult = await getRealBalance(wallet.address, userId);

        return res.json({
            success: true,
            message: 'Wallet login successful',
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                format: validation.format,
                createdAt: wallet.created_at,
                source: wallet.source || 'generated',
                wordCount: wallet.word_count || 24,
                balance: balanceResult.balance,
                isActive: balanceResult.isActive || false,
                isReal: validation.isRealTON,
                status: balanceResult.status
            },
            explorerLink: `https://tonviewer.com/${validation.eqAddress}`,
            note: 'Wallet will auto-deploy on first transaction if needed'
        });

    } catch (error) {
        console.error('❌ Wallet login failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// ============================================
// 🎯 UPDATED BALANCE ENDPOINT WITH DUAL APIS
// ============================================
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { userId } = req.query; // Optional: for database fallback
        
        console.log(`💰 BALANCE REQUEST for: ${address}, user: ${userId || 'none'}`);

        const validation = validateTONAddress(address);

        // Get balance with database fallback if userId provided
        const balanceResult = await getRealBalance(address, userId);

        // Get price from multiple exchanges
        let priceData;
        try {
            priceData = await fetchRealTONPrice();
        } catch (priceError) {
            console.log('⚠️ Price fetch failed, using fallback');
            priceData = {
                price: 2.35,
                change24h: 0,
                source: 'fallback',
                timestamp: Date.now()
            };
        }

        const balance = parseFloat(balanceResult.balance || "0");
        const valueUSD = (balance * priceData.price).toFixed(2);

        console.log(`✅ Balance result: ${balanceResult.balance} TON, Active: ${balanceResult.isActive}, Source: ${balanceResult.source}`);

        return res.json({
            success: true,
            address: address,
            format: validation.format,
            balance: balanceResult.balance,
            balanceUSD: valueUSD,
            tonPrice: priceData.price.toFixed(4),
            priceChange24h: priceData.change24h.toFixed(2),
            priceSource: priceData.source,
            balanceSource: balanceResult.source,
            apiUsed: balanceResult.apiUsed || 'unknown',
            isCache: balanceResult.source === 'database_cache',
            isActive: balanceResult.isActive || false,
            status: balanceResult.status || 'unknown',
            isRealTON: validation.isRealTON,
            explorerLink: `https://tonviewer.com/${validation.eqAddress}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Balance check failed:', error);
        
        return res.json({
            success: false,
            address: req.params.address,
            balance: "0.0000",
            balanceUSD: "0.00",
            tonPrice: "2.35",
            priceChange24h: "0.00",
            priceSource: 'fallback',
            balanceSource: 'error',
            isActive: false,
            status: 'uninitialized',
            note: 'Wallet needs initial funding and deployment',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// 🎯 DEBUG: WALLET ON-CHAIN STATE (helper for troubleshooting seqno/deploy issues)
// ============================================
router.get('/debug/wallet-state', async (req, res) => {
    try {
        const { userId, address } = req.query;

        if (!userId && !address) {
            return res.status(400).json({ success: false, error: 'Provide either userId or address as query param' });
        }

        let targetAddress = address;
        if (userId) {
            const wallet = await getWalletFromDatabase(userId);
            if (!wallet) return res.status(404).json({ success: false, error: 'Wallet not found' });
            targetAddress = wallet.address;
        }

        // Ensure we have a valid address
        try {
            Address.parse(targetAddress);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid TON address' });
        }

        // Try same RPC endpoint selection strategy as send flow
        const rpcEndpoints = [
            { name: 'TON Console', endpoint: 'https://tonapi.io/v2/jsonRPC', apiKey: TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : undefined },
            { name: 'TON Center', endpoint: 'https://toncenter.com/api/v2/jsonRPC', apiKey: TONCENTER_API_KEY || undefined },
            { name: 'Public RPC', endpoint: 'https://ton.rpc.thirdweb.com', apiKey: undefined }
        ];

        let tonClient = null;
        let lastRpcError = null;
        for (const rpc of rpcEndpoints) {
            try {
                console.log(`🔍 Debug: Trying RPC endpoint for debug: ${rpc.name}`);
                tonClient = new TonClient({ endpoint: rpc.endpoint, apiKey: rpc.apiKey, timeout: 30000 });
                await tonClient.getBalance(targetAddress);
                console.log(`✅ Debug: Connected to ${rpc.name}`);
                break;
            } catch (err) {
                lastRpcError = { name: rpc.name, message: err.message, response: err.response?.data || null };
                tonClient = null;
                continue;
            }
        }

        if (!tonClient) {
            return res.status(503).json({ success: false, error: 'No RPC endpoints available', lastRpcError });
        }

        // Gather on-chain info
        let deployed = false;
        let contractState = null;
        let balance = '0';

        try {
            deployed = await tonClient.isContractDeployed(targetAddress);
        } catch (e) {
            console.log('⚠️ Debug: isContractDeployed failed:', e.message);
        }

        try {
            contractState = await tonClient.getContractState(targetAddress);
        } catch (e) {
            console.log('⚠️ Debug: getContractState failed:', e.message);
        }

        try {
            balance = await tonClient.getBalance(targetAddress);
        } catch (e) {
            console.log('⚠️ Debug: getBalance failed:', e.message);
        }

        return res.json({
            success: true,
            address: targetAddress,
            rpcUsed: tonClient.endpoint || null,
            rpcLastError: lastRpcError,
            deployed,
            contractState,
            balance: balance ? (Number(BigInt(balance)) / 1_000_000_000) : 0,
            rawBalance: balance || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Debug wallet-state failed:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 🎯 SEND ENDPOINT - WITH DUAL API SUPPORT
// ============================================
router.post('/send', async (req, res) => {
    console.log('📨 SEND REQUEST RECEIVED - DUAL API SUPPORT');

    try {
        const { userId, walletPassword, toAddress, amount, memo = '' } = req.body;

        console.log('📋 Request details:', { 
            userId: userId ? `${userId.substring(0, 8)}...` : 'MISSING',
            toAddress: toAddress ? `${toAddress.substring(0, 10)}...` : 'MISSING',
            amount: amount || 'MISSING'
        });

        if (!userId || !walletPassword || !toAddress || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, walletPassword, toAddress, amount'
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be a positive number'
            });
        }

        if (amountNum < 0.001) {
            return res.status(400).json({
                success: false,
                error: 'Minimum send amount is 0.001 TON'
            });
        }

        if (!toAddress.startsWith('EQ') && !toAddress.startsWith('UQ')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid TON address format. Must start with EQ or UQ'
            });
        }

        if (dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        if (!WalletContractV4) {
            return res.status(503).json({
                success: false,
                error: 'TON SDK not loaded'
            });
        }

        console.log('✅ All validations passed');

        try {
            const result = await sendTONTransaction(userId, walletPassword, toAddress, amount, memo);

            console.log('✅✅✅ Transaction SUCCESS!');

            return res.json({
                success: true,
                message: result.message,
                note: 'Wallet was automatically initialized if needed',
                data: result
            });

        } catch (transactionError) {
            console.error('❌❌❌ Transaction failed:', transactionError.message);

            let errorType = 'transaction_error';
            let fix = 'Please try again';

            if (transactionError.message.includes('deployment') || transactionError.message.includes('initialization')) {
                errorType = 'initialization_failed';
                fix = 'Make sure wallet has at least 0.05 TON and try again';
            } else if (transactionError.message.includes('Insufficient balance')) {
                errorType = 'insufficient_balance';
                fix = 'Add more TON to your wallet';
            } else if (transactionError.message.includes('Invalid wallet password')) {
                errorType = 'wrong_password';
                fix = 'Enter the correct wallet password';
            } else if (transactionError.message.includes('Invalid recipient address')) {
                errorType = 'invalid_address';
                fix = 'Check the recipient address is correct';
            } else if (transactionError.message.includes('seqno')) {
                errorType = 'seqno_issue';
                fix = 'Wait 10-15 seconds then try again';
            } else if (transactionError.message.includes('401') || transactionError.message.includes('unauthorized')) {
                errorType = 'api_auth_error';
                fix = 'Check your TON Console API key in .env file';
            }

            return res.status(400).json({
                success: false,
                error: transactionError.message,
                errorType: errorType,
                fix: fix,
                note: 'Wallet will auto-initialize on next attempt if needed'
            });
        }

    } catch (error) {
        console.error('❌❌❌❌❌ SEND ENDPOINT CRASHED:');
        console.error('❌ FINAL ERROR:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message,
            details: 'Transaction failed - dual API system active'
        });
    }
});

// ============================================
// 🎯 NEW: ENVIRONMENT CHECK ENDPOINT
// ============================================
router.get('/env-check', (req, res) => {
    const envVars = {
        TONCENTER_API_KEY: process.env.TONCENTER_API_KEY ? '✓ Present' : '✗ Missing',
        TON_CONSOLE_API_KEY: process.env.TON_CONSOLE_API_KEY ? '✓ Present' : '✗ Missing',
        TON_API_TOKEN: process.env.TON_API_TOKEN ? '✓ Present' : '✗ Missing',
        TONAPI_KEY: process.env.TONAPI_KEY ? '✓ Present' : '✗ Missing',
        SUPABASE_URL: process.env.SUPABASE_URL ? '✓ Present' : '✗ Missing',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ Present' : '✗ Missing',
        NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    console.log('🔍 Environment Variables Check:', envVars);
    
    res.json({
        success: true,
        message: 'Environment Variables Status',
        variables: envVars,
        loadedKeys: {
            TONCENTER_API_KEY: TONCENTER_API_KEY ? 'Loaded' : 'Not loaded',
            TON_CONSOLE_API_KEY: TON_CONSOLE_API_KEY ? 'Loaded' : 'Not loaded'
        },
        suggestions: [
            'Make sure your .env file is in the root directory',
            'Check that variables are spelled correctly',
            'Restart your server after updating .env',
            'Get TON Console API key from: https://tonconsole.com/'
        ]
    });
});

// ============================================
// 🎯 SIMPLE PRICE ENDPOINT
// ============================================
router.get('/price/ton', async (req, res) => {
    try {
        const priceData = await fetchRealTONPrice();

        return res.json({
            success: true,
            symbol: 'TON',
            price: priceData.price.toFixed(4),
            change24h: priceData.change24h.toFixed(2),
            change24hPercent: `${priceData.change24h >= 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%`,
            source: priceData.source,
            timestamp: new Date().toISOString(),
            sourcesCount: priceData.sourcesCount || 0
        });
    } catch (error) {
        console.error('❌ TON price fetch failed:', error);
        return res.json({
            success: true,
            symbol: 'TON',
            price: "2.35",
            change24h: "0.00",
            change24hPercent: "0.00%",
            source: 'fallback',
            timestamp: new Date().toISOString(),
            sourcesCount: 0
        });
    }
});

// ============================================
// 🎯 TRANSACTION SYNC HELPERS AND ENDPOINTS
// ============================================

// Fetch transactions from public providers and normalize
async function fetchTransactionsFromProviders(address, limit = 50) {
    const providers = [];
    // TonAPI / TON Console
    providers.push({ name: 'TonAPI', url: `${TON_API_URL}/accounts/${address}/transactions?limit=${limit}`, method: 'GET' });
    // TonCenter
    providers.push({ name: 'TON Center', url: `https://toncenter.com/api/v2/getTransactions`, params: { address: address, limit: limit } });

    for (const p of providers) {
        try {
            console.log(`🔎 Trying transaction provider: ${p.name} for ${address}`);
            const opts = { method: p.method || 'GET', url: p.url, timeout: 20000 };
            if (p.params) opts.params = p.params;
            if (p.headers) opts.headers = p.headers;
            if (p.name === 'TON Center' && TONCENTER_API_KEY) opts.headers = { 'X-API-Key': TONCENTER_API_KEY };

            const response = await axios(opts);
            if (!response || !response.data) continue;

            let raw = response.data;
            if (raw.ok && raw.result) raw = raw.result;
            if (raw.transactions) raw = raw.transactions;

            if (!Array.isArray(raw) || raw.length === 0) {
                console.log(`ℹ️ ${p.name} returned no transactions for ${address}`);
                continue;
            }

            const normalized = raw.map(tx => {
                try {
                    const hash = tx.hash || tx.transaction_hash || tx.tx_hash || (tx.transaction_id && tx.transaction_id.hash) || null;
                    const timeVal = tx.utime || tx.time || (tx.block && tx.block.utime) || null;
                    const block_time = timeVal ? (new Date(timeVal * 1000)).toISOString() : (tx.block_time || null);
                    const block_height = tx.block && tx.block.height ? tx.block.height : (tx.block_height || null);

                    let amount = null;
                    let from_address = null;
                    let to_address = null;
                    let fee = null;
                    let status = tx.status || 'pending';
                    let description = tx.description || tx.memo || tx.message || '';

                    if (tx.in_msg) {
                        from_address = tx.in_msg.source || tx.in_msg.from || null;
                        to_address = tx.in_msg.destination || tx.in_msg.to || null;
                        if (tx.in_msg.value) amount = Number(tx.in_msg.value) / 1_000_000_000;
                        if (tx.in_msg.fee) fee = Number(tx.in_msg.fee) / 1_000_000_000;
                    }

                    if (!amount && tx.value) amount = Number(tx.value) / 1_000_000_000;
                    if (!amount && tx.amount) amount = Number(tx.amount);

                    if (!from_address && tx.from) from_address = tx.from;
                    if (!to_address && tx.to) to_address = tx.to;

                    let type = 'unknown';
                    const lowerAddr = (address || '').toLowerCase();
                    if (from_address && from_address.toLowerCase() === lowerAddr) type = 'send';
                    if (to_address && to_address.toLowerCase() === lowerAddr) type = 'receive';

                    return {
                        transaction_hash: hash,
                        block_time: block_time || null,
                        block_height: block_height || null,
                        amount: amount !== null ? parseFloat(amount) : null,
                        network_fee: fee !== null ? parseFloat(fee) : null,
                        from_address: from_address || null,
                        to_address: to_address || null,
                        type: type,
                        status: status,
                        description: description || '',
                        raw: tx
                    };
                } catch (e) {
                    console.warn('⚠️ Failed to normalize tx:', e.message);
                    return null;
                }
            }).filter(Boolean);

            if (normalized.length > 0) return normalized;

        } catch (error) {
            console.warn(`⚠️ Provider ${p.name} failed:`, error.message);
            continue;
        }
    }

    return [];
}

// Upsert helper (reuses normalization rules)
async function upsertTransactionsForUser(userId, address, chainTxs = []) {
    try {
        if (!Array.isArray(chainTxs) || chainTxs.length === 0) return { success: true, syncedCount: 0, rows: [] };

        const allowedTypes = ['send', 'receive', 'swap', 'buy'];
        const allowedStatuses = ['pending', 'completed', 'failed'];

        const rowsToUpsert = [];
        for (const tx of chainTxs) {
            if (!tx.transaction_hash) continue;

            const safeAmount = tx.amount !== null && tx.amount !== undefined ? Number(tx.amount) : 0;
            const amountNum = Number(Number(safeAmount).toFixed(8));
            const safeFee = tx.network_fee !== null && tx.network_fee !== undefined ? Number(tx.network_fee) : 0;
            const feeNum = Number(Number(safeFee).toFixed(8));

            let txType = (tx.type || '').toString().toLowerCase();
            if (!allowedTypes.includes(txType)) {
                const lower = (address || '').toLowerCase();
                if (tx.from_address && tx.from_address.toLowerCase() === lower) txType = 'send';
                else if (tx.to_address && tx.to_address.toLowerCase() === lower) txType = 'receive';
                else txType = 'receive';
            }

            let txStatus = (tx.status || '').toString().toLowerCase();
            if (!allowedStatuses.includes(txStatus)) {
                if (txStatus === 'ok' || txStatus === 'finalized' || txStatus === 'confirmed' || txStatus === 'completed') txStatus = 'completed';
                else if (txStatus === 'failed' || txStatus === 'rejected' || txStatus === 'error') txStatus = 'failed';
                else txStatus = 'pending';
            }

            rowsToUpsert.push({
                user_id: userId,
                wallet_address: address,
                transaction_hash: tx.transaction_hash,
                type: txType,
                token: tx.token || 'TON',
                amount: amountNum,
                to_address: tx.to_address || null,
                from_address: tx.from_address || null,
                status: txStatus,
                network_fee: feeNum,
                description: tx.description || null,
                created_at: tx.block_time || new Date().toISOString()
            });
        }

        if (rowsToUpsert.length === 0) return { success: true, syncedCount: 0, rows: [] };

        const { data: upsertedRows, error: bulkErr } = await supabase
            .from('transactions')
            .upsert(rowsToUpsert, { onConflict: 'transaction_hash' });

        if (bulkErr) {
            console.warn('⚠️ Bulk upsert error:', bulkErr.message);
            return { success: false, error: bulkErr.message, syncedCount: 0, rows: [] };
        }

        return { success: true, syncedCount: Array.isArray(upsertedRows) ? upsertedRows.length : 0, rows: upsertedRows };

    } catch (e) {
        console.warn('⚠️ upsertTransactionsForUser failed:', e.message);
        return { success: false, error: e.message, syncedCount: 0, rows: [] };
    }
}

// POST /transactions/sync - sync transactions for a single user
router.post('/transactions/sync', async (req, res) => {
    try {
        const { userId } = req.body || {};
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId required' });
        }

        if (!supabase || dbStatus !== 'connected') {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { data: wallets, error: walletErr } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .limit(1);

        if (walletErr) {
            console.error('❌ DB error fetching wallet:', walletErr.message);
            return res.status(500).json({ success: false, error: walletErr.message });
        }

        const wallet = wallets && wallets[0];
        if (!wallet || !wallet.wallet_address) {
            return res.json({ success: false, error: 'No wallet address found for user', syncedCount: 0 });
        }

        const address = wallet.wallet_address;
        console.log(`🔄 Starting transaction sync for user ${userId}, address ${address}`);

        const chainTxs = await fetchTransactionsFromProviders(address, 100);
        if (!chainTxs || chainTxs.length === 0) {
            return res.json({ success: true, message: 'No transactions found on chain', syncedCount: 0, transactions: [] });
        }

        const upsertResult = await upsertTransactionsForUser(userId, address, chainTxs);
        return res.json({ success: true, message: 'Sync completed', syncedCount: upsertResult.syncedCount, transactions: upsertResult.rows });
    } catch (error) {
        console.error('❌ Sync failed:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Sync all wallets helper
async function syncAllWallets(limitPerWallet = 100) {
    if (!supabase || dbStatus !== 'connected') {
        throw new Error('Database not connected');
    }

    if (global.__transactionSyncRunning) {
        throw new Error('Transaction sync already in progress');
    }
    global.__transactionSyncRunning = true;

    const { data: wallets, error: walletErr } = await supabase
        .from('user_wallets')
        .select('user_id, wallet_address')
        .not('wallet_address', 'is', null);

    if (walletErr) {
        global.__transactionSyncRunning = false;
        throw new Error(walletErr.message);
    }

    const results = [];
    const CONCURRENCY = parseInt(process.env.TRANSACTION_SYNC_CONCURRENCY || '5');
    const queue = [...(wallets || [])];

    async function worker() {
        while (queue.length > 0) {
            const w = queue.shift();
            if (!w || !w.wallet_address) continue;
            try {
                const txs = await fetchTransactionsFromProviders(w.wallet_address, limitPerWallet);
                const up = await upsertTransactionsForUser(w.user_id, w.wallet_address, txs);
                results.push({ userId: w.user_id, address: w.wallet_address, synced: up.syncedCount || 0, error: up.error || null });
            } catch (e) {
                results.push({ userId: w.user_id, address: w.wallet_address, synced: 0, error: e.message });
            }
        }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    global.__transactionSyncRunning = false;
    return results;
}

// POST /transactions/sync/all - sync all wallets (can be called via webhook/cron)
router.post('/transactions/sync/all', async (req, res) => {
    try {
        const limitPerWallet = parseInt(req.body?.limitPerWallet || 100);
        const results = await syncAllWallets(limitPerWallet);
        return res.json({ success: true, message: 'Full sync completed', results });
    } catch (error) {
        if (error.message === 'Transaction sync already in progress') {
            return res.json({ success: false, error: error.message });
        }
        console.error('❌ Full sync failed:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Transaction history endpoint
router.get('/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: false,
                error: 'Database not available',
                transactions: []
            });
        }

        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (error) {
                console.error('Database error:', error.message);
                return res.json({
                    success: false,
                    error: error.message,
                    transactions: []
                });
            }

            return res.json({
                success: true,
                transactions: transactions || [],
                count: transactions?.length || 0
            });

        } catch (tableError) {
            return res.json({
                success: false,
                error: 'Transactions table not ready',
                transactions: []
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Schedule periodic full sync of all wallets (if desired)
const TRANSACTION_SYNC_INTERVAL_SECONDS = parseInt(process.env.TRANSACTION_SYNC_INTERVAL_SECONDS || '300');

function scheduleTransactionSync() {
    if (global.__transactionSyncScheduled) return;
    global.__transactionSyncScheduled = true;

    console.log(`🔁 Transaction sync scheduled every ${TRANSACTION_SYNC_INTERVAL_SECONDS} seconds`);

    // Immediate run after startup (non-blocking)
    setTimeout(async () => {
        try {
            if (dbStatus === 'connected') {
                console.log('🔁 Initial transaction sync starting...');
                const results = await syncAllWallets();
                console.log('🔁 Initial transaction sync completed. Wallets processed:', results.length);
            } else {
                console.log('🔁 Initial sync skipped: database not connected yet');
            }
        } catch (e) {
            console.error('❌ Initial transaction sync failed:', e.message);
        }
    }, 5000);

    // Periodic sync
    setInterval(async () => {
        try {
            if (dbStatus !== 'connected') {
                console.log('🔁 Skipping periodic sync - database not connected');
                return;
            }
            console.log('🔁 Periodic transaction sync starting...');
            const results = await syncAllWallets();
            console.log('🔁 Periodic transaction sync completed. Wallets processed:', results.length);
        } catch (e) {
            console.error('❌ Periodic transaction sync error:', e.message);
        }
    }, TRANSACTION_SYNC_INTERVAL_SECONDS * 1000);
}

// Start scheduler now (safe - function checks DB status on run)
scheduleTransactionSync();

console.log('✅ WALLET ROUTES READY - DUAL API FIXED VERSION');

module.exports = router;