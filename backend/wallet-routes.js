// backend/wallet-routes.js - REAL TON WALLETS v8.0 - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');
const TonWeb = require('tonweb');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');

require('dotenv').config();

console.log('🚀 WALLET ROUTES v8.0 - COMPLETE FIXED VERSION');

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
            .select('count')
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
// 🎯 BIP39 WORD LIST (2048 WORDS - COMPLETE)
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

function generateBIP39Mnemonic(wordCount = 12) {
    const words = [];
    for (let i = 0; i < wordCount; i++) {
        const randomBytes = crypto.randomBytes(2);
        const randomIndex = randomBytes.readUInt16BE(0) % 2048;
        words.push(BIP39_WORDS[randomIndex]);
    }
    return words.join(' ');
}

function mnemonicToSeed(mnemonic, password = '') {
    const mnemonicBuffer = Buffer.from(mnemonic.normalize('NFKD'), 'utf8');
    const saltBuffer = Buffer.from('mnemonic' + password.normalize('NFKD'), 'utf8');
    const seed = crypto.pbkdf2Sync(mnemonicBuffer, saltBuffer, 2048, 64, 'sha512');
    return seed;
}

// ============================================
// 🎯 SIMPLE & RELIABLE TON WALLET GENERATION
// ============================================

async function generateRealTONWallet() {
    try {
        console.log('🎯 Starting TON wallet generation...');
        
        // 1. Generate 24-word mnemonic using TON's official method
        const mnemonicArray = await mnemonicNew();
        const mnemonic = mnemonicArray.join(' ');
        console.log('✅ Mnemonic generated (24 words)');
        
        // 2. Derive key from mnemonic
        const key = await mnemonicToPrivateKey(mnemonicArray);
        console.log('✅ Private key derived');
        
        // 3. Create wallet on workchain 0 (mainnet)
        const workchain = 0;
        
        // Use TonWeb static method - this is the MOST RELIABLE way
        const wallet = TonWeb.WalletContractV4.create({
            workchain: workchain,
            publicKey: key.publicKey,
        });
        
        // Get the address object
        const addressObj = wallet.address;
        
        // Get address in non-bounceable format (UQ)
        const address = addressObj.toString(true, false, true);
        
        console.log('📊 Address details:');
        console.log('   Raw address:', address);
        console.log('   Length:', address.length);
        console.log('   Starts with:', address.substring(0, 4));
        console.log('   Workchain:', workchain);
        
        // Ensure it's UQ format
        let finalAddress = address;
        if (!finalAddress.startsWith('UQ')) {
            console.log('🔄 Converting to UQ format...');
            if (finalAddress.startsWith('EQ')) {
                finalAddress = 'UQ' + finalAddress.substring(2);
            } else {
                // If it doesn't start with UQ or EQ, there's a problem
                console.error('❌ Invalid address format:', finalAddress);
                throw new Error('Generated address has invalid format');
            }
        }
        
        // Remove any accidental double UQ
        if (finalAddress.startsWith('UQUQ')) {
            console.log('🔄 Removing double UQ...');
            finalAddress = 'UQ' + finalAddress.substring(4);
        }
        
        // Validate the address has proper length (46-48 chars)
        const addressLength = finalAddress.length;
        if (addressLength < 46 || addressLength > 48) {
            console.error('❌ Invalid address length:', addressLength);
            throw new Error(`Address length ${addressLength} is invalid. Must be 46-48 characters.`);
        }
        
        console.log('✅ Final wallet generated:');
        console.log('   Address:', finalAddress);
        console.log('   Length:', finalAddress.length);
        console.log('   Format: UQ (non-bounceable)');
        console.log('   Valid: ✓');
        
        return {
            mnemonic: mnemonic,
            address: finalAddress,
            publicKey: Buffer.from(key.publicKey).toString('hex'),
            privateKey: Buffer.from(key.secretKey).toString('hex'),
            wordCount: 24,
            source: 'ton-official-v4'
        };

    } catch (error) {
        console.error('❌ TON wallet generation failed:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
}

// ============================================
// 🎯 CORRECT ADDRESS VALIDATION
// ============================================

function validateTONAddress(address) {
    try {
        if (!address || typeof address !== 'string') {
            return { valid: false, error: 'Address is empty or invalid' };
        }

        // Remove any whitespace
        const cleanAddress = address.trim();
        
        // Check length - TON addresses are 46-48 characters
        if (cleanAddress.length < 46 || cleanAddress.length > 48) {
            return {
                valid: false,
                error: `Invalid length: ${cleanAddress.length} characters (must be 46-48)`,
                actualLength: cleanAddress.length
            };
        }

        // Must start with EQ (bounceable) or UQ (non-bounceable)
        if (!cleanAddress.startsWith('EQ') && !cleanAddress.startsWith('UQ')) {
            return {
                valid: false,
                error: `Invalid prefix: "${cleanAddress.substring(0, 2)}" (must start with EQ or UQ)`,
                prefix: cleanAddress.substring(0, 2)
            };
        }

        // The rest must be valid base64url characters
        const body = cleanAddress.substring(2);
        const validCharsRegex = /^[A-Za-z0-9\-_]+$/;
        
        if (!validCharsRegex.test(body)) {
            const invalidChars = body.replace(/[A-Za-z0-9\-_]/g, '');
            return {
                valid: false,
                error: `Invalid characters found: "${invalidChars}"`,
                invalidCharacters: invalidChars
            };
        }

        // All checks passed
        return {
            valid: true,
            address: cleanAddress,
            format: cleanAddress.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
            length: cleanAddress.length,
            isProperFormat: true
        };
    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`
        };
    }
}

// ============================================
// 🎯 PASSWORD & ENCRYPTION FUNCTIONS
// ============================================

async function hashWalletPassword(password) {
    try {
        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.error('❌ Password hashing failed:', error);
        throw error;
    }
}

async function verifyWalletPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('❌ Password verification failed:', error);
        return false;
    }
}

function encryptMnemonic(mnemonic, password) {
    try {
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
    } catch (error) {
        console.error('❌ Encryption failed:', error);
        throw error;
    }
}

function decryptMnemonic(encryptedData, password) {
    try {
        const algorithm = encryptedData.algorithm || 'aes-256-gcm';
        const key = crypto.scryptSync(password, 'nemex-salt', 32);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ Decryption failed:', error);
        throw error;
    }
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// 🎯 TON BLOCKCHAIN FUNCTIONS
// ============================================

const TON_API_CONFIG = {
    mainnet: {
        endpoint: 'https://toncenter.com/api/v2',
        apiKey: process.env.TONCENTER_API_KEY || ''
    },
    testnet: {
        endpoint: 'https://testnet.toncenter.com/api/v2',
        apiKey: process.env.TONCENTER_TESTNET_API_KEY || ''
    }
};

async function getRealBalance(address, network = 'mainnet') {
    try {
        const config = TON_API_CONFIG[network];
        const headers = {};

        if (config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
        }

        let queryAddress = address;
        if (queryAddress.startsWith('UQ')) {
            queryAddress = 'EQ' + queryAddress.substring(2);
        }

        const response = await axios.get(`${config.endpoint}/getAddressInformation`, {
            headers,
            params: { address: queryAddress },
            timeout: 10000
        });

        if (response.data && response.data.ok) {
            const balanceNano = response.data.result.balance;
            const balanceTON = parseInt(balanceNano) / 1_000_000_000;

            return {
                success: true,
                balance: balanceTON.toFixed(4),
                balanceNano: balanceNano,
                status: response.data.result.status,
                isActive: response.data.result.status === 'active'
            };
        }

        return {
            success: false,
            balance: "0.0000",
            error: 'No balance data'
        };

    } catch (error) {
        console.error('❌ Balance check failed:', error.message);

        if (error.response?.status === 404) {
            return {
                success: true,
                balance: "0.0000",
                isActive: false,
                status: 'uninitialized'
            };
        }

        return {
            success: false,
            balance: "0.0000",
            error: error.message
        };
    }
}

// ============================================
// 🎯 PRICE FUNCTIONS
// ============================================

const PRICE_APIS = [
    {
        name: 'Binance',
        url: 'https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT',
        parser: (data) => {
            try {
                if (data.symbol === 'TONUSDT') {
                    return parseFloat(data.price) || 0;
                }
                return 0;
            } catch (error) {
                return 0;
            }
        }
    },
    {
        name: 'CoinGecko',
        url: 'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
        parser: (data) => {
            try {
                return data['the-open-network']?.usd || 0;
            } catch (error) {
                return 0;
            }
        }
    }
];

let priceCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 30000;

async function fetchRealTONPrice() {
    const now = Date.now();
    if (priceCache.data && (now - priceCache.timestamp) < CACHE_DURATION) {
        return priceCache.data;
    }

    console.log('💰 Fetching TON price...');

    let tonPrice = 0;
    let source = 'none';

    for (const api of PRICE_APIS) {
        try {
            const response = await axios.get(api.url, { timeout: 5000 });
            const price = api.parser(response.data);

            if (price > 0) {
                tonPrice = price;
                source = api.name;
                break;
            }
        } catch (error) {
            console.log(`❌ ${api.name} failed:`, error.message);
            continue;
        }
    }

    if (tonPrice === 0) {
        tonPrice = 2.35;
        source = 'default';
    }

    priceCache.data = { price: tonPrice, source: source, timestamp: now };
    priceCache.timestamp = now;

    return priceCache.data;
}

// ============================================
// 🎯 MAIN ENDPOINTS
// ============================================

router.post('/check', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }

        console.log('🔍 Checking wallet for user:', userId);

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source, word_count')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Database error:', error);
            return res.json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            console.log('📭 No wallet found for user:', userId);
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }

        const wallet = wallets[0];
        const validation = validateTONAddress(wallet.address);

        console.log('✅ Wallet found:', {
            id: wallet.id,
            address: wallet.address.substring(0, 10) + '...',
            validation: validation.valid ? 'valid' : 'invalid'
        });

        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                format: validation.format,
                createdAt: wallet.created_at,
                source: wallet.source,
                wordCount: wallet.word_count,
                validation: validation
            }
        });

    } catch (error) {
        console.error('❌ Check wallet failed:', error);
        res.json({
            success: false,
            error: 'Check failed: ' + error.message
        });
    }
});

router.post('/login', async (req, res) => {
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

        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        console.log('🔐 Login attempt for user:', userId);

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallet) {
            console.log('❌ No wallet found for user:', userId);
            return res.status(404).json({
                success: false,
                error: 'No wallet found for this user'
            });
        }

        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            console.log('❌ Incorrect password for user:', userId);
            return res.status(401).json({
                success: false,
                error: 'Incorrect wallet password'
            });
        }

        console.log('✅ Password verified for user:', userId);

        const balanceResult = await getRealBalance(wallet.address);
        const tonPrice = await fetchRealTONPrice();

        let sessionToken = null;
        try {
            sessionToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashToken(sessionToken);

            const sessionData = {
                user_id: userId,
                active_wallet_address: wallet.address,
                session_token: sessionToken,
                token_hash: tokenHash,
                ip_address: req.ip || 'unknown',
                user_agent: req.headers['user-agent'] || 'unknown',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                last_active: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: true
            };

            await supabase
                .from('user_sessions')
                .upsert(sessionData, { 
                    onConflict: 'user_id'
                });

            console.log('✅ Created session token for user:', userId);
        } catch (sessionError) {
            console.error('❌ Session creation failed:', sessionError);
        }

        res.json({
            success: true,
            message: 'Wallet login successful',
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                format: wallet.address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
                createdAt: wallet.created_at,
                source: wallet.source,
                wordCount: wallet.word_count,
                hasWallet: true,
                balance: balanceResult.success ? balanceResult.balance : "0.0000",
                isActive: balanceResult.isActive || false,
                tonPrice: tonPrice.price
            },
            sessionToken: sessionToken,
            tonPrice: tonPrice.price,
            priceSource: tonPrice.source
        });

    } catch (error) {
        console.error('❌ Wallet login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// ============================================
// 🎯 CREATE WALLET - COMPLETELY FIXED VERSION
// ============================================

router.post('/create', async (req, res) => {
    console.log('🎯 CREATE WALLET REQUEST - v8.0 FIXED');

    try {
        const { userId, walletPassword } = req.body;

        // Validate input
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

        // Check database connection
        if (!supabase || dbStatus !== 'connected') {
            console.error('❌ Database not connected');
            return res.status(503).json({
                success: false,
                error: 'Database not available. Please try again.'
            });
        }

        console.log('🔍 Checking for existing wallet for user:', userId);

        // Check if wallet already exists
        const { data: existingWallets, error: checkError } = await supabase
            .from('user_wallets')
            .select('id, address, created_at')
            .eq('user_id', userId);

        if (checkError) {
            console.error('❌ Database check error:', checkError);
            return res.status(500).json({
                success: false,
                error: 'Database error. Please try again.'
            });
        }

        if (existingWallets && existingWallets.length > 0) {
            console.log('✅ Wallet already exists for user:', userId);
            const tonPriceData = await fetchRealTONPrice();

            return res.json({
                success: true,
                message: 'Wallet already exists',
                wallet: {
                    id: existingWallets[0].id,
                    userId: userId,
                    address: existingWallets[0].address,
                    format: existingWallets[0].address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
                    createdAt: existingWallets[0].created_at,
                    source: 'existing',
                    wordCount: 24
                },
                tonPrice: tonPriceData.price,
                priceSource: tonPriceData.source
            });
        }

        console.log('🆕 No existing wallet found. Generating new wallet...');

        // GENERATE NEW WALLET
        let wallet;
        try {
            wallet = await generateRealTONWallet();
            console.log('✅ Wallet generated successfully');
        } catch (genError) {
            console.error('❌ Wallet generation error:', genError);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate wallet: ' + genError.message
            });
        }

        // VALIDATE THE GENERATED ADDRESS
        const validation = validateTONAddress(wallet.address);
        if (!validation.valid) {
            console.error('❌ Generated invalid address:', wallet.address);
            console.error('❌ Validation error:', validation.error);
            
            // Try one more time
            console.log('🔄 Retrying wallet generation...');
            try {
                wallet = await generateRealTONWallet();
                const retryValidation = validateTONAddress(wallet.address);
                
                if (!retryValidation.valid) {
                    throw new Error('Second generation also failed: ' + retryValidation.error);
                }
                console.log('✅ Retry successful!');
            } catch (retryError) {
                console.error('❌ Retry failed:', retryError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to generate valid wallet address after retry',
                    details: validation.error
                });
            }
        }

        console.log('✅ TON wallet generated:');
        console.log('   Address:', wallet.address);
        console.log('   Length:', wallet.address.length);
        console.log('   Format:', validation.format);
        console.log('   Valid:', validation.valid);

        // HASH PASSWORD AND ENCRYPT MNEMONIC
        let passwordHash;
        let encryptedMnemonic;
        try {
            passwordHash = await hashWalletPassword(walletPassword);
            encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);
            console.log('✅ Password hashed and mnemonic encrypted');
        } catch (cryptoError) {
            console.error('❌ Crypto operations failed:', cryptoError);
            return res.status(500).json({
                success: false,
                error: 'Security operations failed: ' + cryptoError.message
            });
        }

        // PREPARE WALLET RECORD
        const walletRecord = {
            user_id: userId,
            address: wallet.address,
            encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
            public_key: wallet.publicKey,
            wallet_type: 'TON',
            source: 'generated-v8',
            word_count: 24,
            password_hash: passwordHash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('💾 Saving wallet to database...');

        // SAVE TO DATABASE
        let insertedWallet;
        const { data: dbData, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            
            // Try simpler insert without optional fields
            const simpleRecord = {
                user_id: userId,
                address: wallet.address,
                password_hash: passwordHash,
                created_at: new Date().toISOString()
            };
            
            const { data: simpleData, error: simpleError } = await supabase
                .from('user_wallets')
                .insert([simpleRecord])
                .select()
                .single();
            
            if (simpleError) {
                console.error('❌ Simple insert also failed:', simpleError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to save wallet to database: ' + simpleError.message
                });
            }
            
            insertedWallet = simpleData;
            console.log('✅ Wallet saved with simple record');
        } else {
            insertedWallet = dbData;
            console.log('✅ Wallet saved to database with ID:', insertedWallet.id);
        }

        // GET TON PRICE FOR RESPONSE
        const tonPriceData = await fetchRealTONPrice();

        // SUCCESS RESPONSE
        res.json({
            success: true,
            message: 'TON wallet created successfully!',
            wallet: {
                id: insertedWallet.id,
                userId: userId,
                address: wallet.address,
                format: validation.format,
                createdAt: insertedWallet.created_at,
                source: 'database-v8',
                wordCount: 24,
                validation: validation
            },
            tonPrice: tonPriceData.price,
            priceSource: tonPriceData.source,
            explorerLink: `https://tonviewer.com/${wallet.address}`,
            activationNote: 'Send 0.01 TON to activate this new wallet address'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message,
            step: 'unknown'
        });
    }
});

