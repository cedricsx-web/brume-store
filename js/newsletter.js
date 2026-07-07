// js/newsletter.js
// Gère la soumission du formulaire d'inscription newsletter.
// L'email de bienvenue (avec le PDF des 3 recettes) est envoyé par Brevo
// via une automation déclenchée côté Brevo — rien à gérer ici après l'inscription.

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  const input = document.getElementById('newsletter-email');
  const button = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById('newsletter-feedback');
  const buttonLabel = button ? button.textContent : '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFeedback(message, type) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = 'newsletter-feedback' + (type ? ` is-${type}` : '');
  }

  function setLoading(isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? '...' : buttonLabel;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (input.value || '').trim();

    if (!emailRegex.test(email)) {
      setFeedback('Merci de saisir une adresse email valide.', 'error');
      input.focus();
      return;
    }

    setLoading(true);
    setFeedback('', null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      form.reset();
      setFeedback('Vérifiez votre boîte mail 🎁', 'success');

    } catch (err) {
      console.warn('Newsletter subscribe failed:', err);
      setFeedback('Une erreur est survenue, merci de réessayer.', 'error');

    } finally {
      setLoading(false);
    }
  });
});
