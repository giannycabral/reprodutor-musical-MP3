class MusicVisualizer {
  constructor(audioContext, analyser, audioElement) {
    this.audioContext = audioContext;
    this.analyser = analyser;
    this.audioElement = audioElement;

    // Configurar o array de dados para o visualizador
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Monitorar eventos de áudio para atualização do visualizador
    requestAnimationFrame(() => this.updateVisualizer());
  }

  updateVisualizer() {
    // Obter dados de frequência
    this.analyser.getByteFrequencyData(this.dataArray);

    // Atualizar visualização aqui
    // TODO: Implementar visualização conforme necessário

    // Continuar atualizando
    requestAnimationFrame(() => this.updateVisualizer());
  }

  // Método para desenhar o visualizador
  drawVisualizer() {
    const track = this.playlist[index];
    if (!track) {
      console.error("Track não encontrada no índice:", index);
      return;
    }

    // Verificar se a URL do áudio é válida
    fetch(track.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Se o arquivo existe, carregá-lo
        this.audioElement.src = track.url;
        this.audioElement.load(); // Forçar o recarregamento
        if (this.isPlaying) {
          this.audioElement
            .play()
            .catch((e) => console.error("Erro ao reproduzir áudio:", e));
        }
      })
      .catch((error) => {
        console.error(`Erro ao carregar a música: ${track.url}`, error);
        document.getElementById("track-name").textContent =
          "Erro ao carregar música";
        document.getElementById("lcd-track-name").textContent =
          "Erro: Arquivo não encontrado";
      });

    document.getElementById("track-name").textContent = track.title;
    document.getElementById("track-artist").textContent = track.artist;

    // Carregar artwork com fallback
    const artwork = document.getElementById("track-artwork");
    artwork.src = track.artwork;
    artwork.onerror = () => {
      console.error(`Erro ao carregar a imagem: ${track.artwork}`);
      artwork.src = "src/assets/playlist/covers/default-cover.jpg";
    };

    const lcdTrackName = document.getElementById("lcd-track-name");
    lcdTrackName.textContent = track.title;
    if (track.title.length > 20) {
      lcdTrackName.classList.add("animate");
    } else {
      lcdTrackName.classList.remove("animate");
    } // Atualizar o visualizador (temporariamente desativado para debug)
    /*if (!this.visualizerStarted) {
      this.startVisualizer();
      this.visualizerStarted = true;
    }*/
  }
  async togglePlay() {
    try {
      if (this.audioElement.paused) {
        await this.audioElement.play();
        const playBtn = document.getElementById("play-btn");
        if (playBtn) playBtn.textContent = "⏸️";
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }
      } else {
        this.audioElement.pause();
        const playBtn = document.getElementById("play-btn");
        if (playBtn) playBtn.textContent = "▶️";
      }
    } catch (error) {
      console.error("Erro ao alternar reprodução:", error);
    }
  }
  async nextTrack() {
    try {
      this.currentTrackIndex =
        (this.currentTrackIndex + 1) % this.playlist.length;
      await this.loadTrack(this.currentTrackIndex);
      if (this.isPlaying) {
        await this.audioElement.play();
      }
    } catch (error) {
      console.error("Erro ao avançar para próxima faixa:", error);
    }
  }
  async previousTrack() {
    try {
      this.currentTrackIndex =
        (this.currentTrackIndex - 1 + this.playlist.length) %
        this.playlist.length;
      await this.loadTrack(this.currentTrackIndex);
      if (this.isPlaying) {
        await this.audioElement.play();
      }
    } catch (error) {
      console.error("Erro ao voltar para faixa anterior:", error);
    }
  }
  updateProgress() {
    const progress =
      (this.audioElement.currentTime / this.audioElement.duration) * 100;

    // Atualizar seek slider se existir
    const seekSlider = document.getElementById("seek-slider");
    if (seekSlider) {
      seekSlider.value = progress;
      seekSlider.style.setProperty("--progress", `${progress}%`);
    }

    // Função auxiliar para atualizar elementos de texto com segurança
    const updateTimeElement = (elementId, time) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = this.formatTime(time);
      }
    };

    // Atualiza os tempos com verificação de nulos
    updateTimeElement("current-time", this.audioElement.currentTime);
    updateTimeElement("duration", this.audioElement.duration);
    updateTimeElement("lcd-current-time", this.audioElement.currentTime);
    updateTimeElement("lcd-duration", this.audioElement.duration);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  startVisualizer() {
    const visualizer = document.getElementById("visualizer");

    // Limpar visualizador existente
    visualizer.innerHTML = "";

    // Criar barras do visualizador
    const barCount = 16;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className = "pixel-bar";
      visualizer.appendChild(bar);
    }

    // Criar dataArray com o tamanho correto do frequencyBinCount
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Função de atualização do visualizador
    const updateVisualizer = () => {
      // Garantir que o contexto de áudio está ativo
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Atualizar dados de frequência
      requestAnimationFrame(updateVisualizer);
      this.analyser.getByteFrequencyData(dataArray);

      const bars = document.querySelectorAll(".pixel-bar");
      const step = Math.floor(dataArray.length / bars.length);

      for (let i = 0; i < bars.length; i++) {
        let sum = 0;
        const offset = i * step;

        // Calcular média do range de frequências para cada barra
        for (let j = 0; j < step; j++) {
          sum += dataArray[offset + j];
        }
        const value = sum / (step * 255); // Normalizar para 0-1
        const height = value * 200 + 2; // altura mínima de 2px
        bars[i].style.height = `${height}px`;

        // Atualizar cor baseado na intensidade
        if (value > 0.8) {
          bars[i].style.backgroundColor = "#ef5350";
        } else if (value > 0.5) {
          bars[i].style.backgroundColor = "#f8bbd0";
        } else {
          bars[i].style.backgroundColor = "#f48fb1";
        }
      }
    };

    updateVisualizer();
  }
}

// Inicializar o player quando o documento carregar
document.addEventListener("DOMContentLoaded", () => {
  window.musicPlayer = new MusicPlayer();
});
