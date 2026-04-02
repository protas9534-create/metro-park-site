/**
 * ============================================================
 *  Metro Park TRC — Google Apps Script для формы аренды
 *  Версия: 1.0.0
 *  Дата: 2026
 * ============================================================
 *
 *  ИНСТРУКЦИЯ ПО НАСТРОЙКЕ (выполните шаги по порядку)
 *  ─────────────────────────────────────────────────────────
 *
 *  ШАГ 1. СОЗДАЙТЕ ТАБЛИЦУ GOOGLE SHEETS
 *  ──────────────────────────────────────
 *  1. Откройте https://sheets.google.com и создайте новую таблицу.
 *  2. Переименуйте её, например: "Metro Park — Заявки на аренду".
 *  3. Скопируйте ID таблицы из адресной строки браузера:
 *     https://docs.google.com/spreadsheets/d/<ВОТ_ЭТОТ_ID>/edit
 *  4. Вставьте скопированный ID в константу SPREADSHEET_ID ниже.
 *
 *  ШАГ 2. НАСТРОЙТЕ КОНСТАНТЫ СКРИПТА
 *  ────────────────────────────────────
 *  - SPREADSHEET_ID   — ID вашей Google Sheets (см. шаг 1)
 *  - SHEET_NAME       — Название листа (по умолчанию "Заявки")
 *  - NOTIFICATION_EMAIL — Email, на который будут приходить уведомления
 *                         о новых заявках (например: manager@metro-park.by)
 *
 *  ШАГ 3. РАЗВЕРНИТЕ КАК ВЕБ-ПРИЛОЖЕНИЕ
 *  ───────────────────────────────────────
 *  1. В редакторе Apps Script нажмите «Развернуть» → «Новое развёртывание».
 *  2. Тип: «Веб-приложение».
 *  3. Описание: "Metro Park Leasing Form v1".
 *  4. Выполнять от имени: «Меня» (от имени владельца скрипта).
 *  5. Уровень доступа: «Все» (чтобы форма на сайте могла отправлять данные).
 *  6. Нажмите «Развернуть», скопируйте полученный URL веб-приложения.
 *  7. Вставьте этот URL в настройки формы на сайте (поле action или fetch URL).
 *
 *  ШАГ 4. ПЕРВЫЙ ЗАПУСК — ВЫДАЧА РАЗРЕШЕНИЙ
 *  ──────────────────────────────────────────
 *  1. В редакторе выберите функцию «setupSheet» и нажмите «Выполнить».
 *  2. Подтвердите запрос разрешений (доступ к таблицам и Gmail).
 *  3. После этого заголовки колонок будут созданы автоматически.
 *
 *  ШАГ 5. ПРОВЕРКА РАБОТЫ
 *  ───────────────────────
 *  Отправьте тестовую форму с сайта. Убедитесь, что:
 *  - Данные появились в Google Sheets на листе «Заявки».
 *  - На NOTIFICATION_EMAIL пришло письмо с данными заявки.
 *
 *  ТЕХНИЧЕСКИЕ ПРИМЕЧАНИЯ
 *  ───────────────────────
 *  - Скрипт поддерживает CORS: допускает запросы с любых источников
 *    (необходимо для отправки формы с браузера).
 *  - Все данные логируются в Google Sheets с временной меткой (UTC+3).
 *  - При ошибке скрипт возвращает JSON: {success: false, error: "..."}
 *  - При успехе: {success: true}
 *
 * ============================================================
 */

// ─── НАСТРОЙКИ — ИЗМЕНИТЕ ЭТИ ЗНАЧЕНИЯ ───────────────────────────────────────

/** ID вашей Google Таблицы (из адресной строки браузера) */
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/** Название листа в таблице, куда будут записываться заявки */
var SHEET_NAME = 'Заявки';

/** Email для получения уведомлений о новых заявках */
var NOTIFICATION_EMAIL = 'YOUR_NOTIFICATION_EMAIL';

/** Часовой пояс для отображения времени (Минск UTC+3) */
var TIMEZONE = 'Europe/Minsk';

// ─── КОНСТАНТЫ КОЛОНОК ────────────────────────────────────────────────────────

var COLUMNS = [
  'Timestamp',
  'ФИО',
  'Телефон',
  'Email',
  'Компания',
  'Направление бизнеса',
  'Желаемый этаж',
  'Площадь (от м²)',
  'Площадь (до м²)',
  'Предельная ставка BYN/м²',
  'Сообщение',
  'Согласие на ПДн'
];

