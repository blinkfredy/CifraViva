// CifraViva app.js - módulos principales
// Módulo 1: Carga y Gestión | Módulo 2: Reproductor | Módulo 3: Responsividad/Arquitectura
const CHROMATIC_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B','Fb':'E' };
const SHARP_TO_FLAT = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };

function normalizeRoot(r){
  if(!r) return r;
  if(FLAT_TO_SHARP[r]) return FLAT_TO_SHARP[r];
  return r;
}
function rootIndex(root){
  const n = normalizeRoot(root);
  return CHROMATIC_SHARP.indexOf(n);
}
function transposeRoot(root, semitones){
  const idx = rootIndex(root);
  if(idx===-1) return root;
  let n = (idx+semitones)%12; if(n<0) n+=12;
  return CHROMATIC_SHARP[n];
}

// Regex para acorde inglés: C, G, Am, F#m7b5, BbMaj7, Dsus2, C/E etc.
const CHORD_TOKEN_RE = /^[A-G][#b]?(?:m(?!aj)|maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?(?:5|9|11|13)|sus[24]|add9|dim7|m7b5|7b5|7#9|6|9)*(?:\/[A-G][#b]?)?$/i;
const CHORD_EXTRACT_RE = /([A-G][#b]?(?:m(?!aj)|maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?(?:5|9|11|13)|sus[24]|add9|dim7|m7b5|7b5|7#9|6|9)*(?:\/[A-G][#b]?)?)/g;

function isChordToken(tok){
  const t = tok.trim();
  if(!t) return false;
  // evita palabras comunes que parecen acordes: A, Am? pero A es acorde válido.
  // Si es una sola letra A-G y no está sola en línea? Consideramos acorde.
  if(!CHORD_TOKEN_RE.test(t)) return false;
  // filtrar falsos positivos: "A" inglés articulo -> si token es "A" y contexto es letra normal, pero lo mantenemos; el detector de línea usa densidad.
  return true;
}

function parseChordNote(chord){
  // separa root, descriptor, bass
  const m = chord.match(/^([A-G][#b]?)(.*?)(\/[A-G][#b]?)?$/);
  if(!m) return null;
  return { root:m[1], desc:m[2]||'', bass: m[3]? m[3].slice(1): null, raw:chord };
}

function transposeChord(chordStr, semitones){
  // mantiene descriptor, transpone root y bass
  const p = parseChordNote(chordStr);
  if(!p) return chordStr;
  // validar token
  if(!CHORD_TOKEN_RE.test(chordStr)) return chordStr;
  const newRoot = transposeRoot(p.root, semitones);
  const newBass = p.bass ? transposeRoot(p.bass, semitones) : null;
  return newRoot + p.desc + (newBass? '/'+newBass:'');
}

function detectChordsInText(text){
  const found=[];
  let m;
  while((m=CHORD_EXTRACT_RE.exec(text))!==null){
    const tok=m[1];
    if(isChordToken(tok)) found.push({token:tok, index:m.index});
  }
  return found;
}

// --- Estado global temporal y persistente ---
let rawText = "";
let songTitle = "";
let songArtist = "";
let lines = []; // {type:'chord'|'lyric'|'empty', text:string} — solo cuerpo desde línea 3
let originalKeyIdx = null; // 0-11
let originalIsMinor = false; // calidad de la tonalidad original (para relativa)
let transposeSemitones = 0;
let capoFret = 0;
let chordErrors = [];
let sections = []; // {title, id, lineIdx}

let currentSongId = null;
let currentSetlistId = 'all';
let pendingSaveSong = null;

// Extrae título (línea 1) y artista (línea 2) como campos independientes.
// Siempre las primeras dos líneas no vacías son título y artista; el resto es cuerpo del cifrado.
function extractMetadata(fullText){
  const all = fullText.split(/\r?\n/);
  let idxTitle = -1, idxArtist = -1;
  for(let i=0;i<all.length;i++){ if(all[i].trim()!==""){ idxTitle=i; break; } }
  if(idxTitle!==-1){
    for(let i=idxTitle+1;i<all.length;i++){ if(all[i].trim()!==""){ idxArtist=i; break; } }
  }
  let title="", artist="", body="";
  if(idxTitle!==-1){ title = all[idxTitle].trim(); }
  if(idxArtist!==-1){ artist = all[idxArtist].trim(); }
  // cuerpo: todo después de la línea del artista (preserva líneas vacías)
  let bodyStart = idxArtist!==-1 ? idxArtist+1 : (idxTitle!==-1 ? idxTitle+1 : 0);
  // si no había artista pero había título, bodyStart ya está bien
  // Evitar incluir un separador vacío extra inicial innecesario: mantiene tal cual
  body = all.slice(bodyStart).join('\n');
  // Si solo había 0-1 líneas no vacías y el resto vacío, body puede ser ""
  return { title, artist, body };
}

function loadDocument(fullText){
  rawText = (fullText || '').replace(/	+/g, ' ');
  const meta = extractMetadata(rawText);
  songTitle = meta.title;
  songArtist = meta.artist;
  // si no hay título/artista, body es todo el texto (compatibilidad)
  // parseRawText solo sobre el cuerpo para no confundir acordes con título
  lines = parseRawText(meta.body);
  originalKeyIdx = detectOriginalKey(lines);
  // Detecta si la tonalidad original es menor (primer acorde menor) para la relativa del círculo de quintas
  originalIsMinor = false;
  for(const l of lines){
    if(l.type==='chord'){
      const toks = l.text.trim().replace(/\./g,' ').replace(/\|/g,' ').replace(/\s+\/\s+|\s+\/|\/\s+/g,' ').split(/[\s\-]+/).filter(Boolean);
      for(const t of toks){
        if(isChordToken(t)){
          const p=parseChordNote(t);
          if(p) { originalIsMinor = /m(?!aj)/.test(p.desc) && !/maj/i.test(p.desc); break; }
        }
      }
      break;
    }
  }
  if(originalKeyIdx!==null) document.getElementById('keySelect').value = originalKeyIdx;
  else document.getElementById('keySelect').value = "7";
  // transpose se resetea al cargar nuevo documento
  transposeSemitones = 0;
  renderSheet();
  updateScaleBox();
}

// --- Secciones: detección de bloques como *Coro*, *Precoro*, *Solo de Guitarra*, [Puente] etc. ---
function normalizeSectionTitle(raw){
  const trimmed = raw.trim();
  if(!trimmed) return '';
  return trimmed.split(/\s+/).map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
}
function detectSection(line){
  const t = line.trim();
  if(!t) return null;
  // 1. Patrón principal: todo lo encerrado entre asteriscos (*Precoro*, **Solo**, * Pre-coro 1 *, etc.)
  let m = t.match(/^\s*\*+\s*(.+?)\s*\*+\s*$/);
  if(m && m[1].trim()) return normalizeSectionTitle(m[1]);
  // 2. Alternativos: encerrado entre corchetes [sección] o paréntesis (sección)
  m = t.match(/^\s*[\[\(]\s*(.+?)\s*[\]\)]\s*$/);
  if(m && m[1].trim()) return normalizeSectionTitle(m[1]);
  // 3. Alternativos: encerrado entre guiones o iguales --- sección --- , === sección ===
  m = t.match(/^\s*[-=]{2,}\s*(.+?)\s*[-=]{2,}\s*$/);
  if(m && m[1].trim()) return normalizeSectionTitle(m[1]);
  return null;
}

// --- Escala para improvisar (círculo de quintas) ---
function noteDisplay(idx){
  const n = ((idx%12)+12)%12;
  const sharp = CHROMATIC_SHARP[n];
  const flat = SHARP_TO_FLAT[sharp];
  return flat ? `${sharp} / ${flat}` : sharp;
}
function scaleNotes(rootIdx, intervals){
  return intervals.map(semi=> noteDisplay((rootIdx+semi)%12));
}
// Actualiza subsección Escala: muestra relativa y se ajusta al transponer (círculo de quintas)
function updateScaleBox(){
  const box = document.getElementById('scaleBox');
  const main = document.getElementById('scaleMain');
  const notesEl = document.getElementById('scaleNotes');
  const pentEl = document.getElementById('scalePentatonic');
  const circleEl = document.getElementById('scaleCircle');
  if(!box||!main) return;
  const sel = document.getElementById('keySelect');
  let currentIdx = sel ? parseInt(sel.value,10) : originalKeyIdx;
  if(isNaN(currentIdx)) currentIdx = originalKeyIdx ?? 0;
  // Si no hay documento, usa la tónica seleccionada asumiendo mayor (para preview)
  let isMinor = originalIsMinor;
  // Si no hay líneas con acordes, asume mayor para no confundir
  if(originalKeyIdx===null) isMinor=false;

  // Tonalidad actual (con transposición)
  const tonalidadRoot = noteDisplay(currentIdx);
  const tonalidadTipo = isMinor ? 'menor' : 'mayor';

  // Relativa (círculo de quintas): mayor -> menor relativa (6º grado, -3 semitonos), menor -> mayor relativa (+3)
  const relativaIdx = isMinor ? (currentIdx+3)%12 : (currentIdx+9)%12;
  const relativaTipo = isMinor ? 'mayor' : 'menor';
  const relativaName = noteDisplay(relativaIdx) + (isMinor ? '' : 'm');
  const relativaDisplay = isMinor ? `${noteDisplay(relativaIdx)} mayor` : `${noteDisplay(relativaIdx)}m`;

  // Intervalos
  const MAJOR = [0,2,4,5,7,9,11];
  const MINOR_NAT = [0,2,3,5,7,8,10];
  const PENT_MAJOR = [0,2,4,7,9];
  const PENT_MINOR = [0,3,5,7,10];

  // Escala de la tonalidad actual (para contexto) y escala recomendada para improvisar (relativa pentatónica)
  const tonalidadScale = isMinor ? scaleNotes(currentIdx, MINOR_NAT) : scaleNotes(currentIdx, MAJOR);
  const improvRoot = relativaIdx; // Bm para D mayor es la que se pisa
  const improvScale = isMinor ? scaleNotes(improvRoot, MAJOR) : scaleNotes(improvRoot, MINOR_NAT);
  const pentScale = isMinor ? scaleNotes(improvRoot, PENT_MAJOR) : scaleNotes(improvRoot, PENT_MINOR);
  const pentTipo = isMinor ? 'pentatónica mayor' : 'pentatónica menor';

  // Vecinos círculo de quintas (5ª y 4ª)
  const fifthIdx = (currentIdx+7)%12;
  const fourthIdx = (currentIdx+5)%12; // -7
  const fifthName = noteDisplay(fifthIdx) + (isMinor ? 'm' : '');
  const fourthName = noteDisplay(fourthIdx) + (isMinor ? 'm' : '');

  // Render principal minimalista: ej. "D mayor → Bm" (sin texto extra)
  const tonalidadFull = `${tonalidadRoot} ${tonalidadTipo}`;
  main.innerHTML = `${tonalidadFull} <span style="opacity:.45">→</span> ${relativaDisplay}`;

  // Notas: pinta escala recomendada con tónica destacada y pentatónica marcada
  if(notesEl){
    const allNotes = improvScale;
    const pentSet = new Set(pentScale);
    notesEl.innerHTML = allNotes.map((n,i)=>{
      const isRoot = i===0;
      const isPent = pentSet.has(n.split(' / ')[0]) || pentSet.has(n);
      // Compara por pitch: normaliza a índice
      const idx = (improvRoot + (isMinor ? [0,2,3,5,7,8,10][i] : [0,2,4,5,7,9,11][i]))%12;
      const pentIdxs = isMinor ? PENT_MAJOR.map(s=> (improvRoot+s)%12) : PENT_MINOR.map(s=> (improvRoot+s)%12);
      const isPentPitch = pentIdxs.includes(idx);
      return `<span class="scale-note ${isRoot?'root':''} ${isPentPitch?'pent':''}" title="${isPentPitch?pentTipo:''}">${n}</span>`;
    }).join('');
  }
  if(pentEl){
    pentEl.innerHTML = `◉ <strong>${relativaDisplay}</strong> ${pentTipo}: <code>${pentScale.join(' – ')}</code> <span style="opacity:.7">· escala completa: ${improvScale.join(' – ')}</span>`;
  }
  if(circleEl){
    circleEl.innerHTML = `<span style="opacity:.7">Vecinas:</span> <strong>${fifthName}</strong> (5ª) · <strong>${fourthName}</strong> (4ª)`;
  }
  box.style.display='';
}
// Toggle detalles escala — botón solo flecha (minimalista)
document.getElementById('btnToggleScale')?.addEventListener('click', ()=>{
  const det=document.getElementById('scaleDetails');
  const btn=document.getElementById('btnToggleScale');
  if(!det||!btn) return;
  const hidden=det.classList.toggle('hidden');
  btn.textContent = hidden ? '▾' : '▴';
  btn.title = hidden ? 'Ver detalles' : 'Ocultar detalles';
});

// --- Biblioteca diagramas ---
// frets: array 6 (EADGBE low to high): -1 mute, 0 open, 1.. etc. fingers optional. barres: [{fret, fromString, toString}]
const CHORD_SHAPES = {
  // mayores abiertos y base
  'C':  { frets:[-1,3,2,0,1,0], fingers:[0,3,2,0,1,0], barres:[] },
  'C#': { frets:[-1,4,3,1,1,1], fingers:[0,3,2,1,1,1], barres:[{fret:1, from:3,to:5}] },
  'D':  { frets:[-1,-1,0,2,3,2], fingers:[0,0,0,1,3,2], barres:[] },
  'D#': { frets:[-1,-1,1,3,4,3], fingers:[0,0,1,2,3,2], barres:[] },
  'E':  { frets:[0,2,2,1,0,0], fingers:[0,2,3,1,0,0], barres:[] },
  'F':  { frets:[1,3,3,2,1,1], fingers:[1,3,4,2,1,1], barres:[{fret:1,from:0,to:5}] },
  'F#': { frets:[2,4,4,3,2,2], fingers:[1,3,4,2,1,1], barres:[{fret:2,from:0,to:5}] },
  'G':  { frets:[3,2,0,0,0,3], fingers:[2,1,0,0,0,3], barres:[] },
  'G#': { frets:[4,3,1,1,1,4], fingers:[3,2,1,1,1,4], barres:[{fret:1,from:2,to:4}] },
  'A':  { frets:[-1,0,2,2,2,0], fingers:[0,0,1,2,3,0], barres:[] },
  'A#': { frets:[-1,1,3,3,3,1], fingers:[0,1,2,3,4,1], barres:[{fret:1,from:1,to:5}] },
  'B':  { frets:[-1,2,4,4,4,2], fingers:[0,1,2,3,4,1], barres:[{fret:2,from:1,to:5}] },
  // menores
  'Am': { frets:[-1,0,2,2,1,0], fingers:[0,0,2,3,1,0], barres:[] },
  'A#m':{ frets:[-1,1,3,3,2,1], fingers:[0,1,3,4,2,1], barres:[{fret:1,from:1,to:5}] },
  'Bm': { frets:[-1,2,4,4,3,2], fingers:[0,1,3,4,2,1], barres:[{fret:2,from:1,to:5}] },
  'Cm': { frets:[-1,3,5,5,4,3], fingers:[0,1,3,4,2,1], barres:[{fret:3,from:1,to:5}] },
  'C#m':{ frets:[-1,4,6,6,5,4], fingers:[0,1,3,4,2,1], barres:[{fret:4,from:1,to:5}] },
  'Dm': { frets:[-1,-1,0,2,3,1], fingers:[0,0,0,2,3,1], barres:[] },
  'D#m':{ frets:[-1,-1,1,3,4,2], fingers:[0,0,1,3,4,2], barres:[] },
  'Em': { frets:[0,2,2,0,0,0], fingers:[0,2,3,0,0,0], barres:[] },
  'Fm': { frets:[1,3,3,1,1,1], fingers:[1,3,4,1,1,1], barres:[{fret:1,from:0,to:5}] },
  'F#m':{ frets:[2,4,4,2,2,2], fingers:[1,3,4,1,1,1], barres:[{fret:2,from:0,to:5}] },
  'Gm': { frets:[3,5,5,3,3,3], fingers:[1,3,4,1,1,1], barres:[{fret:3,from:0,to:5}] },
  'G#m':{ frets:[4,6,6,4,4,4], fingers:[1,3,4,1,1,1], barres:[{fret:4,from:0,to:5}] },
  // 7
  'C7': { frets:[-1,3,2,3,1,0], fingers:[0,3,2,4,1,0], barres:[] },
  'D7': { frets:[-1,-1,0,2,1,2], fingers:[0,0,0,2,1,3], barres:[] },
  'E7': { frets:[0,2,0,1,0,0], fingers:[0,2,0,1,0,0], barres:[] },
  'G7': { frets:[3,2,0,0,0,1], fingers:[3,2,0,0,0,1], barres:[] },
  'A7': { frets:[-1,0,2,0,2,0], fingers:[0,0,2,0,3,0], barres:[] },
  'Am7':{ frets:[-1,0,2,0,1,0], fingers:[0,0,2,0,1,0], barres:[] },
  'Em7':{ frets:[0,2,0,0,0,0], fingers:[0,2,0,0,0,0], barres:[] },
  'Dm7':{ frets:[-1,-1,0,2,1,1], fingers:[0,0,0,2,1,1], barres:[] },
};

// Generador fallback para acordes no mapeados: usa forma mayor/menor con cejilla
function generateBarreShape(chordStr){
  const p = parseChordNote(chordStr);
  if(!p) return null;
  const isMinor = /m(?!aj)/.test(p.desc) && !/maj/.test(p.desc);
  const rootIdx = rootIndex(p.root);
  if(rootIdx===-1) return null;
  let fret = (rootIdx - 4 + 12)%12;
  let frets;
  if(isMinor){
    if(fret===0) frets=[0,2,2,0,0,0];
    else frets=[fret, fret+2, fret+2, fret, fret, fret];
  } else {
    if(fret===0) frets=[0,2,2,1,0,0];
    else frets=[fret, fret+2, fret+2, fret+1, fret, fret];
  }
  if(fret>7){
    const aFret = (rootIdx - 9 +12)%12;
    if(isMinor) frets=[-1, aFret, aFret+2, aFret+2, aFret+1, aFret];
    else frets=[-1, aFret, aFret+2, aFret+2, aFret+2, aFret];
    return { frets, barres: aFret>0 ? [{fret:aFret, from:1, to:5}] : [] };
  }
  return { frets, barres: fret>0 ? [{fret, from:0,to:5}] : [] };
}

function getDiagram(chordStr){
  if(CHORD_SHAPES[chordStr]) return CHORD_SHAPES[chordStr];
  const p = parseChordNote(chordStr);
  if(!p) return null;
  const sharpRoot = normalizeRoot(p.root);
  const normalized = sharpRoot + p.desc + (p.bass? '/'+ normalizeRoot(p.bass):'');
  if(CHORD_SHAPES[normalized]) return CHORD_SHAPES[normalized];
  if(/^(m|7|m7|maj7|sus2|sus4)?$/.test(p.desc) || /m$/.test(p.desc) || p.desc==='' ){
    const gen = generateBarreShape(normalized);
    if(gen) return gen;
  }
  return null;
}

// SVG diagrama
function svgDiagram(chordName, shape){
  const frets = shape.frets; // 6
  // calcular baseFret: minimo fret >0
  const pressed = frets.filter(f=>f>0);
  let baseFret = 1;
  if(pressed.length){
    const min = Math.min(...pressed);
    baseFret = min>3 ? min : 1; // si todo en trastes altos, desplazar
    if(min>4) baseFret = min;
    // si baseFret>1, restar offset visual
  } else baseFret=1;
  const offset = baseFret-1;
  const W=140, H=160, left=20, top=30, cw=20, rh=22;
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  // Título ya se muestra en <h4> del card (corrige duplicado) — no se renderiza dentro del SVG
  // nut
  const nutY = top;
  // fret lines
  for(let f=0; f<=5; f++){
    const y = top + f*rh;
    const w = frets.length * cw - cw; // 5 gaps
    svg += `<line x1="${left}" y1="${y}" x2="${left+5*cw}" y2="${y}" stroke="${f===0 && baseFret===1 ? '#f1f1f3':'#555'}" stroke-width="${f===0 && baseFret===1 ? 4:1}"/>`;
  }
  // strings
  for(let s=0;s<6;s++){
    const x = left + s*cw;
    svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top+5*rh}" stroke="#888" stroke-width="1.2"/>`;
  }
  // base fret label
  if(baseFret>1){
    svg+= `<text x="${left-8}" y="${top+rh*1.2}" font-size="10" fill="#9aa0a6" text-anchor="middle">${baseFret}fr</text>`;
  }
  // barres
  if(shape.barres){
    for(const b of shape.barres){
      const bf = b.fret - offset;
      if(bf<1||bf>5) continue;
      const y = top + (bf-0.5)*rh;
      const x1 = left + b.from*cw;
      const x2 = left + b.to*cw;
      svg += `<rect x="${x1-6}" y="${y-6}" width="${x2-x1+12}" height="12" rx="6" fill="#ffb84d"/>`;
    }
  }
  // dots & mutes
  const openY = top-12;
  for(let s=0;s<6;s++){
    const f = frets[s];
    const x = left + s*cw;
    if(f===-1){
      svg+= `<text x="${x}" y="${openY}" text-anchor="middle" font-size="12" fill="#ff6b6b">×</text>`;
    } else if(f===0){
      svg+= `<circle cx="${x}" cy="${openY}" r="5" fill="none" stroke="#9aa0a6" stroke-width="1.2"/>`;
    } else {
      const df = f - offset;
      if(df>=1 && df<=5){
        const y = top + (df-0.5)*rh;
        // si hay barre en ese fret y string dentro del barre, no duplicar dot (ya dibujado barre) pero dibujar igual? Omitir si barre cubre
        let inBarre=false;
        if(shape.barres){
          for(const b of shape.barres){ if(b.fret===f && s>=b.from && s<=b.to) inBarre=true; }
        }
        if(!inBarre){
          svg+= `<circle cx="${x}" cy="${y}" r="8" fill="#ffb84d" stroke="#ffb84d"/>`;
        } else {
          // pequeño punto dentro del barre
          svg+= `<circle cx="${x}" cy="${y}" r="3" fill="#222"/>`;
        }
      } else if(df>5){
        // fuera de vista: indicar con número
      }
    }
  }
  // string names EADGBE
  const strings=['E','A','D','G','B','E'];
  for(let s=0;s<6;s++){
    svg+= `<text x="${left+s*cw}" y="${top+5*rh+14}" text-anchor="middle" font-size="9" fill="#9aa0a6">${strings[s]}</text>`;
  }
  svg+= `</svg>`;
  return svg;
}

// --- Parser de texto a líneas ---
function parseRawText(text){
  chordErrors=[];
  sections=[];
  const rawLines = text.split(/\r?\n/);
  const out=[];
  // Heurística: si una línea tiene >50% tokens que son acordes, es línea de acordes.
  // Separadores soportados: espacios, '-', '/', '.' y '|' (p. ej. "G - D / Em . C" o "Am-Dm") además de espacios.
  // Para '/' se distingue separador " / " (con espacios) de bajo "C/E" (sin espacios) — este último se preserva.
  for(let i=0;i<rawLines.length;i++){
    const line = rawLines[i];
    if(line.trim()===""){ out.push({type:'empty', text:''}); continue; }
    // Detecta sección antes de análisis de acordes (patrón recomendado: *Coro*, *Verso 1*, [Puente] etc.)
    const sec = detectSection(line);
    if(sec){
      const id = 'sec-' + sections.length;
      sections.push({title: sec, id, lineIdx: out.length});
      out.push({type:'section', text: sec, raw: line, id});
      continue;
    }
    // Normaliza separadores para conteo: '.' y '|' -> espacio; '/' con espacios -> espacio; '-' se mantiene como separador
    let norm = line.trim().replace(/\./g, ' ').replace(/\|/g, ' ');
    norm = norm.replace(/\s+\/\s+|\s+\/|\/\s+/g, ' ');
    const tokens = norm.split(/[\s\-]+/).filter(Boolean);
    let chordCount=0;
    for(const t of tokens) if(isChordToken(t)) chordCount++;
    const density = tokens.length? chordCount/tokens.length :0;
    const isChordLine = (density>=0.5 && chordCount>=1) || (chordCount>=2 && density>=0.3);
    if(isChordLine){
      out.push({type:'chord', text:line});
      for(const tok of tokens){
        if(/^[A-G][#b]?/.test(tok) && !isChordToken(tok)){
          chordErrors.push(tok);
        }
      }
    } else {
      out.push({type:'lyric', text:line});
    }
  }
  return out;
}

function detectOriginalKey(lines){
  for(const l of lines){
    if(l.type==='chord'){
      const m = l.text.match(/[A-G][#b]?/);
      if(m){
        // extraer primer token válido (soporta '-', '/', '.' y '|' como separadores)
        let norm = l.text.trim().replace(/\./g, ' ').replace(/\|/g, ' ');
        norm = norm.replace(/\s+\/\s+|\s+\/|\/\s+/g, ' ');
        const tokens = norm.split(/[\s\-]+/).filter(Boolean);
        for(const t of tokens){ if(isChordToken(t)){ const p=parseChordNote(t); if(p) return rootIndex(p.root); } }
      }
    }
  }
  return null;
}

function renderSheet(){
  const sheetEl = document.getElementById('sheet');
  const emptyEl = document.getElementById('emptyState');
  const headerEl = document.getElementById('songHeader');
  const titleEl = document.getElementById('songTitle');
  const artistEl = document.getElementById('songArtist');
  const capoBanner = document.getElementById('capoBanner');
  const capoBannerVal = document.getElementById('capoBannerVal');
  const hasContent = lines.length>0 || songTitle || songArtist;
  if(!hasContent){
    sheetEl.classList.add('hidden'); emptyEl.classList.remove('hidden');
    headerEl.classList.add('hidden');
    if(capoBanner) capoBanner.classList.add('hidden');
    document.getElementById('diagramList').innerHTML='';
    document.getElementById('diagramCount').textContent='0 acordes';
    renderSections();
    return;
  }
  emptyEl.classList.add('hidden'); sheetEl.classList.remove('hidden');
  // Header independiente: estilo diferenciado, no forma parte del cifrado
  if(songTitle || songArtist){
    headerEl.classList.remove('hidden');
    titleEl.textContent = songTitle || 'Sin título';
    titleEl.style.display = songTitle ? '' : 'none';
    artistEl.textContent = songArtist || 'Artista desconocido';
    artistEl.style.display = songArtist ? '' : 'none';
    if(!songArtist) artistEl.classList.add('hidden'); else artistEl.classList.remove('hidden');
  } else {
    headerEl.classList.add('hidden');
  }
  // Banner capo: visible si traste 1-12, justo antes del cifrado (no olvidar ponerlo en la guitarra)
  if(capoBanner){
    if(capoFret>=1 && capoFret<=12){
      capoBanner.classList.remove('hidden');
      if(capoBannerVal) capoBannerVal.textContent = capoFret;
    } else {
      capoBanner.classList.add('hidden');
    }
  }
  sheetEl.innerHTML='';
  const uniqueChords = new Set();
  const errorsSet = new Set(chordErrors);

  // Vista en dos columnas (para cifrados extensos) — columnas personalizables en ancho
  const twoCols = document.getElementById('toggleColumns')?.checked;
  if(twoCols){
    sheetEl.classList.add('two-columns','grid-two');
    const leftPct = document.getElementById('colLeftRange')?.value || 50;
    const gap = document.getElementById('colGapRange')?.value || 24;
    sheetEl.style.setProperty('--col-left', leftPct + '%');
    sheetEl.style.setProperty('--col-right', (100 - leftPct) + '%');
    sheetEl.style.setProperty('--col-gap', gap + 'px');
  } else {
    sheetEl.classList.remove('two-columns','grid-two');
    sheetEl.style.removeProperty('--col-left');
    sheetEl.style.removeProperty('--col-right');
    sheetEl.style.removeProperty('--col-gap');
  }

  // Helper para crear línea DOM (incluye secciones) — con soporte de pares acorde+letra para conservar posición
  function createLineElement(l){
    const div = document.createElement('div');
    if(l.type==='section'){
      div.className='line section-line';
      div.id = l.id;
      div.textContent = l.text;
      div.setAttribute('data-section', l.text);
      return div;
    }
    if(l.type==='empty'){
      div.className='line';
      div.innerHTML='&nbsp;';
      return div;
    }
    div.className='line ' + (l.type==='chord'?'chord-line':'lyric-line');
    if(l.type==='chord'){
      const html = l.text.replace(CHORD_EXTRACT_RE, (match)=>{
        const t = match;
        if(isChordToken(t)){
          const transposed = transposeSemitones!==0 ? transposeChord(t, transposeSemitones) : t;
          uniqueChords.add(transposed);
          return `<span class="chord" data-chord="${transposed}">${transposed}</span>`;
        } else {
          if(/^[A-G][#b]?/.test(t)){
            chordErrors.push(t);
            return `<span class="chord err" title="Notación no reconocida">${t}</span>`;
          }
          return match;
        }
      });
      div.innerHTML = html;
    } else {
      // lyric sin acorde previo — se renderiza con estilo lyric independiente
      // Se envuelve en span.lyric para tamaño independiente
      const esc = l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      div.innerHTML = `<span class="lyric">${esc}</span>`;
    }
    return div;
  }

  // Crea un par acorde+letra como segmentos inline para conservar posición y permitir wrap conjunto
  function createPairElement(chordText, lyricText){
    const container = document.createElement('div');
    container.className='pair-line';
    // Encuentra acordes y sus índices en la línea de acordes
    const re = new RegExp(CHORD_EXTRACT_RE.source, 'g');
    const pos = [];
    let m;
    while((m=re.exec(chordText))!==null){
      const chord = m[1] || m[0];
      if(isChordToken(chord)){
        pos.push({chord, start:m.index, end:m.index+chord.length});
      }
    }
    // Si no hay acordes válidos, fallback a línea chord sola
    if(!pos.length){
      const div=document.createElement('div');
      div.className='line chord-line';
      div.textContent=chordText;
      return div;
    }
    const lyric = lyricText || '';
    // Segmento previo al primer acorde (letra sin acorde)
    if(pos[0].start>0){
      const segLyric = lyric.substring(0, pos[0].start);
      if(segLyric){
        const seg=document.createElement('div'); seg.className='segment';
        const c=document.createElement('span'); c.className='chord'; c.innerHTML='&nbsp;';
        const l=document.createElement('span'); l.className='lyric'; l.textContent=segLyric;
        seg.appendChild(c); seg.appendChild(l); container.appendChild(seg);
      }
    }
    // Segmentos por cada acorde
    for(let i=0;i<pos.length;i++){
      const cur=pos[i];
      const nextStart = (i+1<pos.length) ? pos[i+1].start : Math.max(chordText.length, lyric.length);
      const segLyric = lyric.substring(cur.start, nextStart);
      const seg=document.createElement('div'); seg.className='segment';
      const c=document.createElement('span'); c.className='chord';
      const transposed = transposeSemitones!==0 ? transposeChord(cur.chord, transposeSemitones) : cur.chord;
      uniqueChords.add(transposed);
      c.dataset.chord=transposed; c.textContent=transposed;
      c.style.cursor='pointer';
      c.addEventListener('click', (e)=>{
        e.stopPropagation();
        document.querySelectorAll('.diagram-card').forEach(card=>{
          const isTarget = card.querySelector('h4')?.textContent.trim()===transposed;
          card.style.outline = isTarget ? '2px solid var(--accent)' : 'none';
        });
        const targetCard=[...document.querySelectorAll('.diagram-card')].find(card=>card.querySelector('h4')?.textContent.trim()===transposed);
        if(targetCard) targetCard.scrollIntoView({behavior:'smooth', block:'nearest'});
      });
      const l=document.createElement('span'); l.className='lyric'; l.textContent=segLyric || ' ';
      seg.appendChild(c); seg.appendChild(l); container.appendChild(seg);
    }
    // Si lyric es más larga que último acorde, ya está incluido en último segmento (nextStart = lyric.length)
    // Si chord line es más larga que lyric, el último segmento ya incluye espacios restantes
    return container;
  }

  // Construye lista de bloques renderizables (pair / single / section / empty) para manejar wrap y columnas correctamente
  const blocks=[];
  for(let i=0;i<lines.length;){
    const cur=lines[i];
    const nxt=lines[i+1];
    if(cur.type==='chord' && nxt && nxt.type==='lyric'){
      // Par: conserva acorde sobre letra y wrap conjunto
      const pairEl=createPairElement(cur.text, nxt.text);
      blocks.push({el:pairEl, type:'pair', startIdx:i});
      i+=2;
    } else {
      const el=createLineElement(cur);
      blocks.push({el, type:cur.type, startIdx:i});
      i+=1;
    }
  }

  if(twoCols && blocks.length>4){
    const leftCol = document.createElement('div'); leftCol.className='col col-left';
    const rightCol = document.createElement('div'); rightCol.className='col col-right';
    sheetEl.appendChild(leftCol);
    sheetEl.appendChild(rightCol);
    // Calcula mid en términos de bloques, asegurando que la segunda columna inicie con par/acorde (no con lyric sola)
    let mid = Math.ceil(blocks.length/2);
    let adjustedMid = mid;
    while(adjustedMid < blocks.length && blocks[adjustedMid].type==='lyric'){
      adjustedMid++;
    }
    while(adjustedMid < blocks.length && blocks[adjustedMid].type==='empty'){
      adjustedMid++;
    }
    // Si cae en sección vacía sin acorde después, avanza
    while(adjustedMid < blocks.length && blocks[adjustedMid].type==='section'){
      const next = blocks[adjustedMid+1];
      if(next && (next.type==='pair' || next.type==='chord')) break;
      adjustedMid++;
    }
    if(adjustedMid >= blocks.length || adjustedMid - mid > 4){
      adjustedMid = mid;
      while(adjustedMid>0 && blocks[adjustedMid].type==='lyric') adjustedMid--;
      if(blocks[adjustedMid]?.type!=='pair' && blocks[adjustedMid]?.type!=='chord' && blocks[adjustedMid]?.type!=='section') adjustedMid=mid;
    }
    // Evita sección huérfana al final de la izquierda
    let leftEnd = adjustedMid -1;
    while(leftEnd>=0 && blocks[leftEnd].type==='empty') leftEnd--;
    if(leftEnd>=0 && blocks[leftEnd].type==='section'){
      adjustedMid = leftEnd;
    }
    mid = adjustedMid;
    if(mid<=0) mid=Math.ceil(blocks.length/2);
    if(mid>=blocks.length) mid=Math.floor(blocks.length/2);
    // Última salvaguarda: segunda columna debe iniciar con chord/pair/section (no lyric)
    if(blocks[mid]?.type==='lyric'){
      let fwd=mid; while(fwd<blocks.length && blocks[fwd].type==='lyric') fwd++;
      if(fwd<blocks.length && fwd-mid<3) mid=fwd;
    }
    blocks.forEach((b, idx)=>{
      (idx < mid ? leftCol : rightCol).appendChild(b.el);
    });
  } else {
    blocks.forEach(b=> sheetEl.appendChild(b.el));
  }

  // actualizar badge tonalidad
  const origBadge = document.getElementById('originalKey');
  if(originalKeyIdx!==null) origBadge.textContent = CHROMATIC_SHARP[originalKeyIdx];
  else origBadge.textContent='—';
  const info = document.getElementById('transposeInfo');
  if(transposeSemitones===0) info.textContent='';
  else info.textContent = (transposeSemitones>0? `+${transposeSemitones}`: `${transposeSemitones}`) + ' semitonos';

  // diagramas
  renderDiagrams([...uniqueChords]);
  // secciones navegables
  renderSections();

  // errors panel
  const errEl=document.getElementById('diagramErrors');
  if(chordErrors.length){
    errEl.classList.remove('hidden');
    const uniqErr=[...new Set(chordErrors)];
    errEl.innerHTML = `<strong>⚠ Notación no reconocida:</strong> ${uniqErr.map(e=>`<code>${e}</code>`).join(', ')}`;
  } else errEl.classList.add('hidden');

  // Fix: re-sincronizar visibilidad y layout de paneles tras cada render
  // Dispara change en ambos switches para que el panel ajuste display y el grid se recalcule
  requestAnimationFrame(() => {
    document.getElementById('toggleDiagrams')?.dispatchEvent(new Event('change'));
    document.getElementById('toggleSections')?.dispatchEvent(new Event('change'));
  });
}

function renderSections(){
  const list = document.getElementById('sectionsList');
  const fsList = document.getElementById('fsSectionsList');
  const countEl = document.getElementById('sectionsCount');
  if(!list) return;
  list.innerHTML='';
  if(fsList) fsList.innerHTML='';
  if(countEl) countEl.textContent = `${sections.length} ${sections.length===1?'sección':'secciones'}`;
  if(!sections.length){
    list.innerHTML='<p class="hint" style="padding:8px">Sin secciones. Usa <code>*Coro*</code>, <code>*Verso 1*</code>, <code>*Puente*</code> etc. encerradas entre <code>*</code> para crearlas.</p>';
    if(fsList) fsList.innerHTML='<p class="hint" style="padding:8px;font-size:.78rem">Sin secciones detectadas</p>';
    return;
  }
  function makeSectionBtn(sec){
    const btn = document.createElement('button');
    btn.className='section-link';
    btn.textContent = sec.title;
    btn.title = `Ir a ${sec.title}`;
    btn.addEventListener('click', ()=>{
      const target = document.getElementById(sec.id);
      if(target){
        const sc = (typeof getScrollContainer === 'function') ? getScrollContainer() : document.querySelector('.sheet-area');
        const top = target.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
        sc.scrollTo({top, behavior:'smooth'});
        target.style.transition='background .3s';
        target.style.background='rgba(255,59,48,.12)';
        setTimeout(()=> target.style.background='', 1200);
        // marca activo en ambas listas
        document.querySelectorAll('.section-link').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll(`.section-link`).forEach(b=>{ if(b.textContent===sec.title) b.classList.add('active'); });
      }
    });
    return btn;
  }
  sections.forEach(sec => {
    list.appendChild(makeSectionBtn(sec));
    if(fsList) fsList.appendChild(makeSectionBtn(sec));
  });
}

function renderDiagrams(chordNames){
  const list = document.getElementById('diagramList');
  const count = document.getElementById('diagramCount');
  list.innerHTML='';
  // deduplicar, ordenar por aparición
  const seen=new Set();
  const uniq=[];
  for(const c of chordNames){ if(!seen.has(c)){ seen.add(c); uniq.push(c);} }
  count.textContent = `${uniq.length} acorde${uniq.length!==1?'s':''} único${uniq.length!==1?'s':''}`;
  for(const name of uniq){
    const shape = getDiagram(name);
    const card=document.createElement('div');
    card.className='diagram-card';
    if(!shape){
      card.innerHTML=`<h4>${name}</h4><p class="hint">Diagrama no disponible<br><code>${name}</code> no reconocido</p>`;
    } else {
      card.innerHTML=`<h4>${name}</h4>${svgDiagram(name, shape)}`;
    }
    // click en diagrama resalta acorde en sheet
    card.style.cursor='pointer';
    card.addEventListener('click',()=>{
      document.querySelectorAll('.sheet .chord').forEach(el=>{
        el.style.background = el.dataset.chord===name ? 'rgba(255,184,77,.25)' : '';
      });
      // scroll to first occurrence
      const first=document.querySelector(`.sheet .chord[data-chord="${CSS.escape(name)}"]`);
      if(first) first.scrollIntoView({behavior:'smooth', block:'center'});
    });
    list.appendChild(card);
  }
}

// --- PDF Handling ---
async function handlePDF(file){
  if(!file) return;
  toast('Leyendo PDF…');
  try{
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    let fullText='';
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Agrupar items por y (línea). Items con misma y son misma línea.
      const items = content.items;
      // ordenar por y descendente, luego x
      items.sort((a,b)=>{
        if(Math.abs(b.transform[5]-a.transform[5])>2) return b.transform[5]-a.transform[5];
        return a.transform[0]-b.transform[0];
      });
      let currentY=null;
      let line='';
      for(const it of items){
        const y = it.transform[5];
        const str = it.str;
        if(currentY===null) currentY=y;
        if(Math.abs(y-currentY)>4){
          fullText += line + "\n";
          line = str;
          currentY=y;
        } else {
          // añadir espacio si hay gap
          const x = it.transform[4];
          // simple: añadir espacio
          line += (line && !line.endsWith(' ') ? ' ' : '') + str;
        }
      }
      if(line) fullText += line + "\n";
      fullText += "\n";
    }
    const trimmed = fullText.trim();
    if(!trimmed){
      toast('PDF sin texto seleccionable');
      return;
    }
    loadDocument(trimmed);
    toast(`PDF cargado: ${pdf.numPages} página(s)`);
  }catch(e){
    console.error(e);
    toast('Error al leer PDF: '+e.message);
  }
}

// --- Edit modal ---
function openEdit(){
  document.getElementById('editTitle').value = songTitle;
  document.getElementById('editArtist').value = songArtist;
  // Para secciones, restaura el raw con *...* para que el patrón no se pierda al guardar
  document.getElementById('editArea').value = lines.map(l=> l.type==='section' ? (l.raw || `*${l.text}*`) : l.text).join('\n');
  const sw = document.getElementById('editIncludeHeader');
  if(sw){
    sw.checked = false;
    // habilita campos título/artista por defecto
    document.getElementById('editTitle').disabled = false;
    document.getElementById('editArtist').disabled = false;
    document.getElementById('editTitle').style.opacity = '1';
    document.getElementById('editArtist').style.opacity = '1';
  }
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEdit(){ document.getElementById('editModal').classList.add('hidden'); }
function saveEdit(){
  const includeHeader = document.getElementById('editIncludeHeader')?.checked;
  let full;
  if(includeHeader){
    const pasted = document.getElementById('editArea').value;
    full = pasted.trim() ? pasted : [document.getElementById('editTitle').value.trim(), document.getElementById('editArtist').value.trim(), pasted].join('\n');
    const nonEmpty = pasted.split(/\r?\n/).filter(l=>l.trim()!=='').length;
    if(nonEmpty < 2){
      toast('Aviso: no se detectó encabezado en el texto pegado — se usaron los campos Título/Artista');
      const newTitle = document.getElementById('editTitle').value.trim();
      const newArtist = document.getElementById('editArtist').value.trim();
      const body = document.getElementById('editArea').value;
      full = [newTitle, newArtist, body].join('\n');
    }
  } else {
    const newTitle = document.getElementById('editTitle').value.trim();
    const newArtist = document.getElementById('editArtist').value.trim();
    const body = document.getElementById('editArea').value;
    full = [newTitle, newArtist, body].join('\n');
  }
  loadDocument(full);
  closeEdit();
  saveCurrentSongAction();
}
// Switch en modal: deshabilita campos Título/Artista cuando el pegado trae encabezado
document.getElementById('editIncludeHeader')?.addEventListener('change', e=>{
  const on = e.target.checked;
  const t = document.getElementById('editTitle');
  const a = document.getElementById('editArtist');
  t.disabled = on;
  a.disabled = on;
  t.style.opacity = on ? '0.5' : '1';
  a.style.opacity = on ? '0.5' : '1';
});

// --- Autoscroll ---
let scrollRunning=false;
let scrollRAF=null;
let lastTS=null;
let scrollAccum=0;
function getScrollContainer(){
  const viewer = document.getElementById('viewer');
  const isFs = !!document.fullscreenElement || viewer?.classList.contains('is-fullscreen');
  // En pantalla completa el que scrollea es #viewer (fullscreen), si no es .sheet-area
  if(isFs) return viewer;
  return document.querySelector('.sheet-area');
}
function autoscrollStep(ts){
  if(!scrollRunning) return;
  if(lastTS===null) lastTS=ts;
  const dt = ts-lastTS;
  lastTS=ts;
  const speed = parseInt(document.getElementById('speedRange').value,10); // 1-10
  const pxPerMs = speed * 0.007; // 0.007..0.07 px/ms => ~7..70 px/s — recalibrado: 1≈7px/s, 2≈14px/s, 3≈21px/s (antes con 0.009 era 9/18/27, con 0.0045 no se movía por subpíxel)
  const scroller = getScrollContainer();
  if(!scroller) return;
  // Acumula subpíxeles para que 1,2,3 sí avancen (evita que 0.07px/frame se pierda por scrollTop entero)
  scrollAccum += pxPerMs * dt;
  const delta = Math.floor(scrollAccum);
  if(delta > 0){
    scroller.scrollTop += delta;
    scrollAccum -= delta;
  }
  if(scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight -2){
    stopScroll();
    toast('Fin del cifrado');
    return;
  }
  scrollRAF = requestAnimationFrame(autoscrollStep);
}
function startScroll(){
  if(scrollRunning) return;
  scrollRunning=true;
  lastTS=null;
  scrollAccum=0;
  document.getElementById('btnPlay').classList.add('hidden');
  document.getElementById('btnPause').classList.remove('hidden');
  scrollRAF=requestAnimationFrame(autoscrollStep);
}
function stopScroll(){
  scrollRunning=false;
  if(scrollRAF) cancelAnimationFrame(scrollRAF);
  scrollRAF=null;
  document.getElementById('btnPlay').classList.remove('hidden');
  document.getElementById('btnPause').classList.add('hidden');
}

// --- DriveAdapter (arquitectura futura) ---
const DriveAdapter = {
  // Interfaz preparada para Google Drive API. Solo falta OAuth.
  // Métodos esperados:
  async pickAndLoad(accessToken){
    // Uso futuro con gapi / google picker
    // const res = await fetch('https://www.googleapis.com/drive/v3/files?...', {headers:{Authorization:`Bearer ${accessToken}`}})
    // const pdfBlob = await res.blob(); handlePDF(pdfBlob)
    console.log('DriveAdapter.pickAndLoad() placeholder — conectar con Google Picker API');
    toast('Integración Drive lista para conectar (ver DriveAdapter en app.js)');
  },
  async listFiles(accessToken){
    console.log('DriveAdapter.listFiles() placeholder');
    return [];
  }
};

// --- Helpers ---
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),2500);
}

// --- Sample ---
const SAMPLE_TEXT = `Camino Largo — Demo Integral
CifraViva Ensemble

*Intro*
C - G/B . Am - F | C / G | Am . F
C/E   D/F#   G - G/B

*Verso 1*
C               G/B
Caminé sin rumbo bajo el sol
Am              F
Buscando sombras en mi voz
C               G
El viento escribe mi canción
Am              F          G
Y el tiempo cura con su perdón

*Verso 2*
C               G/B
Desperté en calles sin final
Am              Fmaj7
Con acordes de un viejo bar
C               G
La luna guarda mi secreto
Am              F          Gsus4  G
Y el eco vuelve en tu recuerdo

*Puente*
Am7             D7
Puente de sueños por cruzar
F               G
Dejar el miedo atrás sin dudar
Em              Am
Susurros que me hacen despertar

*Coro*
C - G - Am - F | C - G - F - G
C               G
Quiero quedarme aquí a tu lado
Am              F
Aunque el mundo gire equivocado
C               G
Cantar las horas que han pasado
Am              F          G
Y no soltar lo que hemos soñado

*Verso 3*
C               G/B
No hay mapa que me haga volver
Am              F
Si tu voz me vuelve a entender
C               G
Cada nota es una promesa
Am              F          C/E  D7
Que flota leve en tu cabeza

*Bridge*
Em              Bm
Bridge de silencios y susurros
Am7             D7
Entre nieblas y arrullos
F               G
Todo vuelve a comenzar
Em              F
Y el silencio sabe cantar

*Coro*
C - G/B . Am - F | C / G - Am . F
C               G
Quiero quedarme aquí a tu lado
Am              F
Aunque el mundo gire equivocado
C               G/B
Cantar las horas que han pasado
Am              F          G
Y no soltar lo que hemos soñado

*Estribillo*
F  G  C  Am | F . G . C
F               G
Estribillo que no se termina
C               Am
Luz que nunca se apaga
F               D7
Somos verso y despedida

*Outro*
C  G/B  Am  F  |  C - G - C
C   Fm   C
*Salida*
C  G  C`;

function loadSample(){
  loadDocument(SAMPLE_TEXT);
  toast('Ejemplo cargado');
}

// --- Eventos ---
document.getElementById('pdfInput').addEventListener('change', e=> handlePDF(e.target.files[0]));
document.getElementById('btnEdit').addEventListener('click', openEdit);
document.getElementById('btnCloseEdit').addEventListener('click', closeEdit);
document.getElementById('btnCancelEdit').addEventListener('click', closeEdit);
document.getElementById('btnSaveEdit').addEventListener('click', saveEdit);
document.getElementById('btnSample').addEventListener('click', loadSample);
document.getElementById('linkSample').addEventListener('click', loadSample);
document.getElementById('editModal').addEventListener('click', e=>{ if(e.target.id==='editModal') closeEdit(); });

document.getElementById('keySelect').addEventListener('change', e=>{
  const newIdx=parseInt(e.target.value,10);
  if(originalKeyIdx===null){ originalKeyIdx=newIdx; transposeSemitones=0; renderSheet(); updateScaleBox(); return; }
  let diff = newIdx - originalKeyIdx;
  // normalizar -6..6? mantener diff directo 0-11; elegir camino más corto? Mantener lineal matemática simple como pide spec
  // transposición lineal: diff puede ser negativo si nueva tonalidad menor
  // Ajustar a rango -11..11 eligiendo menor distancia circular
  if(diff>6) diff-=12;
  if(diff<-6) diff+=12;
  transposeSemitones=diff;
  renderSheet();
  updateScaleBox();
});

const capoRange=document.getElementById('capoRange');
const capoVal=document.getElementById('capoVal');
const capoBadge=document.getElementById('capoBadge');
const capoBannerEl=document.getElementById('capoBanner');
const capoBannerValEl=document.getElementById('capoBannerVal');
function updateCapo(v){
  capoFret=v;
  capoVal.textContent=v;
  capoRange.value=v;
  if(v===0){ capoBadge.classList.add('hidden'); }
  else { capoBadge.classList.remove('hidden'); capoBadge.textContent=`CAPO ${v}ª casa`; }
  // Banner en cifrado (justo antes del cifrado) para no olvidar poner el capo
  if(capoBannerEl){
    if(v>=1 && v<=12){
      capoBannerEl.classList.remove('hidden');
      if(capoBannerValEl) capoBannerValEl.textContent=v;
    } else {
      capoBannerEl.classList.add('hidden');
    }
  }
}
capoRange.addEventListener('input', e=> updateCapo(parseInt(e.target.value,10)));
document.getElementById('capoPlus').addEventListener('click', ()=> updateCapo(Math.min(12, capoFret+1)));
document.getElementById('capoMinus').addEventListener('click', ()=> updateCapo(Math.max(0, capoFret-1)));

document.getElementById('btnPlay').addEventListener('click', startScroll);
document.getElementById('btnPause').addEventListener('click', stopScroll);
document.getElementById('btnTop').addEventListener('click', ()=>{ const sc=getScrollContainer(); sc.scrollTo({top:0, behavior:'smooth'}); stopScroll(); });
document.getElementById('speedRange').addEventListener('input', e=>{
  document.getElementById('speedVal').textContent=e.target.value;
});
function syncLayout(){
  const layout=document.querySelector('.layout');
  const diagOn=document.getElementById('toggleDiagrams')?.checked;
  const secOn=document.getElementById('toggleSections')?.checked;
  if(window.innerWidth<=980){
    // móvil: panels son fixed overlay, layout es 1fr
    layout.classList.remove('diagrams-hidden','sections-hidden','both-hidden');
    return;
  }
  layout.classList.toggle('diagrams-hidden', !diagOn && secOn);
  layout.classList.toggle('sections-hidden', diagOn && !secOn);
  layout.classList.toggle('both-hidden', !diagOn && !secOn);
  if(diagOn && secOn) layout.classList.remove('diagrams-hidden','sections-hidden','both-hidden');
  // Ajusta grid para casos donde JS previo tocó style
  if(!diagOn && !secOn) layout.style.gridTemplateColumns='1fr';
  else if(diagOn && secOn) { layout.style.gridTemplateColumns=''; layout.style.removeProperty('grid-template-columns'); }
  else if(diagOn && !secOn) layout.style.gridTemplateColumns='1fr 320px';
  else if(!diagOn && secOn) layout.style.gridTemplateColumns='1fr 260px';
}

document.getElementById('toggleDiagrams').addEventListener('change', e=>{
  const panel=document.getElementById('diagramPanel');
  const on=e.target.checked;
  if(window.innerWidth<=980){
    panel.classList.toggle('collapsed', !on);
  } else {
    panel.style.display = on ? 'flex' : 'none';
  }
  syncLayout();
});
document.getElementById('btnClosePanel').addEventListener('click', ()=>{
  document.getElementById('toggleDiagrams').checked=false;
  document.getElementById('toggleDiagrams').dispatchEvent(new Event('change'));
});
const toggleSecEl=document.getElementById('toggleSections');
const sectionsPanel=document.getElementById('sectionsPanel');
if(toggleSecEl && sectionsPanel){
  toggleSecEl.addEventListener('change', e=>{
    const on=e.target.checked;
    if(window.innerWidth<=980){
      sectionsPanel.classList.toggle('collapsed', !on);
    } else {
      sectionsPanel.style.display = on ? 'flex' : 'none';
    }
    syncLayout();
  });
  document.getElementById('btnCloseSections')?.addEventListener('click', ()=>{
    toggleSecEl.checked=false;
    toggleSecEl.dispatchEvent(new Event('change'));
  });
}

// Vista dos columnas — personalizable en ancho (para cifrados extensos)
const toggleCols = document.getElementById('toggleColumns');
const colSliders = document.getElementById('columnsSliders');
const colLeftRange = document.getElementById('colLeftRange');
const colGapRange = document.getElementById('colGapRange');
function syncColumnControls(){
  if(!toggleCols) return;
  colSliders.classList.toggle('hidden', !toggleCols.checked);
  document.getElementById('colLeftVal').textContent = colLeftRange.value + '%';
  document.getElementById('colGapVal').textContent = colGapRange.value + 'px';
  // Si ya hay contenido, re-renderiza para aplicar distribución / actualiza vars en vivo
  if(lines.length) renderSheet();
  else {
    const sheet=document.getElementById('sheet');
    if(!sheet.classList.contains('hidden')){
      sheet.style.setProperty('--col-left', colLeftRange.value+'%');
      sheet.style.setProperty('--col-right', (100-colLeftRange.value)+'%');
      sheet.style.setProperty('--col-gap', colGapRange.value+'px');
    }
  }
}
if(toggleCols){
  toggleCols.addEventListener('change', syncColumnControls);
  colLeftRange.addEventListener('input', ()=>{
    document.getElementById('colLeftVal').textContent = colLeftRange.value + '%';
    const sheet=document.getElementById('sheet');
    sheet.style.setProperty('--col-left', colLeftRange.value+'%');
    sheet.style.setProperty('--col-right', (100-colLeftRange.value)+'%');
  });
  colGapRange.addEventListener('input', ()=>{
    document.getElementById('colGapVal').textContent = colGapRange.value + 'px';
    document.getElementById('sheet').style.setProperty('--col-gap', colGapRange.value+'px');
  });
}

// Tamaño independiente acordes / letra — conserva posición (segmentos) y wrap conjunto
const chordSizeRange=document.getElementById('chordSizeRange');
const lyricSizeRange=document.getElementById('lyricSizeRange');
function syncFontSizes(){
  const sheet=document.getElementById('sheet');
  if(chordSizeRange){
    document.getElementById('chordSizeVal').textContent=chordSizeRange.value+'px';
    sheet.style.setProperty('--chord-size', chordSizeRange.value+'px');
  }
  if(lyricSizeRange){
    document.getElementById('lyricSizeVal').textContent=lyricSizeRange.value+'px';
    sheet.style.setProperty('--lyric-size', lyricSizeRange.value+'px');
  }
}
if(chordSizeRange) chordSizeRange.addEventListener('input', syncFontSizes);
if(lyricSizeRange) lyricSizeRange.addEventListener('input', syncFontSizes);
syncFontSizes();

// Ocultar panel de opciones + Pantalla completa (vista óptima vivo)
const toolbarEl = document.querySelector('.toolbar');
const btnToggleOptions = document.getElementById('btnToggleOptions');
const collapsibleActions = document.getElementById('collapsibleActions');
if(btnToggleOptions && toolbarEl){
  btnToggleOptions.addEventListener('click', ()=>{
    const hidden = toolbarEl.classList.toggle('hidden');
    if(collapsibleActions) collapsibleActions.classList.toggle('hidden', hidden);
    btnToggleOptions.textContent = hidden ? '🛠 Mostrar opciones' : '🛠 Ocultar opciones';
    btnToggleOptions.title = hidden ? 'Mostrar panel de opciones' : 'Ocultar panel de opciones';
  });
}
const viewerEl = document.getElementById('viewer');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnExitFullscreen = document.getElementById('btnExitFullscreen');
const fsControls = document.getElementById('fullscreenControls');
const fsPlay = document.getElementById('fsPlay');
const fsPause = document.getElementById('fsPause');
const fsTop = document.getElementById('fsTop');
const fsSectionsPanel = document.getElementById('fsSectionsPanel');
let fsSectionsVisible = false; // estado local del sidebar de secciones en fullscreen

function syncFullscreenUI(){
  const isFs = !!document.fullscreenElement || viewerEl.classList.contains('is-fullscreen');
  if(btnFullscreen) btnFullscreen.textContent = isFs ? '⛶ Salir' : '⛶ Pantalla completa';
  if(fsControls) fsControls.classList.toggle('hidden', !isFs);
  if(btnExitFullscreen) btnExitFullscreen.classList.toggle('hidden', !isFs);
  // Ocultar/mostrar sidebar de secciones en fullscreen
  if(fsSectionsPanel){
    if(!isFs){
      fsSectionsPanel.classList.add('hidden');
    } else {
      fsSectionsPanel.classList.toggle('hidden', !fsSectionsVisible);
    }
  }
  const fsSecBtn = document.getElementById('fsSectionsToggle');
  if(fsSecBtn){
    fsSecBtn.classList.toggle('active', isFs && fsSectionsVisible);
  }
  // sincroniza controles flotantes con estado real de autoscroll
  if(fsPlay && fsPause){
    const playing = typeof scrollRunning !== 'undefined' ? scrollRunning : false;
    fsPlay.classList.toggle('hidden', playing);
    fsPause.classList.toggle('hidden', !playing);
  }
}
async function enterFullscreen(){
  try{
    if(viewerEl.requestFullscreen) await viewerEl.requestFullscreen();
    else viewerEl.classList.add('is-fullscreen');
  } catch{
    viewerEl.classList.add('is-fullscreen');
  }
  syncFullscreenUI();
}
async function exitFullscreen(){
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
  } catch{}
  viewerEl.classList.remove('is-fullscreen');
  syncFullscreenUI();
}
if(btnFullscreen){
  btnFullscreen.addEventListener('click', ()=>{
    const isFs = !!document.fullscreenElement || viewerEl.classList.contains('is-fullscreen');
    if(isFs) exitFullscreen(); else enterFullscreen();
  });
}
if(btnExitFullscreen) btnExitFullscreen.addEventListener('click', exitFullscreen);
document.addEventListener('fullscreenchange', syncFullscreenUI);

// Toggle sidebar secciones en pantalla completa
document.getElementById('fsSectionsToggle')?.addEventListener('click', ()=>{
  fsSectionsVisible = !fsSectionsVisible;
  if(fsSectionsPanel) fsSectionsPanel.classList.toggle('hidden', !fsSectionsVisible);
  document.getElementById('fsSectionsToggle')?.classList.toggle('active', fsSectionsVisible);
});
document.getElementById('btnFsHideSections')?.addEventListener('click', ()=>{
  fsSectionsVisible = false;
  if(fsSectionsPanel) fsSectionsPanel.classList.add('hidden');
  document.getElementById('fsSectionsToggle')?.classList.remove('active');
});

// Importar Backup JSON desde el menú del logo
document.getElementById('jsonImportLogo')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if(file) handleImportJSON(file);
  e.target.value = ''; // reset para poder reimportar el mismo archivo
});
document.addEventListener('webkitfullscreenchange', syncFullscreenUI);
// Controles flotantes en vivo — llaman directamente a lógica de autoscroll (corrige que antes delegaba a toolbar oculto y no scrolleaba viewer en fullscreen)
if(fsPlay) fsPlay.addEventListener('click', ()=>{ startScroll(); syncFullscreenUI(); });
if(fsPause) fsPause.addEventListener('click', ()=>{ stopScroll(); syncFullscreenUI(); });
if(fsTop) fsTop.addEventListener('click', ()=>{ const sc=getScrollContainer(); sc.scrollTo({top:0, behavior:'smooth'}); stopScroll(); syncFullscreenUI(); });
// Mantener sincronizado cuando cambia estado de play/pause principal
const _origStart = typeof startScroll !== 'undefined' ? startScroll : null;
const _origStop = typeof stopScroll !== 'undefined' ? stopScroll : null;
if(_origStart && _origStop){
  const mo = new MutationObserver(syncFullscreenUI);
  const bp = document.getElementById('btnPlay');
  const bpause = document.getElementById('btnPause');
  if(bp) mo.observe(bp, {attributes:true});
  if(bpause) mo.observe(bpause, {attributes:true});
}
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape' && viewerEl.classList.contains('is-fullscreen')){
    viewerEl.classList.remove('is-fullscreen');
    syncFullscreenUI();
  }
});

