(function () {
  const PROP_PREVIEW = 'Design Preview';
  const PROP_RAW_ID = '_printify_personalization_id';

  function getProductForm() {
    return document.querySelector('product-form-component form');
  }

  function setHiddenInput(form, name, value) {
    let input = form.querySelector(`input[data-printify="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = `properties[${name}]`;
      input.dataset.printify = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function clearInputs(form) {
    form.querySelectorAll('input[data-printify]').forEach((el) => el.remove());
  }

  // Request max resolution by replacing the size param in the preview URL.
  // The preview is a rendered composite (product + customer design).
  // The raw uploaded image requires Printify API server-side access via personalizationId.
  function maxResUrl(url) {
    try {
      const u = new URL(url);
      u.searchParams.set('size', '4096');
      u.searchParams.delete('_t');
      return u.toString();
    } catch {
      return url;
    }
  }

  function applyPersonalization(imageUrl, personalizationId) {
    const form = getProductForm();
    if (!form) return;
    setHiddenInput(form, PROP_PREVIEW, maxResUrl(imageUrl));
    setHiddenInput(form, PROP_RAW_ID, personalizationId);
  }

  function clearPersonalization() {
    const form = getProductForm();
    if (!form) return;
    clearInputs(form);
  }

  window.addEventListener('message', function (event) {
    if (!event.origin.includes('personalize.at')) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'PERSONALIZATION_APPLIED' && msg.data) {
      applyPersonalization(msg.data.imageUrl, msg.data.personalizationId);
    }
  });

  function watchPersonalizeButton() {
    const btn = document.querySelector('.personalize-button');
    if (!btn) return;

    new MutationObserver(function () {
      if (!btn.classList.contains('button--secondary')) {
        clearPersonalization();
      }
    }).observe(btn, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPersonalizeButton);
  } else {
    watchPersonalizeButton();
  }
})();
