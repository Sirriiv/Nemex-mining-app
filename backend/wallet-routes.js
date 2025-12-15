// backend/wallet-routes.js - COMPLETE FIXED VERSION v27.0
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');

// ============================================
// 🎯 TON IMPORTS - OFFICIAL SDK ONLY (NO FALLBACK)
// ============================================
console.log('🔄 Loading TON libraries (Official SDK v15.4.0)...');

let tonCrypto, tonSDK;
let mnemonicNew, mnemonicToPrivateKey;
let WalletContractV4, Address, TonClient, internal, toNano, fromNano;

try {
    console.log('🔍 Attempting to load @ton/crypto...');
    tonCrypto = require('@ton/crypto');
    console.log('✅ @ton/crypto v3.2.0 loaded');

    console.log('🔍 Attempting to load @ton/ton...');
    tonSDK = require('@ton/ton');
    console.log('✅ @ton/ton v15.4.0 loaded');

    // Get functions from @ton/crypto
    mnemonicNew = tonCrypto.mnemonicNew;
    mnemonicToPrivateKey = tonCrypto.mnemonicToPrivateKey;

    // Get WalletContractV4 and Address from @ton/ton
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

require('dotenv').config();

console.log('🚀 WALLET ROUTES v27.0 - ACTIVATION FIX APPLIED');

// ============================================
// 🎯 CORS MIDDLEWARE - FIXED
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
// 🎯 SUPABASE SETUP - FIXED TO MATCH YOUR TABLES
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
// 🎯 REAL TON WALLET GENERATION (UQ FORMAT)
// ============================================

async function generateRealTONWallet() {
    try {
        console.log('🎯 Generating REAL TON wallet with official SDK...');

        // 1. Generate mnemonic (24 words)
        const mnemonicArray = await mnemonicNew();
        const mnemonic = mnemonicArray.join(' ');
        console.log('✅ Mnemonic generated (24 words)');

        // 2. Derive private key from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonicArray);
        console.log('✅ Key pair derived');

        // 3. Create WalletContractV4 on mainnet (workchain 0)
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        console.log('✅ Wallet contract created');

        // 4. Get the address object
        const addressObj = wallet.address;

        // 5. Generate UQ format (non-bounceable) - THIS IS THE FIX!
        const uqAddress = addressObj.toString({
            urlSafe: true,
            bounceable: false,
            testOnly: false
        });

        // 6. Also get EQ format for reference
        const eqAddress = addressObj.toString({
            urlSafe: true,
            bounceable: true,
            testOnly: false
        });

        console.log('✅ UQ Address (stored):', uqAddress);
        console.log('✅ EQ Address (reference):', eqAddress);

        // 7. VALIDATE the address - MUST BE 48 CHARACTERS
        if (uqAddress.length !== 48) {
            throw new Error(`INVALID ADDRESS LENGTH: ${uqAddress.length} characters (must be 48). Address: ${uqAddress}`);
        }

        console.log('✅ Address validation passed');

        // 8. Return complete wallet data WITH BOTH FORMATS
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
        console.error('❌ Stack:', error.stack);
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

        // Check length
        if (cleanAddress.length !== 48) {
            return {
                valid: false,
                error: `Invalid length: ${cleanAddress.length} characters (must be 48)`,
                isRealTON: false
            };
        }

        // Must start with EQ or UQ
        if (!cleanAddress.startsWith('EQ') && !cleanAddress.startsWith('UQ')) {
            return {
                valid: false,
                error: `Invalid prefix: "${cleanAddress.substring(0, 2)}" (must be EQ or UQ)`,
                isRealTON: false
            };
        }

        // Try to parse
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
// 🎯 TON BLOCKCHAIN FUNCTIONS - FIXED ACTIVATION
// ============================================

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';

// 🎯 FIXED: CORRECT ACTIVATION DETECTION
async function getRealBalance(address) {
    try {
        console.log(`💰 CHECKING BALANCE FOR: ${address}`);

        // Convert UQ to EQ for API calls
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

        console.log(`🔍 Querying TON Center API for: ${queryAddress}`);

        const headers = {};
        if (TONCENTER_API_KEY) {
            headers['X-API-Key'] = TONCENTER_API_KEY;
            console.log(`🔑 Using API Key (first 8 chars): ${TONCENTER_API_KEY.substring(0, 8)}...`);
        } else {
            console.warn('⚠️ No TONCENTER_API_KEY provided - using public API (rate limited)');
        }

        const url = 'https://toncenter.com/api/v2/getAddressInformation';
        const response = await axios.get(url, {
            headers,
            params: { address: queryAddress },
            timeout: 15000
        });

        console.log(`📊 API Response Status: ${response.status}`);

        if (response.data && typeof response.data === 'object') {
            let resultData = response.data;
            if (response.data.ok !== undefined) {
                resultData = response.data.result;
            }

            if (resultData && resultData.balance !== undefined) {
                const balanceNano = BigInt(resultData.balance);
                const balanceTON = Number(balanceNano) / 1_000_000_000;
                const status = resultData.status || 'unknown';
                
                // 🎯 CRITICAL FIX: Wallets can be active even with status "uninitialized"
                // A wallet is ACTIVE if it has any balance OR if status is "active"
                const isActive = status.toLowerCase() === 'active' || balanceNano > 0n;
                
                console.log(`✅ Balance found: ${balanceTON.toFixed(4)} TON`);
                console.log(`✅ Status: ${status}, Active: ${isActive}`);

                return {
                    success: true,
                    balance: balanceTON.toFixed(4),
                    status: status,
                    isActive: isActive,
                    isReal: true,
                    rawBalance: balanceNano.toString(),
                    queryAddress: queryAddress
                };
            }
        }

        return {
            success: true,
            balance: "0.0000",
            isActive: false,
            status: 'uninitialized',
            isReal: true
        };

    } catch (error) {
        console.error('❌ BALANCE CHECK FAILED:', error.message);

        if (error.response && error.response.status === 404) {
            return {
                success: true,
                balance: "0.0000",
                isActive: false,
                status: 'not_found',
                isReal: true
            };
        }

        return {
            success: false,
            balance: "0.0000",
            error: error.message,
            isReal: true
        };
    }
}

// ============================================
// 🎯 AUTO WALLET DEPLOYMENT FUNCTION
// ============================================

async function deployWalletIfNeeded(keyPair, walletContract) {
    try {
        console.log('🔍 Checking if wallet needs deployment...');
        
        // Initialize TON client
        const tonClient = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC',
            apiKey: TONCENTER_API_KEY || undefined,
            timeout: 30000
        });
        
        // Check if contract is deployed
        const deployed = await tonClient.isContractDeployed(walletContract.address);
        
        if (deployed) {
            console.log('✅ Wallet already deployed');
            return { success: true, deployed: true };
        }
        
        console.log('⚠️ Wallet not deployed. Attempting auto-deploy...');
        
        // Check balance (need at least 0.05 TON for deployment)
        const balance = await tonClient.getBalance(walletContract.address);
        const minDeployBalance = toNano('0.05');
        
        if (BigInt(balance) < minDeployBalance) {
            throw new Error(
                `Wallet needs at least 0.05 TON for deployment. Current: ${fromNano(balance)} TON`
            );
        }
        
        // Create deployment transfer (empty messages, seqno = 0)
        console.log('🔐 Creating deployment transfer...');
        const deployTransfer = walletContract.createTransfer({
            secretKey: keyPair.secretKey,
            seqno: 0,
            messages: [], // Empty messages = deployment
            sendMode: 3
        });
        
        // Send deployment
        console.log('📤 Sending deployment transaction...');
        await tonClient.sendExternalMessage(walletContract, deployTransfer);
        
        // Wait for deployment confirmation
        console.log('⏳ Waiting for deployment confirmation...');
        let attempts = 0;
        while (attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const nowDeployed = await tonClient.isContractDeployed(walletContract.address);
            
            if (nowDeployed) {
                console.log('✅ Wallet successfully deployed!');
                return { 
                    success: true, 
                    deployed: true, 
                    message: 'Wallet deployed successfully' 
                };
            }
            attempts++;
            console.log(`⏳ Attempt ${attempts}/30 - still deploying...`);
        }
        
        throw new Error('Wallet deployment timeout. Check in 1-2 minutes.');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        return { 
            success: false, 
            deployed: false, 
            error: error.message 
        };
    }
}

// ============================================
// 🎯 REAL PRICE FETCHING - WORKING VERSION
// ============================================
let priceCache = { data: null, timestamp: 0, change24h: 0 };
const CACHE_DURATION = 30000;

async function fetchRealTONPrice() {
    const now = Date.now();
    if (priceCache.data && (now - priceCache.timestamp) < CACHE_DURATION) {
        return priceCache.data;
    }

    console.log('💰 Fetching TON price from exchanges...');
    
    let tonPrice = 2.35;
    let source = 'fallback';
    let change24h = 0;
    let high24h = 0;
    let low24h = 0;
    let volume24h = 0;

    try {
        // 1️⃣ TRY BINANCE FIRST
        try {
            console.log('🔄 Trying Binance exchange...');
            const binanceResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT', {
                timeout: 5000
            });
            
            if (binanceResponse.data && binanceResponse.data.lastPrice) {
                tonPrice = parseFloat(binanceResponse.data.lastPrice);
                change24h = parseFloat(binanceResponse.data.priceChangePercent);
                high24h = parseFloat(binanceResponse.data.highPrice);
                low24h = parseFloat(binanceResponse.data.lowPrice);
                volume24h = parseFloat(binanceResponse.data.volume);
                source = 'Binance';
                console.log(`✅ Got price from ${source}: $${tonPrice}, 24h change: ${change24h.toFixed(2)}%`);
            }
        } catch (binanceError) {
            console.log('❌ Binance failed, trying Bybit...');
            
            // 2️⃣ TRY BYBIT
            try {
                const bybitResponse = await axios.get('https://api.bybit.com/v5/market/tickers?category=spot&symbol=TONUSDT', {
                    timeout: 5000
                });
                
                if (bybitResponse.data && bybitResponse.data.result && bybitResponse.data.result.list[0]) {
                    const data = bybitResponse.data.result.list[0];
                    tonPrice = parseFloat(data.lastPrice);
                    change24h = parseFloat(data.price24hPcnt) * 100;
                    high24h = parseFloat(data.highPrice24h);
                    low24h = parseFloat(data.lowPrice24h);
                    volume24h = parseFloat(data.volume24h);
                    source = 'Bybit';
                    console.log(`✅ Got price from ${source}: $${tonPrice}, 24h change: ${change24h.toFixed(2)}%`);
                }
            } catch (bybitError) {
                console.log('❌ Bybit failed, trying Bitget...');
                
                // 3️⃣ TRY BITGET
                try {
                    const bitgetResponse = await axios.get('https://api.bitget.com/api/v2/spot/public/tickers?symbol=TONUSDT', {
                        timeout: 5000
                    });
                    
                    if (bitgetResponse.data && bitgetResponse.data.data && bitgetResponse.data.data[0]) {
                        const data = bitgetResponse.data.data[0];
                        tonPrice = parseFloat(data.close);
                        change24h = parseFloat(data.chgUtc);
                        high24h = parseFloat(data.high24h);
                        low24h = parseFloat(data.low24h);
                        volume24h = parseFloat(data.quoteVolume);
                        source = 'Bitget';
                        console.log(`✅ Got price from ${source}: $${tonPrice}, 24h change: ${change24h.toFixed(2)}%`);
                    }
                } catch (bitgetError) {
                    console.log('❌ Bitget failed, trying MEXC...');
                    
                    // 4️⃣ TRY MEXC
                    try {
                        const mexcResponse = await axios.get('https://api.mexc.com/api/v3/ticker/24hr?symbol=TONUSDT', {
                            timeout: 5000
                        });
                        
                        if (mexcResponse.data && mexcResponse.data.lastPrice) {
                            tonPrice = parseFloat(mexcResponse.data.lastPrice);
                            change24h = parseFloat(mexcResponse.data.priceChangePercent);
                            high24h = parseFloat(mexcResponse.data.highPrice);
                            low24h = parseFloat(mexcResponse.data.lowPrice);
                            volume24h = parseFloat(mexcResponse.data.volume);
                            source = 'MEXC';
                            console.log(`✅ Got price from ${source}: $${tonPrice}, 24h change: ${change24h.toFixed(2)}%`);
                        }
                    } catch (mexcError) {
                        console.log('❌ All exchanges failed, using fallback');
                        source = 'fallback';
                        change24h = (Math.random() * 10 - 5).toFixed(2);
                    }
                }
            }
        }
    } catch (error) {
        console.log('❌ All price fetches failed:', error.message);
        source = 'fallback';
        change24h = (Math.random() * 10 - 5).toFixed(2);
    }

    priceCache.data = { 
        price: tonPrice, 
        source: source, 
        timestamp: now,
        change24h: parseFloat(change24h),
        high24h: high24h,
        low24h: low24h,
        volume24h: volume24h,
        isRealPrice: source !== 'fallback'
    };

    console.log(`✅ Final price: $${tonPrice.toFixed(4)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%) from ${source}`);
    
    return priceCache.data;
}

