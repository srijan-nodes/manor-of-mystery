/* ================================================================
   HELPERS
================================================================ */
const fmt = (val) => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object')
        return val.name || val.title || val.item || val.description || val.text || JSON.stringify(val);
    return String(val);
};

const formatVal = fmt;

const cleanJSON = (str) => {
    try {
        // Strip thinking tags (deepseek-r1 outputs <think>...</think> before JSON)
        str = str.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        // Find the outermost JSON object
        let depth = 0, start = -1;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') { if (depth === 0) start = i; depth++; }
            if (str[i] === '}') { depth--; if (depth === 0 && start >= 0) { str = str.slice(start, i + 1); break; } }
        }
        // Fix trailing commas before ] or }
        str = str.replace(/,\s*([}\]])/g, '$1');
        // Fix single quotes to double quotes (some models do this)
        // Only do this if it doesn't already parse
        try { JSON.parse(str); return str; } catch {}
        return str;
    } catch { return str; }
};