// Click en acorde del sheet: resaltar diagrama + autoscroll en panel de diagramas
document.addEventListener('click', e=>{
  if(e.target.classList.contains('chord') && e.target.dataset.chord){
    const name=e.target.dataset.chord;
    const cards = document.querySelectorAll('.diagram-card');
    let targetCard = null;
    cards.forEach(c=>{
      const isTarget = c.querySelector('h4')?.textContent.trim()===name;
      c.style.outline = isTarget ? '2px solid var(--accent)' : 'none';
      if(isTarget) targetCard = c;
    });
    // Autoscroll en la barra de diagramas para navegar al acorde clicado
    if(targetCard){
      const panel = document.getElementById('diagramPanel');
      // Si el panel está colapsado/oculto (móvil o toggle), abrirlo
      if(panel.classList.contains('collapsed')){
        panel.classList.remove('collapsed');
        document.getElementById('toggleDiagrams').checked = true;
      }
      if(panel.style.display==='none'){
        panel.style.display='flex';
        document.getElementById('toggleDiagrams').checked = true;
      }
      if(typeof syncLayout==='function') syncLayout();
      // Scroll suave dentro del contenedor de diagramas
      // Usa scrollIntoView con nearest para no mover la página principal
      targetCard.scrollIntoView({behavior:'smooth', block:'nearest', inline:'nearest'});
      // Pequeño highlight temporal
      targetCard.style.transition='outline 0.2s';
      setTimeout(()=>{ /* mantiene outline hasta próximo clic */ }, 1500);
    }
  }
});

