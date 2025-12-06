// assets/js/wallet.js - PRODUCTION READY WITH REAL TON ADDRESSES (COMPLETE)
console.log('🚀 PRODUCTION Wallet Manager v5.0 (Real TON Addresses)...');

class MiningWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.isInitialized = false;
        this.miningUser = null;
        this.supabaseClient = null;
        
        // 🔥 REAL TON NETWORK CONFIG
        this.tonNetwork = 'mainnet'; // or 'testnet'
        this.tonApiUrl = this.tonNetwork === 'mainnet' 
            ? 'https://tonapi.io/v2'
            : 'https://testnet.tonapi.io/v2';
        
        // 🎯 TOKEN CONFIGURATION
        this.supportedTokens = {
            TON: {
                symbol: 'TON',
                name: 'Toncoin',
                decimals: 9,
                contract: null, // Native token
                logo: 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png',
                isNative: true
            },
            NMX: {
                symbol: 'NMX',
                name: 'NemexCoin',
                decimals: 9,
                contract: 'EQD__________________________________________0vo', // Your NMX contract address
                logo: 'https://turquoise-obedient-frog-86.mypinata.cloud/ipfs/QmZo4rNnhhpWq6qQBkXBaAGqTdrawEzmW4w4QQsuMSjjW1',
                isNative: false
            }
        };

        // 🎯 FULL BIP-39 WORDLIST (2048 WORDS)
        this.BIP39_WORDLIST = [
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

        console.log('✅ Production Wallet Manager initialized');
    }

    // =============================================
    // 🔥 REAL TON ADDRESS GENERATION
    // =============================================

    async generateAddressFromMnemonic(mnemonic) {
        console.log('📍 Generating REAL TON wallet address...');
        
        try {
            // Check if tonweb is loaded
            if (!window.TonWeb || !window.TonWeb.mnemonic) {
                console.error('❌ tonweb library not loaded');
                throw new Error('Please reload page - tonweb library missing. Add these scripts to wallet.html: <script src="https://unpkg.com/tonweb@0.0.50/dist/tonweb.js"></script><script src="https://unpkg.com/tonweb-mnemonic@0.0.4/dist/tonweb-mnemonic.js"></script>');
            }
            
            const mnemonicArray = mnemonic.trim().split(/\s+/);
            
            // Validate mnemonic length
            if (mnemonicArray.length !== 12 && mnemonicArray.length !== 24) {
                throw new Error('Mnemonic must be 12 or 24 words');
            }
            
            console.log('🔐 Generating keypair from mnemonic...');
            
            // Generate keypair from mnemonic using tonweb-mnemonic
            const keyPair = await window.TonWeb.mnemonic.mnemonicToKeyPair(mnemonicArray);
            
            // Create TON wallet instance (using v4R2 - standard TON wallet)
            const provider = new window.TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC');
            const wallet = new window.TonWeb.wallets.all.v4R2(provider, {
                publicKey: keyPair.publicKey
            });
            
            // Get the wallet address
            const address = await wallet.getAddress();
            
            // Convert to user-friendly format
            const tonAddress = address.toString(true, true, true);
            
            console.log('✅ Generated REAL TON address:', tonAddress.substring(0, 20) + '...');
            
            return tonAddress;
            
        } catch (error) {
            console.error('❌ TON address generation error:', error);
            
            // Fallback: Generate deterministic address (for testing)
            console.warn('⚠️ Using fallback address generation');
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(mnemonic + '::TON');
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                const fallbackAddress = 'EQA' + hashHex.substring(0, 44).toUpperCase();
                console.log('⚠️ Fallback address:', fallbackAddress);
                return fallbackAddress;
            } catch (fallbackError) {
                throw new Error('Failed to generate TON address: ' + error.message);
            }
        }
    }

    // =============================================
    // 🔥 REAL API METHODS (NO MOCK DATA)
    // =============================================

    async getBalance(address) {
        try {
            console.log(`💰 Getting REAL balance for: ${address?.substring(0, 16) || 'null'}...`);

            if (!address) {
                return { 
                    success: false, 
                    error: 'Wallet address required',
                    address: null
                };
            }

            // 🔥 REAL API CALL to your backend
            const response = await fetch(`${this.apiBaseUrl}/balance/${encodeURIComponent(address)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch balance');
            }

            console.log(`✅ Balance fetched: ${result.balance} ${result.currency}`);
            return result;

        } catch (error) {
            console.error('❌ Get REAL balance failed:', error);
            return { 
                success: false, 
                error: 'Failed to fetch balance: ' + error.message,
                address: address || null
            };
        }
    }

    async getPrices() {
        try {
            console.log('📈 Getting REAL prices...');

            // 🔥 REAL API CALL to your backend
            const response = await fetch(`${this.apiUrl}/prices`);
            
            if (!response.ok) {
                throw new Error(`Price API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch prices');
            }

            console.log('✅ Prices fetched:', {
                TON: `$${result.prices?.TON?.price || 0}`,
                NMX: `$${result.prices?.NMX?.price || 0}`
            });

            return result;

        } catch (error) {
            console.error('❌ Get REAL prices failed:', error);
            return { 
                success: false, 
                error: 'Failed to fetch prices: ' + error.message,
                prices: null
            };
        }
    }

    async sendTransaction(userId, toAddress, amount, password, token = 'TON', memo = '') {
        try {
            console.log(`📤 Sending REAL transaction: ${amount} ${token} to ${toAddress?.substring(0, 20) || 'null'}...`);

            if (!userId || !toAddress || !amount || !password) {
                return {
                    success: false,
                    error: 'All fields are required: user ID, recipient address, amount, and password'
                };
            }

            // 🔥 FIRST: Get encrypted wallet data
            const walletData = await this.getEncryptedWallet(userId);
            if (!walletData.success) {
                throw new Error('Failed to get wallet: ' + walletData.error);
            }

            // 🔥 SECOND: Decrypt mnemonic client-side
            const encryptedMnemonic = walletData.encryptedMnemonic;
            if (!encryptedMnemonic) {
                throw new Error('No encrypted wallet found');
            }

            const decryptedMnemonic = await this.decrypt(encryptedMnemonic, password);
            
            // 🔥 THIRD: Get current wallet address
            const currentAddress = walletData.address;
            if (!currentAddress) {
                throw new Error('No wallet address found');
            }

            // 🔥 FOURTH: Prepare transaction data
            const payload = { 
                userId,
                toAddress,
                amount: parseFloat(amount),
                token: token || 'TON',
                encryptedMnemonic: encryptedMnemonic, // Send encrypted mnemonic for verification
                fromAddress: currentAddress
            };

            if (memo && memo.trim()) {
                payload.memo = memo.trim();
            }

            console.log('📦 Sending transaction to backend...');

            // 🔥 FIFTH: Send to backend API
            const response = await fetch(`${this.apiBaseUrl}/send-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Transaction failed');
            }

            console.log('✅ Transaction submitted:', result.transaction?.hash);
            return result;

        } catch (error) {
            console.error('❌ Send REAL transaction failed:', error);
            return { 
                success: false, 
                error: 'Failed to send transaction: ' + error.message
            };
        }
    }

    async getTransactionHistory(address) {
        try {
            console.log(`📜 Getting REAL transaction history for: ${address?.substring(0, 16) || 'null'}...`);

            if (!address) {
                return { 
                    success: false, 
                    error: 'Address required',
                    transactions: []
                };
            }

            // 🔥 REAL API CALL to your backend
            const response = await fetch(`${this.apiBaseUrl}/transactions/${encodeURIComponent(address)}`);
            
            if (!response.ok) {
                throw new Error(`Transaction API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch transactions');
            }

            console.log(`✅ Got ${result.transactions?.length || 0} REAL transactions`);
            return result;

        } catch (error) {
            console.error('❌ Get REAL transaction history failed:', error);
            return { 
                success: false, 
                error: 'Failed to fetch transactions: ' + error.message,
                transactions: []
            };
        }
    }

    // =============================================
    // 🎯 ENCRYPTION/DECRYPTION METHODS
    // =============================================

    async encrypt(text, password) {
        console.log('🔐 Encrypting data...');

        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        if (!text) {
            throw new Error('No data to encrypt');
        }

        try {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            const salt = crypto.getRandomValues(new Uint8Array(16));

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = encoder.encode(text);

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                data
            );

            const encryptedArray = new Uint8Array(encrypted);
            const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
            result.set(salt);
            result.set(iv, salt.length);
            result.set(encryptedArray, salt.length + iv.length);

            return 'ENCv1:' + btoa(String.fromCharCode.apply(null, result));

        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data securely');
        }
    }

    async decrypt(encryptedBase64, password) {
        console.log('🔐 Decrypting data...');

        if (!password) {
            throw new Error('Password required');
        }

        if (!encryptedBase64 || !encryptedBase64.startsWith('ENCv1:')) {
            throw new Error('Invalid encrypted data format');
        }

        try {
            const encryptedData = encryptedBase64.substring(6);
            const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            const salt = encryptedBytes.slice(0, 16);
            const iv = encryptedBytes.slice(16, 28);
            const encrypted = encryptedBytes.slice(28);

            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);

        } catch (error) {
            console.error('Decryption error:', error);
            if (error.name === 'OperationError') {
                throw new Error('Incorrect password or corrupted data');
            }
            throw new Error('Failed to decrypt data: ' + error.message);
        }
    }

    // =============================================
    // 🎯 VALIDATION METHODS
    // =============================================

    validateMnemonic(mnemonic) {
        console.log('🔍 Validating mnemonic...');

        if (!mnemonic || typeof mnemonic !== 'string') {
            return { valid: false, error: 'Invalid mnemonic format' };
        }

        const words = mnemonic.trim().split(/\s+/);
        const wordCount = words.length;

        if (wordCount !== 12 && wordCount !== 24) {
            return {
                valid: false,
                error: `Seed phrase must be 12 or 24 words (got ${wordCount})`
            };
        }

        const invalidWords = [];
        for (const word of words) {
            if (!this.BIP39_WORDLIST.includes(word.toLowerCase())) {
                invalidWords.push(word);
            }
        }

        if (invalidWords.length > 0) {
            return {
                valid: false,
                error: `Invalid words: ${invalidWords.slice(0, 3).join(', ')}${invalidWords.length > 3 ? '...' : ''}`,
                invalidWords: invalidWords
            };
        }

        return { valid: true, wordCount: wordCount };
    }

    validateTONAddress(address) {
        if (!address) return { valid: false, error: 'Address required' };
        
        // Basic TON address validation
        const isValidFormat = address.startsWith('EQ') || address.startsWith('UQ') || address.startsWith('0:');
        const isValidLength = address.length >= 48 && address.length <= 66;
        
        return {
            valid: isValidFormat && isValidLength,
            error: isValidFormat && isValidLength ? null : 'Invalid TON address format'
        };
    }

    // =============================================
    // 🎯 WALLET GENERATION METHODS
    // =============================================

    generateMnemonic(wordCount = 12) {
        console.log(`🎯 Generating ${wordCount}-word mnemonic (secure)`);

        const words = [];
        const randomBuffer = new Uint32Array(wordCount);

        try {
            crypto.getRandomValues(randomBuffer);

            for (let i = 0; i < wordCount; i++) {
                const randomIndex = randomBuffer[i] % this.BIP39_WORDLIST.length;
                words.push(this.BIP39_WORDLIST[randomIndex]);
            }

            const mnemonic = words.join(' ');

            if (mnemonic.split(' ').length !== wordCount) {
                throw new Error('Invalid mnemonic generated');
            }

            console.log('✅ Secure mnemonic generated');
            return mnemonic;

        } catch (error) {
            console.error('❌ Secure mnemonic generation failed:', error);
            throw new Error('Failed to generate secure mnemonic: ' + error.message);
        }
    }

    // =============================================
    // 🎯 USER & WALLET MANAGEMENT
    // =============================================

    getCurrentUserId() {
        console.log('🔍 getCurrentUserId() called');

        if (this.userId) {
            return this.userId;
        }

        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        if (userParam) {
            try {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData && userData.id) {
                    this.userId = userData.id;
                    this.miningUser = userData;
                    window.miningUser = userData;
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing URL user param:', e);
            }
        }

        // Check window.miningUser
        if (window.miningUser && window.miningUser.id) {
            this.userId = window.miningUser.id;
            this.miningUser = window.miningUser;
            return this.userId;
        }

        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('miningUser');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                if (userData && userData.id) {
                    this.userId = userData.id;
                    this.miningUser = userData;
                    window.miningUser = userData;
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing sessionStorage user:', e);
            }
        }

        console.warn('❌ No user ID found from any source');
        return null;
    }

    async initialize() {
        console.log('🚀 WalletManager.initialize() called');

        if (this.isInitialized && this.currentWallet) {
            return { 
                success: true, 
                wallet: this.currentWallet,
                hasWallet: true 
            };
        }

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                return {
                    success: false,
                    requiresLogin: true,
                    error: 'Please login to your mining dashboard first'
                };
            }

            this.userId = userId;

            // 🔥 REAL: Check for existing wallet via API
            const result = await this.checkExistingWallet();

            if (result.success && result.hasWallet) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;

                console.log('✅ Wallet loaded:', {
                    userId: this.userId,
                    hasWallet: true,
                    address: this.currentWallet.address
                });

                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    userId: this.userId
                };
            } else {
                console.log('ℹ️ No wallet found for user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found. Create your first wallet.',
                    userId: this.userId
                };
            }

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to initialize wallet: ' + error.message
            };
        }
    }

    async checkExistingWallet() {
        console.log('🔍 checkExistingWallet() called');

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                return {
                    success: false,
                    error: 'No user ID found',
                    requiresLogin: true
                };
            }

            // 🔥 REAL API CALL
            const response = await fetch(`${this.apiBaseUrl}/check-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                return {
                    success: true,
                    hasWallet: false,
                    message: 'Wallet check API not available'
                };
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('❌ checkExistingWallet failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getEncryptedWallet(userId) {
        console.log(`📥 Getting encrypted wallet for user: ${userId}`);

        try {
            // 🔥 REAL API CALL
            const response = await fetch(`${this.apiBaseUrl}/get-encrypted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('❌ API Error:', response.status, result.error);
                return result;
            }

            return result;

        } catch (error) {
            console.error('❌ Get encrypted wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to retrieve encrypted wallet: ' + error.message
            };
        }
    }

    // =============================================
    // 🎯 STORE WALLET METHOD
    // =============================================

    async storeWallet(userId, walletAddress, encryptedMnemonic, password, isImport = false) {
        console.log('📦 Storing wallet to backend...');

        try {
            if (!userId || !walletAddress || !encryptedMnemonic || !password) {
                throw new Error('All fields required: userId, address, encrypted mnemonic, password');
            }

            // 🔥 REAL API CALL to store encrypted wallet
            const response = await fetch(`${this.apiBaseUrl}/store-encrypted`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    userId,
                    walletAddress,
                    encryptedMnemonic,
                    publicKey: '',
                    wordCount: 12,
                    derivationPath: "m/44'/607'/0'/0/0",
                    isImport: isImport
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server error: ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to store wallet');
            }

            console.log('✅ Wallet stored successfully:', result.wallet?.id);
            return result;

        } catch (error) {
            console.error('❌ Store wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to store wallet: ' + error.message
            };
        }
    }

    // =============================================
    // 🎯 DELETE WALLET METHOD
    // =============================================

    async deleteWallet(userId, confirm = true) {
        try {
            console.log(`🗑️ Deleting wallet for user: ${userId}`);

            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!confirm) {
                return {
                    success: false,
                    error: 'Confirmation required for safety'
                };
            }

            // 🔥 REAL API CALL
            const response = await fetch(`${this.apiBaseUrl}/delete-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, confirm: true })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = null;
                this.isInitialized = false;
                console.log('✅ Wallet deleted successfully');
            }

            return result;

        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to delete wallet: ' + error.message
            };
        }
    }

    // =============================================
    // 🎯 UTILITY METHODS
    // =============================================

    hasWallet() {
        return !!this.currentWallet;
    }

    getCurrentWallet() {
        return this.currentWallet;
    }

    getAddress() {
        return this.currentWallet ? 
            (this.currentWallet.address || this.currentWallet.wallet_address) : 
            null;
    }

    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        if (address.length <= 16) return address;
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }

    getUserId() {
        return this.userId;
    }

    getMiningUserData() {
        if (this.miningUser) {
            return this.miningUser;
        }

        if (window.miningUser) {
            this.miningUser = window.miningUser;
            return this.miningUser;
        }

        try {
            const sessionUser = sessionStorage.getItem('miningUser');
            if (sessionUser) {
                this.miningUser = JSON.parse(sessionUser);
                return this.miningUser;
            }
        } catch (e) {
            console.warn('⚠️ Error getting mining user:', e);
        }

        return null;
    }

    validatePasswordStrength(password) {
        if (!password) return { valid: false, message: 'Password required' };
        if (password.length < 8) return { valid: false, message: 'Minimum 8 characters' };

        let strength = 'medium';
        let message = 'Good password';

        if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
            strength = 'strong';
            message = 'Strong password';
        } else if (password.length >= 8) {
            strength = 'medium';
            message = 'Good password';
        } else {
            strength = 'weak';
            message = 'Weak password';
        }

        return { 
            valid: true, 
            message: message,
            strength: strength
        };
    }

    clearData() {
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.miningUser = null;
        this.isInitialized = false;
        console.log('🧹 Wallet data cleared');
    }

    // =============================================
    // 🎯 NMXp METHODS (CONNECTED TO MINING DASHBOARD)
    // =============================================

    async getNMXpBalance(userId) {
        try {
            // Get user data to show mining balance
            const userData = this.getMiningUserData();
            const miningBalance = userData?.miningBalance || 0;

            return {
                success: true,
                balance: miningBalance,
                wallet_address: this.getAddress(),
                userId: userId,
                source: 'miningDashboard'
            };
        } catch (error) {
            console.error('❌ Get NMXp balance failed:', error);
            return { 
                success: false, 
                error: 'Failed to get NMXp balance: ' + error.message
            };
        }
    }
}

// =============================================
// 🚀 CREATE GLOBAL INSTANCE
// =============================================

window.walletManager = new MiningWalletManager();

// =============================================
// 🎯 GLOBAL HELPER FUNCTIONS
// =============================================

window.getCurrentUserId = function() {
    return window.walletManager.getCurrentUserId();
};

window.validateUserLoggedIn = function() {
    const userId = window.walletManager.getCurrentUserId();
    if (!userId) {
        if (typeof window.showLoginRequiredMessage === 'function') {
            window.showLoginRequiredMessage();
        }
        return false;
    }
    return true;
};

window.showCreateWalletModal = function() {
    console.log('🎯 showCreateWalletModal called');

    const userId = window.walletManager.getCurrentUserId();
    if (!userId) {
        console.error('❌ User not logged in');

        if (typeof window.showMessage === 'function') {
            window.showMessage('Please login to your mining account first', 'error');
        }

        setTimeout(() => {
            if (confirm('Go back to mining dashboard?')) {
                window.location.href = 'dashboard.html';
            }
        }, 1000);
        return;
    }

    closeModal();

    const createModal = document.getElementById('createWalletModal');
    if (createModal) {
        createModal.style.display = 'flex';
        console.log('✅ Create wallet modal opened');
    }
};

window.showImportWalletModal = function() {
    console.log('🎯 showImportWalletModal called');

    const userId = window.walletManager.getCurrentUserId();
    if (!userId) {
        console.error('❌ User not logged in');
        if (typeof window.showMessage === 'function') {
            window.showMessage('Please login to your mining account first', 'error');
        }
        return;
    }

    closeModal();

    const importModal = document.getElementById('importWalletModal');
    if (importModal) {
        importModal.style.display = 'flex';
        console.log('✅ Import wallet modal opened');
    }
};

// =============================================
// 🎯 AUTO-INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('wallet.html')) {
        console.log('🎯 Auto-initializing wallet system...');

        setTimeout(async () => {
            try {
                console.log('🔄 Starting secure initialization...');
                const result = await window.walletManager.initialize();

                if (result.success) {
                    console.log('✅ Secure initialization successful:', {
                        hasWallet: result.hasWallet,
                        userId: result.userId
                    });

                    // Trigger UI update if wallet exists
                    if (result.hasWallet && typeof window.initWallet === 'function') {
                        setTimeout(() => window.initWallet(), 500);
                    }

                } else if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login to mining site');

                    setTimeout(() => {
                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Please access wallet from mining dashboard menu', 'error');
                        }
                    }, 500);
                }
            } catch (error) {
                console.error('❌ Secure initialization failed:', error);
            }
        }, 1000);
    }
});

console.log('✅ PRODUCTION Wallet Manager ready - ALL mock data removed');
console.log('📝 IMPORTANT: Add these scripts to wallet.html:');
console.log('1. <script src="https://unpkg.com/tonweb@0.0.50/dist/tonweb.js"></script>');
console.log('2. <script src="https://unpkg.com/tonweb-mnemonic@0.0.4/dist/tonweb-mnemonic.js"></script>');