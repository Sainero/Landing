---
title: "Структура проекта"
group: "Разработка"
order: 6
---

```
presentations/
  microclimate/
    deck.yaml          презентация: тексты, данные, заметки
    assets/logo.svg    картинки этой презентации
templates/basic/       шаблон для yarn new
src/
  engine/              движок: показ, обзор, докладчик, темы, синхронизация окон
  components/          компоненты и шаблоны слайдов
  styles/              токены темы, базовые стили, интерфейс, печать
plugins/decks.ts       загрузка YAML и сборка презентаций
scripts/               yarn build, yarn new
docs/COMPONENTS.md     справочник компонентов
```
