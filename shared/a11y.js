// Shared keyboard and focus behavior for custom controls.
export function initRadioGroups() {
  document.querySelectorAll('[role="radiogroup"]').forEach(group => {
    const radios = [...group.querySelectorAll('[role="radio"]')];
    if (!radios.length) return;

    const sync = active => {
      radios.forEach(radio => {
        const selected = radio === active;
        radio.setAttribute('aria-checked', String(selected));
        radio.tabIndex = selected ? 0 : -1;
      });
    };

    sync(radios.find(radio => radio.getAttribute('aria-checked') === 'true') || radios[0]);
    radios.forEach((radio, index) => {
      radio.addEventListener('click', () => sync(radio));
      radio.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        const next = radios[(index + delta + radios.length) % radios.length];
        next.focus();
        next.click();
      });
    });
  });
}

export function initDialogs() {
  document.querySelectorAll('[role="dialog"]').forEach(dialog => {
    dialog.setAttribute('aria-modal', 'true');
    if (!dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
    if (!dialog.getAttribute('aria-labelledby')) {
      const heading = dialog.querySelector('h1, h2, h3, [class*="title"]');
      if (heading) {
        if (!heading.id) heading.id = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
        dialog.setAttribute('aria-labelledby', heading.id);
      }
    }

    let wasOpen = !dialog.classList.contains('hidden');
    let lastFocused = null;
    const focusables = () => [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.getClientRects().length > 0);
    const focusFirst = () => (focusables()[0] || dialog).focus();

    const observer = new MutationObserver(() => {
      const isOpen = !dialog.classList.contains('hidden');
      if (isOpen && !wasOpen) {
        lastFocused = document.activeElement;
        requestAnimationFrame(focusFirst);
      } else if (!isOpen && wasOpen && lastFocused?.focus) {
        requestAnimationFrame(() => lastFocused.focus());
      }
      wasOpen = isOpen;
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['class'] });

    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  });
}

initRadioGroups();
initDialogs();
