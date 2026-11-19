/** Ключ темы в localStorage — тот же, что у Slideria (историческое имя), поэтому демо-презентации и сайт помнят одну тему. */
export const THEME_KEY = 'htmlpptx-theme';

/**
 * Скрипт до первой отрисовки: тема без мигания.
 * data-theme ставится всегда (выбор пользователя или системная тема), чтобы работал вариант dark: в Tailwind.
 * Класс js включает анимации появления при прокрутке.
 */
export const themeInitScript = `(function(){var d=document.documentElement,k='${THEME_KEY}',m=matchMedia('(prefers-color-scheme: dark)');function s(){try{var v=localStorage.getItem(k);return v==='light'||v==='dark'?v:null}catch(e){return null}}d.setAttribute('data-theme',s()||(m.matches?'dark':'light'));m.addEventListener('change',function(e){if(!s())d.setAttribute('data-theme',e.matches?'dark':'light')});d.classList.add('js');})();`;
