// Campos editáveis com sugestões controladas, sem o popup nativo do datalist.
(() => {
  window.initEditableChoices = function (form) {
    const closeMenus = [];
    form.querySelectorAll('input[list]').forEach(input => {
      const source = document.getElementById(input.getAttribute('list'));
      if (!source) return;
      const label = input.closest('.form-field')?.querySelector('span');
      const name = label?.textContent.replace(/\s*\*$/, '') || 'Opções';
      const wrapper = document.createElement('div');
      wrapper.className = 'editable-choice';
      input.before(wrapper);
      wrapper.append(input);
      input.removeAttribute('list');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-haspopup', 'listbox');
      if (label) {
        label.id ||= input.id + 'Label';
        input.setAttribute('aria-labelledby', label.id);
      }
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'editable-choice-toggle';
      toggle.id = input.id + 'Toggle';
      toggle.setAttribute('aria-haspopup', 'listbox');
      toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      const menu = document.createElement('div');
      menu.className = 'editable-choice-list';
      menu.id = input.id + 'Suggestions';
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', 'Sugestões de ' + name);
      input.setAttribute('aria-controls', menu.id);
      toggle.setAttribute('aria-controls', menu.id);
      wrapper.append(toggle, menu);
      let options = [];
      let active = -1;
      let choosing = false;
      const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
      function expanded(open) {
        menu.hidden = !open;
        input.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', (open ? 'Fechar' : 'Abrir') + ' sugestões de ' + name);
        if (!open) {
          active = -1;
          input.removeAttribute('aria-activedescendant');
        }
      }
      const close = () => expanded(false);
      closeMenus.push(close);
      close();
      function open(all = false) {
        if (input.disabled) return;
        closeMenus.forEach(closeMenu => closeMenu());
        const query = all ? '' : normalize(input.value);
        options = [...new Set([...source.options].map(option => option.value))]
          .filter(value => !query || normalize(value).includes(query));
        menu.replaceChildren();
        options.forEach((value, index) => {
          const option = document.createElement('div');
          option.id = menu.id + '-' + index;
          option.dataset.index = index;
          option.className = 'editable-choice-option';
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.textContent = value;
          menu.append(option);
        });
        if (!options.length) {
          const empty = document.createElement('div');
          empty.className = 'editable-choice-empty';
          empty.textContent = 'Sem sugestões. Você pode usar o texto digitado.';
          menu.append(empty);
        }
        expanded(true);
      }
      function highlight(index) {
        active = index;
        [...menu.querySelectorAll('[role="option"]')].forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
        const option = menu.children[index];
        if (option) {
          input.setAttribute('aria-activedescendant', option.id);
          option.scrollIntoView({block: 'nearest', behavior: 'instant'});
        }
      }
      function choose(index) {
        if (options[index] === undefined) return;
        input.value = options[index];
        choosing = true;
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
        choosing = false;
        close();
        input.focus({preventScroll: true});
      }
      toggle.addEventListener('pointerdown', event => event.preventDefault());
      toggle.addEventListener('click', event => {
        event.preventDefault();
        const wasOpen = !menu.hidden;
        input.focus({preventScroll: true});
        if (wasOpen) close();
        else open(true);
      });
      input.addEventListener('click', () => open());
      input.addEventListener('input', () => { if (!choosing) open(); });
      input.addEventListener('keydown', event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          if (menu.hidden) open(true);
          if (options.length) highlight(active < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (event.key === 'Enter' && !menu.hidden) {
          event.preventDefault();
          if (active >= 0) choose(active);
          else close();
        } else if (event.key === 'Escape' && !menu.hidden) {
          event.preventDefault();
          close();
        } else if (event.key === 'Tab') close();
      });
      menu.addEventListener('pointerdown', event => event.preventDefault());
      menu.addEventListener('click', event => {
        event.preventDefault();
        const option = event.target.closest('[data-index]');
        if (option) choose(Number(option.dataset.index));
      });
      wrapper.addEventListener('focusout', event => {
        if (!wrapper.contains(event.relatedTarget)) close();
      });
      document.addEventListener('pointerdown', event => {
        if (!wrapper.contains(event.target)) close();
      });
      form.addEventListener('submit', close);
      form.addEventListener('event-step-change', close);
    });
  };
})();