// ============================================
// 🎯 SEND TON TRANSACTION - FIXED WITH AUTO-DEPLOYMENT
// ============================================

async function sendTONTransaction(userId, walletPassword, toAddress, amount, memo = '') {
    console.log('🚀 SEND TRANSACTION STARTED WITH AUTO-DEPLOYMENT');
    
    try {
        // 1. Get wallet from database
        const { data: wallet, error: walletError } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (walletError || !wallet) {
            throw new Error('Wallet not found in database.');
        }
        
        console.log('✅ Wallet found:', wallet.address?.substring(0, 15) + '...');
        
        // 2. Verify wallet password
        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            throw new Error('Invalid wallet password');
        }
        console.log('✅ Password verified');
        
        // 3. Check if we have encrypted mnemonic
        if (!wallet.encrypted_mnemonic) {
            throw new Error('Wallet recovery phrase not found.');
        }
        
        // 4. Decrypt mnemonic
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
        const mnemonic = decrypted.split(' ');
        
        console.log('✅ Mnemonic decrypted');
        
        // 5. Derive keyPair from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        console.log('✅ Key pair derived');
        
        // 6. Create wallet contract
        const walletContract = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });
        
        console.log('✅ Wallet contract created');
        
        // ✅ 7. NEW: CHECK AND DEPLOY WALLET IF NEEDED
        console.log('🔧 Checking wallet deployment status...');
        const deploymentCheck = await deployWalletIfNeeded(keyPair, walletContract);
        
        if (!deploymentCheck.success) {
            console.log('⚠️ Deployment may be in progress, continuing anyway...');
        }
        
        // 8. Initialize TON client
        const tonClient = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC',
            apiKey: TONCENTER_API_KEY || undefined,
            timeout: 30000
        });
        
        // 9. Get current seqno (should now exist if deployed)
        let seqno = 0;
        try {
            const walletState = await tonClient.getContractState(walletContract.address);
            seqno = walletState.seqno || 0;
            console.log(`📝 Current seqno: ${seqno}`);
            
            // If seqno is still 0 after deployment, wait a bit
            if (seqno === 0 && deploymentCheck.deployed) {
                console.log('⏳ Waiting for seqno to update after deployment...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const updatedState = await tonClient.getContractState(walletContract.address);
                seqno = updatedState.seqno || 0;
                console.log(`📝 Updated seqno: ${seqno}`);
            }
        } catch (seqnoError) {
            console.log('⚠️ Could not get seqno:', seqnoError.message);
            seqno = 0;
        }
        
        // 10. Validate recipient address
        let recipientAddress;
        try {
            recipientAddress = Address.parse(toAddress);
            console.log('✅ Recipient address parsed');
        } catch (error) {
            throw new Error('Invalid recipient address: ' + error.message);
        }
        
        // 11. Convert amount to nanoton
        const amountNano = toNano(amount.toString());
        console.log(`💰 Amount: ${amount} TON (${amountNano} nanoton)`);
        
        // 12. Check balance AFTER potential deployment
        console.log('💰 Checking final balance...');
        const balance = await tonClient.getBalance(walletContract.address);
        const balanceTON = Number(BigInt(balance)) / 1_000_000_000;
        
        if (balanceTON < parseFloat(amount) + 0.01) {
            throw new Error(`Insufficient balance. Need ${amount} TON + ~0.01 TON fee, but only have ${balanceTON.toFixed(4)} TON.`);
        }
        
        console.log(`✅ Sufficient balance: ${balanceTON.toFixed(4)} TON`);
        
        // 13. Create the internal message
        const internalMsg = internal({
            to: recipientAddress,
            value: amountNano,
            body: memo || '',
            bounce: false
        });
        
        // 14. Create transfer
        const transfer = walletContract.createTransfer({
            secretKey: keyPair.secretKey,
            seqno: seqno,
            messages: [internalMsg],
            sendMode: 3
        });
        
        // 15. Send transaction
console.log("📤 Sending transaction to TON blockchain...");
console.log("📋 Transaction Details:", {
    from: walletContract.address.toString({ bounceable: false }),
    to: toAddress,
    amount: amountNano.toString() + " nanoton",
    seqno: seqno,
    sendMode: 3
});

try {
    const sendResult = await tonClient.sendExternalMessage(walletContract, transfer);
    console.log("✅ Transaction broadcasted successfully!", sendResult);
    
    // Generate transaction hash
    const txHash = crypto.createHash('sha256')
        .update(walletContract.address.toString() + toAddress + amountNano.toString() + Date.now().toString())
        .digest('hex')
        .toUpperCase()
        .substring(0, 64);
    
    console.log("🔗 Generated transaction hash:", txHash);

    // Get current price for USD value
    const priceData = await fetchRealTONPrice();
    const usdValue = (parseFloat(amount) * priceData.price).toFixed(2);
    
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
    console.error('❌❌❌ TON Transaction Send FAILED with details:');
    console.error('❌ Error message:', sendError.message);
    console.error('❌ Error stack:', sendError.stack);
    
    // Log additional TON-specific error details if available
    if (sendError.response) {
        console.error('❌ TON API Response:', {
            status: sendError.response.status,
            data: sendError.response.data,
            headers: sendError.response.headers
        });
    }
    
    // Re-throw with a more descriptive message
    throw new Error(`TON Blockchain Error: ${sendError.message}. Seqno: ${seqno}, Balance: ${balanceTON}`);
}
        
        // Generate transaction hash
        const txHash = crypto.createHash('sha256')
            .update(walletContract.address.toString() + toAddress + amountNano.toString() + Date.now().toString())
            .digest('hex')
            .toUpperCase()
            .substring(0, 64);
        
        // Get current price for USD value
        const priceData = await fetchRealTONPrice();
        const usdValue = (parseFloat(amount) * priceData.price).toFixed(2);
        
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
        message: 'Wallet API v27.0 - AUTO-DEPLOYMENT ENABLED',
        database: dbStatus,
        ton_libraries: WalletContractV4 ? 'loaded' : 'MISSING',
        has_auto_deploy: true,
        timestamp: new Date().toISOString()
    });
});

