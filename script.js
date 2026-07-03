(function () {
  'use strict';

  const WEDDING_DATE = new Date('2026-10-01T15:00:00+03:00');
  const RSVP_DEADLINE = new Date('2026-09-01T23:59:59+03:00');

  // Countdown
  function updateCountdown() {
    const now = new Date();
    const diff = WEDDING_DATE - now;

    const els = {
      days: document.getElementById('days'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds'),
    };

    if (!els.days) return;

    if (diff <= 0) {
      Object.values(els).forEach((el) => (el.textContent = '00'));
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    els.days.textContent = String(days).padStart(2, '0');
    els.hours.textContent = String(hours).padStart(2, '0');
    els.minutes.textContent = String(minutes).padStart(2, '0');
    els.seconds.textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Scroll reveal
  const revealEls = document.querySelectorAll(
    '.section__title, .section__text, .sched-minimal, .details-grid, .form, .countdown, .palette, .silk-palette, .wedding-calendar, .contacts-stack'
  );

  revealEls.forEach((el) => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));

  function isCopyPhoneDevice() {
    return window.matchMedia('(min-width: 768px)').matches;
  }

  async function copyPhoneNumber(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    document.body.removeChild(helper);
  }

  let copyToastTimer;

  function showCopyToast(message) {
    const toast = document.getElementById('copy-toast');
    if (!toast) return;

    if (message) toast.textContent = message;

    toast.hidden = false;
    toast.classList.add('is-visible');

    window.clearTimeout(copyToastTimer);
    copyToastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        toast.hidden = true;
        if (message) toast.textContent = 'Скопировано';
      }, 250);
    }, 4000);
  }

  function normalizeTelegramUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('tel:')) {
      const digits = trimmed.slice(4).replace(/\D/g, '');
      return digits ? `https://t.me/+${digits}` : '';
    }

    const asPhone = trimmed.replace(/\s/g, '');
    if (/^\+\d+$/.test(asPhone)) return `https://t.me/${asPhone}`;
    if (/^\d{7,}$/.test(asPhone)) return `https://t.me/+${asPhone}`;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('tg://')) {
      return trimmed;
    }

    return `https://t.me/${trimmed.replace(/^@/, '')}`;
  }

  function getTelegramAppUrl(webUrl) {
    const phoneMatch = webUrl.match(/^https?:\/\/t\.me\/\+(\d+)$/);
    if (phoneMatch) return `tg://resolve?phone=${phoneMatch[1]}`;

    const usernameMatch = webUrl.match(/^https?:\/\/t\.me\/([A-Za-z0-9_]{5,})$/);
    if (usernameMatch) return `tg://resolve?domain=${usernameMatch[1]}`;

    const inviteMatch = webUrl.match(/^https?:\/\/t\.me\/\+([A-Za-z0-9_-]+)$/);
    if (inviteMatch) return `tg://join?invite=${inviteMatch[1]}`;

    return webUrl;
  }

  function isMobileDevice() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  function openTelegramLink(webUrl) {
    const normalizedUrl = normalizeTelegramUrl(webUrl);
    if (!normalizedUrl) return;

    if (isMobileDevice()) {
      window.location.href = getTelegramAppUrl(normalizedUrl);
      return;
    }

    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  function initContacts() {
    const tgUrl =
      typeof TELEGRAM_GROUP_URL === 'string' ? TELEGRAM_GROUP_URL.trim() : '';

    document.querySelectorAll('.js-telegram-group-link').forEach((tgLink) => {
      if (tgUrl) {
        const normalizedGroupUrl = normalizeTelegramUrl(tgUrl);
        tgLink.href = normalizedGroupUrl;
        tgLink.removeAttribute('disabled');
        tgLink.addEventListener('click', (e) => {
          if (isMobileDevice()) {
            e.preventDefault();
            openTelegramLink(normalizedGroupUrl);
          }
        });
      } else {
        tgLink.removeAttribute('href');
        tgLink.setAttribute('disabled', '');
        tgLink.textContent = 'Присоединиться';
      }
    });

    const organizerName =
      typeof ORGANIZER_NAME === 'string' && ORGANIZER_NAME.trim()
        ? ORGANIZER_NAME.trim()
        : 'Имя организатора';
    const organizerNameInText =
      typeof ORGANIZER_NAME_IN_TEXT === 'string' && ORGANIZER_NAME_IN_TEXT.trim()
        ? ORGANIZER_NAME_IN_TEXT.trim()
        : organizerName;
    const phone = typeof ORGANIZER_PHONE === 'string' ? ORGANIZER_PHONE.trim() : '';
    const phoneDisplay =
      typeof ORGANIZER_PHONE_DISPLAY === 'string' && ORGANIZER_PHONE_DISPLAY.trim()
        ? ORGANIZER_PHONE_DISPLAY.trim()
        : phone;
    const organizerTelegramUrl =
      typeof ORGANIZER_TELEGRAM_URL === 'string' ? ORGANIZER_TELEGRAM_URL.trim() : '';
    const organizerTelegramLabel =
      typeof ORGANIZER_TELEGRAM_DISPLAY === 'string' && ORGANIZER_TELEGRAM_DISPLAY.trim()
        ? ORGANIZER_TELEGRAM_DISPLAY.trim()
        : 'Telegram';
    const organizerInstagramUrl =
      typeof ORGANIZER_INSTAGRAM_URL === 'string' ? ORGANIZER_INSTAGRAM_URL.trim() : '';
    const organizerInstagramLabel =
      typeof ORGANIZER_INSTAGRAM_DISPLAY === 'string' && ORGANIZER_INSTAGRAM_DISPLAY.trim()
        ? ORGANIZER_INSTAGRAM_DISPLAY.trim()
        : 'Instagram';

    document.querySelectorAll('.js-organizer-name').forEach((nameEl) => {
      nameEl.textContent = organizerName;
    });

    document.querySelectorAll('.js-organizer-name-inline').forEach((nameEl) => {
      nameEl.textContent = organizerNameInText;
    });

    document.querySelectorAll('.js-organizer-phone').forEach((phoneEl) => {
      phoneEl.classList.remove('contacts-card__link--placeholder');

      if (!phone) {
        phoneEl.hidden = true;
        return;
      }

      const phoneValue = phoneDisplay || phone;
      const telHref = `tel:${phone.replace(/\s/g, '')}`;
      phoneEl.href = telHref;
      phoneEl.textContent = phoneValue;
      phoneEl.hidden = false;

      const updatePhoneLabel = () => {
        phoneEl.setAttribute(
          'aria-label',
          isCopyPhoneDevice()
            ? `Скопировать номер: ${phoneValue}`
            : `Позвонить: ${phoneValue}`
        );
      };

      updatePhoneLabel();
      window.addEventListener('resize', updatePhoneLabel);

      phoneEl.addEventListener('click', async (e) => {
        if (!isCopyPhoneDevice()) return;

        e.preventDefault();

        try {
          await copyPhoneNumber(phoneValue);
          showCopyToast();
          phoneEl.setAttribute('aria-label', 'Номер скопирован');
          window.setTimeout(updatePhoneLabel, 2000);
        } catch (err) {
          console.error('Copy phone error:', err);
          phoneEl.setAttribute('aria-label', 'Не удалось скопировать номер');
          window.setTimeout(updatePhoneLabel, 2000);
        }
      });
    });

    document.querySelectorAll('.js-organizer-telegram').forEach((telegramEl) => {
      const normalizedTelegramUrl = normalizeTelegramUrl(organizerTelegramUrl);

      if (normalizedTelegramUrl) {
        telegramEl.href = normalizedTelegramUrl;
        telegramEl.setAttribute('aria-label', organizerTelegramLabel);
        telegramEl.hidden = false;
        telegramEl.addEventListener('click', (e) => {
          e.preventDefault();
          openTelegramLink(normalizedTelegramUrl);
        });
      } else {
        telegramEl.hidden = true;
      }
    });

    document.querySelectorAll('.js-organizer-instagram').forEach((instagramEl) => {
      if (organizerInstagramUrl) {
        instagramEl.href = organizerInstagramUrl;
        instagramEl.setAttribute('aria-label', organizerInstagramLabel);
        instagramEl.hidden = false;
      } else {
        instagramEl.hidden = true;
      }
    });
  }

  initContacts();

  function showFormError(message) {
    const errorEl = document.getElementById('form-error');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function hideFormError() {
    const errorEl = document.getElementById('form-error');
    if (errorEl) errorEl.hidden = true;
  }

  function setSubmitting(isSubmitting) {
    const submitBtn = document.getElementById('rsvp-submit');
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Отправляем…' : 'Отправить анкету';
  }

  async function submitToGoogleSheets(data) {
    if (typeof GOOGLE_SCRIPT_URL !== 'string' || !GOOGLE_SCRIPT_URL.trim()) {
      throw new Error(
        'Форма ещё не подключена к Google Таблице. Укажите URL в config.js.'
      );
    }

    // no-cors + text/plain — стандартный способ для Google Apps Script
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
    });
  }

  // RSVP form
  const form = document.getElementById('rsvp-form');
  const successEl = document.getElementById('form-success');

  function getAttendanceValue() {
    return form?.querySelector('input[name="attendance"]:checked')?.value || '';
  }

  function getTransferValue() {
    return form?.querySelector('input[name="transfer"]:checked')?.value || '';
  }

  function isAttending() {
    const attendance = getAttendanceValue();
    return attendance && attendance !== 'no';
  }

  function needsTransferPickup() {
    const transfer = getTransferValue();
    return transfer && transfer !== 'no';
  }

  function setGroupVisible(group, visible) {
    if (!group) return;
    group.hidden = !visible;
  }

  function clearGroupInputs(group) {
    if (!group) return;
    group.querySelectorAll('input, textarea').forEach((input) => {
      if (input.type === 'radio' || input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
  }

  const FOOD_VALUES = ['chicken', 'fish', 'meat', 'vegetarian'];
  const foodCounts = {
    chicken: 0,
    fish: 0,
    meat: 0,
    vegetarian: 0,
  };

  function getPartySize() {
    const raw = parseInt(form?.partySize?.value, 10);
    if (!Number.isFinite(raw)) return 2;
    return Math.min(10, Math.max(2, raw));
  }

  function getFoodMultiTotal() {
    return FOOD_VALUES.reduce((sum, value) => sum + foodCounts[value], 0);
  }

  function resetFoodCounts() {
    FOOD_VALUES.forEach((value) => {
      foodCounts[value] = 0;
    });
    updateFoodMultiUI();
  }

  function trimFoodCounts() {
    let total = getFoodMultiTotal();
    const partySize = getPartySize();

    while (total > partySize) {
      for (let i = FOOD_VALUES.length - 1; i >= 0; i -= 1) {
        const value = FOOD_VALUES[i];
        if (foodCounts[value] > 0) {
          foodCounts[value] -= 1;
          total -= 1;
          break;
        }
      }
    }
  }

  function getFoodMultiSelection() {
    return FOOD_VALUES.flatMap((value) => Array(foodCounts[value]).fill(value));
  }

  function updateFoodMultiUI() {
    const total = getFoodMultiTotal();
    const partySize = getPartySize();

    form?.querySelectorAll('.food-multi__option').forEach((label) => {
      const value = label.dataset.food;
      const count = foodCounts[value] || 0;
      const input = label.querySelector('input');
      const countEl = label.querySelector('.food-multi__count');

      if (input) input.checked = count > 0;
      if (countEl) {
        if (count > 1) {
          countEl.textContent = `×${count}`;
          countEl.hidden = false;
        } else {
          countEl.textContent = '';
          countEl.hidden = true;
        }
      }
    });

    const status = document.getElementById('food-multi-status');
    if (status) {
      status.textContent = `Выбрано ${total} из ${partySize}`;
    }
  }

  function onFoodMultiClick(e) {
    e.preventDefault();

    const label = e.currentTarget;
    const value = label.dataset.food;
    if (!value || !FOOD_VALUES.includes(value)) return;

    const total = getFoodMultiTotal();
    const count = foodCounts[value];
    const partySize = getPartySize();

    if (total < partySize) {
      foodCounts[value] = count + 1;
    } else if (count > 0) {
      foodCounts[value] = count - 1;
    }

    updateFoodMultiUI();
  }

  function updateFoodMode(withGuests) {
    const foodSingle = document.getElementById('food-single');
    const foodPlus = document.getElementById('food-plus');
    if (!foodSingle || !foodPlus) return;

    foodSingle.hidden = withGuests;
    foodPlus.hidden = !withGuests;

    if (withGuests) {
      clearGroupInputs(foodSingle);
      updateFoodMultiUI();
    } else {
      resetFoodCounts();
    }
  }

  function updateFormVisibility() {
    if (!form) return;

    const attendance = getAttendanceValue();
    const attending = isAttending();
    const unsure = attendance === 'unsure';
    const plusOne = attendance === 'yes-plus';
    const showCompanions = plusOne || unsure;
    const transferPickup = needsTransferPickup();

    const partySizeGroup = document.getElementById('party-size-group');
    const partySizeEl = form.partySize;

    setGroupVisible(partySizeGroup, plusOne && attending);
    if (partySizeEl) {
      if (plusOne && attending) {
        partySizeEl.setAttribute('required', '');
      } else {
        partySizeEl.removeAttribute('required');
      }
    }
    if (!plusOne || !attending) {
      if (partySizeEl) partySizeEl.value = '2';
      resetFoodCounts();
    } else {
      trimFoodCounts();
      updateFoodMultiUI();
    }

    const companionsGroup = document.getElementById('companions-group');
    const companionsEl = form.companions;
    const companionsMark = document.getElementById('companions-required');

    setGroupVisible(companionsGroup, showCompanions);
    if (companionsMark) companionsMark.hidden = !plusOne;
    if (companionsEl) {
      if (plusOne) {
        companionsEl.setAttribute('required', '');
      } else {
        companionsEl.removeAttribute('required');
      }
    }
    if (!showCompanions) {
      clearGroupInputs(companionsGroup);
    }

    setGroupVisible(document.getElementById('attendance-reason-group'), unsure);
    if (!unsure) {
      clearGroupInputs(document.getElementById('attendance-reason-group'));
    }

    setGroupVisible(document.getElementById('food-group'), attending);
    updateFoodMode(plusOne && attending);
    setGroupVisible(document.getElementById('transfer-group'), attending);
    setGroupVisible(document.getElementById('overnight-group'), attending);
    setGroupVisible(document.getElementById('alcohol-group'), attending);
    setGroupVisible(document.getElementById('allergies-group'), attending);

    const allergiesChoice = form.querySelector('input[name="allergiesChoice"]:checked')?.value;
    const allergiesYes = allergiesChoice === 'yes';
    const allergiesDetailGroup = document.getElementById('allergies-detail-group');
    const allergiesEl = form.allergies;

    setGroupVisible(allergiesDetailGroup, attending && allergiesYes);
    if (allergiesEl) {
      if (attending && allergiesYes) {
        allergiesEl.setAttribute('required', '');
      } else {
        allergiesEl.removeAttribute('required');
      }
    }
    if (!allergiesYes && allergiesEl) {
      allergiesEl.value = '';
    }

    if (!attending) {
      clearGroupInputs(document.getElementById('food-group'));
      updateFoodMode(false);
      clearGroupInputs(document.getElementById('transfer-group'));
      clearGroupInputs(document.getElementById('overnight-group'));
      clearGroupInputs(document.getElementById('alcohol-group'));
      clearGroupInputs(document.getElementById('allergies-group'));
      clearGroupInputs(document.getElementById('allergies-detail-group'));
    }

    setGroupVisible(document.getElementById('transfer-pickup-group'), attending && transferPickup);
    if (!transferPickup) {
      clearGroupInputs(document.getElementById('transfer-pickup-group'));
    }
  }

  if (form) {
    form.querySelectorAll('input[name="attendance"], input[name="transfer"], input[name="allergiesChoice"]').forEach((input) => {
      input.addEventListener('change', updateFormVisibility);
    });
    form.querySelectorAll('.food-multi__option').forEach((label) => {
      label.addEventListener('click', onFoodMultiClick);
    });
    form.partySize?.addEventListener('input', () => {
      trimFoodCounts();
      updateFoodMultiUI();
    });
    updateFormVisibility();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormError();

      const name = form.name.value.trim();
      const attendance = form.querySelector('input[name="attendance"]:checked');

      if (!name) {
        form.name.focus();
        return;
      }

      if (!attendance) {
        alert('Пожалуйста, укажите, планируете ли вы присутствовать на свадьбе.');
        return;
      }

      const isNotAttending = attendance.value === 'no';
      const isUnsure = attendance.value === 'unsure';
      const isPlusOne = attendance.value === 'yes-plus';
      const attendanceReason = form.attendanceReason.value.trim();
      const companions = form.companions.value.trim();

      if (isUnsure && !attendanceReason) {
        form.attendanceReason.focus();
        alert('Пожалуйста, укажите причину, по которой вы затрудняетесь ответить.');
        return;
      }

      if (isPlusOne && !companions) {
        form.companions.focus();
        alert('Пожалуйста, укажите, с кем вы планируете прийти.');
        return;
      }

      const transfer = form.querySelector('input[name="transfer"]:checked')?.value || '';
      const transferPickup = form.querySelector('input[name="transferPickup"]:checked');
      const foodSingle = form.querySelector('input[name="food"]:checked');
      const foodMultiSelection = getFoodMultiSelection();
      const overnight = form.querySelector('input[name="overnight"]:checked');
      const alcoholChecked = form.querySelectorAll('input[name="alcohol"]:checked');

      if (isPlusOne && (!form.partySize?.value || getPartySize() < 2)) {
        form.partySize?.focus();
        alert('Пожалуйста, укажите, сколько человек будет всего.');
        return;
      }

      if (!isNotAttending && isPlusOne) {
        const partySize = getPartySize();
        if (foodMultiSelection.length !== partySize) {
          alert(`Пожалуйста, выберите блюда для всех ${partySize} человек.`);
          return;
        }
      } else if (!isNotAttending && !foodSingle) {
        alert('Пожалуйста, выберите блюдо.');
        return;
      }

      if (!isNotAttending && alcoholChecked.length === 0) {
        alert('Пожалуйста, укажите ваши предпочтения в алкоголе.');
        return;
      }

      if (!isNotAttending && transfer && transfer !== 'no' && !transferPickup) {
        alert('Пожалуйста, укажите, откуда удобнее, чтобы забрал трансфер.');
        return;
      }

      const allergiesChoice = form.querySelector('input[name="allergiesChoice"]:checked');
      const allergiesText = form.allergies.value.trim();

      if (!isNotAttending && !allergiesChoice) {
        alert('Пожалуйста, укажите, есть ли у вас пищевые аллергии.');
        return;
      }

      if (!isNotAttending && allergiesChoice?.value === 'yes' && !allergiesText) {
        form.allergies.focus();
        alert('Пожалуйста, укажите, на что именно у вас аллергия.');
        return;
      }

      const data = {
        name,
        attendance: attendance.value,
        attendanceReason: isUnsure ? attendanceReason : '',
        companions,
        partySize: isPlusOne ? getPartySize() : '',
        food: !isNotAttending
          ? isPlusOne
            ? foodMultiSelection
            : foodSingle.value
          : '',
        transfer,
        transferPickup:
          !isNotAttending && transfer && transfer !== 'no' && transferPickup
            ? transferPickup.value
            : '',
        overnight: !isNotAttending && overnight ? overnight.value : '',
        alcohol: Array.from(alcoholChecked).map((cb) => cb.value),
        allergies: !isNotAttending
          ? allergiesChoice.value === 'no'
            ? 'Нет'
            : allergiesText
          : '',
        submittedAt: new Date().toISOString(),
      };

      setSubmitting(true);

      try {
        await submitToGoogleSheets(data);

        form.hidden = true;
        successEl.hidden = false;
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        console.error('RSVP error:', err);
        showFormError(
          err.message ||
            'Не удалось отправить анкету. Проверьте интернет и попробуйте снова.'
        );
      } finally {
        setSubmitting(false);
      }
    });
  }

  // RSVP deadline notice
  const deadlineEl = document.querySelector('.section__text--deadline');
  if (deadlineEl && new Date() > RSVP_DEADLINE) {
    deadlineEl.innerHTML =
      'Срок подтверждения истёк <strong>1 сентября 2026</strong>. ' +
      'Если вы ещё не ответили — напишите нам лично.';
  }
})();
