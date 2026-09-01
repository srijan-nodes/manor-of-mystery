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
        const m = str.match(/\{[\s\S]*\}/);
        return m ? m[0] : str;
    } catch { return str; }
};