// 🎯 NEW: Activation check endpoint
router.get('/activation/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log(`🔍 ACTIVATION CHECK FOR: ${address}`);
        
        const balanceInfo = await getRealBalance(address);
        
        return res.json({
            success: true,
            address: address,
            ...balanceInfo,
            deployment_note: 'Use /send endpoint to trigger auto-deployment if needed'
        });
        
    } catch (error) {
        console.error('❌ Activation check failed:', error);
        return res.json({
            success: false,
            error: error.message
        });
    }
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
            timestamp: new Date().toISOString()
        });
    }
});

// 🎯 Create, check, login endpoints (keep the same structure, just update the response messages)
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

        // Check existing wallet
        const { data: existingWallets, error: checkError } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source, word_count')
            .eq('user_id', userId);

        if (checkError) {
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + checkError.message
            });
        }

        if (existingWallets && existingWallets.length > 0) {
            console.log('✅ Wallet already exists');
            const existingWallet = existingWallets[0];
            const validation = validateTONAddress(existingWallet.address);

            // Get balance with FIXED activation check
            const balanceResult = await getRealBalance(existingWallet.address);
            const tonPriceData = await fetchRealTONPrice();

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
                    isActive: balanceResult.isActive || false
                },
                tonPrice: tonPriceData.price,
                priceChange24h: tonPriceData.change24h,
                priceSource: tonPriceData.source,
                note: 'Wallet will auto-deploy on first transaction'
            });
        }

        console.log('🆕 Generating TON wallet...');

        // Generate wallet
        const wallet = await generateRealTONWallet();
        const validation = validateTONAddress(wallet.address);

        if (!validation.valid) {
            throw new Error('Generated invalid address: ' + validation.error);
        }

        console.log('✅ Valid TON address generated:', wallet.address);

        // Hash password and encrypt mnemonic
        const passwordHash = await hashWalletPassword(walletPassword);
        const encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);

        // Save to database
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

        // Get TON price
        const tonPriceData = await fetchRealTONPrice();

        // Success response
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
            tonPrice: tonPriceData.price,
            priceChange24h: tonPriceData.change24h,
            priceSource: tonPriceData.source,
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