// --- Módulo de Persistencia y Gestor de Setlists ---
const STORAGE_KEYS = {
  SONGS: 'cifraviva_songs_v1',
  SETLISTS: 'cifraviva_setlists_v1'
};

const StorageManager = {
  getSongs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SONGS);
      return data ? JSON.parse(data) : {};
    } catch(e) {
      console.error(e);
      return {};
    }
  },
  saveSong(song) {
    const songs = this.getSongs();
    songs[song.id] = song;
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
    return song;
  },
  deleteSong(id) {
    const songs = this.getSongs();
    if(songs[id]) {
      delete songs[id];
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
    }
    // Quitar de todas las setlists
    const setlists = this.getSetlists();
    let modified = false;
    Object.values(setlists).forEach(sl => {
      if(sl.songIds && sl.songIds.includes(id)) {
        sl.songIds = sl.songIds.filter(sId => sId !== id);
        modified = true;
      }
    });
    if(modified) localStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
  },
  findSongByTitleAndArtist(title, artist) {
    const songs = this.getSongs();
    const normT = (title || '').trim().toLowerCase();
    const normA = (artist || '').trim().toLowerCase();
    return Object.values(songs).find(s => 
      (s.title || '').trim().toLowerCase() === normT && (s.artist || '').trim().toLowerCase() === normA
    );
  },
  getSetlists() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETLISTS);
      return data ? JSON.parse(data) : {};
    } catch(e) {
      console.error(e);
      return {};
    }
  },
  saveSetlist(setlist) {
    const setlists = this.getSetlists();
    setlists[setlist.id] = setlist;
    localStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
    return setlist;
  },
  deleteSetlist(id) {
    const setlists = this.getSetlists();
    if(setlists[id]) {
      delete setlists[id];
      localStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
    }
  },
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.SONGS);
    localStorage.removeItem(STORAGE_KEYS.SETLISTS);
  }
};

