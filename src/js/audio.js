// Audio context and elements
let audioContext;
let analyser;
let audioElement;
let source;
let dataArray;
let isPlaying = false;

class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.audioElement = new Audio();
    this.analyser = null;
    this.source = null;
    this.isPlaying = false;
    this.playlist = [];
    this.currentTrackIndex = 0;

    // Tornar as variáveis acessíveis globalmente
    window.audioContext = this.audioContext;
    window.analyser = this.analyser;
    window.audioElement = this.audioElement;
    window.isPlaying = this.isPlaying;

    this.initializeAudioContext();
    this.setupEventListeners();
  }
  initializeAudioContext() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    // Configurar fonte de áudio
    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    // Atualizar variáveis globais
    window.audioContext = this.audioContext;
    window.analyser = this.analyser;
    window.audioElement = this.audioElement;
  }

  setupEventListeners() {
    const playBtn = document.getElementById("play-btn");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const volumeControl = document.getElementById("volume-control");

    playBtn.addEventListener("click", () => this.togglePlay());
    prevBtn.addEventListener("click", () => this.playPrevious());
    nextBtn.addEventListener("click", () => this.playNext());
    volumeControl.addEventListener("input", (e) =>
      this.setVolume(e.target.value)
    );

    // Atualizar tempo no display LCD
    this.audioElement.addEventListener("timeupdate", () => {
      this.updateTimeDisplay();
    });

    const volumeIcon = document.querySelector(".volume-icon");
    let previousVolume = this.audioElement.volume;

    volumeIcon.addEventListener("click", () => {
      if (this.audioElement.volume > 0) {
        previousVolume = this.audioElement.volume;
        this.setVolume(0);
        document.getElementById("volume-control").value = 0;
      } else {
        this.setVolume(previousVolume);
        document.getElementById("volume-control").value = previousVolume;
      }
    });

    volumeIcon.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        volumeIcon.click();
      }
    });

    // Atualizar tooltip do volume
    document.getElementById("volume-control").addEventListener("input", (e) => {
      const value = Math.round(e.target.value * 100);
      e.target.setAttribute("data-tooltip", `Volume: ${value}%`);
    });
  }

  async loadPlaylist() {
    try {
      const response = await fetch("src/assets/playlist/songs.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.playlist = data.playlist;

      // Verificar se há músicas na playlist
      if (!this.playlist || this.playlist.length === 0) {
        throw new Error("Playlist vazia");
      }

      // Verificar se os arquivos existem antes de carregar
      const track = this.playlist[0];
      const audioResponse = await fetch(track.url);
      if (!audioResponse.ok) {
        throw new Error(`Arquivo de áudio não encontrado: ${track.url}`);
      }

      this.loadTrack(0);
    } catch (error) {
      console.error("Erro ao carregar playlist:", error);
      // Mostrar mensagem de erro na interface
      const trackName = document.getElementById("track-name");
      const lcdTrackName = document.getElementById("lcd-track-name");
      if (trackName) trackName.textContent = "Erro ao carregar playlist";
      if (lcdTrackName)
        lcdTrackName.textContent = "Erro: Verifique os arquivos";
    }
  }

  loadTrack(index) {
    try {
      const track = this.playlist[index];
      if (!track) {
        throw new Error("Track inválida");
      }

      this.audioElement.src = track.url;
      this.audioElement.load(); // Forçar recarregamento

      const trackNameEl = document.getElementById("track-name");
      const trackArtistEl = document.getElementById("track-artist");
      const trackArtworkEl = document.getElementById("track-artwork");

      if (trackNameEl) trackNameEl.textContent = track.title;
      if (trackArtistEl) trackArtistEl.textContent = track.artist;
      if (trackArtworkEl) {
        trackArtworkEl.src = track.artwork;
        trackArtworkEl.onerror = () => {
          trackArtworkEl.src = "src/assets/playlist/covers/default-cover.jpg";
        };
      }
    } catch (error) {
      console.error("Erro ao carregar track:", error);
    }
  }
  togglePlay() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    if (this.audioElement.paused) {
      this.audioElement.play();
      document.getElementById("play-btn").textContent = "⏸️";
      this.isPlaying = true;
      window.isPlaying = true;

      // Reiniciar o visualizador
      initVisualizer();
      updateVisualizer();
    } else {
      this.audioElement.pause();
      document.getElementById("play-btn").textContent = "▶️";
      this.isPlaying = false;
      window.isPlaying = false;
    }
  }

  playNext() {
    this.currentTrackIndex =
      (this.currentTrackIndex + 1) % this.playlist.length;
    this.loadTrack(this.currentTrackIndex);
    if (!this.audioElement.paused) this.audioElement.play();
  }

  playPrevious() {
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + this.playlist.length) %
      this.playlist.length;
    this.loadTrack(this.currentTrackIndex);
    if (!this.audioElement.paused) this.audioElement.play();
  }

  setVolume(value) {
    this.audioElement.volume = value;
    document
      .getElementById("volume-control")
      .style.setProperty("--volume-percent", `${value * 100}%`);

    // Atualizar ícone do volume
    const volumeIcon = document.querySelector(".volume-icon-svg");
    if (value == 0) {
      volumeIcon.innerHTML =
        '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else if (value < 0.5) {
      volumeIcon.innerHTML =
        '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    } else {
      volumeIcon.innerHTML =
        '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  }
  updateTimeDisplay() {
    const currentTime = document.getElementById("lcd-current-time");
    const duration = document.getElementById("lcd-duration");

    if (currentTime && duration) {
      currentTime.textContent = this.formatTime(this.audioElement.currentTime);
      duration.textContent = this.formatTime(this.audioElement.duration || 0);
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  startVisualizer() {
    const visualizer = document.getElementById("visualizer");
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Criar as barras se ainda não existirem
    if (visualizer.children.length === 0) {
      const barCount = 32;
      for (let i = 0; i < barCount; i++) {
        const bar = document.createElement("div");
        bar.className = "visualizer-bar";
        bar.style.setProperty("--bar-index", i);
        visualizer.appendChild(bar);
      }
    }

    const animate = () => {
      if (this.audioElement.paused) return;

      requestAnimationFrame(animate);
      this.analyser.getByteFrequencyData(dataArray);

      const bars = visualizer.children;
      const step = Math.floor(bufferLength / bars.length);

      for (let i = 0; i < bars.length; i++) {
        let sum = 0;
        const offset = i * step;

        // Calcular média para suavizar as frequências
        for (let j = 0; j < step; j++) {
          sum += dataArray[offset + j];
        }
        const average = sum / step;
        const height = (average / 255) * 100;

        bars[i].style.height = `${Math.max(2, height)}%`;

        // Efeito de cor baseado na intensidade
        const hue = 320 + height / 2;
        bars[i].style.background = `linear-gradient(to top, 
          hsl(${hue}, 100%, 75%), 
          hsl(${hue}, 100%, 85%)
        )`;
      }
    };

    animate();
  }
}

// Inicializar o player
window.addEventListener("DOMContentLoaded", () => {
  const player = new AudioPlayer();
  player.loadPlaylist();
});