// ─── ОБРАБОТЧИК OPTIONS (CORS preflight) ──────────────────────────────────────

/**
 * Обработчик предварительных CORS-запросов (OPTIONS).
 * Браузеры автоматически отправляют OPTIONS перед POST с кастомными заголовками.
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(getCorsHeaders());
}

// ─── ОБРАБОТЧИК POST ──────────────────────────────────────────────────────────

/**
 * Основной обработчик POST-запросов от формы на сайте.
 * @param {Object} e - Объект события Apps Script.
 * @returns {TextOutput} JSON-ответ с результатом обработки.
 */
function doPost(e) {
  try {
    // Разбираем входные данные
    var data = parseRequestData(e);

    // Валидируем обязательные поля
    var validationError = validateData(data);
    if (validationError) {
      return buildResponse({ success: false, error: validationError });
    }

    // Записываем данные в Google Sheets
    appendToSheet(data);

    // Отправляем email-уведомление администратору
    sendNotificationEmail(data);

    return buildResponse({ success: true });

  } catch (err) {
    Logger.log('Ошибка doPost: ' + err.toString());
    return buildResponse({ success: false, error: 'Внутренняя ошибка сервера: ' + err.message });
  }
}

// ─── ОБРАБОТЧИК GET ───────────────────────────────────────────────────────────

/**
 * Обработчик GET-запросов.
 * Используется для проверки работоспособности скрипта.
 */
function doGet(e) {
  return buildResponse({
    success: true,
    message: 'Metro Park TRC — Leasing Form API. Используйте POST для отправки заявки.',
    version: '1.0.0'
  });
}

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ──────────────────────────────────────────────────

/**
 * Разбирает данные запроса (поддерживает JSON и form-encoded форматы).
 * @param {Object} e - Объект события Apps Script.
 * @returns {Object} Объект с данными формы.
 */
function parseRequestData(e) {
  var data = {};

  if (e.postData) {
    var contentType = e.postData.type || '';

    if (contentType.indexOf('application/json') !== -1) {
      // JSON-тело запроса
      data = JSON.parse(e.postData.contents);
    } else {
      // application/x-www-form-urlencoded или multipart
      data = e.parameter || {};
      // Также проверяем postData.contents для form-encoded
      if (e.postData.contents) {
        var params = e.postData.contents.split('&');
        params.forEach(function(param) {
          var parts = param.split('=');
          if (parts.length === 2) {
            data[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1].replace(/\+/g, ' '));
          }
        });
      }
    }
  } else if (e.parameter) {
    data = e.parameter;
  }

  return data;
}

/**
 * Валидирует обязательные поля заявки.
 * @param {Object} data - Данные формы.
 * @returns {string|null} Сообщение об ошибке или null при успехе.
 */
function validateData(data) {
  if (!data.name || data.name.trim() === '') {
    return 'Поле "ФИО" обязательно для заполнения.';
  }
  if (!data.phone || data.phone.trim() === '') {
    return 'Поле "Телефон" обязательно для заполнения.';
  }
  if (!data.consent || data.consent !== 'true') {
    return 'Необходимо дать согласие на обработку персональных данных.';
  }
  return null;
}

/**
 * Записывает данные заявки в Google Sheets.
 * @param {Object} data - Данные формы.
 */
function appendToSheet(data) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // Если лист не существует — создаём и добавляем заголовки
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    formatHeaderRow(sheet);
  }

  // Формируем временную метку в часовом поясе Минска
  var timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'dd.MM.yyyy HH:mm:ss');

  // Строка данных в порядке колонок
  var row = [
    timestamp,
    data.name        || '',
    data.phone       || '',
    data.email       || '',
    data.company     || '',
    data.business    || '',
    data.floor       || '',
    data.areaFrom    || '',
    data.areaTo      || '',
    data.rate        || '',
    data.message     || '',
    data.consent === 'true' ? 'Да' : 'Нет'
  ];

  sheet.appendRow(row);

  // Автоматически подбираем ширину колонок
  try {
    sheet.autoResizeColumns(1, COLUMNS.length);
  } catch (e) {
    // Игнорируем ошибки автоподбора ширины — не критично
    Logger.log('autoResizeColumns: ' + e.message);
  }
}