function getCurrentStateConfig() {
  const selKey = document.getElementById('keySelect');
  const spRange = document.getElementById('speedRange');
  const chRange = document.getElementById('chordSizeRange');
  const lyRange = document.getElementById('lyricSizeRange');
  const togCol = document.getElementById('toggleColumns');
  const colLeftR = document.getElementById('colLeftRange');
  const colGapR = document.getElementById('colGapRange');
  const togDiag = document.getElementById('toggleDiagrams');
  const togSec = document.getElementById('toggleSections');

  return {
    keyIdx: selKey ? parseInt(selKey.value, 10) : 7,
    transposeSemitones: typeof transposeSemitones !== 'undefined' ? transposeSemitones : 0,
    capoFret: typeof capoFret !== 'undefined' ? capoFret : 0,
    speed: spRange ? parseInt(spRange.value, 10) : 3,
    chordSize: chRange ? parseInt(chRange.value, 10) : 15,
    lyricSize: lyRange ? parseInt(lyRange.value, 10) : 15,
    twoColumns: togCol ? !!togCol.checked : false,
    colLeft: colLeftR ? parseInt(colLeftR.value, 10) : 50,
    colGap: colGapR ? parseInt(colGapR.value, 10) : 24,
    showDiagrams: togDiag ? !!togDiag.checked : true,
    showSections: togSec ? !!togSec.checked : true
  };
}

