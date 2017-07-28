/* eslint-env browser */

import Controller from './Controller';
import Scene from './Scene';

// TODO: temporary workaround for chrome's scroll jitter bug
// window.addEventListener('mousewheel', () => {}, { passive: true });

export {
  Controller,
  Scene,
};
