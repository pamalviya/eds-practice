export async function loadFragment(path) {
  if (!path) return null;

  let fragmentPath = path;
  try {
    const url = new URL(path, window.location.href);
    if (url.origin !== window.location.origin) {
      return null;
    }
    fragmentPath = url.pathname;
  } catch (error) {
    // ignore invalid URLs and fall back to the provided path
  }

  if (!fragmentPath.startsWith('/') || fragmentPath.startsWith('//')) {
    return null;
  }

  const resp = await fetch(`${fragmentPath}.plain.html`);
  if (!resp.ok) {
    return null;
  }

  const main = document.createElement('main');
  main.innerHTML = await resp.text();

  // reset base path for media to fragment base
  const resetAttributeBase = (tag, attr) => {
    main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
      elem[attr] = new URL(elem.getAttribute(attr), new URL(fragmentPath, window.location)).href;
    });
  };
  resetAttributeBase('img', 'src');
  resetAttributeBase('source', 'srcset');

  return main;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (!fragment) return;

  const wrapper = block.closest('.fragment-wrapper');
  if (!wrapper) return;

  const section = wrapper.closest('.section');

  if (section && section.children.length === 1) {
    // fragment is the ONLY child of its section; replace the whole section
    section.replaceWith(...fragment.childNodes);
  } else {
    // fragment shares section with other children; flatten children into it
    fragment.querySelectorAll(':scope > .section').forEach((fragSection) => {
      [...fragSection.childNodes].forEach((child) => wrapper.before(child));
    });
    wrapper.remove();
  }
}