function applyStateConfig(cfg) {
  if(!cfg) return;
  if(typeof cfg.transposeSemitones === 'number') transposeSemitones = cfg.transposeSemitones;
  if(typeof cfg.keyIdx === 'number') {
    const sel = document.getElementById('keySelect');
    if(sel) sel.value = cfg.keyIdx;
  }
  if(typeof cfg.capoFret === 'number' && typeof updateCapo === 'function') updateCapo(cfg.capoFret);
  if(typeof cfg.speed === 'number') {
    const sr = document.getElementById('speedRange');
    const sv = document.getElementById('speedVal');
    if(sr) sr.value = cfg.speed;
    if(sv) sv.textContent = cfg.speed;
  }
  if(typeof cfg.chordSize === 'number') {
    const cr = document.getElementById('chordSizeRange');
    if(cr) cr.value = cfg.chordSize;
  }
  if(typeof cfg.lyricSize === 'number') {
    const lr = document.getElementById('lyricSizeRange');
    if(lr) lr.value = cfg.lyricSize;
  }
  if(typeof cfg.twoColumns === 'boolean') {
    const tc = document.getElementById('toggleColumns');
    if(tc) tc.checked = cfg.twoColumns;
  }
  if(typeof cfg.colLeft === 'number') {
    const cl = document.getElementById('colLeftRange');
    if(cl) cl.value = cfg.colLeft;
  }
  if(typeof cfg.colGap === 'number') {
    const cg = document.getElementById('colGapRange');
    if(cg) cg.value = cfg.colGap;
  }
  if(typeof cfg.showDiagrams === 'boolean') {
    const td = document.getElementById('toggleDiagrams');
    if(td) td.checked = cfg.showDiagrams;
  }
  if(typeof cfg.showSections === 'boolean') {
    const ts = document.getElementById('toggleSections');
    if(ts) ts.checked = cfg.showSections;
  }
  if(typeof syncFontSizes === 'function') syncFontSizes();
  if(typeof syncColumnControls === 'function') syncColumnControls();
  if(typeof syncLayout === 'function') syncLayout();
}

