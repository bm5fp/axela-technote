document.addEventListener("DOMContentLoaded", setupLightbox);
document.addEventListener("page:loaded", setupLightbox); // instant navigation

function setupLightbox() {
  if (document.querySelector(".lightbox-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = '<button class="lightbox-close" aria-label="閉じる">&times;</button><img alt="">';
  document.body.appendChild(overlay);

  const img = overlay.querySelector("img");

  function open(src, alt) {
    img.src = src;
    img.alt = alt || "";
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    img.src = "";
  }

  overlay.addEventListener("click", (e) => {
    if (e.target !== img) close();
  });

  overlay.querySelector(".lightbox-close").addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  document.querySelector(".md-content")?.addEventListener("click", (e) => {
    const target = e.target.closest("img");
    if (!target) return;
    open(target.src, target.alt);
  });
}
