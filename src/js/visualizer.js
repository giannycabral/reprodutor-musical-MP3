// Configuração do visualizador
const barCount = 32;
let smoothedBars = new Float32Array(barCount);
const smoothingFactor = 0.5; // Suavização das barras
let isVisualizerActive = false;
let animationFrameId = null;
let lastUpdate = 0;
const updateInterval = 1000 / 30; // 30 FPS para melhor performance

// Inicialização das barras do visualizador
function initVisualizer() {
  console.log("Iniciando visualizador...");
  const visualizer = document.getElementById("visualizer");
  if (!visualizer) {
    console.warn("Elemento visualizer não encontrado");
    return;
  }

  visualizer.innerHTML = "";

  // Criar barras com espaçamento e estilo inicial
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "visualizer-bar";
    bar.style.setProperty("--bar-index", i);
    bar.style.height = "2px";
    visualizer.appendChild(bar);
  }

  smoothedBars.fill(0);
  console.log("Visualizador inicializado");
}

// Controle de início do visualizador
function startVisualizer() {
  console.log("Iniciando animação do visualizador");
  if (!isVisualizerActive) {
    isVisualizerActive = true;
    updateVisualizer();
  }
}

// Controle de parada do visualizador
function stopVisualizer() {
  console.log("Parando visualizador");
  isVisualizerActive = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Resetar todas as barras para altura mínima
  const bars = document.querySelectorAll(".visualizer-bar");
  bars.forEach((bar) => {
    bar.style.height = "2px";
    bar.style.background = "var(--primary-color)";
    bar.style.boxShadow = "none";
  });
}

// Atualização do visualizador
function updateVisualizer() {
  if (!isVisualizerActive) return;

  const now = performance.now();
  if (now - lastUpdate < updateInterval) {
    animationFrameId = requestAnimationFrame(updateVisualizer);
    return;
  }
  lastUpdate = now;

  // Verificar se temos um player válido com contexto de áudio
  const player = window.player;
  if (!player?.audioContext || !player?.analyser || !player.audioElement) {
    console.log("Aguardando inicialização completa do player...");
    animationFrameId = requestAnimationFrame(updateVisualizer);
    return;
  }

  // Garantir que o contexto de áudio está em execução
  if (player.audioContext.state !== "running") {
    console.log("Resumindo contexto de áudio...");
    player.audioContext.resume();
  }

  // Verificar se o áudio está realmente tocando
  if (player.audioElement.paused || player.audioElement.ended) {
    stopVisualizer();
    return;
  }

  const bufferLength = player.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  player.analyser.getByteFrequencyData(dataArray);

  const bars = document.querySelectorAll(".visualizer-bar");
  const step = Math.floor(bufferLength / barCount);

  for (let i = 0; i < bars.length; i++) {
    let sum = 0;
    const offset = i * step;

    // Calcular média para suavizar as frequências
    for (let j = 0; j < step; j++) {
      sum += dataArray[offset + j];
    }
    const average = sum / step;
    const value = average / 255.0;

    // Aplicar suavização
    smoothedBars[i] =
      smoothedBars[i] * (1 - smoothingFactor) + value * smoothingFactor;
    const height = smoothedBars[i] * 100;

    // Atualizar altura da barra
    bars[i].style.height = `${Math.max(2, height)}%`;

    // Cor dinâmica baseada na intensidade
    const hue = 320 + smoothedBars[i] * 40;
    const saturation = 80 + smoothedBars[i] * 20;
    const lightness = 60 + smoothedBars[i] * 20;

    bars[i].style.background = `linear-gradient(to top,
            hsl(${hue}, ${saturation}%, ${lightness}%),
            hsl(${hue + 30}, ${saturation}%, ${lightness + 10}%))`;

    // Efeito de brilho dinâmico
    const glowIntensity = Math.min(20, smoothedBars[i] * 25);
    bars[i].style.boxShadow = `0 0 ${glowIntensity}px rgba(255, 105, 180, ${
      smoothedBars[i] * 0.8
    })`;
  }

  animationFrameId = requestAnimationFrame(updateVisualizer);
}

// Inicialização e eventos
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM carregado, configurando visualizador...");

  // Inicializar visualizador
  initVisualizer();

  // Monitorar eventos de reprodução
  document.addEventListener(
    "play",
    (e) => {
      console.log("Evento play detectado");
      if (e.target === window.player?.audioElement) {
        startVisualizer();
      }
    },
    true
  );

  document.addEventListener(
    "pause",
    (e) => {
      console.log("Evento pause detectado");
      if (e.target === window.player?.audioElement) {
        stopVisualizer();
      }
    },
    true
  );

  document.addEventListener(
    "ended",
    (e) => {
      console.log("Evento ended detectado");
      if (e.target === window.player?.audioElement) {
        stopVisualizer();
      }
    },
    true
  );

  // Verificar se já existe uma música tocando
  const checkAndStartVisualizer = () => {
    if (window.player?.audioElement && !window.player.audioElement.paused) {
      if (window.player.audioContext && window.player.analyser) {
        startVisualizer();
      } else {
        setTimeout(checkAndStartVisualizer, 100);
      }
    }
  };

  checkAndStartVisualizer();
});
