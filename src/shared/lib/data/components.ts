export type ComponentGroup = 'templates' | 'layout' | 'data' | 'live';

export interface CatalogItem {
  type: string;
  title: string;
  text: string;
  group: ComponentGroup;
  /** Иконка lucide для карточки */
  icon: string;
}

export const componentGroups: { id: ComponentGroup; label: string }[] = [
  { id: 'live', label: 'Живая графика' },
  { id: 'data', label: 'Карточки и данные' },
  { id: 'layout', label: 'Раскладка' },
  { id: 'templates', label: 'Шаблоны слайдов' },
];

/** Справочник компонентов движка (docs/COMPONENTS.md) в виде данных для каталога */
export const catalog: CatalogItem[] = [
  { type: 'network', title: 'Схема сети', text: 'Станция в центре, устройства по кругу, по линиям бегут импульсы.', group: 'live', icon: 'Share2' },
  { type: 'hub', title: 'Итоги вокруг логотипа', text: 'Список и схема: наведение на пункт подсвечивает узел, и наоборот.', group: 'live', icon: 'Orbit' },
  { type: 'system', title: 'Из чего состоит система', text: 'Оборудование → сервер и БД → интерфейсы. Импульсы по проводам.', group: 'live', icon: 'Network' },
  { type: 'pipeline', title: 'Пайплайн', text: 'Шаги подсвечиваются по очереди с заданным темпом.', group: 'live', icon: 'Workflow' },
  { type: 'line-chart', title: 'График', text: 'Линия прорисовывается при открытии слайда, оси подписываются сами.', group: 'live', icon: 'ChartSpline' },
  { type: 'uptime', title: 'Полоса доступности', text: 'Ячейка на день, дни ниже порога бледнее.', group: 'live', icon: 'ChartNoAxesGantt' },
  { type: 'bars', title: 'Столбцы', text: 'Вырастают по очереди, подписи под осью.', group: 'live', icon: 'ChartColumn' },
  { type: 'tile', title: 'Плитка', text: 'Иллюстрация с мигающими индикаторами или своё фото.', group: 'live', icon: 'Image' },
  { type: 'card', title: 'Карточка', text: 'Заголовок, абзац и любые блоки внутри.', group: 'data', icon: 'SquareStack' },
  { type: 'panel', title: 'Панель', text: 'Выделенная панель с ячейками на одну или две колонки.', group: 'data', icon: 'LayoutPanelTop' },
  { type: 'kv', title: 'Ключ — значение', text: 'Аккуратная таблица параметров без лишних линий.', group: 'data', icon: 'ListTree' },
  { type: 'chips', title: 'Чипы', text: 'Ряд меток. Звёздочка в конце выделяет чип цветом.', group: 'data', icon: 'Tags' },
  { type: 'progress', title: 'Прогресс', text: 'Полоса заполняется, когда открывается слайд.', group: 'data', icon: 'Loader' },
  { type: 'sliders', title: 'Ползунки', text: 'Параметры с положением от 0 до 1 — для рассказа о настройках.', group: 'data', icon: 'SlidersHorizontal' },
  { type: 'grid', title: 'Сетка', text: 'CSS grid: колонки, строки, высота, растяжение элементов.', group: 'layout', icon: 'LayoutGrid' },
  { type: 'stack', title: 'Столбик', text: 'Блоки сверху вниз с заданным отступом.', group: 'layout', icon: 'Rows3' },
  { type: 'text', title: 'Текст', text: 'Абзац обычного, крупного или мелкого размера, **жирный** внутри.', group: 'layout', icon: 'Type' },
  { type: 'list', title: 'Список', text: 'Маркированный список пунктов.', group: 'layout', icon: 'List' },
  { type: 'image', title: 'Картинка', text: 'Файл из assets/ встраивается в HTML при сборке.', group: 'layout', icon: 'ImagePlus' },
  { type: 'note', title: 'Подпись', text: 'Мелкая серая строка под блоком.', group: 'layout', icon: 'StickyNote' },
  { type: 'spacer', title: 'Отступ', text: 'Пустое место заданной высоты.', group: 'layout', icon: 'Space' },
  { type: 'cover', title: 'Титульный', text: 'Логотип, заголовок, подзаголовок и живая графика справа.', group: 'templates', icon: 'PanelsTopLeft' },
  { type: 'content', title: 'Обычный слайд', text: 'Заголовок, чип-бейдж, логотип в углу и тело из блоков.', group: 'templates', icon: 'RectangleHorizontal' },
  { type: 'finale', title: 'Финальный', text: 'Кольца, световой луч, слова по одному, QR-код из ссылки.', group: 'templates', icon: 'Sparkles' },
  { type: 'space', title: 'Космический', text: 'Всегда тёмный: звёзды, метеоры, параллакс за мышью.', group: 'templates', icon: 'Rocket' },
];