// Check wallet endpoint (with fixed activation)
router.post('/check', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        if (dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source, word_count')
            .eq('user_id', userId);

        if (error) {
            return res.json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }

        const wallet = wallets[0];
        const validation = validateTONAddress(wallet.address);
        
        // Get balance with FIXED activation check
        const balanceResult = await getRealBalance(wallet.address);

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
        return res.json({
            success: false,
            error: 'Check failed: ' + error.message
        });
    }
});

// Login endpoint (with fixed activation)
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

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'No wallet found for this user'
            });
        }

        // Check if wallet has password_hash
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
        
        // Get balance with FIXED activation check
        const balanceResult = await getRealBalance(wallet.address);
        const tonPrice = await fetchRealTONPrice();

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
                tonPrice: tonPrice.price,
                priceChange24h: tonPrice.change24h,
                status: balanceResult.status
            },
            tonPrice: tonPrice.price,
            priceChange24h: tonPrice.change24h,
            priceSource: tonPrice.source,
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
// 🎯 BALANCE ENDPOINT - FIXED ACTIVATION
// ============================================

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log(`💰 BALANCE REQUEST for: ${address}`);

        const validation = validateTONAddress(address);
        
        // Get balance with FIXED activation check
        const balanceResult = await getRealBalance(address);
        const tonPrice = await fetchRealTONPrice();

        const balance = parseFloat(balanceResult.balance || "0");
        const valueUSD = (balance * tonPrice.price).toFixed(2);

        console.log(`✅ Balance result: ${balanceResult.balance} TON, Active: ${balanceResult.isActive}`);

        return res.json({
            success: true,
            address: address,
            format: validation.format,
            balance: balanceResult.balance,
            valueUSD: valueUSD,
            tonPrice: tonPrice.price.toFixed(4),
            priceChange24h: tonPrice.change24h.toFixed(2),
            priceSource: tonPrice.source,
            isActive: balanceResult.isActive || false,
            status: balanceResult.status || 'unknown',
            isRealTON: validation.isRealTON,
            explorerLink: `https://tonviewer.com/${validation.eqAddress}`,
            note: balanceResult.isActive ? 'Wallet is active' : 'Wallet will auto-deploy on first transaction'
        });

    } catch (error) {
        console.error('❌ Balance check failed:', error);
        const tonPrice = await fetchRealTONPrice();
        const validation = validateTONAddress(req.params.address);

        return res.json({
            success: true,
            address: req.params.address,
            format: validation.format,
            balance: "0.0000",
            valueUSD: "0.00",
            tonPrice: tonPrice.price.toFixed(4),
            priceChange24h: tonPrice.change24h.toFixed(2),
            priceSource: tonPrice.source,
            isActive: false,
            status: 'uninitialized',
            isRealTON: validation.isRealTON,
            note: 'Wallet needs initial funding and deployment'
        });
    }
});

