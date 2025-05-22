// Efeito de movimento das estrelas
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  let starX = 0;
  let starY = 0;

  // Movimento suave das estrelas baseado no movimento do mouse
  document.addEventListener("mousemove", (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    // Movimento suave das estrelas
    starX += (mouseX * 20 - starX) * 0.05;
    starY += (mouseY * 20 - starY) * 0.05;

    body.style.setProperty("--star-x", `${starX}%`);
    body.style.setProperty("--star-y", `${starY}%`);
  });

  // Animação automática para dispositivos móveis
  let autoAnimateX = 0;
  let autoAnimateY = 0;
  let direction = 1;

  function autoAnimate() {
    if (!("ontouchstart" in window)) return; // Só animar em dispositivos touch

    autoAnimateX += 0.2 * direction;
    autoAnimateY += 0.15 * direction;

    if (autoAnimateX > 20 || autoAnimateX < -20) {
      direction *= -1;
    }

    body.style.setProperty("--star-x", `${autoAnimateX}%`);
    body.style.setProperty("--star-y", `${autoAnimateY}%`);

    requestAnimationFrame(autoAnimate);
  }

  autoAnimate();
});