function getSongsInCurrentSetlist() {
  const songs = StorageManager.getSongs();
  if(currentSetlistId === 'all') {
    return Object.values(songs).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  const setlists = StorageManager.getSetlists();
  const sl = setlists[currentSetlistId];
  if(!sl || !sl.songIds) return [];
  return sl.songIds.map(id => songs[id]).filter(Boolean);
}

function updateSetlistNavUI() {
  const navInfo = document.getElementById('setlistNavInfo');
  const navCount = document.getElementById('setlistNavCount');
  const btnPrev = document.getElementById('btnSetlistPrev');
  const btnNext = document.getElementById('btnSetlistNext');
  const fsPrev = document.getElementById('fsSetlistPrev');
  const fsNext = document.getElementById('fsSetlistNext');

  const setlists = StorageManager.getSetlists();
  const currentSetlist = currentSetlistId === 'all' ? null : setlists[currentSetlistId];
  const setlistName = currentSetlist ? currentSetlist.name : (currentSetlistId === 'all' ? 'Todos los Cifrados' : 'Sin Setlist');
  
  if(navInfo) {
    navInfo.textContent = setlistName;
    navInfo.title = setlistName;
  }

  const list = getSongsInCurrentSetlist();
  const activeIdx = list.findIndex(s => s.id === currentSongId);

  if(navCount) {
    if(!list.length) navCount.textContent = '0 / 0 canciones';
    else if(activeIdx === -1) navCount.textContent = `— / ${list.length} canciones`;
    else navCount.textContent = `${activeIdx + 1} / ${list.length} en setlist`;
  }

  const isPrevDisabled = activeIdx <= 0;
  const isNextDisabled = activeIdx === -1 || activeIdx >= list.length - 1;

  if(btnPrev) btnPrev.disabled = isPrevDisabled;
  if(btnNext) btnNext.disabled = isNextDisabled;
  if(fsPrev) fsPrev.disabled = isPrevDisabled;
  if(fsNext) fsNext.disabled = isNextDisabled;
}

function renderLogoDropdown() {
  const songs = StorageManager.getSongs();
  const setlists = StorageManager.getSetlists();
  const songCount = Object.keys(songs).length;

  const repoBadge = document.getElementById('repoCountBadge');
  if(repoBadge) repoBadge.textContent = `${songCount} cifrado${songCount !== 1 ? 's' : ''} en repositorio`;

  // Select de Setlists
  const sel = document.getElementById('setlistSelect');
  if(sel) {
    sel.innerHTML = '<option value="all">📚 Todos los Cifrados</option>';
    Object.values(setlists).forEach(sl => {
      const count = (sl.songIds || []).filter(id => songs[id]).length;
      const opt = document.createElement('option');
      opt.value = sl.id;
      opt.textContent = `📋 ${sl.name} (${count})`;
      if(sl.id === currentSetlistId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  const isSpecificSetlist = currentSetlistId && currentSetlistId !== 'all';
  document.getElementById('btnRenameSetlist')?.classList.toggle('hidden', !isSpecificSetlist);
  document.getElementById('btnDeleteSetlist')?.classList.toggle('hidden', !isSpecificSetlist);
  document.getElementById('btnManageSetlistSongs')?.classList.toggle('hidden', !isSpecificSetlist);

  // Lista de canciones del desplegable
  const songsListEl = document.getElementById('dropdownSongsList');
  if(songsListEl) {
    songsListEl.innerHTML = '';
    const currentList = getSongsInCurrentSetlist();
    const countSpan = document.getElementById('setlistSongsCount');
    if(countSpan) countSpan.textContent = currentList.length;

    if(!currentList.length) {
      songsListEl.innerHTML = '<p class="hint" style="text-align:center;padding:12px">No hay cifrados en esta vista</p>';
      return;
    }

    currentList.forEach((song, idx) => {
      const item = document.createElement('div');
      item.className = 'dropdown-song-item' + (song.id === currentSongId ? ' active' : '');
      
      const info = document.createElement('div');
      info.className = 'song-item-info';
      info.innerHTML = `<span class="song-item-title">${song.title || 'Sin título'}</span><span class="song-item-artist">${song.artist || 'Artista desconocido'}</span>`;
      
      // Cargar canción al hacer clic sin cerrar el desplegable
      item.addEventListener('click', (e) => {
        if(e.target.closest('.song-item-actions')) return;
        loadSongById(song.id);
      });

      const actions = document.createElement('div');
      actions.className = 'song-item-actions';

      // Reordenar en setlist específica
      if(isSpecificSetlist) {
        const btnUp = document.createElement('button');
        btnUp.className = 'btn btn-mini btn-ghost btn-move';
        btnUp.textContent = '▲';
        btnUp.title = 'Mover arriba en setlist';
        btnUp.disabled = idx === 0;
        btnUp.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSongInSetlist(currentSetlistId, idx, -1);
        });

        const btnDown = document.createElement('button');
        btnDown.className = 'btn btn-mini btn-ghost btn-move';
        btnDown.textContent = '▼';
        btnDown.title = 'Mover abajo en setlist';
        btnDown.disabled = idx === currentList.length - 1;
        btnDown.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSongInSetlist(currentSetlistId, idx, 1);
        });

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn btn-mini btn-ghost btn-move';
        btnRemove.style.color = '#ff6b6b';
        btnRemove.textContent = '✕';
        btnRemove.title = 'Quitar de esta setlist';
        btnRemove.addEventListener('click', (e) => {
          e.stopPropagation();
          removeSongFromSetlist(currentSetlistId, song.id);
        });

        actions.appendChild(btnUp);
        actions.appendChild(btnDown);
        actions.appendChild(btnRemove);
      } else {
        // En "Todos los Cifrados", eliminar del repositorio
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-mini btn-ghost btn-move';
        btnDel.style.color = '#ff6b6b';
        btnDel.textContent = '🗑️';
        btnDel.title = 'Eliminar del repositorio';
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          if(confirm(`¿Eliminar "${song.title}" del repositorio permanente?`)) {
            StorageManager.deleteSong(song.id);
            if(currentSongId === song.id) currentSongId = null;
            renderLogoDropdown();
            updateSetlistNavUI();
            toast('Cifrado eliminado');
          }
        });
        actions.appendChild(btnDel);
      }

      item.appendChild(info);
      item.appendChild(actions);
      songsListEl.appendChild(item);
    });
  }
}