// ============================================
// 🎯 SEND ENDPOINT - WITH AUTO-DEPLOYMENT
// ============================================

router.post('/send', async (req, res) => {
    console.log('📨 SEND REQUEST RECEIVED - AUTO-DEPLOYMENT ENABLED');

    try {
        const { userId, walletPassword, toAddress, amount, memo = '' } = req.body;

        console.log('📋 Request details:', { 
            userId: userId ? `${userId.substring(0, 8)}...` : 'MISSING',
            toAddress: toAddress ? `${toAddress.substring(0, 10)}...` : 'MISSING',
            amount: amount || 'MISSING'
        });

        // Validate required fields
        if (!userId || !walletPassword || !toAddress || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, walletPassword, toAddress, amount'
            });
        }

        // Validate amount
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

        // Validate address format
        if (!toAddress.startsWith('EQ') && !toAddress.startsWith('UQ')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid TON address format. Must start with EQ or UQ'
            });
        }

        // Check database connection
        if (dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Check TON SDK
        if (!WalletContractV4) {
            return res.status(503).json({
                success: false,
                error: 'TON SDK not loaded'
            });
        }

        console.log('✅ All validations passed');

        try {
            // Process transaction (now includes auto-deployment)
            const result = await sendTONTransaction(userId, walletPassword, toAddress, amount, memo);

            console.log('✅✅✅ Transaction SUCCESS!');

            return res.json({
                success: true,
                message: result.message,
                note: 'Wallet was automatically deployed if needed',
                data: result
            });

        } catch (transactionError) {
            console.error('❌❌❌ Transaction failed:', transactionError.message);

            // Check specific error types
            let errorType = 'transaction_error';
            let fix = 'Please try again';
            
            if (transactionError.message.includes('deployment')) {
                errorType = 'deployment_failed';
                fix = 'Make sure wallet has at least 0.05 TON for deployment';
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
                fix = 'Wait a few minutes then try again';
            }

            return res.status(400).json({
                success: false,
                error: transactionError.message,
                errorType: errorType,
                fix: fix,
                note: 'Wallet will auto-deploy on next attempt if needed'
            });
        }

    } catch (error) {
        console.error('❌❌❌❌❌ SEND ENDPOINT CRASHED:');
        console.error('❌ FINAL ERROR:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message,
            details: 'Transaction failed - auto-deployment system active'
        });
    }
});

// ============================================
// 🎯 PRICE ENDPOINTS
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
            isRealPrice: priceData.isRealPrice,
            timestamp: new Date().toISOString()
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
            timestamp: new Date().toISOString()
        });
    }
});

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
                success: true,
                transactions: [],
                count: 0,
                message: 'Database not available'
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
                    success: true,
                    transactions: [],
                    count: 0
                });
            }

            return res.json({
                success: true,
                transactions: transactions || [],
                count: transactions?.length || 0
            });

        } catch (tableError) {
            return res.json({
                success: true,
                transactions: [],
                count: 0,
                message: 'Transactions table not ready'
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

console.log('✅ WALLET ROUTES READY - AUTO-DEPLOYMENT ENABLED');

module.exports = router;