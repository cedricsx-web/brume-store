/* ── THEME JOUR / NUIT ──────────────────────────────────────────────
   Logique complète (le script bloquant dans <head> duplique une version
   minimale de _timeBasedDefault()/_stored() pour appliquer le thème avant
   le premier rendu et éviter un flash). Ce fichier gère l'interactivité :
   clic sur le bouton, sauvegarde du choix manuel.
   ------------------------------------------------------------------
   Règle par défaut (si aucun choix manuel enregistré) : nuit entre 20h
   et 7h du matin, heure locale du visiteur. Ajuster HOUR_NIGHT_START /
   HOUR_NIGHT_END ci-dessous si besoin. */

const Theme = {
  KEY: 'brume-theme',
  HOUR_NIGHT_START: 20, // 20h
  HOUR_NIGHT_END: 7,    // 7h

  _timeBasedDefault() {
    const h = new Date().getHours();
    return (h >= this.HOUR_NIGHT_START || h < this.HOUR_NIGHT_END) ? 'dark' : 'light';
  },

  _stored() {
    try { return localStorage.getItem(this.KEY); } catch (e) { return null; }
  },

  current() {
    return this._stored() || this._timeBasedDefault();
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  // Bascule manuelle : mémorisée, prend le pas sur l'heure jusqu'à ce que
  // le visiteur efface ses données de navigation.
  toggle() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    this.apply(next);
    try { localStorage.setItem(this.KEY, next); } catch (e) {}
  },

  init() {
    // Le thème a déjà été posé par le script bloquant dans <head> ;
    // ici on ne fait que brancher le bouton.
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => this.toggle());
    this._initHamburgerMenu();
  },

  // Menu hamburger — partagé par toutes les pages qui ont #hamburger-btn/#nav-menu.
  // Ouverture/fermeture, clic en dehors, lien cliqué.
  _initHamburgerMenu() {
    const hbtn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('nav-menu');
    if (!hbtn || !menu) return;

    const close = () => { menu.classList.remove('open'); hbtn.setAttribute('aria-expanded', 'false'); };
    const toggle = () => {
      const isOpen = menu.classList.toggle('open');
      hbtn.setAttribute('aria-expanded', String(isOpen));
    };

    hbtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      if (!menu.contains(e.target) && e.target !== hbtn) close();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Theme.init());
