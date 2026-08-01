/*About Cards*/
const dialog = document.getElementById("about-dialog");
const dialogContent = document.getElementById("dialog-content");
const closeBtn = dialog.querySelector(".dialog-close");
const cards = document.querySelectorAll(".about-card");
const shadowforeground = document.querySelector(".shadow-foreground");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const detailId = card.getAttribute("aria-controls");
    const detail = document.getElementById(detailId);

    dialogContent.replaceChildren();

    detail.childNodes.forEach((node) => {
      dialogContent.appendChild(node.cloneNode(true));
    });

    dialog.showModal();
    const foregroundCurOpacity = parseFloat(
      window.getComputedStyle(shadowforeground).opacity
    );
    if (foregroundCurOpacity === 0) {
      shadowforeground.style.opacity = "0.3";
    }
  });
});

dialog.addEventListener("click", (e) => {
  if (!dialogContent.contains(e.target) && e.target !== dialogContent) {
    dialog.close();
    const foregroundCurOpacity = parseFloat(
      window.getComputedStyle(shadowforeground).opacity
    );
    if (foregroundCurOpacity === 0.3) {
      shadowforeground.style.opacity = "0";
    }
  }
});

closeBtn.addEventListener("click", () => dialog.close());
