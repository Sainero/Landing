---
title: "Свой компонент"
group: "Разработка"
order: 5
---

1. Создайте папку `src/components/my-thing/` с файлами `my-thing.ts` и `my-thing.css`.
2. Зарегистрируйте компонент:

```ts
import { defineBlock } from '../../engine/component';
import { t } from '../../engine/html';
import type { Block } from '../../types';
import './my-thing.css';

interface Props extends Block {
  title: string;
  value: number;
}

defineBlock<Props>('big-number', {
  // Разметка должна быть самодостаточной: из неё же строятся миниатюры и печать
  render(p) {
    return `<div class="big-number r"><b>${t(p.value)}</b><span>${t(p.title)}</span></div>`;
  },
  // Необязательно: интерактивность после вставки в страницу
  mount(el) {
    el.addEventListener('click', () => el.classList.toggle('active'));
  },
});
```

3. Добавьте `import './my-thing/my-thing';` в `src/components/index.ts`.
4. Используйте в любой презентации: `- type: big-number`.

Соглашения:
- цвета только через переменные темы (`var(--ac)`, `var(--surf)`, `var(--tx)`…) из `src/styles/tokens.css`, тогда тёмная тема заработает сама;
- класс `r` на элементе — появление с задержкой по очереди при открытии слайда;
- анимации, которые должны запускаться при открытии слайда, пишите через `.slide.on .ваш-класс { animation: … }`;
- текст из данных выводите через `t()` (экранирование и `**жирный**`), атрибуты — через `esc()`.
