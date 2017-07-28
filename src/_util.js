/* eslint-env browser */

const DEBUG = false;

const U = {};

let i;

/**
   * ------------------------------
   * Type testing
   * ------------------------------
   */

const _type = v => Object.prototype.toString.call(v).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
_type.String = v => _type(v) === 'string';
_type.Function = v => _type(v) === 'function';
_type.Array = v => Array.isArray(v);
_type.Number = v => !_type.Array(v) && (v - parseFloat(v) + 1) >= 0;
_type.DomElement = o => (typeof HTMLElement === 'object' || typeof HTMLElement === 'function' ? o instanceof HTMLElement || o instanceof SVGElement : // DOM2
  o && typeof o === 'object' && o !== null && o.nodeType === 1 && typeof o.nodeName === 'string');
U.type = _type;

/**
   * ------------------------------
   * Internal helpers
   * ------------------------------
   */

// parse float and fall back to 0.
const _floatval = number => parseFloat(number) || 0;

// get current style IE safe (otherwise IE would return calculated values for 'auto')
const _getComputedStyle = elem => (elem.currentStyle ? elem.currentStyle : window.getComputedStyle(elem));

// get element dimension (width or height)
const _dimension = (which, elem, outer, includeMargin) => {
  elem = (elem === document) ? window : elem;
  if (elem === window) {
    includeMargin = false;
  } else if (!_type.DomElement(elem)) {
    return 0;
  }
  which = which.charAt(0).toUpperCase() + which.substr(1).toLowerCase();
  let dimension = (outer ? elem[`offset${which}`] || elem[`outer${which}`] : elem[`client${which}`] || elem[`inner${which}`]) || 0;
  if (outer && includeMargin) {
    const style = _getComputedStyle(elem);
    dimension += which === 'Height' ? _floatval(style.marginTop) + _floatval(style.marginBottom) : _floatval(style.marginLeft) + _floatval(style.marginRight);
  }
  return dimension;
};

  // converts 'margin-top' into 'marginTop'
const _camelCase = str => str.replace(/^[^a-z]+([a-z])/g, '$1').replace(/-([a-z])/g, g => g[1].toUpperCase());

/**
   * ------------------------------
   * External helpers
   * ------------------------------
   */

// extend obj – same as jQuery.extend({}, objA, objB)
U.extend = function (obj) {
  obj = obj || {};
  for (i = 1; i < arguments.length; i++) {
    if (!arguments[i]) {
      continue;
    }
    for (const key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        obj[key] = arguments[i][key];
      }
    }
  }
  return obj;
};

// check if a css display type results in margin-collapse or not
U.isMarginCollapseType = str => ['block', 'flex', 'list-item', 'table', '-webkit-box'].indexOf(str) > -1;

// implementation of requestAnimationFrame
// based on https://gist.github.com/paulirish/1579671

let lastTime = 0;

const vendors = ['ms', 'moz', 'webkit', 'o'];
let _requestAnimationFrame = window.requestAnimationFrame;
let _cancelAnimationFrame = window.cancelAnimationFrame;

// try vendor prefixes if the above doesn't work
for (i = 0; !_requestAnimationFrame && i < vendors.length; ++i) {
  _requestAnimationFrame = window[`${vendors[i]}RequestAnimationFrame`];
  _cancelAnimationFrame = window[`${vendors[i]}CancelAnimationFrame`] || window[`${vendors[i]}CancelRequestAnimationFrame`];
}