function moveSongInSetlist(setlistId, fromIdx, dir) {
  const setlists = StorageManager.getSetlists();
  const sl = setlists[setlistId];
  if(!sl || !sl.songIds) return;
  const toIdx = fromIdx + dir;
  if(toIdx < 0 || toIdx >= sl.songIds.length) return;
  const temp = sl.songIds[fromIdx];
  sl.songIds[fromIdx] = sl.songIds[toIdx];
  sl.songIds[toIdx] = temp;
  StorageManager.saveSetlist(sl);
  renderLogoDropdown();
  updateSetlistNavUI();
}

function removeSongFromSetlist(setlistId, songId) {
  const setlists = StorageManager.getSetlists();
  const sl = setlists[setlistId];
  if(!sl || !sl.songIds) return;
  sl.songIds = sl.songIds.filter(id => id !== songId);
  StorageManager.saveSetlist(sl);
  renderLogoDropdown();
  updateSetlistNavUI();
  toast('Canción quitada de la setlist');
}

function loadSongById(songId) {
  const songs = StorageManager.getSongs();
  const song = songs[songId];
  if(!song) return;
  currentSongId = songId;
  loadDocument(song.content);
  applyStateConfig(song.settings);
  updateSetlistNavUI();
  renderLogoDropdown();
  toast(`Cargado: ${song.title}`);
}

function saveCurrentSongAction() {
  if(!rawText && !songTitle && !songArtist) {
    toast('No hay ningún cifrado cargado para guardar');
    return;
  }
  const title = songTitle || 'Sin título';
  const artist = songArtist || 'Artista desconocido';

  // Si hay una canción cargada previamente guardada (currentSongId)
  if(currentSongId) {
    const songs = StorageManager.getSongs();
    const currentObj = songs[currentSongId];
    const currentName = currentObj ? currentObj.title : title;
    pendingSaveSong = {
      title,
      artist,
      content: rawText,
      settings: getCurrentStateConfig(),
      existingId: currentSongId
    };
    const dupText = document.getElementById('duplicateText');
    if(dupText) dupText.textContent = `Estás guardando cambios en "${currentName}". ¿Deseas sobreescribir este cifrado o guardar como un cifrado nuevo?`;
    document.getElementById('duplicateModal')?.classList.remove('hidden');
    return;
  }

  // Si es un cifrado recién pegado o importado (currentSongId === null)
  const existing = StorageManager.findSongByTitleAndArtist(title, artist);
  if(existing) {
    pendingSaveSong = {
      title,
      artist,
      content: rawText,
      settings: getCurrentStateConfig(),
      existingId: existing.id
    };
    const dupText = document.getElementById('duplicateText');
    if(dupText) dupText.textContent = `Ya existe un cifrado guardado en el repositorio como "${title}" de ${artist}. ¿Deseas sobreescribirlo o guardar una nueva copia?`;
    document.getElementById('duplicateModal')?.classList.remove('hidden');
    return;
  }

  // Guardar directamente como canción nueva
  const songId = 'song_' + Date.now();
  const songObj = {
    id: songId,
    title,
    artist,
    content: rawText,
    settings: getCurrentStateConfig(),
    updatedAt: Date.now()
  };
  StorageManager.saveSong(songObj);
  currentSongId = songId;

  if(currentSetlistId && currentSetlistId !== 'all') {
    const setlists = StorageManager.getSetlists();
    const sl = setlists[currentSetlistId];
    if(sl && !sl.songIds.includes(songId)) {
      sl.songIds.push(songId);
      StorageManager.saveSetlist(sl);
    }
  }

  renderLogoDropdown();
  updateSetlistNavUI();
  toast(`Cifrado "${title}" guardado en el repositorio`);
}

function openNewSong() {
  currentSongId = null;
  songTitle = "";
  songArtist = "";
  rawText = "";

  const t = document.getElementById('editTitle');
  const a = document.getElementById('editArtist');
  const area = document.getElementById('editArea');
  const sw = document.getElementById('editIncludeHeader');

  if(t) { t.value = ""; t.disabled = false; t.style.opacity = '1'; }
  if(a) { a.value = ""; a.disabled = false; a.style.opacity = '1'; }
  if(area) area.value = "";
  if(sw) sw.checked = false;

  document.getElementById('editModal')?.classList.remove('hidden');
  toast('Modo Nueva Canción: pega o escribe tu cifrado');
}

