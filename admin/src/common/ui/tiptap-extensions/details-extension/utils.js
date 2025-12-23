import { DETAILS_ANIMATION } from './constants.js';

/**
 * Toggle details element with smooth animation
 * @param {HTMLElement} detailsElement - The details element to toggle
 * @param {HTMLElement} contentDiv - The content div to animate
 */
export function toggleDetailsWithAnimation(detailsElement, contentDiv) {
  if (!detailsElement || !contentDiv) return;

  const isOpen = detailsElement.hasAttribute('open');

  if (isOpen) {
    closeDetails(detailsElement, contentDiv);
  } else {
    openDetails(detailsElement, contentDiv);
  }
}

/**
 * Open details element with animation
 * @param {HTMLElement} detailsElement - The details element
 * @param {HTMLElement} contentDiv - The content div to animate
 */
function openDetails(detailsElement, contentDiv) {
  detailsElement.setAttribute('open', '');
  contentDiv.removeAttribute('hidden');
  contentDiv.style.maxHeight = '0';
  contentDiv.style.opacity = '0';

  requestAnimationFrame(() => {
    contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
    contentDiv.style.opacity = '1';
  });

  // Reset max-height after animation completes
  setTimeout(() => {
    contentDiv.style.maxHeight = 'none';
  }, DETAILS_ANIMATION.DURATION);
}

/**
 * Close details element with animation
 * @param {HTMLElement} detailsElement - The details element
 * @param {HTMLElement} contentDiv - The content div to animate
 */
function closeDetails(detailsElement, contentDiv) {
  contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;

  requestAnimationFrame(() => {
    contentDiv.style.maxHeight = '0';
    contentDiv.style.opacity = '0';
  });

  // Wait for animation to complete before hiding
  setTimeout(() => {
    contentDiv.setAttribute('hidden', '');
    detailsElement.removeAttribute('open');
  }, DETAILS_ANIMATION.DURATION);
}
