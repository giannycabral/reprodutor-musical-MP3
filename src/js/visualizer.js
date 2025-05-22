const barCount = 32;
let smoothedBars = new Float32Array(barCount);
const smoothingFactor = 0.3;

function initVisualizer() {
  const visualizer = document.getElementById("visualizer");
  visualizer.innerHTML = "";

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "visualizer-bar";
    bar.style.setProperty("--bar-index", i);
    bar.style.height = "2px";
    visualizer.appendChild(bar);
  }

  smoothedBars.fill(0);
}

function updateVisualizer() {
  // Aguardar até que o AudioContext esteja disponível
  if (!window.audioContext || !window.analyser) {
    requestAnimationFrame(updateVisualizer);
    return;
  }

  const bufferLength = window.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  window.analyser.getByteFrequencyData(dataArray);

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
    smoothedBars[i] += (value - smoothedBars[i]) * smoothingFactor;
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

  requestAnimationFrame(updateVisualizer);
}

// Inicializar o visualizador
window.addEventListener("DOMContentLoaded", () => {
  // Garantir que as barras sejam criadas
  initVisualizer();

  // Aguardar um momento para garantir que o AudioContext esteja pronto
  setTimeout(() => {
    updateVisualizer();
  }, 100);
});
