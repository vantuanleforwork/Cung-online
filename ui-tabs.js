/* Shared keyboard-accessible tabs. Panels may belong to the same form. */
(function () {
  'use strict';
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const buttons = [...root.querySelectorAll('[data-tab]')].filter(button => button.closest('[data-tabs]') === root);
    const panels = [...root.querySelectorAll('[data-panel]')].filter(panel => panel.closest('[data-tabs]') === root);
    buttons.forEach(button => {
      button.id ||= root.dataset.tabs+'-tab-'+button.dataset.tab;
      const matching = panels.filter(panel => panel.dataset.panel === button.dataset.tab);
      matching.forEach((panel,index) => {
        panel.id ||= root.dataset.tabs+'-panel-'+button.dataset.tab+'-'+index;
        panel.setAttribute('aria-labelledby',button.id);
      });
      button.setAttribute('aria-controls',matching.map(panel => panel.id).join(' '));
    });
    function select(key, focus = false) {
      buttons.forEach(button => {
        const active = button.dataset.tab === key;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.panel !== key; });
      root.dispatchEvent(new CustomEvent('tabchange', {detail: key}));
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button.dataset.tab));
      button.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = buttons[(index + 1) % buttons.length];
        if (event.key === 'ArrowLeft') target = buttons[(index + buttons.length - 1) % buttons.length];
        if (event.key === 'Home') target = buttons[0];
        if (event.key === 'End') target = buttons[buttons.length - 1];
        if (!target) return;
        event.preventDefault(); select(target.dataset.tab, true);
      });
    });
    root.addEventListener('invalid', event => {
      const panel = event.target.closest('[data-panel]');
      if (panel) select(panel.dataset.panel);
    }, true);
    select(buttons[0]?.dataset.tab);
  });
})();
