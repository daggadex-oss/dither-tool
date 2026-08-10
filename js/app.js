import { CRTFilterWebGL } from './CRTFilter.js';

// ---------- DOM refs ----------
const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const canvasWrap = document.querySelector('.canvas-wrap');
const emptyState = document.getElementById('emptyState');

const dropzone = document.getElementById('dropzone');
const sourceInput = document.getElementById('sourceInput');
const overlayZone = document.getElementById('overlayZone');
const overlayInput = document.getElementById('overlayInput');
const overlayControls = document.getElementById('overlayControls');
const blendModeSelect = document.getElementById('blendMode');
const overlayOpacitySlider = document.getElementById('overlayOpacity');
const overlayOpacityVal = document.getElementById('overlayOpacityVal');

const exportBtn = document.getElementById('exportBtn');
const exportStatus = document.getElementById('exportStatus');

const sliderIds = [
  'chromaticAberration', 'staticNoise', 'scanlineIntensity',
  'verticalJitter', 'horizontalTearing', 'signalLoss',
  'curvature', 'desaturation', 'flicker'
];

// ---------- state ----------
let sourceMedia = null;      // <img> or <video>
let sourceIsVideo = false;
let overlayMedia = null;     // <img> or <video>
let overlayIsVideo = false;
let crt = null;
let rafId = null;

// ---------- credit link (edit this to your channel URL) ----------
document.getElementById('credit-link').href = '#'; // TODO: point at your channel/Substack

// ---------- CRT config from sliders ----------
function readConfig() {
  const cfg = {};
  sliderIds.forEach(id => {
    cfg[id] = parseFloat(document.getElementById(id).value);
  });
  cfg.retraceLines = document.getElementById('retraceLines').checked;
  cfg.dotMask = false;
  cfg.brightness = 0.95;
  cfg.contrast = 1.05;
  return cfg;
}

function applyConfig() {
  if (crt) crt.config = Object.assign(crt.config, readConfig());
}

sliderIds.forEach(id => {
  document.getElementById(id).addEventListener('input', applyConfig);
});
document.getElementById('retraceLines').addEventListener('change', applyConfig);

// ---------- presets ----------
const PRESETS = {
  clean: { chromaticAberration: 0, staticNoise: 0, scanlineIntensity: 0, verticalJitter: 0, horizontalTearing: 0, signalLoss: 0, curvature: 0, desaturation: 0, flicker: 0, retraceLines: false },
  vhs:   { chromaticAberration: 0.003, staticNoise: 0.02, scanlineIntensity: 0.4, verticalJitter: 0.004, horizontalTearing: 0.0008, signalLoss: 0.08, curvature: 0.001, desaturation: 0.15, flicker: 0.015, retraceLines: true },
  crt:   { chromaticAberration: 0.0008, staticNoise: 0.004, scanlineIntensity: 0.75, verticalJitter: 0.0005, horizontalTearing: 0, signalLoss: 0.01, curvature: 0.008, desaturation: 0.1, flicker: 0.01, retraceLines: true },
  broken:{ chromaticAberration: 0.006, staticNoise: 0.035, scanlineIntensity: 0.6, verticalJitter: 0.012, horizontalTearing: 0.004, signalLoss: 0.18, curvature: 0.004, desaturation: 0.3, flicker: 0.04, retraceLines: true },
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = PRESETS[btn.dataset.preset];
    sliderIds.forEach(id => { if (id in p) document.getElementById(id).value = p[id]; });
    document.getElementById('retraceLines').checked = p.retraceLines;
    applyConfig();
  });
});

// ---------- file loading ----------
function loadFile(file, { isOverlay }) {
  const isVideo = file.type.startsWith('video/');
  const url = URL.createObjectURL(file);
  let el;
  if (isVideo) {
    el = document.createElement('video');
    el.src = url;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.autoplay = true;
  } else {
    el = new Image();
    el.src = url;
  }

  el.onload = el.onloadeddata = () => {
    if (isOverlay) {
      overlayMedia = el;
      overlayIsVideo = isVideo;
      overlayControls.hidden = false;
      if (isVideo) el.play();
    } else {
      sourceMedia = el;
      sourceIsVideo = isVideo;
      if (isVideo) el.play();
      const w = el.videoWidth || el.naturalWidth || 960;
      const h = el.videoHeight || el.naturalHeight || 540;
      sourceCanvas.width = w;
      sourceCanvas.height = h;
      emptyState.style.display = 'none';
      exportBtn.disabled = false;
      initCRT();
      startLoop();
    }
  };
}

function wireDropzone(zone, input, opts) {
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => {
    if (e.target.files[0]) loadFile(e.target.files[0], opts);
  });
  ['dragover', 'dragenter'].forEach(ev =>
    zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag-over'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag-over'); })
  );
  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file, opts);
  });
}

wireDropzone(dropzone, sourceInput, { isOverlay: false });
wireDropzone(overlayZone, overlayInput, { isOverlay: true });

overlayOpacitySlider.addEventListener('input', () => {
  overlayOpacityVal.textContent = overlayOpacitySlider.value + '%';
});

// ---------- CRT init ----------
function initCRT() {
  if (crt) crt.stop();
  // sourceCanvas gets swapped out of the DOM by CRTFilterWebGL.start();
  // re-append a fresh canvas element each time we load new media so sizing is clean.
  crt = new CRTFilterWebGL(sourceCanvas, readConfig());
  crt.start();
}

// ---------- draw loop: composite source + overlay into the 2D canvas
//            every frame; CRTFilterWebGL reads this canvas on its own rAF ----------
function drawFrame() {
  if (!sourceMedia) return;
  sourceCtx.globalCompositeOperation = 'source-over';
  sourceCtx.globalAlpha = 1;
  sourceCtx.drawImage(sourceMedia, 0, 0, sourceCanvas.width, sourceCanvas.height);

  if (overlayMedia) {
    sourceCtx.globalCompositeOperation = blendModeSelect.value;
    sourceCtx.globalAlpha = overlayOpacitySlider.value / 100;
    sourceCtx.drawImage(overlayMedia, 0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.globalAlpha = 1;
    sourceCtx.globalCompositeOperation = 'source-over';
  }

  rafId = requestAnimationFrame(drawFrame);
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  drawFrame();
}

// ---------- export ----------
exportBtn.addEventListener('click', () => {
  if (!crt) return;
  const outCanvas = crt.glcanvas;

  if (!sourceIsVideo) {
    // still image export
    const link = document.createElement('a');
    link.download = 'dither-export.png';
    link.href = outCanvas.toDataURL('image/png');
    link.click();
    exportStatus.textContent = 'saved PNG';
    return;
  }

  // video export via MediaRecorder (silent — see README for audio pass-through notes)
  exportStatus.textContent = 'recording…';
  const stream = outCanvas.captureStream(30);
  const chunks = [];
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });

  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mime });
    const link = document.createElement('a');
    link.download = 'dither-export.webm';
    link.href = URL.createObjectURL(blob);
    link.click();
    exportStatus.textContent = 'saved WEBM';
  };

  recorder.start();
  const duration = Math.min((sourceMedia.duration || 6) * 1000, 30_000); // cap at 30s for MVP
  setTimeout(() => recorder.stop(), duration);
});