// fallbacks
if (!_requestAnimationFrame) {
  _requestAnimationFrame = (callback) => {
    const currTime = new Date().getTime();
    const timeToCall = Math.max(0, 16 - (currTime - lastTime));
    const id = window.setTimeout(() => { callback(currTime + timeToCall); }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  };
}

if (!_cancelAnimationFrame) {
  _cancelAnimationFrame = (id) => {
    window.clearTimeout(id);
  };
}

U.rAF = _requestAnimationFrame.bind(window);
U.cAF = _cancelAnimationFrame.bind(window);

const loglevels = ['error', 'warn', 'log'];

const console = window.console || {};

console.log = console.log || (() => {}); // no console log, well - do nothing then...

// make sure methods for all levels exist.
for (i = 0; i < loglevels.length; i++) {
  const method = loglevels[i];
  if (!console[method]) {
    console[method] = console.log; // prefer .log over nothing
  }
}

U.log = function (loglevel) {
  if (!DEBUG) {
    return;
  }
  if (loglevel > loglevels.length || loglevel <= 0) loglevel = loglevels.length;
  const now = new Date();
  const time = `${(`0${now.getHours()}`).slice(-2)}:${(`0${now.getMinutes()}`).slice(-2)}:${(`0${now.getSeconds()}`).slice(-2)}:${(`00${now.getMilliseconds()}`).slice(-3)}`;
  const method = loglevels[loglevel - 1];
  const args = Array.prototype.splice.call(arguments, 1);
  const func = Function.prototype.bind.call(console[method], console);
  args.unshift(time);
  func.apply(console, args);
};

/**
   * ------------------------------
   * DOM Element info
   * ------------------------------
   */
// always returns a list of matching DOM elements, from a selector, a DOM element or an list of elements or even an array of selectors
const _get = {};
_get.elements = (selector) => {
  let arr = [];
  if (_type.String(selector)) {
    try {
      selector = document.querySelectorAll(selector);
    } catch (e) { // invalid selector
      return arr;
    }
  }
  if (_type(selector) === 'nodelist' || _type.Array(selector)) {
    for (let i = 0, ref = arr.length = selector.length; i < ref; i++) { // list of elements
      const elem = selector[i];
      arr[i] = _type.DomElement(elem) ? elem : _get.elements(elem); // if not an element, try to resolve recursively
    }
  } else if (_type.DomElement(selector) || selector === document || selector === window) {
    arr = [selector]; // only the element
  }
  return arr;
};
// get scroll top value
_get.scrollTop = elem => ((elem && typeof elem.scrollTop === 'number') ? elem.scrollTop : window.pageYOffset || 0);
// get scroll left value
_get.scrollLeft = elem => ((elem && typeof elem.scrollLeft === 'number') ? elem.scrollLeft : window.pageXOffset || 0);
// get element height
_get.width = (elem, outer, includeMargin) => _dimension('width', elem, outer, includeMargin);
// get element width
_get.height = (elem, outer, includeMargin) => _dimension('height', elem, outer, includeMargin);

// get element position (optionally relative to viewport)
_get.offset = (elem, relativeToViewport) => {
  const offset = { top: 0, left: 0 };
  if (elem && elem.getBoundingClientRect) { // check if available
    const rect = elem.getBoundingClientRect();
    offset.top = rect.top;
    offset.left = rect.left;
    if (!relativeToViewport) { // clientRect is by default relative to viewport...
      offset.top += _get.scrollTop();
      offset.left += _get.scrollLeft();
    }
  }
  return offset;
};
U.get = _get;

/**
   * ------------------------------
   * DOM Element manipulation
   * ------------------------------
   */

U.addClass = (elem, classname) => {
  if (classname) {
    if (elem.classList) { elem.classList.add(classname); } else { elem.className += ` ${classname}`; }
  }
};

U.removeClass = (elem, classname) => {
  if (classname) {
    if (elem.classList) { elem.classList.remove(classname); } else { elem.className = elem.className.replace(new RegExp(`(^|\\b)${classname.split(' ').join('|')}(\\b|$)`, 'gi'), ' '); }
  }
};

// if options is string -> returns css value
// if options is array -> returns object with css value pairs
// if options is object -> set new css values
U.css = (elem, options) => {
  if (_type.String(options)) {
    return _getComputedStyle(elem)[_camelCase(options)];
  } else if (_type.Array(options)) {
    const obj = {};
    const style = _getComputedStyle(elem);
    options.forEach((option, key) => {
      obj[option] = style[_camelCase(option)];
    });
    return obj;
  }
  for (const option in options) {
    let val = options[option];
    if (val === parseFloat(val)) { // assume pixel for seemingly numerical values
      val += 'px';
    }
    elem.style[_camelCase(option)] = val;
  }
};

export default U;
