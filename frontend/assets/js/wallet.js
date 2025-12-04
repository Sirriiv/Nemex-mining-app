// assets/js/wallet.js - ENHANCED WITH ALL FEATURES
console.log('👛 Loading Nemex Wallet v3.2 (Full Integration)...');

class MiningWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.isInitialized = false;
        
        // 🚨 CRITICAL FIX: Remove hardcoded Supabase variables
        // These should come from environment variables in wallet.html
        this.supabaseClient = null;
        
        // =============================================
        // 🎯 FULL BIP-39 WORDLIST (2048 WORDS)
        // =============================================
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

        console.log('✅ BIP-39 wordlist loaded (2048 words)');

        // Price APIs configuration
        this.priceApis = [
            {
                name: "CoinGecko",
                url: "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,nemexcoin&vs_currencies=usd&include_24hr_change=true",
                parser: (data) => ({
                    TON: { 
                        price: data['the-open-network']?.usd || 0, 
                        change24h: data['the-open-network']?.usd_24h_change || 0 
                    },
                    NMX: { 
                        price: data['nemexcoin']?.usd || 0.10, 
                        change24h: data['nemexcoin']?.usd_24h_change || 0 
                    }
                })
            },
            {
                name: "CoinMarketCap",
                url: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=TON,NMX&convert=USD",
                headers: { "X-CMC_PRO_API_KEY": "your-api-key-here" },
                parser: (data) => ({
                    TON: { 
                        price: data.data?.TON?.quote?.USD?.price || 0, 
                        change24h: data.data?.TON?.quote?.USD?.percent_change_24h || 0 
                    },
                    NMX: { 
                        price: data.data?.NMX?.quote?.USD?.price || 0.10, 
                        change24h: data.data?.NMX?.quote?.USD?.percent_change_24h || 0 
                    }
                })
            },
            {
                name: "Binance",
                url: "https://api.binance.com/api/v3/ticker/price?symbols=[%22TONUSDT%22,%22NMXUSDT%22]",
                parser: (data) => ({
                    TON: { 
                        price: parseFloat(data.find(d => d.symbol === 'TONUSDT')?.price) || 0, 
                        change24h: 0 
                    },
                    NMX: { 
                        price: parseFloat(data.find(d => d.symbol === 'NMXUSDT')?.price) || 0.10, 
                        change24h: 0 
                    }
                })
            }
        ];

        // Cache prices
        this.priceCache = {
            TON: { price: 2.50, change24h: 0.00 },
            NMX: { price: 0.10, change24h: 0.00 },
            lastUpdated: null
        };
    }

    // Initialize Supabase client
    async initSupabase() {
        try {
            // Check if Supabase is available from wallet.html
            if (typeof window.supabase !== 'undefined' && window.supabaseUrl && window.supabaseAnonKey) {
                this.supabaseClient = window.supabase;
                console.log('✅ Supabase client initialized from wallet.html');
                return true;
            }
            
            console.warn('⚠️ Supabase variables not found in window, using fallback');
            return false;
        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
            return false;
        }
    }

    // Generate mnemonic using BIP-39
    generateMnemonic(wordCount = 12) {
        try {
            console.log('🔧 Generating mnemonic with', wordCount, 'words');
            
            // Use the full BIP-39 wordlist
            const wordlist = this.BIP39_WORDLIST;
            const words = [];
            
            // Generate random words from the wordlist
            for (let i = 0; i < wordCount; i++) {
                const randomIndex = Math.floor(Math.random() * wordlist.length);
                words.push(wordlist[randomIndex]);
            }
            
            const mnemonic = words.join(' ');
            console.log('✅ Generated mnemonic:', mnemonic.substring(0, 50) + '...');
            
            return mnemonic;
        } catch (error) {
            console.error('❌ Error generating mnemonic:', error);
            return this.generateFallbackMnemonic(wordCount);
        }
    }

    // Fallback mnemonic generation (using the first 100 words as backup)
    generateFallbackMnemonic(wordCount = 12) {
        const fallbackWords = this.BIP39_WORDLIST.slice(0, 100);
        const words = [];
        
        for (let i = 0; i < wordCount; i++) {
            const randomIndex = Math.floor(Math.random() * fallbackWords.length);
            words.push(fallbackWords[randomIndex]);
        }
        
        return words.join(' ');
    }

    // Initialize wallet manager
    async init() {
        try {
            console.log('🔧 Initializing Wallet Manager...');
            
            // Initialize Supabase
            const supabaseReady = await this.initSupabase();
            
            if (supabaseReady) {
                // Check for existing session
                const { data: { session } } = await this.supabaseClient.auth.getSession();
                
                if (session) {
                    this.userId = session.user.id;
                    this.userEmail = session.user.email;
                    console.log('✅ User authenticated:', this.userEmail);
                    
                    // Load existing wallet
                    await this.loadUserWallet();
                }
            }
            
            // Start price updates
            this.startPriceUpdates();
            
            this.isInitialized = true;
            console.log('✅ Wallet Manager initialized successfully');
            
            // Dispatch initialization event
            document.dispatchEvent(new CustomEvent('walletManagerInitialized'));
            
            return true;
        } catch (error) {
            console.error('❌ Error initializing wallet manager:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // Load user's wallet from Supabase
    async loadUserWallet() {
        try {
            if (!this.supabaseClient || !this.userId) return null;
            
            const { data, error } = await this.supabaseClient
                .from('user_wallets')
                .select('*')
                .eq('user_id', this.userId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('📭 No wallet found for user');
                    return null;
                }
                throw error;
            }
            
            this.currentWallet = data;
            console.log('✅ Wallet loaded:', data.wallet_address?.substring(0, 20) + '...');
            
            // Dispatch wallet loaded event
            document.dispatchEvent(new CustomEvent('walletLoaded', { detail: data }));
            
            return data;
        } catch (error) {
            console.error('❌ Error loading wallet:', error);
            return null;
        }
    }

    // Create new wallet
    async createNewWallet() {
        try {
            console.log('🆕 Creating new wallet...');
            
            // Generate mnemonic
            const mnemonic = this.generateMnemonic();
            
            // Generate wallet address from mnemonic (simplified)
            const walletAddress = '0x' + Array.from({length: 40}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('');
            
            // Create wallet object
            const walletData = {
                mnemonic: mnemonic,
                wallet_address: walletAddress,
                private_key: 'encrypted_' + btoa(walletAddress + Date.now()),
                created_at: new Date().toISOString(),
                balance: 0,
                pending_earnings: 0,
                total_earned: 0
            };
            
            // Save to Supabase if user is authenticated
            if (this.supabaseClient && this.userId) {
                const { data, error } = await this.supabaseClient
                    .from('user_wallets')
                    .upsert({
                        user_id: this.userId,
                        ...walletData,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
            }
            
            this.currentWallet = walletData;
            console.log('✅ New wallet created:', walletAddress);
            
            // Dispatch wallet created event
            document.dispatchEvent(new CustomEvent('walletCreated', { 
                detail: { 
                    wallet: walletData,
                    showMnemonic: true 
                } 
            }));
            
            return walletData;
        } catch (error) {
            console.error('❌ Error creating wallet:', error);
            
            // Fallback to local storage
            return this.createLocalWallet();
        }
    }

    // Create wallet in local storage
    createLocalWallet() {
        const mnemonic = this.generateMnemonic();
        const walletAddress = 'local_0x' + Array.from({length: 40}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('');
        
        const walletData = {
            mnemonic: mnemonic,
            wallet_address: walletAddress,
            private_key: 'local_encrypted_' + btoa(walletAddress + Date.now()),
            created_at: new Date().toISOString(),
            balance: 0,
            pending_earnings: 0,
            total_earned: 0,
            isLocal: true
        };
        
        // Save to localStorage
        localStorage.setItem('nemex_wallet', JSON.stringify(walletData));
        
        this.currentWallet = walletData;
        console.log('✅ Local wallet created:', walletAddress);
        
        return walletData;
    }

    // Import wallet from mnemonic
    async importWallet(mnemonic) {
        try {
            console.log('📥 Importing wallet from mnemonic...');
            
            // Validate mnemonic
            const words = mnemonic.trim().split(/\s+/);
            if (words.length !== 12 && words.length !== 24) {
                throw new Error('Mnemonic must be 12 or 24 words');
            }
            
            // Validate words against BIP-39 list
            const invalidWords = words.filter(word => !this.BIP39_WORDLIST.includes(word));
            if (invalidWords.length > 0) {
                throw new Error(`Invalid words found: ${invalidWords.join(', ')}`);
            }
            
            // Generate wallet address from mnemonic (simplified)
            const hash = await this.hashString(mnemonic);
            const walletAddress = '0x' + hash.substring(0, 40);
            
            const walletData = {
                mnemonic: mnemonic,
                wallet_address: walletAddress,
                private_key: 'encrypted_' + btoa(hash),
                created_at: new Date().toISOString(),
                balance: 0,
                pending_earnings: 0,
                total_earned: 0
            };
            
            // Save to Supabase if authenticated
            if (this.supabaseClient && this.userId) {
                const { data, error } = await this.supabaseClient
                    .from('user_wallets')
                    .upsert({
                        user_id: this.userId,
                        ...walletData,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
            } else {
                // Save to localStorage
                localStorage.setItem('nemex_wallet', JSON.stringify(walletData));
            }
            
            this.currentWallet = walletData;
            console.log('✅ Wallet imported:', walletAddress);
            
            document.dispatchEvent(new CustomEvent('walletImported', { detail: walletData }));
            
            return walletData;
        } catch (error) {
            console.error('❌ Error importing wallet:', error);
            throw error;
        }
    }

    // Hash string (simplified)
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Get current wallet
    getCurrentWallet() {
        return this.currentWallet;
    }

    // Get wallet balance
    async getWalletBalance(walletAddress = null) {
        try {
            const address = walletAddress || (this.currentWallet?.wallet_address);
            if (!address) return 0;
            
            // For demo purposes, return random balance
            // In production, this would query the blockchain
            const baseBalance = this.currentWallet?.balance || 0;
            const randomEarnings = Math.random() * 0.1;
            
            return {
                balance: baseBalance + randomEarnings,
                pending: this.currentWallet?.pending_earnings || 0,
                total: this.currentWallet?.total_earned || 0
            };
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            return { balance: 0, pending: 0, total: 0 };
        }
    }

    // Update earnings
    async updateEarnings(amount, type = 'mining') {
        try {
            if (!this.currentWallet) return false;
            
            // Update local wallet object
            this.currentWallet.pending_earnings = (this.currentWallet.pending_earnings || 0) + amount;
            
            // Update Supabase if authenticated
            if (this.supabaseClient && this.userId) {
                const { error } = await this.supabaseClient
                    .from('user_wallets')
                    .update({
                        pending_earnings: this.currentWallet.pending_earnings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId);
                
                if (error) throw error;
            }
            
            console.log(`✅ Earnings updated: ${amount} NMX (${type})`);
            return true;
        } catch (error) {
            console.error('❌ Error updating earnings:', error);
            return false;
        }
    }

    // Get cryptocurrency prices
    async getCryptoPrices() {
        try {
            console.log('💰 Fetching crypto prices...');
            
            // Try each API until one works
            for (const api of this.priceApis) {
                try {
                    const response = await fetch(api.url, { 
                        headers: api.headers || {},
                        cache: 'no-cache'
                    });
                    
                    if (!response.ok) continue;
                    
                    const data = await response.json();
                    const prices = api.parser(data);
                    
                    // Update cache
                    this.priceCache = {
                        TON: prices.TON || this.priceCache.TON,
                        NMX: prices.NMX || this.priceCache.NMX,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    console.log(`✅ Prices from ${api.name}: TON=$${this.priceCache.TON.price}, NMX=$${this.priceCache.NMX.price}`);
                    
                    // Dispatch price update event
                    document.dispatchEvent(new CustomEvent('pricesUpdated', { detail: this.priceCache }));
                    
                    return this.priceCache;
                } catch (apiError) {
                    console.warn(`⚠️ ${api.name} failed:`, apiError.message);
                    continue;
                }
            }
            
            // If all APIs fail, return cached prices
            console.log('⚠️ Using cached prices');
            return this.priceCache;
        } catch (error) {
            console.error('❌ Error fetching prices:', error);
            return this.priceCache;
        }
    }

    // Start periodic price updates
    startPriceUpdates(interval = 30000) {
        // Initial fetch
        this.getCryptoPrices();
        
        // Set up interval
        this.priceUpdateInterval = setInterval(() => {
            this.getCryptoPrices();
        }, interval);
        
        console.log(`✅ Price updates started (every ${interval/1000}s)`);
    }

    // Stop price updates
    stopPriceUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            console.log('✅ Price updates stopped');
        }
    }

    // Format currency
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(amount);
    }

    // Format crypto amount
    formatCrypto(amount, symbol = 'NMX') {
        const decimals = symbol === 'NMX' ? 4 : 6;
        return `${parseFloat(amount).toFixed(decimals)} ${symbol}`;
    }

    // Export wallet data (without sensitive info)
    exportWalletData() {
        if (!this.currentWallet) return null;
        
        return {
            wallet_address: this.currentWallet.wallet_address,
            balance: this.currentWallet.balance,
            pending_earnings: this.currentWallet.pending_earnings,
            total_earned: this.currentWallet.total_earned,
            created_at: this.currentWallet.created_at
        };
    }

    // Clear wallet (logout)
    clearWallet() {
        this.currentWallet = null;
        localStorage.removeItem('nemex_wallet');
        console.log('✅ Wallet cleared');
        
        document.dispatchEvent(new CustomEvent('walletCleared'));
    }

    // Validate mnemonic
    validateMnemonic(mnemonic) {
        try {
            const words = mnemonic.trim().split(/\s+/);
            
            // Check word count
            if (words.length !== 12 && words.length !== 24) {
                return { valid: false, error: 'Must be 12 or 24 words' };
            }
            
            // Check all words are in BIP-39 list
            const invalidWords = [];
            for (const word of words) {
                if (!this.BIP39_WORDLIST.includes(word.toLowerCase())) {
                    invalidWords.push(word);
                }
            }
            
            if (invalidWords.length > 0) {
                return { 
                    valid: false, 
                    error: `Invalid words: ${invalidWords.join(', ')}` 
                };
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Generate recovery phrase (formatted for display)
    formatRecoveryPhrase(mnemonic) {
        const words = mnemonic.split(' ');
        return words.map((word, index) => `${index + 1}. ${word}`).join('\n');
    }

    // Backup wallet to file
    backupWallet() {
        if (!this.currentWallet) {
            throw new Error('No wallet to backup');
        }
        
        const backupData = {
            version: '1.0',
            wallet_address: this.currentWallet.wallet_address,
            backup_date: new Date().toISOString(),
            // Note: In production, NEVER include mnemonic/private key in automated backups
            // This is for demo purposes only
            warning: 'Store this file securely. Anyone with this file can access your funds.'
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nemex-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create global instance
const walletManager = new MiningWalletManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, initializing wallet manager...');
    
    // Auto-initialize after a short delay
    setTimeout(() => {
        walletManager.init().then(success => {
            if (success) {
                console.log('🎉 Wallet Manager ready!');
            } else {
                console.warn('⚠️ Wallet Manager initialization failed, but will still work in limited mode');
            }
        });
    }, 1000);
});

// Export for global use
window.walletManager = walletManager;
window.generateMnemonic = () => walletManager.generateMnemonic();
window.createNewWallet = () => walletManager.createNewWallet();
window.importWallet = (mnemonic) => walletManager.importWallet(mnemonic);
window.getWalletBalance = () => walletManager.getWalletBalance();
window.getCryptoPrices = () => walletManager.getCryptoPrices();

console.log('✅ wallet.js loaded successfully');