const { useState, useEffect, useRef, useCallback } = React;

/* ================================================================
   MAIN APP
================================================================ */
function App() {
    const [phase,         setPhase]         = useState('name');      // name | loading | generating | playing
    const [playerName,    setPlayerName]     = useState('');
    const [selectedModel, setSelectedModel]  = useState('');
    const [crimeScene,    setCrimeScene]     = useState(null);
    const [activeUI,      setActiveUI]       = useState(null);
    const [activeSuspect, setActiveSuspect]  = useState(null);
    const [conversations, setConversations]  = useState({});
    const [evidence,      setEvidence]       = useState([]);
    const [completed,     setCompleted]      = useState(new Set());
    const [isThinking,    setIsThinking]     = useState(false);
    const [interactText,  setInteractText]   = useState('');
    const [roomName,      setRoomName]       = useState('Manor of Whispers');
    const [confessed,     setConfessed]      = useState({});

    const canvasRef  = useRef();
    const minimapRef = useRef();
    const mountRef   = useRef(false);
    const stateRef   = useRef({
        moveForward: false, moveBackward: false, moveLeft: false, moveRight: false,
        pitch: 0, yaw: 0, camera: null, interactables: [], activeUI: null,
        openUI: () => {},
    });

    /* Keep stateRef.activeUI in sync */
    useEffect(() => { stateRef.current.activeUI = activeUI; }, [activeUI]);

    /* Wire openUI so the 3D click handler can call it */
    const openUI = useCallback((type, data) => {
        if (type === 'chat') setActiveSuspect(data);
        setActiveUI(type);
    }, []);
    useEffect(() => { stateRef.current.openUI = openUI; }, [openUI]);

    /* ESC closes panel */
    useEffect(() => {
        const handler = (e) => { if (e.code === 'Escape') setActiveUI(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    /* â”€â”€ Mystery generation â”€â”€ */
    const initMystery = async () => {
        setPhase('generating');
        const prompt = `Generate a murder mystery JSON for a manor house. Include: victim, victimProfile, location, weapon, motive, fullStory, timeline (array of timestamped strings), discoveryPhase (string), evidenceList (array of strings), investigativeActions (array of 4 objects: id, task, result), suspects (array of exactly 5 objects: id, name, role, secret, isKiller boolean, clueTrigger string). Output JSON ONLY, no explanation.`;

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const res = await fetch(OLLAMA_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: selectedModel, format: 'json', stream: false, options: { num_predict: 4096 }, messages: [{ role: 'user', content: prompt }] })
                });
                const data = await res.json();
                const raw = data.message.content;
                console.log("Raw LLM response (attempt " + attempt + "):", raw.substring(0, 500));
                const cleaned = cleanJSON(raw);
                const scene = JSON.parse(cleaned);
                // Validate minimum structure
                if (!scene.suspects || !Array.isArray(scene.suspects) || scene.suspects.length < 1) {
                    throw new Error("Invalid mystery: missing suspects array");
                }
                setCrimeScene(scene);
                const h = {}; scene.suspects.forEach(s => h[s.id] = []);
                setConversations(h);
                setPhase('playing');
                return; // success
            } catch (err) {
                console.error(`Init mystery error (attempt ${attempt}):`, err);
                if (attempt < 2) {
                    console.log("Retrying mystery generation...");
                    continue;
                }
                alert("Failed to generate mystery after 2 attempts.\n\n" + err.message + "\n\nTip: Try a larger model like gemma4:26b for more reliable JSON output.");
                setPhase('loading');
            }
        }
    };

    /* â”€â”€ Build Three.js scene once crime scene is ready â”€â”€ */
    useEffect(() => {
        if (phase !== 'playing' || mountRef.current || !crimeScene) return;
        mountRef.current = true;
        buildScene(THREE, crimeScene, canvasRef.current, stateRef, setInteractText, setRoomName, minimapRef);
    }, [phase, crimeScene]);

    /* â”€â”€ LLM chat â”€â”€ */
    const chat = async (msg) => {
        if (!msg.trim() || isThinking) return;
        const s = activeSuspect;
        setConversations(p => ({ ...p, [s.id]: [...p[s.id], { role: 'user', content: msg }] }));
        setIsThinking(true);
        try {
            const res = await fetch(OLLAMA_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel, stream: false,
                    messages: [
                        {
                            role: 'system',
                            content: `You are ${fmt(s.name)}, a suspect in a murder mystery. Your role: ${fmt(s.role)}. Your secret: "${fmt(s.secret)}". If the detective says or asks about "${fmt(s.clueTrigger)}", you nervously reveal the secret. Keep replies to 2 sentences maximum, and stay in character at all times.`
                        },
                        ...conversations[s.id],
                        { role: 'user', content: msg }
                    ]
                })
            });
            const d = await res.json();
            const reply = d.message.content;
            setConversations(p => ({ ...p, [s.id]: [...p[s.id], { role: 'assistant', content: reply }] }));
            if (reply.toLowerCase().includes(fmt(s.clueTrigger).toLowerCase())) {
                setEvidence(prev => [...new Set([...prev, `${fmt(s.name)} revealed: ${fmt(s.secret)}`])]);
                setConfessed(prev => ({ ...prev, [s.id]: true }));
            }
        } finally {
            setIsThinking(false);
        }
    };

    /* â”€â”€ Screens â”€â”€ */
    if (phase === 'name') return <NameScreen onConfirm={(n) => { setPlayerName(n); setPhase('loading'); }} />;
    if (phase === 'loading' || phase === 'generating')
        return <LoadingScreen phase={phase} onStart={initMystery} playerName={playerName}
                    selectedModel={selectedModel} setSelectedModel={setSelectedModel} />;

    /* â”€â”€ Playing â”€â”€ */
    return (
        <div className="relative" style={{ width: '100vw', height: '100vh' }}>

            {/* Three.js canvas mount point */}
            <div
                ref={canvasRef}
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => { if (!activeUI) e.target.closest('div').querySelector('canvas')?.requestPointerLock(); }}
            />

            {/* â”€â”€ HUD â”€â”€ */}
            <div className="hud-overlay">
                <div className="crosshair" />
                <div className="scanline" />

                {interactText && <div className="interaction-prompt font-typewriter">{interactText}</div>}

                {/* Room name */}
                <div className="room-label font-typewriter">{roomName}</div>

                {/* Evidence folder */}
                <div className="absolute glass" style={{ top: '1.5rem', right: '6rem', width: '18rem', maxHeight: '260px', overflowY: 'auto' }}>
                    <p className="text-xs uppercase font-bold text-amber tracking-widest" style={{ marginBottom: '0.5rem' }}>Evidence Folder</p>
                    <div className="flex flex-col gap-2">
                        {evidence.map((e, i) => <div key={i} className="evidence-item">{fmt(e)}</div>)}
                        {evidence.length === 0 && <p className="text-xs text-zinc-500 italic">No evidence recovered yet.</p>}
                    </div>
                </div>

                {/* Minimap */}
                <canvas
                    ref={minimapRef}
                    id="minimap"
                    width={140} height={140}
                    style={{ width: '140px', height: '140px' }}
                />

                {/* Controls hint (fades after pointer locked) */}
                {!activeUI && (
                    <div style={{ position:'absolute', bottom:'1.5rem', left:'50%', transform:'translateX(-50%)',
                        color:'rgba(255,255,255,0.2)', fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase' }}>
                        WASD / Click to move &nbsp;Â·&nbsp; Click NPC to interact &nbsp;Â·&nbsp; ESC to close panel
                    </div>
                )}

                {/* Modal panel */}
                {activeUI && ['briefing','chat','actions','boss'].includes(activeUI) && (
                    <div style={{
                        position:'absolute', inset:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background:'rgba(0,0,0,0.78)', padding:'1.5rem',
                        backdropFilter:'blur(4px)', zIndex:50
                    }}>
                        <div className="ui-panel animate-fade-in" style={{ maxHeight:'85vh', overflowY:'auto' }}>
                            <button
                                onClick={() => setActiveUI(null)}
                                style={{ position:'absolute', top:'1.25rem', right:'1.25rem',
                                    background:'none', border:'none', color:'#555',
                                    cursor:'pointer', fontSize:'11px', fontWeight:'bold',
                                    letterSpacing:'0.12em', textTransform:'uppercase' }}
                            >
                                Close [ESC]
                            </button>

                            {/* â”€â”€ BRIEFING â”€â”€ */}
                            {activeUI === 'briefing' && crimeScene && (
                                <div className="flex flex-col gap-8">
                                    <div className="noir-card" style={{ position:'relative', padding:'2rem' }}>
                                        <span style={{ fontSize:'3.5rem', color:'var(--amber)', fontWeight:700,
                                            position:'absolute', left:'1.25rem', top:'0.75rem', opacity:0.7,
                                            fontFamily:"'Special Elite', cursive" }}>
                                            T
                                        </span>
                                        <p style={{ fontSize:'1.05rem', color:'#c4c4c8', fontStyle:'italic',
                                            lineHeight:1.85, paddingLeft:'3.5rem', fontWeight:300 }}>
                                            {fmt(crimeScene.fullStory)}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Victim</p>
                                            <p className="font-typewriter text-amber" style={{ fontSize:'1.5rem', textTransform:'uppercase' }}>{fmt(crimeScene.victim)}</p>
                                            <p className="text-sm text-zinc-500 italic">{fmt(crimeScene.victimProfile)}</p>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold" style={{ marginBottom:'0.3rem' }}>Motive</p>
                                                <p className="text-zinc-300 italic">"{fmt(crimeScene.motive)}"</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold" style={{ marginBottom:'0.3rem' }}>Weapon</p>
                                                <p className="text-white font-bold uppercase" style={{ fontSize:'1.1rem' }}>{fmt(crimeScene.weapon)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Timeline</p>
                                            <div className="flex flex-col gap-2" style={{ borderLeft:'2px solid #27272a', paddingLeft:'1rem' }}>
                                                {crimeScene.timeline?.map((evt, i) => (
                                                    <div key={i} className="text-xs text-zinc-500">
                                                        <span className="text-amber">â–¸ </span>{evt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold" style={{ marginBottom:'0.75rem' }}>Scene Evidence</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {crimeScene.evidenceList?.map((e, i) => (
                                                <div key={i} className="evidence-item">{fmt(e)}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* â”€â”€ CHAT â”€â”€ */}
                            {activeUI === 'chat' && activeSuspect && (
                                <div className="flex flex-col" style={{ height:'460px' }}>
                                    <div style={{ borderBottom:'1px solid #222', paddingBottom:'1rem', marginBottom:'1.25rem' }}>
                                        <h2 className="font-typewriter text-amber uppercase" style={{ fontSize:'1.75rem', letterSpacing:'-0.02em' }}>{fmt(activeSuspect.name)}</h2>
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest">{fmt(activeSuspect.role)}</p>
                                        {confessed[activeSuspect.id] && (
                                            <span style={{ fontSize:'10px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)',
                                                color:'var(--amber)', padding:'2px 8px', borderRadius:'999px', marginTop:'4px', display:'inline-block' }}>
                                                Secret Revealed
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4" style={{ marginBottom:'1rem', paddingRight:'0.5rem' }}>
                                        {conversations[activeSuspect.id].length === 0 && (
                                            <p className="text-xs text-zinc-500 italic" style={{ alignSelf:'center', marginTop:'2rem' }}>
                                                Approach carefully. Every word counts.
                                            </p>
                                        )}
                                        {conversations[activeSuspect.id].map((m, i) => (
                                            <div key={i} className="flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                <div style={{
                                                    maxWidth: '72%', padding: '0.875rem 1rem',
                                                    borderRadius: m.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                                                    fontSize: '0.875rem', lineHeight: 1.6,
                                                    background: m.role === 'user' ? 'var(--amber)' : '#1a1a1e',
                                                    color:      m.role === 'user' ? '#000'         : '#c8c8cc',
                                                    border:     m.role === 'user' ? 'none'         : '1px solid #2a2a2e',
                                                    fontStyle:  m.role === 'assistant' ? 'italic'  : 'normal',
                                                }}>
                                                    {fmt(m.content)}
                                                </div>
                                            </div>
                                        ))}
                                        {isThinking && (
                                            <div style={{ display:'flex', gap:'2px', padding:'0.5rem' }}>
                                                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                                            </div>
                                        )}
                                    </div>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); chat(e.target.m.value); e.target.m.value = ''; }}
                                        className="flex gap-4"
                                    >
                                        <input name="m" className="input-field" placeholder="Ask the suspect somethingâ€¦" autoFocus />
                                        <button type="submit" className="btn" disabled={isThinking}>Ask</button>
                                    </form>
                                </div>
                            )}

                            {/* â”€â”€ FORENSIC TERMINAL â”€â”€ */}
                            {activeUI === 'actions' && crimeScene && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="font-typewriter uppercase tracking-widest" style={{ fontSize:'1.25rem' }}>Forensic Terminal</h2>
                                        <p className="text-xs text-zinc-500 italic" style={{ marginTop:'0.25rem' }}>Run investigative actions to uncover physical evidence.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {crimeScene.investigativeActions.map(a => (
                                            <button
                                                key={a.id}
                                                disabled={completed.has(a.id)}
                                                onClick={() => {
                                                    setCompleted(p => new Set([...p, a.id]));
                                                    setEvidence(e => [...new Set([...e, fmt(a.result)])]);
                                                }}
                                                style={{
                                                    padding:'1.5rem',
                                                    background: completed.has(a.id) ? 'rgba(245,158,11,0.06)' : 'rgba(24,24,27,0.6)',
                                                    border: completed.has(a.id) ? '1px solid rgba(245,158,11,0.25)' : '1px solid #27272a',
                                                    borderRadius:'1rem', textAlign:'left', cursor: completed.has(a.id) ? 'default' : 'pointer',
                                                    transition:'border-color 0.2s, background 0.2s',
                                                    opacity: completed.has(a.id) ? 0.75 : 1,
                                                }}
                                            >
                                                <p className="text-sm font-bold text-zinc-300">{fmt(a.task)}</p>
                                                {completed.has(a.id) && (
                                                    <p className="text-xs text-amber italic" style={{ borderTop:'1px solid rgba(245,158,11,0.15)', paddingTop:'0.75rem', marginTop:'0.75rem' }}>
                                                        "{fmt(a.result)}"
                                                    </p>
                                                )}
                                                {!completed.has(a.id) && (
                                                    <p className="text-xs text-zinc-500 italic" style={{ marginTop:'0.4rem' }}>Click to run analysis</p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* â”€â”€ COMMISSIONER â”€â”€ */}
                            {activeUI === 'boss' && crimeScene && (
                                <div className="text-center flex flex-col gap-8" style={{ padding:'1rem 0' }}>
                                    <div>
                                        <h2 className="font-typewriter uppercase" style={{ fontSize:'1.75rem', letterSpacing:'-0.02em' }}>Commissioner's Office</h2>
                                        <p className="text-zinc-500 italic" style={{ marginTop:'0.5rem', fontSize:'0.9rem' }}>
                                            "One chance, Detective {playerName}. Name the killer â€” or walk away in shame."
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4" style={{ maxWidth:'480px', margin:'0 auto', width:'100%' }}>
                                        {crimeScene.suspects.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setActiveUI(s.isKiller ? 'win' : 'lose')}
                                                className={`btn btn-red`}
                                                disabled={!confessed[s.id]}
                                                style={{ padding:'1.25rem', fontSize:'0.75rem',
                                                    letterSpacing:'0.1em', borderRadius:'1rem',
                                                    opacity: confessed[s.id] ? 1 : 0.28 }}
                                            >
                                                Accuse {fmt(s.name)}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                        Only suspects whose secrets you've uncovered may be accused.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* â”€â”€ WIN / LOSE screen â”€â”€ */}
            {(activeUI === 'win' || activeUI === 'lose') && (
                <div style={{
                    position:'absolute', inset:0, zIndex:100,
                    background: activeUI === 'win' ? 'radial-gradient(ellipse at center, #1a1000 0%, #000 70%)' : 'radial-gradient(ellipse at center, #1a0000 0%, #000 70%)',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    textAlign:'center', padding:'2.5rem',
                }} className="animate-fade-in">
                    <h2 className="font-typewriter uppercase" style={{
                        fontSize:'4rem', marginBottom:'1.5rem',
                        color: activeUI === 'win' ? 'var(--amber)' : 'var(--red)',
                        textShadow: activeUI === 'win' ? '0 0 40px rgba(245,158,11,0.5)' : '0 0 40px rgba(220,38,38,0.5)'
                    }}>
                        {activeUI === 'win' ? 'Case Closed.' : 'Case Dismissed.'}
                    </h2>
                    <p className="text-zinc-300" style={{ fontSize:'1.1rem', maxWidth:'520px', marginBottom:'3rem', lineHeight:1.8 }}>
                        {activeUI === 'win'
                            ? `Outstanding work, Detective ${playerName}. The killer is in custody. Justice is served.`
                            : `An innocent person is accused. The real killer walks free. Your career is over, Detective ${playerName}.`}
                    </p>
                    <button onClick={() => window.location.reload()} className="btn"
                        style={{ padding:'1.25rem 3rem', background:'#e5e5e5', color:'#000', fontSize:'0.8rem' }}>
                        New Case
                    </button>
                </div>
            )}
        </div>
    );
}

/* ================================================================
   NAME SCREEN
================================================================ */
function NameScreen({ onConfirm }) {
    const [name, setName] = useState('');
    return (
        <div style={{ position:'fixed', inset:0, background:'#09090b',
            display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
            <div style={{ maxWidth:'380px', width:'100%' }} className="animate-fade-in">
                <h1 className="font-typewriter text-amber uppercase tracking-widest"
                    style={{ fontSize:'2rem', textAlign:'center', marginBottom:'0.5rem' }}>
                    Manor of Whispers
                </h1>
                <p className="text-zinc-500 text-xs uppercase tracking-widest"
                    style={{ textAlign:'center', marginBottom:'2rem' }}>
                    A 3D Detective Mystery
                </p>
                <div className="noir-card flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Detective Name</label>
                        <input
                            className="input-field"
                            placeholder="Enter your nameâ€¦"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
                            autoFocus
                        />
                    </div>
                    <button
                        className="btn w-full"
                        style={{ padding:'1.25rem' }}
                        onClick={() => name.trim() && onConfirm(name.trim())}
                        disabled={!name.trim()}
                    >
                        Enter the Manor
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   LOADING SCREEN
================================================================ */
function LoadingScreen({ phase, onStart, playerName, selectedModel, setSelectedModel }) {
    const [models,      setModels]      = useState([]);
    const [fetchState,  setFetchState]  = useState('idle'); // idle | loading | error
    const [fetchError,  setFetchError]  = useState('');
    const [retryKey,    setRetryKey]    = useState(0);

    /* Fetch available models from Ollama with fallback and auto-polling */
    useEffect(() => {
        const fetchAvailableModels = async () => {
            setFetchState('loading');
            try {
                const r = await fetch(OLLAMA_TAGS);
                if (!r.ok) throw new Error("Status " + r.status);
                const data = await r.json();
                const list = (data.models || []).map(m => m.name || m.model || String(m));
                setModels(list);
                if (list.length > 0) {
                    const defaultModel = list.find(m => m.includes("gemma-4-E4B")) || list[0];
                    setSelectedModel(prev => prev || defaultModel);
                }
                setFetchState('done');
                setFetchError('');
            } catch (e) {
                console.error("Fetch to Ollama tags failed:", e);
                setFetchState('error');
                setFetchError('Could not reach Ollama. Make sure Ollama is running.');
            }
        };

        fetchAvailableModels();

        return () => {};
    }, [retryKey]);

    const canStart = phase === 'loading' && selectedModel && (fetchState === 'done' || fetchState === 'error');

    return (
        <div style={{ position:'fixed', inset:0, background:'#09090b',
            display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
            <div style={{ maxWidth:'440px', width:'100%' }} className="animate-fade-in">
                <h1 className="font-typewriter text-amber uppercase tracking-widest"
                    style={{ fontSize:'2rem', textAlign:'center', marginBottom:'0.5rem' }}>
                    Manor of Whispers
                </h1>
                <p className="text-zinc-500 text-xs uppercase tracking-widest"
                    style={{ textAlign:'center', marginBottom:'2rem' }}>
                    Detective {playerName}
                </p>
                <div className="noir-card flex flex-col gap-6">
                    {phase === 'loading' ? (
                        <>
                            {/* Model selector */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                                    Ollama Model
                                </label>

                                {fetchState === 'loading' && (
                                    <div className="flex items-center gap-3" style={{ padding:'0.75rem 0' }}>
                                        <div style={{
                                            width:'1rem', height:'1rem', flexShrink:0,
                                            border:'2px solid #27272a', borderTopColor:'var(--amber)',
                                            borderRadius:'50%'
                                        }} className="animate-spin" />
                                        <p className="text-xs text-zinc-500">Connecting to Ollamaâ€¦</p>
                                    </div>
                                )}

                                {fetchState === 'error' && (
                                    <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)',
                                        borderRadius:'0.75rem', padding:'0.875rem 1rem' }}>
                                        <p className="text-xs" style={{ color:'#f87171', marginBottom:'0.4rem' }}>
                                            Could not auto-detect models.
                                        </p>
                                        <p className="text-xs text-zinc-500" style={{ lineHeight:1.6, marginBottom:'0.75rem' }}>
                                            Your browser may be blocking the connection. You can try typing your model name manually below:
                                        </p>
                                        <input 
                                            type="text" 
                                            value={selectedModel}
                                            onChange={e => setSelectedModel(e.target.value)}
                                            placeholder="e.g. mistral:7b"
                                            style={{
                                                background:'#18181b', border:'1px solid #27272a',
                                                borderRadius:'0.5rem', padding:'0.6rem 1rem',
                                                color:'#fff', fontSize:'0.875rem', outline:'none',
                                                width:'100%', marginBottom:'0.5rem'
                                            }}
                                        />
                                        <div style={{ display:'flex', gap:'0.5rem' }}>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding:'0.5rem 1rem', fontSize:'0.7rem', flex:1 }}
                                                onClick={() => { setFetchError(''); setModels([]); setRetryKey(k => k + 1); }}
                                            >
                                                Retry Auto-Detect
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {fetchState === 'done' && models.length === 0 && (
                                    <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)',
                                        borderRadius:'0.75rem', padding:'0.875rem 1rem' }}>
                                        <p className="text-xs text-amber">No models found.</p>
                                        <p className="text-xs text-zinc-500" style={{ marginTop:'0.3rem', lineHeight:1.5 }}>
                                            Pull a model first:<br/>
                                            <code style={{ background:'#1a1a1a', padding:'3px 7px', borderRadius:'4px', color:'#aaa', display:'block', marginTop:'5px' }}>
                                                ollama pull mistral:7b
                                            </code>
                                        </p>
                                    </div>
                                )}

                                {fetchState === 'done' && models.length > 0 && (
                                    <select
                                        value={selectedModel}
                                        onChange={e => setSelectedModel(e.target.value)}
                                        style={{
                                            background:'#18181b', border:'1px solid #27272a',
                                            borderRadius:'0.75rem', padding:'0.875rem 1rem',
                                            color:'#fff', fontSize:'0.875rem', outline:'none',
                                            cursor:'pointer', width:'100%',
                                            appearance:'none',
                                            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                                            backgroundRepeat:'no-repeat',
                                            backgroundPosition:'right 1rem center',
                                            paddingRight:'2.5rem',
                                        }}
                                    >
                                        {models.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <button
                                onClick={onStart}
                                className="btn w-full"
                                style={{ padding:'1.25rem' }}
                                disabled={!canStart}
                            >
                                Connect &amp; Generate Case
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 items-center" style={{ padding:'1rem 0' }}>
                            <div style={{
                                width:'2rem', height:'2rem',
                                border:'2px solid #27272a', borderTopColor:'var(--amber)',
                                borderRadius:'50%'
                            }} className="animate-spin" />
                            <p className="font-typewriter text-amber text-xs uppercase tracking-widest animate-pulse">
                                Drafting the mysteryâ€¦
                            </p>
                            <p className="text-xs text-zinc-500">Using {selectedModel}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   MOUNT
================================================================ */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

