# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Почта для заявок на Timeweb

Чтобы включить уведомления по почте, добавьте адрес получателя в `LEAD_MAIL_TO` в серверном файле `.env` в корне сайта (обычно `public_html`). Если адрес не задан, PHP продолжит сохранять заявки без отправки писем. Для отправки с ящика своего домена укажите его в `LEAD_MAIL_FROM`. Без `LEAD_MAIL_FROM` Timeweb использует отправителя аккаунта хостинга. Пароль почты для PHP `mail()` не нужен. Не добавляйте `.env` в репозиторий.

PHP сохраняет заявку в `api/leads/data/leads-backup.json` перед передачей письма почтовому серверу. Ошибки передачи видны в PHP-логе по номеру заявки. После загрузки проверьте письмо на одном тестовом бронировании, включая папку «Спам». Локальный Node.js сохраняет заявки для разработки.

## Заявки Вайб Шоу на iPhone

1. Соберите сайт (`npm run build`) и зависимости (`composer install --working-dir=server/push --no-dev --optimize-autoloader`). Команда `npm run leads:package` создаёт ZIP для Timeweb с зависимостями внутри. PHP: 8.2 или новее, расширения `curl`, `openssl` и `mbstring`.
2. Распакуйте ZIP в `public_html` как обновление файлов. Не удаляйте существующие `.env` и `api/leads/data/`: в `api/leads/data/` лежат уже полученные заявки.
3. На компьютере один раз запустите `npm run leads:setup`. Он создаст `output/leads-setup/leads.ini` и `password.txt`. В панели Timeweb создайте каталог `vibeshow-private` **рядом** с `public_html` (не внутри) и загрузите в него только `leads.ini`. Например, `имя-сайта/vibeshow-private/leads.ini`. В `password.txt` находится пароль для входа. Не загружайте его на сайт и передавайте только владельцам кабинета. Сохраните конфигурацию при обновлениях сайта: смена ключей потребует подключить уведомления заново.
4. На iPhone с iOS 16.4+ откройте `https://vibeshow-kerch.ru/leads/` в Safari. Нажмите «Поделиться» → «На экран “Домой”» и включите «Открыть как веб-приложение», если появится этот переключатель. Откройте приложение с экрана «Домой», войдите и нажмите «Включить», затем разрешите уведомления. Кнопка «Отправить тест» проверяет доставку на этом устройстве. Поддерживается до четырёх устройств. Выход из приложения отключает подписку на текущем устройстве.

Запрос push выполняется после записи заявки отдельно от отправки email. В уведомление уходят только тип события и название приложения. Пуши не гарантируют доставку: список в кабинете доступен даже при отказе сервиса уведомлений. Для Apple нужен исходящий HTTPS к `*.push.apple.com`; данные ошибок передачи есть в PHP-логе без контактов клиентов и адресов подписок.
