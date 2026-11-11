/* Contact form: sends through FormSubmit (https://formsubmit.co) to the lab inbox.
   One-time setup: the first submission sends an activation email to the inbox below; click "Activate Form" in it.
   Optional: after activation FormSubmit gives a random alias. Put it in data-endpoint to keep the address out of the HTML. */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = form.querySelector('.form__status');
  var button = form.querySelector('button[type="submit"]');
  var inbox = form.getAttribute('data-inbox') || 'cs-patent@ua.edu';
  var endpoint = form.getAttribute('data-endpoint') || ('https://formsubmit.co/ajax/' + inbox);

  function show(kind, html) {
    status.className = 'form__status form__status--' + kind;
    status.innerHTML = html;
    status.hidden = false;
  }
  function mailtoFallback(data) {
    var body = encodeURIComponent(data.message + '\n\n— ' + data.name + (data.affiliation ? ', ' + data.affiliation : '') + ' (' + data.email + ')');
    return 'mailto:' + inbox + '?subject=' + encodeURIComponent('[PATENT website] ' + data.topic) + '&body=' + body;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var f = new FormData(form);
    if (f.get('_honey')) return; // filled by a bot
    var data = {
      name: (f.get('name') || '').trim(), email: (f.get('email') || '').trim(), affiliation: (f.get('affiliation') || '').trim(),
      topic: f.get('topic') || 'General', message: (f.get('message') || '').trim()
    };
    button.disabled = true; button.textContent = 'Sending…'; status.hidden = true;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: data.name, email: data.email, affiliation: data.affiliation, topic: data.topic, message: data.message,
        _subject: '[PATENT website] ' + data.topic + ' from ' + data.name, _replyto: data.email, _template: 'table', _captcha: 'false'
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
      if (String(res.success) === 'true') {
        form.reset();
        show('ok', '<strong>Thanks, your message is on its way.</strong> We usually reply within a few working days.');
      } else {
        show('warn', 'We couldn\'t send that automatically' + (res.message ? ' (' + res.message.replace(/</g, '&lt;') + ')' : '') +
          '. <a href="' + mailtoFallback(data) + '">Email us directly instead</a>, and your message will be filled in.');
      }
    }).catch(function () {
      show('warn', 'The message service didn\'t respond. <a href="' + mailtoFallback(data) + '">Email us directly instead</a>, and your message will be filled in.');
    }).then(function () { button.disabled = false; button.textContent = 'Send message'; });
  });
})();

/* "Copy coordinates" button on the map card */
(function () {
  'use strict';
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy'), label = btn.textContent;
      var done = function () { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = label; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy these coordinates:', text); });
      else window.prompt('Copy these coordinates:', text);
    });
  });
})();
