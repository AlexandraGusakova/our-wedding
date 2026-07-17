/**
 * Свадебная анкета — Google Apps Script
 *
 * === УСТАНОВКА ТАБЛИЦЫ ===
 * 1. Создайте Google Таблицу (например: «Свадьба — ответы гостей»).
 * 2. Расширения → Apps Script → вставьте этот файл.
 * 3. Запустите setupSheet() один раз (разрешите доступ).
 * 4. Развернуть → Новое развертывание → «Веб-приложение»:
 *    — Выполнять как: Я
 *    — У кого есть доступ: Все
 * 5. URL развёртывания → config.js на сайте (GOOGLE_SCRIPT_URL).
 *
 * Если ответы не попадают в таблицу:
 * — Запустите testSaveResponse() в редакторе Apps Script.
 * — Если ошибка доступа: setSpreadsheetId('ID_ИЗ_URL_ТАБЛИЦЫ').
 * — Развернуть → Управление развёртываниями → Новая версия.
 *
 * === TELEGRAM-УВЕДОМЛЕНИЯ ===
 * 1. Создайте бота через @BotFather → скопируйте токен.
 * 2. Напишите боту любое сообщение.
 * 3. Откройте: https://api.telegram.org/bot<ТОКЕН>/getUpdates
 *    Найдите "chat":{"id": ... } — это CHAT_ID.
 * 4. В Apps Script запустите:
 *    setTelegramCredentials('ВАШ_ТОКЕН', 'ВАШ_CHAT_ID');
 * 5. Запустите setupTelegramTrigger() один раз.
 * 6. Проверка: testTelegram()
 *
 * После изменения кода: Новое развертывание (новая версия).
 * Пересоздать графики/сводные: refreshSummarySheet() (формулы не трогает).
 * Переустановить формулы: reapplySummaryFormulas().
 *
 * Формулы: COUNTIF/COUNTA + разделитель ";" (СНГ-локаль Google Таблиц).
 */

var SHEET_NAME = 'Ответы';
var SUMMARY_SHEET = 'Сводка';
var SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

var ATTENDANCE_LABELS = {
  yes: 'Да, обязательно буду',
  'yes-plus': 'Да, буду с +1',
  unsure: 'Затрудняюсь ответить',
  no: 'Нет, не получится',
};

var TRANSFER_LABELS = {
  to: 'Только туда',
  back: 'Только обратно',
  round: 'И туда, и обратно',
  no: 'Не нужен',
};

var PICKUP_LABELS = {
  kurasovshchina: 'Курасовщина',
  palazzo: 'район Палаццо',
};

var DIETARY_LABELS = {
  none: 'Особых ограничений нет',
  'no-fish': 'Не ем рыбу и морепродукты',
  'no-pork': 'Не ем свинину',
  'no-beef': 'Не ем говядину',
  'no-poultry': 'Не ем птицу',
  vegetarian: 'Вегетарианское питание',
  vegan: 'Веганское питание',
  allergy: 'Пищевая аллергия',
  other: 'Другое',
};

var FOOD_LABELS_LEGACY = {
  chicken: 'Курица',
  fish: 'Рыба',
  meat: 'Мясо',
  vegetarian: 'Вегетарианец',
};

var OVERNIGHT_LABELS = {
  yes: 'Да, рассматриваю',
  no: 'Нет, не планирую',
};

