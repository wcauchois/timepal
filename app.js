const DateTime = luxon.DateTime;

const mainInput = document.getElementById('mainInput');
const displayContainer = document.getElementById('displayContainer');

mainInput.addEventListener('keyup', () => refreshDisplay());

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
  mouseX = e.pageX;
  mouseY = e.pageY;
});

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  toast.style.left = `${mouseX}px`;
  toast.style.top = `${mouseY}px`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
function copyToClipboard(str) {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

const luxonParsers = [
  [x => DateTime.fromISO(x), `ISO 8601 string`],
  [x => DateTime.fromHTTP(x), `HTTP header date`],
  [x => DateTime.fromRFC2822(x), `RFC 2822 string`],
  [x => {
    const parsed = Date.parse(x);
    if (parsed !== NaN) {
      return DateTime.fromMillis(parsed);
    } else {
      return DateTime.invalid(`Failed to parse`);
    }
  }, `Generic JavaScript date parse`]
];

const numberRegex = /^[0-9]+$/;
const nowRegex = /^now(-[0-9mhsd,]+)?$/;
const unitRegex = /^([0-9]+)([mhsd])$/;

function refreshDisplay() {
  const value = mainInput.value.trim();

  if (value === '') {
    displayContainer.innerHTML = '';
    return;
  }

  let interp;
  let luxonValue;
  let nowMatch;
  if (nowMatch = value.match(nowRegex)) {
    const minusPart = nowMatch[1];
    interp = `Now${minusPart || ''}`;
    luxonValue = DateTime.local();
    if (minusPart) {
      const timeParts = minusPart.substring(1).split(',');
      for (const timePart of timeParts) {
        const unitMatch = timePart.match(unitRegex);
        if (!unitMatch) {
          luxonValue = DateTime.invalid(`Bad units`);
          break;
        }
        const scalar = parseInt(unitMatch[1]);
        const unit = unitMatch[2];
        const keyForUnit = ({
          'h': 'hours',
          'm': 'minutes',
          'd': 'days',
          's': 'seconds'
        })[unit];
        const duration = {};
        duration[keyForUnit] = scalar;
        luxonValue = luxonValue.minus(duration);
      }
    }
  } if (numberRegex.test(value)) {
    interp = `Millisecond value since epoch`;
    luxonValue = DateTime.fromMillis(parseInt(value));
  } else {
    for (const [parser, desc] of luxonParsers) {
    console.log('evaluating ', desc);
      const parsed = parser(value);
      console.log('parsed', parsed);
      if (parsed.isValid) {
        luxonValue = parsed;
        interp = desc;
        break;
      }
    }
  }

  const isValid = !!(luxonValue && luxonValue.isValid);
  let content;
  if (isValid) {
    const friendlyFormat = `LLLL d, yyyy h:mm:ss.SSS a ZZZZ`;
    const utcFormat = `yyyy-LL-dd HH:mm:ss.SSS ZZZZ`;
    const momentValue = moment(luxonValue.toJSDate());
    const rows = [
      ['Interpretation', interp],
      ['In your time zone', luxonValue.toLocal().toFormat(friendlyFormat)],
      ['Millis since epoch', luxonValue.toMillis()],
      ['UTC', luxonValue.toUTC().toFormat(utcFormat)],
      ['IANA zone', `${luxonValue.toFormat('z')} (${luxonValue.offset / 60})`],
      ['ISO 8601', luxonValue.toISO()],
      ['Relative to now', momentValue.fromNow()],
    ];
    let tableBody = '';
    for (const row of rows) {
      row[row.length - 1] = `
        <span class="cellContent">${row[row.length - 1]}</span>
        <a href="#" class="button copyButton">
          <img src="copy_icon.svg" height="14">
        </a>
      `;
      tableBody += '<tr>\n';
      for (const col of row) {
        tableBody += `<td>${col}</td>\n`;
      }
      tableBody += '</tr>\n';
    }
    content = `
      <table class="u-full-width">
        <tbody>
          ${tableBody}
        </tbody>
      </table>
    `;
  } else {
    content = `
      <center>
        <h1 style="color: red; font-size: 24px;">Invalid date value</h1>
      </center>
    `;
  }
  displayContainer.innerHTML = content;

  function copyListener(e) {
    e.preventDefault();
    const text = e.currentTarget.parentNode.querySelector('.cellContent').textContent;
    copyToClipboard(text);
    showToast('Copied');
  }

  for (const copyButton of displayContainer.querySelectorAll('.copyButton')) {
    copyButton.addEventListener('click', copyListener);
  }
}

function getQueryVariable(name) {
  const query = window.location.search.substring(1);
  const kvs = query.split('&');
  for (const kv of kvs) {
    const [key, value] = kv.split('=');
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

const query = getQueryVariable('q');
if (query !== null) {
  mainInput.value = query;
  refreshDisplay();
} else {
  mainInput.focus();
}
