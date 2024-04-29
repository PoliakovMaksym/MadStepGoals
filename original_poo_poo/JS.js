/* Original widget by JayniusGamingTV (@europlier) */
/* Widgetified by thefyrewire (@MikeyHay) */

/* 
CHANGELOG 
09-dec-19: Added Opacity Multiplier as a field setting 
19-sep-20: Added Goal Completion option.
*/

const prefs = {};
let sane = false,
  goalType,
  goalKey,
  unlocked = [],
  fields;

window.addEventListener('onWidgetLoad', async obj => {
  fields = obj.detail.fieldData;
  const data = obj.detail.session.data;

  prefs.goalType = fields.goalType;
  prefs.backgroundMainColor = {
    original: fields.backgroundMainColor,
    rgb: rgbify(fields.backgroundMainColor),
  };
  prefs.backgroundSecondaryColor = fields.backgroundSecondaryColor;
  prefs.unlockedColor = fields.unlockedColor;
  prefs.opacityMultiplier = fields.opacityMultiplier;

  Object.keys(fields)
    .filter(f => f.startsWith('_reward'))
    .forEach(r => {
      if (fields[r].indexOf('-') === -1) return;
      const parts = fields[r].split('-').map(t => t.trim());
      $('#reward_table').append(`
      <div class="reward_row animated">
        <div class="sub_goal text">${parts.shift() || 0}</div><div class="sub_text text">${fields.goalText}</div><div class="reward_text text">${parts.join('-')}</div><div class="checkmark">✔️</div>
      </div>
    `);
    });

  if (fields.unlockedSound) {
    prefs.unlockedSound = new Audio(fields.unlockedSound);
    prefs.unlockedSound.volume = fields.unlockedSoundVolume / 100;
  }

  if (fields.goalType === 'botCounter') {
    if (fields.counterName.trim().length <= 0 || fields.counterGoal < 0) return;
    prefs.counterName = fields.counterName;
    const channel = await fetch(
      `https://api.streamelements.com/kappa/v2/channels/${obj.detail.channel.username}`,
    ).then(d => d.json());
    const counter = await fetch(
      `https://api.streamelements.com/kappa/v2/bot/${channel._id}/counters/${prefs.counterName}`,
    ).then(d => d.json());
    update(counter.value, true);
  } else {
    [goalType, goalKey] = fields.goalType.split('_');
    update(data[goalType][goalKey], true);
  }

  sane = true;
});

const update = (amount, load = false) => {
  $('.sub_goal').each(function () {
    $(this).toString();

    if (decurrencify($(this).text()) - amount <= 0 && amount > 0) {
      $(this).parent().css('opacity', 1);
      $(this)
        .parent()
        .css({
          'background-image': `linear-gradient(to left, ${prefs.backgroundSecondaryColor}, ${prefs.backgroundMainColor.original})`,
          opacity: '1 !important',
        });
      $(this).parent().addClass('flash');
      $(this).parent().removeClass('pulse infinite');
      $(this).siblings('.reward_text').css('color', prefs.unlockedColor);
      $(this).siblings('.checkmark').css('visibility', 'visible');
      if (fields.goalHide === 'normal') {
        //$(this).parent().removeClass('hidden'); // remove class
      } else {
        $(this).parent().removeClass('flash');
        $(this).parent().fadeOut(2000);
        //$(this).parent().addClass('removethis');
      }
      if (!load && prefs.unlockedSound && unlocked.indexOf($(this).text()) === -1)
        prefs.unlockedSound.play();
      unlocked.push($(this).text());
    }

    if (
      decurrencify($(this).text()) - amount >= 1 &&
      $(this).parent().prev().find('div.checkmark').text().indexOf('') >= 0
    ) {
      $(this).parent().removeClass('pulse infinite').css('z-index', '0');
      $(this).parent().css('display', 'hide');
      updateOtherRows($(this), 3);
    }

    if (
      (decurrencify($(this).text()) - amount >= 1 &&
        $(this).parent().prev().find('div.checkmark').text().indexOf('✔️') >= 0) ||
      unlocked.length <= 0
    ) {
      if ($('.pulse').length <= 0) $(this).parent().addClass('pulse infinite').css('z-index', '10');
      updateOtherRows($(this), amount, 2);
    }
  });
};

const updateOtherRows = (row, amount, opacityMultiplier) => {
  row.parent().css({
    opacity: 1,
    'background-color': '',
    'background-image': `linear-gradient(to left, ${prefs.backgroundSecondaryColor}, rgba(${prefs.backgroundMainColor.rgb.r}, ${prefs.backgroundMainColor.rgb.g}, ${prefs.backgroundMainColor.rgb.b}, ${Math.abs(0.8 / ((decurrencify(row.text()) - amount) / 3))}))`,
  });
  row.siblings('.reward_text').css('color', '');
  row.siblings('.checkmark').css('visibility', 'hidden');
};

window.addEventListener('onSessionUpdate', obj => {
  if (!sane || prefs.goalType === 'botCounter') return;
  const data = obj.detail.session;
  update(data[goalType][goalKey]);
});

window.addEventListener('onEventReceived', obj => {
  if (!sane || prefs.goalType !== 'botCounter' || obj.detail.listener !== 'bot:counter') return;
  const event = obj.detail.event;
  if (event.counter !== prefs.counterName) return;
  update(event.value);
});

const rgbify = color => {
  let rgb = {};
  if (color.charAt(0) === '#') {
    const big = parseInt(color.substr(1, color.length), 16);
    const r = (big >> 16) & 255;
    const g = (big >> 8) & 255;
    const b = big & 255;
    rgb = { r, g, b };
  } else if (color.startsWith('rgb')) {
    const regex = /rgba?\((\d+),\s*?(\d+),\s*?(\d+).*\)/gi;
    const matches = regex.exec(color);
    if (matches.length !== 4) return { r: 255, g: 255, b: 255 };
    rgb = { r: matches[1], g: matches[2], b: matches[3] };
  }
  return rgb;
};

const decurrencify = amount => {
  return parseFloat(amount.replace(/[^\d\.]/g, '')) || 0;
};
