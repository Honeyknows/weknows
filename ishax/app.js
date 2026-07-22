// ============================================================
// ISHAX EDR Web Representation — Interactive Engine & Mobile Menu
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initMitreMatrix();
  initMobileMenu();
});

// ------------------------------------------------------------
// Mobile Menu Navigation Toggle
// ------------------------------------------------------------
function initMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!menuToggle || !navLinks) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    const icon = menuToggle.querySelector('i');
    if (icon) {
      icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    }
  });

  // Close mobile menu when clicking a link
  const links = navLinks.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-bars';
      }
    });
  });
}

// ------------------------------------------------------------
// Interactive MITRE ATT&CK Matrix Cards
// ------------------------------------------------------------
function initMitreMatrix() {
  const cards = document.querySelectorAll('.mitre-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}
