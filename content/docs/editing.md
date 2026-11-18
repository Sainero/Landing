---
title: "Как править презентацию"
group: "Презентации"
order: 3
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
```

- **Порядок слайдов** — порядок в списке `slides`.
- **Шаблон слайда** — поле `template`: `content` (по умолчанию), `cover`, `finale`, `space`.
- **Тело слайда** — `body`: один блок или список блоков сверху вниз.
- **Картинки** — положите файл в `presentations/<имя>/assets/` и укажите путь: `image: ./assets/photo.jpg`. При сборке картинка встроится в HTML.
- **Чипы**: `[Go*, REST API]`. Звёздочка в конце выделяет чип цветом.
- **Жирный текст**: `**так**`.

Все компоненты и их поля описаны в [docs/COMPONENTS.md](/docs/components). Если в данных ошибка (не закрыта кавычка, неизвестный компонент), `yarn dev` покажет её на странице с номером строки.