function exportBackupJSON() {
  const songs = StorageManager.getSongs();
  const setlists = StorageManager.getSetlists();
  const data = {
    app: 'CifraViva',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    songs,
    setlists
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.download = `cifraviva_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Copia JSON descargada (guardable en tu carpeta cifrados/)');
}

function handleImportJSON(file) {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if(parsed.songs) {
        const songs = StorageManager.getSongs();
        Object.assign(songs, parsed.songs);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
      } else if(parsed.title && parsed.content) {
        const songId = parsed.id || ('song_' + Date.now());
        StorageManager.saveSong({
          id: songId,
          title: parsed.title,
          artist: parsed.artist || '',
          content: parsed.content,
          settings: parsed.settings || getCurrentStateConfig(),
          updatedAt: Date.now()
        });
        loadSongById(songId);
      }
      if(parsed.setlists) {
        const setlists = StorageManager.getSetlists();
        Object.assign(setlists, parsed.setlists);
        localStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
      }
      renderLogoDropdown();
      updateSetlistNavUI();
      toast('Cifrado(s) JSON importados con éxito');
    } catch(err) {
      console.error(err);
      toast('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Event Listeners Módulo Persistencia y Setlists
document.getElementById('btnNewSong')?.addEventListener('click', openNewSong);
document.getElementById('btnSaveSong')?.addEventListener('click', saveCurrentSongAction);
document.getElementById('btnQuickSaveSong')?.addEventListener('click', saveCurrentSongAction);
document.getElementById('btnExportJSON')?.addEventListener('click', exportBackupJSON);
document.getElementById('jsonInput')?.addEventListener('change', e => handleImportJSON(e.target.files[0]));

// Restablecer / Limpiar Todo
document.getElementById('btnResetApp')?.addEventListener('click', () => {
  const confirmed = confirm(
    '⚠️ RESTABLECER LA APLICACIÓN\n\n' +
    'Esto eliminará permanentemente:\n' +
    '  • Todos los cifrados guardados\n' +
    '  • Todos los Setlists\n\n' +
    'La caché del navegador (JS, CSS, HTML) NO necesita borrarse, ya que los datos de CifraViva se almacenan en localStorage y se limpian completamente con esta acción.\n\n' +
    '¿Deseas continuar? Esta acción no se puede deshacer.'
  );
  if(!confirmed) return;
  // Doble confirmación para evitar borrado accidental
  const reconfirmed = confirm('✅ Confirma de nuevo: ¿Borrar TODOS los cifrados y setlists?');
  if(!reconfirmed) return;

  StorageManager.clearAll();
  currentSongId = null;
  currentSetlistId = 'all';
  pendingSaveSong = null;

  // Limpiar la vista
  const sheetEl = document.getElementById('sheet');
  const songHeader = document.getElementById('songHeader');
  const emptyState = document.getElementById('emptyState');
  if(sheetEl) { sheetEl.innerHTML = ''; sheetEl.classList.add('hidden'); }
  if(songHeader) songHeader.classList.add('hidden');
  if(emptyState) emptyState.classList.remove('hidden');
  if(diagramPanel) diagramPanel.innerHTML = '';
  if(sectionPanel) sectionPanel.innerHTML = '';

  renderLogoDropdown();
  updateSetlistNavUI();
  document.getElementById('logoDropdownMenu')?.classList.add('hidden');
  toast('✅ Aplicación restablecida. Puedes importar un backup limpio.');
});

// Toggle desplegable del logo
const btnLogoBrand = document.getElementById('btnLogoBrand');
const logoDropdownMenu = document.getElementById('logoDropdownMenu');
if(btnLogoBrand && logoDropdownMenu) {
  btnLogoBrand.addEventListener('click', (e) => {
    e.stopPropagation();
    const hidden = logoDropdownMenu.classList.toggle('hidden');
    if(!hidden) renderLogoDropdown();
  });
}

document.addEventListener('click', (e) => {
  if(logoDropdownMenu && !logoDropdownMenu.classList.contains('hidden')) {
    if(!e.target.closest('.brand-wrapper') && !e.target.closest('.modal')) {
      logoDropdownMenu.classList.add('hidden');
    }
  }
});

// Selección de Setlist en desplegable
document.getElementById('setlistSelect')?.addEventListener('change', (e) => {
  currentSetlistId = e.target.value;
  renderLogoDropdown();
  updateSetlistNavUI();
});

// Crear nueva setlist
document.getElementById('btnNewSetlist')?.addEventListener('click', () => {
  const name = prompt('Nombre para la nueva Setlist:');
  if(name && name.trim()) {
    const slId = 'setlist_' + Date.now();
    StorageManager.saveSetlist({ id: slId, name: name.trim(), songIds: [] });
    currentSetlistId = slId;
    renderLogoDropdown();
    updateSetlistNavUI();
    toast(`Setlist "${name.trim()}" creada`);
  }
});

// Renombrar setlist activa
document.getElementById('btnRenameSetlist')?.addEventListener('click', () => {
  if(currentSetlistId === 'all') return;
  const setlists = StorageManager.getSetlists();
  const sl = setlists[currentSetlistId];
  if(!sl) return;
  const newName = prompt('Nuevo nombre para la Setlist:', sl.name);
  if(newName && newName.trim()) {
    sl.name = newName.trim();
    StorageManager.saveSetlist(sl);
    renderLogoDropdown();
    updateSetlistNavUI();
    toast('Setlist renombrada');
  }
});

// Eliminar setlist activa
document.getElementById('btnDeleteSetlist')?.addEventListener('click', () => {
  if(currentSetlistId === 'all') return;
  const setlists = StorageManager.getSetlists();
  const sl = setlists[currentSetlistId];
  if(!sl) return;
  if(confirm(`¿Eliminar la setlist "${sl.name}"? (Los cifrados se mantendrán guardados en el repositorio)`)) {
    StorageManager.deleteSetlist(currentSetlistId);
    currentSetlistId = 'all';
    renderLogoDropdown();
    updateSetlistNavUI();
    toast('Setlist eliminada');
  }
});

// Modal gestión múltiple de canciones en setlist
document.getElementById('btnManageSetlistSongs')?.addEventListener('click', () => {
  if(currentSetlistId === 'all') return;
  const setlists = StorageManager.getSetlists();
  const sl = setlists[currentSetlistId];
  if(!sl) return;
  const modalTitle = document.getElementById('setlistSongsTitle');
  if(modalTitle) modalTitle.textContent = `Gestionar canciones: ${sl.name}`;

  const songs = StorageManager.getSongs();
  const checklist = document.getElementById('setlistSongsChecklist');
  if(checklist) {
    checklist.innerHTML = '';
    const allSongs = Object.values(songs).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if(!allSongs.length) {
      checklist.innerHTML = '<p class="hint" style="text-align:center">El repositorio de cifrados está vacío</p>';
    } else {
      allSongs.forEach(song => {
        const lbl = document.createElement('label');
        lbl.className = 'checklist-item';
        const checked = (sl.songIds || []).includes(song.id);
        lbl.innerHTML = `<input type="checkbox" value="${song.id}" ${checked ? 'checked' : ''}> <span><strong>${song.title || 'Sin título'}</strong> <span class="hint">— ${song.artist || 'Artista desconocido'}</span></span>`;
        checklist.appendChild(lbl);
      });
    }
  }
  document.getElementById('setlistSongsModal')?.classList.remove('hidden');
});

document.getElementById('btnSaveSetlistSongs')?.addEventListener('click', () => {
  if(currentSetlistId === 'all') return;
  const setlists = StorageManager.getSetlists();
  const sl = setlists[currentSetlistId];
  if(!sl) return;
  const checkedInputs = document.querySelectorAll('#setlistSongsChecklist input[type="checkbox"]:checked');
  const selectedIds = Array.from(checkedInputs).map(cb => cb.value);
  sl.songIds = selectedIds;
  StorageManager.saveSetlist(sl);
  document.getElementById('setlistSongsModal')?.classList.add('hidden');
  renderLogoDropdown();
  updateSetlistNavUI();
  toast('Setlist actualizada');
});

document.getElementById('btnCancelSetlistSongs')?.addEventListener('click', () => {
  document.getElementById('setlistSongsModal')?.classList.add('hidden');
});
document.getElementById('btnCloseSetlistSongs')?.addEventListener('click', () => {
  document.getElementById('setlistSongsModal')?.classList.add('hidden');
});

// Navegación rápida por botones Prev/Next en toolbar y pantalla completa
function navigateSetlist(dir) {
  const list = getSongsInCurrentSetlist();
  const idx = list.findIndex(s => s.id === currentSongId);
  if(dir === -1 && idx > 0) loadSongById(list[idx - 1].id);
  else if(dir === 1 && idx !== -1 && idx < list.length - 1) loadSongById(list[idx + 1].id);
}

document.getElementById('btnSetlistPrev')?.addEventListener('click', () => navigateSetlist(-1));
document.getElementById('btnSetlistNext')?.addEventListener('click', () => navigateSetlist(1));
document.getElementById('fsSetlistPrev')?.addEventListener('click', () => navigateSetlist(-1));
document.getElementById('fsSetlistNext')?.addEventListener('click', () => navigateSetlist(1));

// Resolución de duplicados o ediciones al guardar
document.getElementById('btnOverwriteSong')?.addEventListener('click', () => {
  if(!pendingSaveSong) return;
  const songObj = {
    id: pendingSaveSong.existingId,
    title: pendingSaveSong.title,
    artist: pendingSaveSong.artist,
    content: pendingSaveSong.content,
    settings: pendingSaveSong.settings,
    updatedAt: Date.now()
  };
  StorageManager.saveSong(songObj);
  currentSongId = pendingSaveSong.existingId;
  pendingSaveSong = null;
  document.getElementById('duplicateModal')?.classList.add('hidden');
  renderLogoDropdown();
  updateSetlistNavUI();
  toast(`Cifrado "${songObj.title}" sobreescrito con éxito`);
});

document.getElementById('btnSaveAsNewSong')?.addEventListener('click', () => {
  if(!pendingSaveSong) return;
  const defaultName = pendingSaveSong.title + (pendingSaveSong.title.includes('(nuevo)') ? '' : ' (nuevo)');
  const newName = prompt('Ingresa el nombre para el nuevo cifrado:', defaultName);
  if(!newName || !newName.trim()) return;
  const songId = 'song_' + Date.now();
  const songObj = {
    id: songId,
    title: newName.trim(),
    artist: pendingSaveSong.artist,
    content: pendingSaveSong.content,
    settings: pendingSaveSong.settings,
    updatedAt: Date.now()
  };
  StorageManager.saveSong(songObj);
  currentSongId = songId;

  if(currentSetlistId && currentSetlistId !== 'all') {
    const setlists = StorageManager.getSetlists();
    const sl = setlists[currentSetlistId];
    if(sl && !sl.songIds.includes(songId)) {
      sl.songIds.push(songId);
      StorageManager.saveSetlist(sl);
    }
  }

  pendingSaveSong = null;
  document.getElementById('duplicateModal')?.classList.add('hidden');
  renderLogoDropdown();
  updateSetlistNavUI();
  toast(`Guardado como nuevo cifrado "${songObj.title}"`);
});

document.getElementById('btnCloseDuplicate')?.addEventListener('click', () => {
  pendingSaveSong = null;
  document.getElementById('duplicateModal')?.classList.add('hidden');
});

// Inicial: estado vacío, key select por defecto G (7)
document.getElementById('keySelect').value="7";
updateCapo(0);
// responsive panels inicial
if(window.innerWidth<=980){
  document.getElementById('diagramPanel')?.classList.add('collapsed');
  document.getElementById('sectionsPanel')?.classList.add('collapsed');
} else {
  // desktop: asegura visibles según checkbox
  document.getElementById('diagramPanel').style.display = document.getElementById('toggleDiagrams').checked ? 'flex' : 'none';
  document.getElementById('sectionsPanel').style.display = document.getElementById('toggleSections').checked ? 'flex' : 'none';
}
syncLayout();
updateScaleBox();

// Inicializar Módulo de Persistencia y Setlists
renderLogoDropdown();
updateSetlistNavUI();

// Exponer para debug / futura integración
window.CifraViva={ DriveAdapter, transposeChord, getDiagram, StorageManager };


