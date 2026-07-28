export const THEME_STORAGE_KEY = "theme";

export const PAPER_LIGHT = "#f5f4ee";
export const PAPER_DARK = "#10110f";

/**
 * Runs before first paint, so the correct theme is on <html> when the browser
 * paints, no flash. Rendered inline in <head>; keep it small and defensive.
 *
 * It also adds `.js`, which the reveal-on-scroll CSS depends on: reveal targets
 * only start hidden under `.js`, so a visitor without JavaScript is never shown
 * a page of invisible content.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;d.classList.add('js');var s=null;try{s=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}var k=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);d.classList.toggle('dark',k);d.style.colorScheme=k?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',k?'${PAPER_DARK}':'${PAPER_LIGHT}')}catch(e){}})();`;
