/*About Cards*/
const dialog = document.getElementById("about-dialog");
const dialogContent = document.getElementById("dialog-content");
const closeBtn = dialog.querySelector(".dialog-close");
const cards = document.querySelectorAll(".about-card");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const detailId = card.getAttribute("aria-controls");
    const detail = document.getElementById(detailId);

    dialogContent.replaceChildren();

    detail.childNodes.forEach((node) => {
      dialogContent.appendChild(node.cloneNode(true));
    });

    dialog.showModal();
  });
});

dialog.addEventListener("click", (e) => {
  if (!dialogContent.contains(e.target) && e.target !== dialogContent) {
    dialog.close();
  }
});

closeBtn.addEventListener("click", () => dialog.close());
