/** Split an element's text into masked characters (keeps it accessible via aria-label on the parent). */
export const splitChars = (el) => {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-hidden', 'true');
  return [...text].map((ch) => {
    const mask = document.createElement('span');
    mask.className = 'char-mask';
    const c = document.createElement('span');
    c.className = 'char';
    c.textContent = ch === ' ' ? ' ' : ch;
    mask.appendChild(c);
    el.appendChild(mask);
    return c;
  });
};

/** Split into masked words, preserving inline elements like <em>. */
export const splitWords = (el) => {
  const words = [];
  const walk = (node, parent) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            parent.appendChild(document.createTextNode(' '));
            return;
          }
          const mask = document.createElement('span');
          mask.className = 'char-mask';
          const w = document.createElement('span');
          w.className = 'char';
          w.textContent = part;
          mask.appendChild(w);
          parent.appendChild(mask);
          words.push(w);
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'BR') {
          parent.appendChild(child.cloneNode());
          return;
        }
        const clone = child.cloneNode(false);
        parent.appendChild(clone);
        walk(child, clone);
      }
    });
  };
  const source = el.cloneNode(true);
  el.innerHTML = '';
  walk(source, el);
  return words;
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
