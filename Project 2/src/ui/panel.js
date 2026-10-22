/**
 * Make the control panel collapsible. Starts collapsed on mobile so the map is visible.
 * @param {HTMLButtonElement} toggle - button with aria-controls pointing at the panel body.
 * @param {string} mobileQuery - media query for the mobile layout.
 */
export function initPanel(toggle, mobileQuery) {
  const body = document.getElementById(toggle.getAttribute('aria-controls'));

  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Hide controls' : 'Show controls');
    body.hidden = !expanded;
  };

  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
  setExpanded(!window.matchMedia(mobileQuery).matches);
}
