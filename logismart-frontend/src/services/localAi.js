const STORAGE_KEY = 'logismart.local-ai';
export const DEFAULT_LOCAL_AI = {
  enabled: false,
  endpoint: 'http://127.0.0.1:11434',
  model: 'gemma3:1b',
};

export function getLocalAiConfig() {
  try {
    return { ...DEFAULT_LOCAL_AI, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULT_LOCAL_AI;
  }
}

export function saveLocalAiConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_LOCAL_AI, ...config }));
}

export async function testLocalAi(config = getLocalAiConfig()) {
  const response = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
  const data = await response.json();
  const models = (data.models || []).map(item => item.name);
  return { models, modelAvailable: models.some(name => name === config.model || name.startsWith(`${config.model}:`)) };
}

function safeOperationalData(data) {
  return JSON.stringify(data, (key, value) => {
    if (/token|password|usuario|email/i.test(key)) return undefined;
    return value;
  });
}

export async function generateOperationalSummary(data, config = getLocalAiConfig()) {
  if (!config.enabled) return null;
  const prompt = `Eres un asistente de logística. Redacta en español un resumen operativo breve para anexar a una guía PDF.
REGLAS OBLIGATORIAS:
- Usa únicamente los datos JSON entregados.
- No inventes cifras, ubicaciones, pesos, estados ni rutas.
- No modifiques decisiones de optimización.
- Máximo 180 palabras, texto plano, con: Resumen, Riesgos y Recomendaciones.
- Si falta un dato, omítelo.

DATOS INMUTABLES:
${safeOperationalData(data)}`;

  const response = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, prompt, stream: false, options: { temperature: 0.2 } }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`No se pudo ejecutar ${config.model}`);
  const result = await response.json();
  return String(result.response || '').trim().slice(0, 2400) || null;
}

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of text.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡\n]/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    if (!paragraph.trim()) lines.push('');
  }
  return lines;
}

export async function openAiEnhancedPdf(pdfUrl, operationalData, targetWindow = null) {
  const openUrl = url => {
    if (targetWindow && !targetWindow.closed) targetWindow.location.href = url;
    else window.open(url, '_blank');
  };
  const config = getLocalAiConfig();
  if (!config.enabled) {
    openUrl(pdfUrl);
    return { enhanced: false };
  }

  try {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const [pdfResponse, summary] = await Promise.all([
      fetch(pdfUrl, { credentials: 'include' }),
      generateOperationalSummary(operationalData, config),
    ]);
    if (!pdfResponse.ok || !summary) throw new Error('No se pudo preparar el PDF local');

    const document = await PDFDocument.load(await pdfResponse.arrayBuffer());
    const page = document.addPage([595.28, 841.89]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: rgb(0.03, 0.37, 0.52) });
    page.drawText('LogiSmart · Informe local con IA', { x: 46, y: 795, size: 20, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Modelo local: ${config.model}`, { x: 46, y: 775, size: 9, font: regular, color: rgb(.82, .94, .98) });
    page.drawText('Resumen operativo', { x: 46, y: 720, size: 16, font: bold, color: rgb(.06, .11, .20) });
    let y = 692;
    for (const line of wrapText(summary, regular, 10.5, 503)) {
      if (y < 64) break;
      page.drawText(line, { x: 46, y, size: 10.5, font: regular, color: rgb(.16, .20, .27) });
      y -= 16;
    }
    page.drawText('Contenido redactado localmente. Los datos operativos proceden de LogiSmart.', { x: 46, y: 38, size: 8, font: regular, color: rgb(.40, .45, .52) });

    const blob = new Blob([await document.save()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    openUrl(url);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return { enhanced: true };
  } catch (error) {
    openUrl(pdfUrl);
    return { enhanced: false, error };
  }
}
