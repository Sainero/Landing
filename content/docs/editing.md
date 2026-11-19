---
title: "Как править deck.yaml"
group: "Формат deck.yaml"
order: 8
---

Всё содержимое лежит в `presentations/microclimate/deck.yaml`:

```yaml
- id: firmware
  title: Прошивка и удалённая настройка
  body:
    type: grid
    columns: 1fr 1fr
    items:
      - type: card
        title: Обновление по воздуху
        body:
          - type: progress
            label: Версия 1.4.2
            value: 24 из 24 устройств
            percent: 100
  notes: Текст для окна докладчика.
  backdrop: particles   # анимированный фон: mesh, aurora, silk, waves, topo, field, rays, bokeh, particles, stars, snow, leaves, petals, bubbles, hearts, confetti, caustics, ripples, plankton, pulse, dots, halftone, origami, dither, network, hex, orbits, radar, cymatics, dna, growth, candles, spectrum, grid, retrosun, globe, terrain, tunnel, lava; none — без фона темы
  backdropOpacity: 0.6  # непрозрачность анимированного фона, 0.1–1 (у слайда — своя); в студии — «Прозрачность» 40 %
  backdropSpeed: 1.5    # скорость, 0.25–3
  backdropTouch: false  # фон не отвечает на мышь и щелчки (у «Сети»; так же у темы — для всех слайдов)
```

- **Порядок слайдов** — порядок в списке `slides`.
- **Шаблон слайда** — поле `template`: `content` (по умолчанию), `cover`, `finale`, `space`.
- **Тело слайда** — `body`: один блок или список блоков сверху вниз.
- **Картинки** — положите файл в `presentations/<имя>/assets/` и укажите путь: `image: ./assets/photo.jpg`. При сборке картинка встроится в HTML.
- **Чипы**: `[Go*, REST API]`. Звёздочка в конце выделяет чип цветом.
- **Оформление внутри текста**: `**жирный**`, `*курсив*`, `__подчёркнутый__`, `[ссылка](https://…)`, `{#DC2626|цветной}`, `{g:#F97316,#EC4899@40,#7C3AED|с градиентом}`, строки с `- ` — список. Размер, цвет и выравнивание поля — в `styles` (см. [справочник](/docs/components#оформление-текста)).
- **Акцентный цвет** — в начале файла:

  ```yaml
  theme:
    accent: "#16A34A"
  ```

Все компоненты и их поля описаны в [docs/COMPONENTS.md](/docs/components). Если в данных ошибка (не закрыта кавычка, неизвестный компонент), `yarn dev` покажет её на странице с номером строки.
