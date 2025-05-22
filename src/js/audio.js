class AudioPlayer {
  constructor() {
    // Criar elemento de áudio primeiro
    this.audioElement = new Audio();

    // Cache de elementos DOM
    this.elements = {
      playBtn: document.getElementById("play-btn"),
      prevBtn: document.getElementById("prev-btn"),
      nextBtn: document.getElementById("next-btn"),
      volumeControl: document.getElementById("volume-control"),
      trackName: document.getElementById("track-name"),
      trackArtist: document.getElementById("track-artist"),
      trackArtwork: document.getElementById("track-artwork"),
      currentTime: document.getElementById("lcd-current-time"),
      duration: document.getElementById("lcd-duration"),
      volumeIcon: document.querySelector(".volume-icon"),
    };

    // Inicialização dos estados
    this.state = {
      isPlaying: false,
      currentTrackIndex: 0,
      previousVolume: 0.7,
      playlist: [],
    };

    // Inicialização do contexto de áudio
    this.initializeAudioContext();
    this.setupEventListeners();
    this.loadPlaylist();
  }
  async initializeAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext não suportado neste navegador");
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
        console.log("AudioContext criado com sucesso");
      }
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // Poder de 2 para FFT, otimizado para visualização
      this.analyser.smoothingTimeConstant = 0.8; // Suavização do visualizador

      // Garantir que o elemento de áudio está pronto
      await new Promise((resolve) => {
        if (this.audioElement.readyState >= 2) {
          resolve();
        } else {
          this.audioElement.addEventListener("loadeddata", resolve, {
            once: true,
          });
        }
      });

      // Configurar fonte de áudio
      try {
        this.source = this.audioContext.createMediaElementSource(
          this.audioElement
        );
      } catch (e) {
        if (e.name === "InvalidStateError") {
          // Já conectado, tentar reconectar
          this.source.disconnect();
        }
        throw e;
      }
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Configurar analisador para o visualizador
      this.analyser.fftSize = 64; // Reduzido para melhor performance visual
      this.analyser.smoothingTimeConstant = 0.8;

      console.log("Sistema de áudio inicializado com sucesso");
    } catch (error) {
      console.error("Erro ao inicializar AudioContext:", error);
      this.handleError(
        `Erro ao inicializar sistema de áudio: ${error.message}`
      );
      throw error; // Propagar erro para tratamento adequado
    }
  }

  setupEventListeners() {
    // Event delegation para controles de reprodução
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (target.matches("#play-btn")) this.togglePlay();
      if (target.matches("#prev-btn")) this.playPrevious();
      if (target.matches("#next-btn")) this.playNext();
    });

    // Controle de volume
    if (this.elements.volumeControl) {
      this.elements.volumeControl.addEventListener("input", (e) => {
        this.setVolume(e.target.value);
      });
    }

    // Volume icon click
    if (this.elements.volumeIcon) {
      this.elements.volumeIcon.addEventListener("click", () => {
        if (this.audioElement.volume > 0) {
          this.state.previousVolume = this.audioElement.volume;
          this.setVolume(0);
        } else {
          this.setVolume(this.state.previousVolume);
        }
      });
    }

    // Audio element events
    this.audioElement.addEventListener("timeupdate", () => {
      requestAnimationFrame(() => this.updateTimeDisplay());
    });

    this.audioElement.addEventListener("ended", () => {
      this.playNext();
    });
  }
  async loadPlaylist() {
    try {
      console.log("Carregando playlist...");
      const response = await fetch("src/assets/playlist/songs.json");
      if (!response.ok) {
        throw new Error(`Erro ao carregar songs.json: ${response.status}`);
      }

      const data = await response.json();
      if (!data.playlist || !Array.isArray(data.playlist)) {
        throw new Error("Formato inválido de playlist");
      }

      this.state.playlist = data.playlist;
      console.log("Playlist carregada:", this.state.playlist);

      if (!this.state.playlist.length) {
        throw new Error("Playlist vazia");
      }

      // Tentar carregar a primeira música
      await this.loadTrack(0);
      console.log("Primeira música carregada com sucesso");
    } catch (error) {
      console.error("Erro ao carregar playlist:", error);
      this.handleError(`Erro ao carregar playlist: ${error.message}`);
    }
  }
  async loadTrack(index) {
    try {
      console.log(`Carregando track ${index}...`);

      if (index < 0 || index >= this.state.playlist.length) {
        throw new Error(`Índice inválido: ${index}`);
      }

      const track = this.state.playlist[index];
      if (!track || !track.url) {
        throw new Error("Track inválida ou sem URL");
      }
      console.log(`Tentando carregar: ${track.url}`);

      // Usar o caminho do arquivo diretamente, sem fetch
      const audioUrl = new URL(track.url, window.location.href).href;
      console.log("URL completa:", audioUrl);

      // Configurar fonte de áudio
      this.audioElement.src = audioUrl;

      // Garantir que os metadados são carregados antes de continuar
      await new Promise((resolve, reject) => {
        this.audioElement.addEventListener("loadedmetadata", resolve, {
          once: true,
        });
        this.audioElement.addEventListener("error", reject, { once: true });
        this.audioElement.load();
      });

      // Atualizar informações da track
      if (this.elements.trackName)
        this.elements.trackName.textContent = track.title;
      if (this.elements.trackArtist)
        this.elements.trackArtist.textContent = track.artist;
      if (this.elements.trackArtwork) {
        // Validar se a capa existe
        try {
          const artworkResponse = await fetch(track.artwork);
          if (artworkResponse.ok) {
            this.elements.trackArtwork.src = track.artwork;
          } else {
            throw new Error("Artwork não encontrada");
          }
        } catch {
          this.elements.trackArtwork.src =
            "src/assets/playlist/covers/default-cover.jpg";
        }
      } // Adicionar listener para debug
      this.audioElement.addEventListener(
        "canplay",
        () => {
          console.log("Áudio pronto para reprodução");
        },
        { once: true }
      );
    } catch (error) {
      console.error("Erro ao carregar track:", error);
      this.handleError(`Erro ao carregar música: ${error.message}`);
    }
  }

  handleError(message) {
    if (this.elements.trackName) {
      this.elements.trackName.textContent = message;
    }
  }

  // Player controls
  async togglePlay() {
    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      if (this.audioElement.paused) {
        await this.audioElement.play();
        this.state.isPlaying = true;
        this.elements.playBtn.textContent = "⏸️";

        // Iniciar o visualizador quando a música começar
        if (typeof startVisualizer === "function") {
          startVisualizer();
        }
      } else {
        this.audioElement.pause();
        this.elements.playBtn.textContent = "▶️";
        this.state.isPlaying = false;

        // Dispara evento de pause para parar o visualizador
        const pauseEvent = new Event("pause");
        this.audioElement.dispatchEvent(pauseEvent);
      }
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      this.handleError("Erro ao reproduzir música");
    }
  }

  async playNext() {
    try {
      this.state.currentTrackIndex =
        (this.state.currentTrackIndex + 1) % this.state.playlist.length;
      await this.loadTrack(this.state.currentTrackIndex);

      if (this.state.isPlaying) {
        const wasPlaying = !this.audioElement.paused;
        if (wasPlaying) {
          const pauseEvent = new Event("pause");
          this.audioElement.dispatchEvent(pauseEvent);
        }

        await this.audioElement.play();

        const playEvent = new Event("play");
        this.audioElement.dispatchEvent(playEvent);
      }
    } catch (error) {
      console.error("Erro ao mudar para próxima música:", error);
      this.handleError("Erro ao mudar música");
    }
  }

  async playPrevious() {
    try {
      this.state.currentTrackIndex =
        (this.state.currentTrackIndex - 1 + this.state.playlist.length) %
        this.state.playlist.length;
      await this.loadTrack(this.state.currentTrackIndex);

      if (this.state.isPlaying) {
        const wasPlaying = !this.audioElement.paused;
        if (wasPlaying) {
          const pauseEvent = new Event("pause");
          this.audioElement.dispatchEvent(pauseEvent);
        }

        await this.audioElement.play();

        const playEvent = new Event("play");
        this.audioElement.dispatchEvent(playEvent);
      }
    } catch (error) {
      console.error("Erro ao mudar para música anterior:", error);
      this.handleError("Erro ao mudar música");
    }
  }

  setVolume(value) {
    this.audioElement.volume = value;
    if (this.elements.volumeControl) {
      this.elements.volumeControl.value = value;
      this.elements.volumeControl.style.setProperty(
        "--volume-percent",
        `${value * 100}%`
      );
      this.elements.volumeControl.setAttribute(
        "data-tooltip",
        `Volume: ${Math.round(value * 100)}%`
      );
    }

    // Atualizar ícone
    const volumeIcon = document.querySelector(".volume-icon-svg");
    if (volumeIcon) {
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
  }

  updateTimeDisplay() {
    if (this.elements.currentTime && this.elements.duration) {
      this.elements.currentTime.textContent = this.formatTime(
        this.audioElement.currentTime
      );
      this.elements.duration.textContent = this.formatTime(
        this.audioElement.duration || 0
      );
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}

// Inicializar o player quando o DOM estiver pronto
window.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Inicializando player...");
    window.player = new AudioPlayer();
    console.log("Player inicializado com sucesso");
  } catch (error) {
    console.error("Erro ao inicializar player:", error);
  }
});