var ALCOHOL_LABELS = {
  'white-wine': 'Белое вино',
  'red-wine': 'Красное вино',
  sparkling: 'Игристое / слабоалкогольные',
  strong: 'Крепкий алкоголь',
  none: 'Не употребляю алкоголь',
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: 'Пустой запрос' });
    }

    var payload = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    var row = buildResponseRow_(payload);

    sheet.appendRow(row);

    try {
      scheduleTelegramNotification_(payload, row);
    } catch (telegramErr) {
      Logger.log('Telegram schedule error: ' + telegramErr);
    }

    return jsonResponse_({ success: true });
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return jsonResponse_({ success: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse_({
    status: 'ok',
    message: 'RSVP endpoint работает. Отправляйте POST-запросы с JSON.',
  });
}

/** Запустите один раз для создания листов, сводки, графиков и сводных таблиц. */
function setupSheet() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var headers = [
    'Дата ответа',
    'Имя и фамилия',
    'Присутствие',
    'Причина (если затрудняется)',
    'С кем приходит',
    'Трансфер',
    'Откуда трансфер',
    'Особенности питания',
    'Алкоголь',
    'Подробности (питание)',
    'Ночёвка',
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4a3b34')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  sheet.autoResizeColumns(1, headers.length);
  setupSummarySheet_(ss, { formulas: true, visuals: true });

  SpreadsheetApp.getUi().alert(
    'Готово!',
    'Листы «Ответы» и «Сводка» настроены.\n\n' +
      'Дальше:\n' +
      '1. setTelegramCredentials(токен, chat_id)\n' +
      '2. setupTelegramTrigger()\n' +
      '3. testTelegram()\n' +
      '4. Разверните веб-приложение',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Пересоздать графики и сводные таблицы. Формулы в A:B не меняются. */
function refreshSummarySheet() {
  var ss = getSpreadsheet_();
  var summary = ss.getSheetByName(SUMMARY_SHEET);
  if (!summary) {
    setupSummarySheet_(ss, { formulas: true, visuals: true });
  } else {
    setupSummarySheet_(ss, { formulas: false, visuals: true });
  }
  SpreadsheetApp.getUi().alert('Графики и сводные таблицы обновлены.\nФормулы в колонке B не изменялись.');
}

/** Переустановить формулы сводки (по одной ячейке — надёжнее, чем пакетный setFormulas). */
function reapplySummaryFormulas() {
  var ss = getSpreadsheet_();
  var summary = ss.getSheetByName(SUMMARY_SHEET);
  if (!summary) {
    setupSummarySheet_(ss, { formulas: true, visuals: false });
  } else {
    applySummaryMetrics_(summary);
  }
  SpreadsheetApp.getUi().alert('Формулы на листе «Сводка» переустановлены.');
}

/**
 * Сохранить Telegram-бота в настройках скрипта (запустить один раз).
 * @param {string} botToken Токен от @BotFather
 * @param {string|number} chatId ID чата (личный или группы)
 */
function setTelegramCredentials(botToken, chatId) {
  PropertiesService.getScriptProperties().setProperties({
    TELEGRAM_BOT_TOKEN: String(botToken).trim(),
    TELEGRAM_CHAT_ID: String(chatId).trim(),
  });
  Logger.log('Telegram credentials saved.');
}

/** Отправить тестовое сообщение в Telegram. */
function testTelegram() {
  var props = getTelegramProps_();
  if (!props) {
    throw new Error('Сначала вызовите setTelegramCredentials(токен, chat_id).');
  }

  var started = Date.now();
  var text = '✅ Тест: уведомления свадебной анкеты работают.\n\n' +
    'Новые ответы гостей будут приходить сюда автоматически.';

  sendTelegramMessage_(props.token, props.chatId, text);
  var elapsed = ((Date.now() - started) / 1000).toFixed(1);
  SpreadsheetApp.getUi().alert(
    'Тестовое сообщение отправлено в Telegram.\n\n' +
      'Время отправки: ' + elapsed + ' с.\n' +
      'Первый запуск из редактора часто занимает 10–30 с — это нормально для Google.'
  );
}

/**
 * Запустите один раз — разрешит фоновую отправку в Telegram.
 * Новые анкеты сначала сохраняются в таблицу, уведомление приходит ~через 1 с.
 */
function setupTelegramTrigger() {
  ensureTelegramTrigger_();
  SpreadsheetApp.getUi().alert(
    'Готово!',
    'Фоновая отправка в Telegram включена.\n' +
      'При новой анкете сообщение придёт примерно через 1 секунду после сохранения в таблицу.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Привязать таблицу по ID (из URL: docs.google.com/spreadsheets/d/ЭТОТ_ID/edit).
 * Запустите один раз, если веб-приложение не видит таблицу.
 */
function setSpreadsheetId(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty(
    SPREADSHEET_ID_PROPERTY,
    String(spreadsheetId).trim()
  );
  SpreadsheetApp.getUi().alert('ID таблицы сохранён.');
}

/** Тест записи в таблицу из редактора Apps Script. */
function testSaveResponse() {
  var payload = {
    name: 'Тест из Apps Script',
    attendance: 'yes',
    attendanceReason: '',
    companions: '',
    dietary: ['none'],
    dietaryDetails: '',
    transfer: 'no',
    transferPickup: '',
    overnight: 'no',
    alcohol: ['Не употребляю алкоголь'],
  };

  var sheet = getOrCreateSheet_();
  var row = buildResponseRow_(payload);
  sheet.appendRow(row);
  SpreadsheetApp.getUi().alert('Тестовая строка добавлена на лист «' + SHEET_NAME + '».');
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Таблица не найдена. Откройте проект из Google Таблицы или запустите setSpreadsheetId("ID_ТАБЛИЦЫ").'
    );
  }

  return ss;
}

function getOrCreateSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }

  return sheet;
}

function buildResponseRow_(payload) {
  var alcoholList = Array.isArray(payload.alcohol) ? payload.alcohol : [];
  var alcoholText = alcoholList
    .map(function (value) {
      return ALCOHOL_LABELS[value] || value;
    })
    .join(', ');

  var dietaryList = Array.isArray(payload.dietary)
    ? payload.dietary
    : Array.isArray(payload.food)
      ? payload.food
      : payload.dietary || payload.food
        ? [payload.dietary || payload.food]
        : [];
  var dietaryText = dietaryList
    .map(function (value) {
      return DIETARY_LABELS[value] || FOOD_LABELS_LEGACY[value] || value;
    })
    .join(', ');

  var dietaryDetails = String(payload.dietaryDetails || payload.allergies || '').trim();

  return [
    new Date(),
    String(payload.name || '').trim(),
    ATTENDANCE_LABELS[payload.attendance] || payload.attendance || '',
    String(payload.attendanceReason || '').trim(),
    String(payload.companions || '').trim(),
    TRANSFER_LABELS[payload.transfer] || payload.transfer || '—',
    PICKUP_LABELS[payload.transferPickup] || payload.transferPickup || '—',
    dietaryText,
    alcoholText,
    dietaryDetails,
    OVERNIGHT_LABELS[payload.overnight] || payload.overnight || '—',
  ];
}

function setupSummarySheet_(ss, options) {
  options = options || { formulas: true, visuals: true };
  var needFormulas = options.formulas !== false;
  var needVisuals = options.visuals !== false;

  var summary = ss.getSheetByName(SUMMARY_SHEET);
  var responses = ss.getSheetByName(SHEET_NAME);
  var sourceRange = responses.getDataRange();

  if (needFormulas || !summary) {
    if (summary) {
      ss.deleteSheet(summary);
    }
    summary = ss.insertSheet(SUMMARY_SHEET);
    summary.getRange('A1').setValue('Сводка по анкетам').setFontWeight('bold').setFontSize(14);
    summary.getRange('A2').setValue('Обновляется автоматически при новых ответах').setFontColor('#5A4A42');
    summary.setColumnWidth(1, 260);
    summary.setColumnWidth(2, 80);
    applySummaryMetrics_(summary);
  }

  if (!needVisuals) {
    return;
  }

  clearSummaryVisuals_(summary);

  if (sourceRange.getNumRows() > 1) {
    buildPivotTables_(summary, sourceRange);
  } else {
    summary.getRange('D4').setValue(
      'Сводные таблицы появятся после первых ответов. Затем запустите refreshSummarySheet().'
    );
  }

  buildSummaryCharts_(summary);
}

function getDietarySummaryMetrics_(sheetRange) {
  return Object.keys(DIETARY_LABELS).map(function (key) {
    var label = DIETARY_LABELS[key];
    return [label, countifFormula_(sheetRange('H:H'), '*' + label + '*')];
  });
}

function getSummaryMetrics_() {
  var sheetRange = function (col) {
    return SHEET_NAME + '!' + col;
  };

  return [
    ['Всего ответов', countaFormula_(sheetRange('B2:B'))],
    ['Придут (да)', countifFormula_(sheetRange('C:C'), 'Да, обязательно буду')],
    ['Придут (+1)', countifFormula_(sheetRange('C:C'), 'Да, буду с +1')],
    ['Затрудняются ответить', countifFormula_(sheetRange('C:C'), 'Затрудняюсь ответить')],
    ['Не смогут прийти', countifFormula_(sheetRange('C:C'), 'Нет, не получится')],
    ['', ''],
    ['Трансфер: только туда', countifFormula_(sheetRange('F:F'), 'Только туда')],
    ['Трансфер: только обратно', countifFormula_(sheetRange('F:F'), 'Только обратно')],
    ['Трансфер: туда и обратно', countifFormula_(sheetRange('F:F'), 'И туда, и обратно')],
    ['Трансфер не нужен', countifFormula_(sheetRange('F:F'), 'Не нужен')],
    ['', ''],
  ]
    .concat(getDietarySummaryMetrics_(sheetRange))
    .concat([
    ['', ''],
    ['Белое вино', countifFormula_(sheetRange('I:I'), '*Белое вино*')],
    ['Красное вино', countifFormula_(sheetRange('I:I'), '*Красное вино*')],
    ['Игристое', countifFormula_(sheetRange('I:I'), '*Игристое*')],
    ['Крепкий алкоголь', countifFormula_(sheetRange('I:I'), '*Крепкий*')],
    ['Без алкоголя', countifFormula_(sheetRange('I:I'), '*Не употребляю*')],
    ['', ''],
    ['Ночёвка: да', countifFormula_(sheetRange('K:K'), 'Да*')],
    ['Ночёвка: нет', countifFormula_(sheetRange('K:K'), 'Нет*')],
    ['С особенностями питания', dietaryRestrictionsFormula_()],
  ]);
}

/** По одной ячейке — обход бага пакетного setFormulas в Google Таблицах. */
function applySummaryMetrics_(summary) {
  var metrics = getSummaryMetrics_();
  var startRow = 4;

  metrics.forEach(function (row, index) {
    var rowNum = startRow + index;
    var labelCell = summary.getRange(rowNum, 1);
    var valueCell = summary.getRange(rowNum, 2);

    labelCell.setValue(row[0]);
    if (row[0]) {
      labelCell.setFontWeight('bold');
    } else {
      labelCell.setFontWeight('normal');
    }

    if (row[1]) {
      valueCell.setFormula(row[1]);
      valueCell.setHorizontalAlignment('right');
    } else {
      valueCell.clearContent();
    }
  });

  SpreadsheetApp.flush();
}

function clearSummaryVisuals_(summary) {
  summary.getCharts().forEach(function (chart) {
    summary.removeChart(chart);
  });

  var maxRows = summary.getMaxRows();
  var maxCols = summary.getMaxColumns();
  if (maxCols >= 4 && maxRows >= 4) {
    summary.getRange(4, 4, maxRows - 3, maxCols - 3).clear();
  }
}

function buildPivotTables_(summary, sourceRange) {
  summary.getRange('D4').setValue('Сводные таблицы').setFontWeight('bold').setFontSize(12);

  var pivots = [
    { cell: 'D6', col: 3, title: 'Присутствие' },
    { cell: 'J6', col: 6, title: 'Трансфер' },
    { cell: 'D20', col: 7, title: 'Откуда трансфер' },
    { cell: 'J20', col: 8, title: 'Особенности питания' },
    { cell: 'D34', col: 11, title: 'Ночёвка' },
  ];

  pivots.forEach(function (cfg) {
    summary.getRange(cfg.cell).setValue(cfg.title).setFontWeight('bold').setFontSize(10);
    var anchor = summary.getRange(shiftCell_(summary, cfg.cell, 1, 0));
    var pivot = anchor.createPivotTable(sourceRange);
    pivot.addRowGroup(cfg.col);
    pivot.addPivotValue(cfg.col, SpreadsheetApp.PivotTableSummarizeFunction.COUNTA);
  });
}

function buildSummaryCharts_(summary) {
  summary.getRange('P4').setValue('Графики').setFontWeight('bold').setFontSize(12);

  var charts = [
    {
      title: 'Присутствие',
      range: 'A5:B8',
      type: Charts.ChartType.PIE,
      pos: [5, 15, 0, 0],
      size: [420, 280],
    },
    {
      title: 'Трансфер',
      range: 'A10:B13',
      type: Charts.ChartType.COLUMN,
      pos: [5, 15, 0, 300],
      size: [420, 280],
    },
    {
      title: 'Блюда',
      range: 'A15:B18',
      type: Charts.ChartType.BAR,
      pos: [22, 15, 0, 0],
      size: [420, 240],
    },
    {
      title: 'Алкоголь',
      range: 'A20:B24',
      type: Charts.ChartType.COLUMN,
      pos: [22, 15, 0, 300],
      size: [420, 280],
    },
  ];

  charts.forEach(function (cfg) {
    var chart = summary.newChart()
      .setChartType(cfg.type)
      .addRange(summary.getRange(cfg.range))
      .setPosition(cfg.pos[0], cfg.pos[1], cfg.pos[2], cfg.pos[3])
      .setOption('title', cfg.title)
      .setOption('legend', { position: 'bottom' })
      .setOption('width', cfg.size[0])
      .setOption('height', cfg.size[1])
      .setOption('chartArea', { width: '85%', height: '70%' })
      .build();

    summary.insertChart(chart);
  });
}

function shiftCell_(sheet, a1, rowOffset, colOffset) {
  var range = sheet.getRange(a1);
  return cellToA1_(range.getRow() + rowOffset, range.getColumn() + colOffset);
}

function cellToA1_(row, col) {
  var letters = '';
  var n = col;
  while (n > 0) {
    var rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters + row;
}

/** COUNTIF/COUNTA на английском, разделитель ";" (СНГ-локаль). */
var FORMULA_SEP = ';';

function countifExpr_(rangeRef, criteria) {
  var escaped = String(criteria).replace(/"/g, '""');
  return 'COUNTIF(' + rangeRef + FORMULA_SEP + '"' + escaped + '")';
}

function countifFormula_(rangeRef, criteria) {
  return '=' + countifExpr_(rangeRef, criteria);
}

function countaFormula_(rangeRef) {
  return '=COUNTA(' + rangeRef + ')';
}

/** Ответы с ограничениями в питании (колонка H без «Особых ограничений нет» или с подробностями в J). */
function dietaryRestrictionsFormula_() {
  var dietaryRef = SHEET_NAME + '!H2:H';
  var detailsRef = SHEET_NAME + '!J2:J';
  return '=' + countifExpr_(dietaryRef, '<>') + '-' + countifExpr_(dietaryRef, '*Особых ограничений нет*') + '+' + countifExpr_(detailsRef, '<>');
}

function allergiesFormula_() {
  return dietaryRestrictionsFormula_();
}

function getTelegramProps_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');

  if (!token || !chatId) {
    return null;
  }

  return { token: token, chatId: chatId };
}

var TG_QUEUE_KEY = 'TG_QUEUE';

function scheduleTelegramNotification_(payload, row) {
  if (!getTelegramProps_()) {
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var queue = JSON.parse(props.getProperty(TG_QUEUE_KEY) || '[]');
  queue.push({ payload: payload, row: row });
  props.setProperty(TG_QUEUE_KEY, JSON.stringify(queue));
  ensureTelegramTrigger_();
}

function ensureTelegramTrigger_() {
  var hasTrigger = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'deliverTelegramNotification';
  });

  if (!hasTrigger) {
    ScriptApp.newTrigger('deliverTelegramNotification')
      .timeBased()
      .after(1000)
      .create();
  }
}

/** Фоновая отправка — не блокирует сохранение анкеты. */
function deliverTelegramNotification() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'deliverTelegramNotification') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  var props = PropertiesService.getScriptProperties();
  var queue = JSON.parse(props.getProperty(TG_QUEUE_KEY) || '[]');
  props.deleteProperty(TG_QUEUE_KEY);

  queue.forEach(function (item) {
    try {
      sendTelegramNotification_(item.payload, item.row);
    } catch (err) {
      Logger.log('Telegram queue error: ' + err);
    }
  });

  var remaining = JSON.parse(props.getProperty(TG_QUEUE_KEY) || '[]');
  if (remaining.length) {
    ensureTelegramTrigger_();
  }
}

