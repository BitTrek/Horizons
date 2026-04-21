(function () {
  const PROP_IMAGE = 'Design Preview';

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

  function applyPersonalization(imageUrl) {
    const form = getProductForm();
    if (!form) return;
    setHiddenInput(form, PROP_IMAGE, imageUrl);
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
      applyPersonalization(msg.data.imageUrl);
    }
  });

  // When Printify removes personalization the button loses "button--secondary".
  // Clear hidden inputs so orphaned data doesn't reach the order.
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
