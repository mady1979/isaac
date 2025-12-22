// Basic site JS: mobile menu toggle + gallery loader + lightbox
document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Initialize gallery
  initGallery();
});

async function initGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) return;

  // Determine a robust base URL relative to where this script is served.
  // This makes paths work whether the site is hosted at domain root or as a project site (e.g. /owner/repo/).
  const scriptBase = document.currentScript ? new URL('.', document.currentScript.src) : new URL('/', window.location.origin);

  // Try manifest first
  let images = [];
  try {
    const manifestUrl = new URL('../gallery/index.json', scriptBase).href;
    const resp = await fetch(manifestUrl, {cache: 'no-store'});
    if (resp.ok) {
      const list = await resp.json();
      if (Array.isArray(list) && list.length) {
        images = list.map(name => new URL(`../gallery/${name}`, scriptBase).href);
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback: probe for files named 1..N with common extensions
  if (images.length === 0) {
    const maxFiles = 50; // adjust if you expect more images
    const exts = ['jpg','jpeg','png','webp','gif'];
    const found = [];
    for (let i = 1; i <= maxFiles; i++) {
      let foundOne = false;
      for (const ext of exts) {
        // Construct candidate URL relative to scriptBase
        const candidate = new URL(`../gallery/${i}.${ext}`, scriptBase).href;
        try {
          await tryLoadImage(candidate);
          found.push(candidate);
          foundOne = true;
          break;
        } catch (e) {
          // not found, try next extension
        }
      }
      // continue scanning — keep scanning even if some numbers are missing
    }
    images = found;
  }

  // Render images
  renderGalleryImages(galleryGrid, images);
}

function tryLoadImage(src, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timer = setTimeout(() => {
      img.src = ''; // cancel
      reject(new Error('timeout'));
    }, timeout);
    img.onload = () => {
      clearTimeout(timer);
      resolve(src);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('error'));
    };
    img.src = src;
  });
}

function renderGalleryImages(container, images) {
  container.innerHTML = ''; // clear placeholder
  if (!images || images.length === 0) {
    container.innerHTML = '<p class="small">No images found. Upload images to /gallery/ or add /gallery/index.json listing filenames.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-grid-inner';

  images.forEach((src, idx) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    figure.tabIndex = 0;

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Gallery image ${idx + 1}`;
    img.loading = 'lazy';
    img.dataset.full = src;

    const figcap = document.createElement('figcaption');
    figcap.textContent = src.split('/').pop();

    figure.appendChild(img);
    figure.appendChild(figcap);

    // click / keyboard handler
    const open = () => openLightbox(src, figcap.textContent);
    figure.addEventListener('click', open);
    figure.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    grid.appendChild(figure);
  });

  container.appendChild(grid);
  ensureLightbox();
}

function ensureLightbox() {
  if (document.getElementById('galleryModal')) return;

  const modal = document.createElement('div');
  modal.id = 'galleryModal';
  modal.className = 'gallery-modal';
  modal.innerHTML = `
    <div class="gallery-modal-backdrop" id="galleryModalBackdrop"></div>
    <div class="gallery-modal-content" role="dialog" aria-modal="true" aria-label="Image preview">
      <button class="gallery-modal-close" id="galleryModalClose" aria-label="Close">&times;</button>
      <img id="galleryModalImage" alt="">
      <div id="galleryModalCaption" class="gallery-modal-caption"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const backdrop = document.getElementById('galleryModalBackdrop');
  const closeBtn = document.getElementById('galleryModalClose');

  function close() {
    modal.classList.remove('open');
    // remove src to stop loading
    const im = document.getElementById('galleryModalImage');
    if (im) im.src = '';
  }

  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
}

function openLightbox(src, caption) {
  const modal = document.getElementById('galleryModal');
  const img = document.getElementById('galleryModalImage');
  const cap = document.getElementById('galleryModalCaption');
  if (!modal || !img) return;
  img.src = src;
  img.alt = caption || '';
  cap.textContent = caption || '';
  modal.classList.add('open');
  // focus close button for accessibility
  const closeBtn = document.getElementById('galleryModalClose');
  if (closeBtn) closeBtn.focus();
}