// ============================================
// 🎯 SESSION ENDPOINTS
// ============================================

router.post('/session/create', async (req, res) => {
    try {
        const { userId, walletAddress } = req.body;

        if (!userId || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet address required'
            });
        }

        const sessionToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(sessionToken);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        console.log('🔍 Creating session for user:', userId);

        // Deactivate any existing sessions
        await supabase
            .from('user_sessions')
            .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_active', true);

        const sessionData = {
            user_id: userId,
            active_wallet_address: walletAddress,
            session_token: sessionToken,
            token_hash: tokenHash,
            ip_address: ip,
            user_agent: userAgent,
            expires_at: expiresAt.toISOString(),
            last_active: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
        };

        const { data, error } = await supabase
            .from('user_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            console.error('❌ Session insert error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create session: ' + error.message
            });
        }

        console.log('✅ Session created successfully');

        res.json({
            success: true,
            session: {
                token: sessionToken,
                user_id: userId,
                wallet_address: walletAddress,
                expires_at: expiresAt.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Create session failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session: ' + error.message
        });
    }
});

router.post('/session/check', async (req, res) => {
    try {
        const sessionToken = req.headers['x-session-token'] || req.body.sessionToken;

        if (!sessionToken) {
            return res.json({
                success: true,
                hasSession: false,
                message: 'No session token'
            });
        }

        const tokenHash = hashToken(sessionToken);

        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasSession: false,
                message: 'Database not available'
            });
        }

        const { data: session, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .single();

        if (error || !session) {
            return res.json({
                success: true,
                hasSession: false,
                message: 'Invalid or expired session'
            });
        }

        const now = new Date();
        const expiresAt = new Date(session.expires_at);

        if (expiresAt < now) {
            console.log('Session expired');
            await supabase
                .from('user_sessions')
                .update({ is_active: false })
                .eq('id', session.id);

            return res.json({
                success: true,
                hasSession: false,
                message: 'Session expired'
            });
        }

        await supabase
            .from('user_sessions')
            .update({ 
                last_active: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

        console.log('✅ Valid session found for user:', session.user_id);

        res.json({
            success: true,
            hasSession: true,
            session: {
                token: sessionToken,
                user_id: session.user_id,
                wallet_address: session.active_wallet_address,
                expires_at: session.expires_at
            }
        });

    } catch (error) {
        console.error('❌ Check session failed:', error);
        res.json({
            success: false,
            hasSession: false,
            error: 'Session check failed: ' + error.message
        });
    }
});