function sendTelegramNotification_(payload, row) {
  var tg = getTelegramProps_();
  if (!tg) {
    return;
  }

  var lines = [
    '💌 Новый ответ на анкету',
    '',
    '👤 ' + (row[1] || '—'),
    '📋 ' + (row[2] || '—'),
  ];

  if (row[3]) {
    lines.push('❓ Причина: ' + row[3]);
  }
  if (row[4]) {
    lines.push('👥 С кем: ' + row[4]);
  }

  if (payload.attendance && payload.attendance !== 'no') {
    lines.push('🚌 Трансфер: ' + (row[5] || '—'));
    if (row[6] && row[6] !== '—') {
      lines.push('📍 Откуда: ' + row[6]);
    }
    lines.push('🍽 Питание: ' + (row[7] || '—'));
    if (row[9]) {
      lines.push('📝 Подробности: ' + row[9]);
    }
    lines.push('🥂 Алкоголь: ' + (row[8] || '—'));
    lines.push('🌙 Ночёвка: ' + (row[10] || '—'));
  }

  sendTelegramMessage_(tg.token, tg.chatId, lines.join('\n'));
}

function sendTelegramMessage_(token, chatId, text) {
  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true,
    }),
    muteHttpExceptions: true,
    followRedirects: true,
    validatingHttpsCertificates: true,
  });

  var body = response.getContentText();
  var result = JSON.parse(body);
  if (!result.ok) {
    throw new Error('Telegram API: ' + (result.description || body));
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
