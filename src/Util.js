// import { camelCase, forEach, isElement, isString } from 'lodash-es';
import camelCase from 'lodash/camelCase';
import forEach from 'lodash/forEach';
import isElement from 'lodash/isElement';
import isString from 'lodash/isString';
class Util {
  static elements(selector = []) {
    if (isString(selector)) {
      return document.querySelectorAll(selector);
    }
    if (isElement(selector) || selector === document || selector === window) {
      return [selector];
    }
    return selector;
  }
  static scrollTop(el = {}) {
    return el.scrollTop || window.pageYOffset || 0;
  }
  static scrollLeft(el = {}) {
    return el.scrollLeft || window.pageXOffset || 0;
  }
  static width(el) {
    if (el === window) {
      return window.innerWidth;
    }
    return el.getBoundingClientRect().width;
  }
  static height(el) {
    if (el === window) {
      return window.innerHeight;
    }
    return el.getBoundingClientRect().height;
  }
  static offset(el, relativeToViewport) {
    const offset = { top: 0, left: 0 };
    if (el && el.getBoundingClientRect) {
      const rect = el.getBoundingClientRect();
      offset.top = rect.top;
      offset.left = rect.left;
      if (!relativeToViewport) {
        offset.top += Util.scrollTop();
        offset.left += Util.scrollLeft();
      }
    }
    return offset;
  }
  static marginCollapse(display) {
    return ['block', 'flex', 'list-item', 'table', '-webkit-box'].includes(
      display
    );
  }
  static css(el, css) {
    if (!css) {
      return el.currentStyle ? el.currentStyle : window.getComputedStyle(el);
    }

    forEach(css, (value, key) => {
      if (value === parseFloat(value)) {
        // assume pixel for seemingly numerical values
        value += 'px';
      }
      el.style[camelCase(key)] = value;
    });

    return css;
  }
}

export default Util;