/**
 * Отправляет email-уведомление о новой заявке.
 * @param {Object} data - Данные формы.
 */
function sendNotificationEmail(data) {
  var timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'dd.MM.yyyy HH:mm:ss');

  var subject = '📋 Новая заявка на аренду — Metro Park TRC [' + timestamp + ']';

  var body = buildEmailBody(data, timestamp);

  GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, body, {
    name: 'Metro Park TRC — Система уведомлений',
    replyTo: data.email || NOTIFICATION_EMAIL,
    htmlBody: buildEmailHtmlBody(data, timestamp)
  });
}

/**
 * Формирует текстовое тело письма-уведомления.
 * @param {Object} data - Данные формы.
 * @param {string} timestamp - Временная метка.
 * @returns {string} Текст письма.
 */
function buildEmailBody(data, timestamp) {
  var lines = [
    'НОВАЯ ЗАЯВКА НА АРЕНДУ — METRO PARK TRC',
    '════════════════════════════════════════',
    '',
    'Дата и время: ' + timestamp,
    '',
    'КОНТАКТНЫЕ ДАННЫЕ',
    '─────────────────',
    'ФИО:              ' + (data.name    || '—'),
    'Телефон:          ' + (data.phone   || '—'),
    'Email:            ' + (data.email   || '—'),
    'Компания:         ' + (data.company || '—'),
    '',
    'ПАРАМЕТРЫ АРЕНДЫ',
    '─────────────────',
    'Направление бизнеса:      ' + (data.business || '—'),
    'Желаемый этаж:            ' + (data.floor    || '—'),
    'Площадь от (м²):          ' + (data.areaFrom || '—'),
    'Площадь до (м²):          ' + (data.areaTo   || '—'),
    'Предельная ставка BYN/м²: ' + (data.rate     || '—'),
    '',
    'СООБЩЕНИЕ',
    '─────────────────',
    (data.message || 'Сообщение не указано'),
    '',
    '════════════════════════════════════════',
    'Согласие на обработку ПДн: ' + (data.consent === 'true' ? 'Да' : 'Нет'),
    '',
    '— Автоматическое уведомление Metro Park TRC',
    '  Данные сохранены в Google Sheets.',
  ];

  return lines.join('\n');
}

/**
 * Формирует HTML-тело письма-уведомления.
 * @param {Object} data - Данные формы.
 * @param {string} timestamp - Временная метка.
 * @returns {string} HTML-письмо.
 */
function buildEmailHtmlBody(data, timestamp) {
  var row = function(label, value) {
    return '<tr>' +
      '<td style="padding:8px 16px 8px 0;color:#888;font-size:13px;white-space:nowrap;vertical-align:top;">' + label + '</td>' +
      '<td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:500;">' + (value || '<span style="color:#bbb">—</span>') + '</td>' +
      '</tr>';
  };

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">' +

    // Заголовок
    '<div style="background:#0a0a0a;padding:28px 32px;">' +
    '<div style="color:#c4a882;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Metro Park TRC</div>' +
    '<div style="color:#ffffff;font-size:20px;font-weight:600;">Новая заявка на аренду</div>' +
    '<div style="color:#888;font-size:13px;margin-top:6px;">' + timestamp + '</div>' +
    '</div>' +

    // Контактные данные
    '<div style="padding:24px 32px 16px;">' +
    '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4a882;margin-bottom:12px;">Контактные данные</div>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    row('ФИО', data.name) +
    row('Телефон', data.phone) +
    row('Email', data.email ? '<a href="mailto:' + data.email + '" style="color:#c4a882;">' + data.email + '</a>' : '') +
    row('Компания', data.company) +
    '</table></div>' +

    '<hr style="margin:0 32px;border:none;border-top:1px solid #eee;">' +

    // Параметры аренды
    '<div style="padding:16px 32px 16px;">' +
    '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4a882;margin-bottom:12px;">Параметры аренды</div>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    row('Направление бизнеса', data.business) +
    row('Желаемый этаж', data.floor) +
    row('Площадь от (м²)', data.areaFrom) +
    row('Площадь до (м²)', data.areaTo) +
    row('Предельная ставка BYN/м²', data.rate) +
    '</table></div>' +

    // Сообщение
    (data.message ? (
      '<hr style="margin:0 32px;border:none;border-top:1px solid #eee;">' +
      '<div style="padding:16px 32px 16px;">' +
      '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4a882;margin-bottom:12px;">Сообщение</div>' +
      '<div style="font-size:14px;color:#1a1a1a;line-height:1.6;">' + data.message + '</div>' +
      '</div>'
    ) : '') +

    // Подвал
    '<div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">' +
    '<div style="font-size:12px;color:#999;">Согласие на обработку персональных данных: <strong>' +
      (data.consent === 'true' ? 'Да' : 'Нет') + '</strong></div>' +
    '<div style="font-size:11px;color:#bbb;margin-top:4px;">Данные автоматически сохранены в Google Sheets.</div>' +
    '</div>' +

    '</div></body></html>';
}