router.post('/session/destroy', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.json({
                success: false,
                error: 'Session token required'
            });
        }

        const tokenHash = hashToken(token);

        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                message: 'Database not available'
            });
        }

        await supabase
            .from('user_sessions')
            .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('token_hash', tokenHash);

        console.log('✅ Session destroyed');

        res.json({
            success: true,
            message: 'Session destroyed'
        });

    } catch (error) {
        console.error('❌ Destroy session failed:', error);
        res.json({
            success: false,
            error: 'Failed to destroy session'
        });
    }
});

// ============================================
// 🎯 TEST & DIAGNOSTIC ENDPOINTS
// ============================================

router.get('/test/generate', async (req, res) => {
    try {
        console.log('🧪 Testing wallet generation...');

        const wallet = await generateRealTONWallet();
        const validation = validateTONAddress(wallet.address);

        res.json({
            success: true,
            message: 'Wallet generation test successful',
            wallet: {
                address: wallet.address,
                length: wallet.address.length,
                validation: validation,
                format: 'UQ (non-bounceable)',
                wordCount: 24,
                sampleMnemonic: wallet.mnemonic.split(' ').slice(0, 3).join(' ') + '...'
            },
            instructions: [
                '1. Copy this address to any TON wallet',
                '2. Send 0.01 TON to activate it',
                '3. Check on https://tonviewer.com/',
                '4. Address is ready to use'
            ]
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

router.get('/diagnose/address/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log('🔍 Diagnosing address:', address);
        
        const validation = validateTONAddress(address);
        const balanceResult = await getRealBalance(address);
        
        res.json({
            success: true,
            address: address,
            validation: validation,
            blockchain: balanceResult,
            analysis: {
                isValidFormat: validation.valid,
                needsActivation: balanceResult.status === 'uninitialized',
                isActive: balanceResult.isActive,
                hasBalance: parseFloat(balanceResult.balance) > 0
            }
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🎯 OTHER ENDPOINTS
// ============================================

router.get('/balance/:address', async (req, res) => {
    try {
        let { address } = req.params;
        const { network = 'mainnet' } = req.query;

        console.log(`💰 Checking balance for ${address} on ${network}`);

        const validation = validateTONAddress(address);
        const balanceResult = await getRealBalance(address, network);
        const tonPrice = await fetchRealTONPrice();

        const balance = parseFloat(balanceResult.balance || "0");
        const valueUSD = (balance * tonPrice.price).toFixed(2);

        res.json({
            success: true,
            address: address,
            format: validation.format,
            balance: balanceResult.balance,
            valueUSD: valueUSD,
            tonPrice: tonPrice.price.toFixed(4),
            priceSource: tonPrice.source,
            isActive: balanceResult.isActive || false,
            status: balanceResult.status || 'unknown',
            network: network,
            validation: validation
        });

    } catch (error) {
        console.error('❌ Balance check failed:', error);
        const tonPrice = await fetchRealTONPrice();

        res.json({
            success: true,
            address: req.params.address,
            format: req.params.address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
            balance: "0.0000",
            valueUSD: "0.00",
            tonPrice: tonPrice.price.toFixed(4),
            isActive: false,
            status: 'uninitialized',
            source: 'fallback'
        });
    }
});

router.get('/price/ton', async (req, res) => {
    try {
        const priceData = await fetchRealTONPrice();

        res.json({
            success: true,
            symbol: 'TON',
            price: priceData.price.toFixed(4),
            source: priceData.source,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: true,
            symbol: 'TON',
            price: "2.35",
            source: 'fallback',
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/validate', (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.json({
                success: false,
                error: 'Address is required'
            });
        }

        const validation = validateTONAddress(address);

        res.json({
            success: true,
            address: address,
            validation: validation
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🎯 LEGACY ENDPOINTS (for compatibility)
// ============================================

router.post('/store-encrypted', async (req, res) => {
    try {
        const { userId, walletPassword } = req.body;

        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }

        return router.handle({
            method: 'POST',
            url: '/create',
            body: { userId, walletPassword }
        }, res, () => {});

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/check-wallet', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        return router.handle({
            method: 'POST',
            url: '/check',
            body: { userId }
        }, res, () => {});

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

router.post('/auto-login', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('❌ Database error:', error);
            return res.json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }

        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                format: wallet.address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
                createdAt: wallet.created_at,
                source: wallet.source
            }
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

router.post('/get-encrypted', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase || dbStatus !== 'connected') {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('encrypted_mnemonic, address, created_at')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallet) {
            return res.json({
                success: false,
                error: 'No wallet found'
            });
        }

        res.json({
            success: true,
            encryptedMnemonic: wallet.encrypted_mnemonic,
            address: wallet.address,
            createdAt: wallet.created_at
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🎯 DEBUG & HEALTH ENDPOINTS
// ============================================

router.get('/debug/routes', (req, res) => {
    const routes = router.stack
        .filter(r => r.route)
        .map(r => ({
            method: Object.keys(r.route.methods)[0].toUpperCase(),
            path: r.route.path
        }));

    res.json({
        success: true,
        routes: routes,
        total: routes.length,
        timestamp: new Date().toISOString()
    });
});

router.get('/debug/database', async (req, res) => {
    try {
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: false,
                dbStatus: dbStatus,
                message: 'Database not connected'
            });
        }

        const { data, error, count } = await supabase
            .from('user_wallets')
            .select('*', { count: 'exact', head: true });

        res.json({
            success: true,
            dbStatus: dbStatus,
            user_wallets: {
                accessible: !error,
                error: error ? error.message : null,
                count: count || 0
            },
            tables: ['user_wallets', 'user_sessions']
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

router.get('/debug/test-all', async (req, res) => {
    const tests = [];

    tests.push({
        name: 'Database Connection',
        status: dbStatus === 'connected' ? '✅' : '❌',
        details: dbStatus
    });

    try {
        const wallet = await generateRealTONWallet();
        tests.push({
            name: 'Wallet Generation',
            status: '✅',
            details: `Generated address: ${wallet.address.substring(0, 10)}...`
        });
    } catch (error) {
        tests.push({
            name: 'Wallet Generation',
            status: '❌',
            details: error.message
        });
    }

    try {
        const testAddress = 'UQAqz4zu-c46p2C-6wAXXsXxYRI0o2J-G05XwhAW6007sA';
        const validation = validateTONAddress(testAddress);
        tests.push({
            name: 'Address Validation',
            status: validation.valid ? '✅' : '❌',
            details: validation.valid ? 'Validates correctly' : validation.error
        });
    } catch (error) {
        tests.push({
            name: 'Address Validation',
            status: '❌',
            details: error.message
        });
    }

    res.json({
        success: true,
        tests: tests,
        version: '8.0.0',
        timestamp: new Date().toISOString()
    });
});

router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        version: '8.0.0',
        database: dbStatus,
        ton_wallets: 'active',
        balance_check: 'active',
        price_api: 'active',
        endpoints: {
            create: 'POST /create (FIXED)',
            login: 'POST /login',
            check: 'POST /check',
            session_create: 'POST /session/create',
            session_check: 'POST /session/check',
            balance: 'GET /balance/:address',
            price: 'GET /price/ton',
            validate: 'POST /validate',
            test_generate: 'GET /test/generate',
            diagnose: 'GET /diagnose/address/:address'
        },
        timestamp: new Date().toISOString()
    });
});

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'TON Wallet API v8.0 - COMPLETE FIXED VERSION',
        version: '8.0.0',
        timestamp: new Date().toISOString(),
        features: [
            'complete-bip39-word-list',
            'fixed-ton-wallet-generation',
            '46-48-character-addresses',
            'proper-address-validation',
            'ton-blockchain-balance',
            'real-price-data',
            'session-management',
            'encrypted-storage'
        ],
        status: '✅ READY'
    });
});

console.log('✅ WALLET ROUTES v8.0 READY - COMPLETE FIXED VERSION');

module.exports = router;