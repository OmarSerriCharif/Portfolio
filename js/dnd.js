/**
 * Sortable lists with the native HTML5 Drag and Drop API, plus touch and
 * keyboard support.
 *
 *   makeSortable(listEl, {
 *     itemSelector: '.sortable-item',   // direct children that can move
 *     handleSelector: '.drag-handle',   // drag starts only from the handle
 *     onReorder: (ids) => {...},        // ids = item.dataset.id in the new order
 *   });
 *
 * - Mouse/desktop: native draggable + dragover/drop.
 * - Touch: HTML5 DnD doesn't fire on most mobile browsers, so touch events on
 *   the handle move the item using elementFromPoint.
 * - Keyboard: focus the handle and press ArrowUp / ArrowDown.
 */
import { announce } from './dom.js';

export function makeSortable(list, { itemSelector = '.sortable-item', handleSelector = '.drag-handle', onReorder, label = 'Item' }) {
  let dragged = null;
  let startOrder = '';

  const items = () => [...list.querySelectorAll(`:scope > ${itemSelector}`)];
  const order = () => items().map((el) => el.dataset.id);
  const itemFrom = (node) => node?.closest?.(itemSelector);

  const begin = (item) => {
    dragged = item;
    startOrder = order().join(',');
    item.classList.add('is-dragging');
    list.classList.add('is-sorting');
  };

  const finish = () => {
    if (!dragged) return;
    dragged.classList.remove('is-dragging');
    dragged.removeAttribute('draggable');
    list.classList.remove('is-sorting');
    const moved = dragged;
    dragged = null;
    const ids = order();
    if (ids.join(',') !== startOrder) {
      const position = ids.indexOf(moved.dataset.id) + 1;
      announce(`${label} moved to position ${position} of ${ids.length}.`);
      onReorder?.(ids);
    }
  };

  /** Move the dragged item before/after `target` depending on pointer Y. */
  const moveRelativeTo = (target, clientY) => {
    if (!dragged || !target || target === dragged || target.parentElement !== list) return;
    const rect = target.getBoundingClientRect();
    const after = clientY > rect.top + rect.height / 2;
    list.insertBefore(dragged, after ? target.nextElementSibling : target);
  };

  /* ---- Mouse: native HTML5 drag and drop ---- */

  // Only make the row draggable while the handle is pressed, so text inside
  // the row stays selectable and buttons keep working.
  list.addEventListener('mousedown', (event) => {
    const handle = event.target.closest(handleSelector);
    const item = handle && itemFrom(handle);
    if (item && list.contains(item)) item.setAttribute('draggable', 'true');
  });
  list.addEventListener('mouseup', () => {
    if (!dragged) items().forEach((el) => el.removeAttribute('draggable'));
  });

  list.addEventListener('dragstart', (event) => {
    const item = itemFrom(event.target);
    if (!item || item.getAttribute('draggable') !== 'true') return;
    begin(item);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.dataset.id); // required by Firefox
  });

  list.addEventListener('dragover', (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    moveRelativeTo(itemFrom(event.target), event.clientY);
  });

  list.addEventListener('drop', (event) => {
    if (dragged) event.preventDefault();
  });

  list.addEventListener('dragend', finish);

  /* ---- Touch ---- */

  list.addEventListener('touchstart', (event) => {
    const handle = event.target.closest(handleSelector);
    const item = handle && itemFrom(handle);
    if (!item || event.touches.length !== 1) return;
    begin(item);
  }, { passive: true });

  list.addEventListener('touchmove', (event) => {
    if (!dragged) return;
    event.preventDefault(); // stop the page from scrolling while sorting
    const touch = event.touches[0];
    const under = document.elementFromPoint(touch.clientX, touch.clientY);
    moveRelativeTo(itemFrom(under), touch.clientY);
  }, { passive: false });

  list.addEventListener('touchend', finish);
  list.addEventListener('touchcancel', finish);

  /* ---- Keyboard ---- */

  list.addEventListener('keydown', (event) => {
    const handle = event.target.closest(handleSelector);
    if (!handle || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    const item = itemFrom(handle);
    const sibling = event.key === 'ArrowUp' ? item.previousElementSibling : item.nextElementSibling;
    if (!sibling || !sibling.matches(itemSelector)) return;
    event.preventDefault();
    startOrder = order().join(',');
    dragged = item;
    list.insertBefore(item, event.key === 'ArrowUp' ? sibling : sibling.nextElementSibling);
    finish();
    handle.focus();
  });
}