/**
 * Форматирует строку заголовков таблицы (жирный шрифт, фон).
 * @param {Sheet} sheet - Объект листа Google Sheets.
 */
function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0a0a0a');
  headerRange.setFontColor('#c4a882');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);
}

/**
 * Формирует TextOutput с JSON-ответом и CORS-заголовками.
 * @param {Object} responseObj - Объект ответа.
 * @returns {TextOutput}
 */
function buildResponse(responseObj) {
  var output = ContentService
    .createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);

  // Примечание: Apps Script не поддерживает произвольные заголовки ответа
  // в ContentService. CORS для Apps Script настраивается на уровне развёртывания
  // (доступ «Все») и работает через режим no-cors или через прокси.
  // При использовании fetch() на стороне клиента используйте:
  //   fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData })
  // В этом случае ответ будет opaque, поэтому обрабатывайте только факт успеха.

  return output;
}

/**
 * Возвращает CORS-заголовки для preflight-запросов.
 * Используется в doOptions().
 * @returns {Object}
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────

/**
 * Первоначальная настройка таблицы.
 * Выполните эту функцию вручную один раз из редактора Apps Script
 * для создания листа с заголовками.
 */
function setupSheet() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      Logger.log('Лист "' + SHEET_NAME + '" создан.');
    } else {
      Logger.log('Лист "' + SHEET_NAME + '" уже существует.');
    }

    // Очищаем первую строку и устанавливаем заголовки
    sheet.getRange(1, 1, 1, COLUMNS.length).clearContent();
    sheet.appendRow(COLUMNS);
    formatHeaderRow(sheet);

    // Устанавливаем минимальные ширины колонок
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2, 200);  // ФИО
    sheet.setColumnWidth(3, 140);  // Телефон
    sheet.setColumnWidth(4, 200);  // Email
    sheet.setColumnWidth(5, 180);  // Компания
    sheet.setColumnWidth(6, 180);  // Направление бизнеса
    sheet.setColumnWidth(7, 120);  // Желаемый этаж
    sheet.setColumnWidth(8, 110);  // Площадь от
    sheet.setColumnWidth(9, 110);  // Площадь до
    sheet.setColumnWidth(10, 160); // Предельная ставка
    sheet.setColumnWidth(11, 300); // Сообщение
    sheet.setColumnWidth(12, 140); // Согласие

    Logger.log('Настройка завершена. Таблица готова к работе.');
    Logger.log('Spreadsheet URL: ' + spreadsheet.getUrl());
  } catch (err) {
    Logger.log('Ошибка setupSheet: ' + err.toString());
    throw err;
  }
}

/**
 * Тестирует запись данных в таблицу и отправку email.
 * Выполните из редактора Apps Script для проверки конфигурации.
 */
function testSubmission() {
  var testData = {
    name:     'Тестов Тест Тестович',
    phone:    '+375 29 000-00-00',
    email:    'test@example.com',
    company:  'ООО "Тест"',
    business: 'Розничная торговля',
    floor:    '2',
    areaFrom: '50',
    areaTo:   '100',
    rate:      '25',
    message:  'Это тестовая заявка. Пожалуйста, проигнорируйте.',
    consent:  'true'
  };

  try {
    appendToSheet(testData);
    Logger.log('✓ Данные успешно записаны в таблицу.');
  } catch (err) {
    Logger.log('✗ Ошибка записи в таблицу: ' + err.toString());
  }

  try {
    sendNotificationEmail(testData);
    Logger.log('✓ Email-уведомление отправлено на: ' + NOTIFICATION_EMAIL);
  } catch (err) {
    Logger.log('✗ Ошибка отправки email: ' + err.toString());
  }
}
