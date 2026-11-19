/* Unlisted "Share lab news" form (news-submit.html). Sends each submission by email through FormSubmit
   (https://formsubmit.co) to the address in data-inbox. One-time setup: the first submission sends an activation
   email to that inbox; click "Activate Form" in it. Afterwards FormSubmit offers a random alias: put it in
   data-endpoint (https://formsubmit.co/ajax/<alias>) and remove data-inbox to keep the address out of the HTML. */
(function () {
  'use strict';
  var form = document.getElementById('news-form');
  if (!form) return;
  var status = form.querySelector('.form__status');
  var button = form.querySelector('button[type="submit"]');
  var inbox = form.getAttribute('data-inbox') || 'cs-patent@ua.edu';
  var endpoint = form.getAttribute('data-endpoint') || ('https://formsubmit.co/ajax/' + inbox);

  function show(kind, html) {
    status.className = 'form__status form__status--' + kind;
    status.innerHTML = html;
    status.hidden = false;
    status.scrollIntoView({ block: 'nearest' });
  }
  function fields() {
    var f = new FormData(form), d = {};
    ['name', 'email', 'type', 'date', 'headline', 'people', 'link', 'notes', '_honey'].forEach(function (k) { d[k] = (f.get(k) || '').trim(); });
    return d;
  }
  function body(d) {
    return 'Type: ' + d.type + '\nDate: ' + d.date + '\nHeadline: ' + d.headline + '\nPeople: ' + (d.people || '-') +
      '\nLink: ' + (d.link || '-') + '\nNotes: ' + (d.notes || '-') + '\n\nSubmitted by ' + d.name + ' (' + d.email + ')';
  }
  function mailtoFallback(d) {
    return 'mailto:' + inbox + '?subject=' + encodeURIComponent('[PATENT news] ' + d.type + ': ' + d.headline) + '&body=' + encodeURIComponent(body(d));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var d = fields();
    if (d._honey) return; // filled by a bot
    button.disabled = true; button.textContent = 'Sending…'; status.hidden = true;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type: d.type, date: d.date, headline: d.headline, people: d.people, link: d.link, notes: d.notes,
        submitted_by: d.name, email: d.email,
        _subject: '[PATENT news] ' + d.type + ': ' + d.headline, _replyto: d.email, _template: 'table', _captcha: 'false'
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
      if (String(res.success) === 'true') {
        var keep = { name: d.name, email: d.email };
        form.reset();
        form.querySelector('input[name="name"]').value = keep.name;
        form.querySelector('input[name="email"]').value = keep.email;
        show('ok', '<strong>Thanks, your news item was sent.</strong> It will appear on the site once it\'s reviewed. You can submit another one below.');
        form.querySelector('select[name="type"]').focus();
      } else {
        show('warn', 'We couldn\'t send that automatically' + (res.message ? ' (' + String(res.message).replace(/</g, '&lt;') + ')' : '') +
          '. <a href="' + mailtoFallback(d) + '">Send it by email instead</a>; everything you typed will be filled in.');
      }
    }).catch(function () {
      show('warn', 'The form service didn\'t respond. <a href="' + mailtoFallback(d) + '">Send it by email instead</a>; everything you typed will be filled in.');
    }).then(function () { button.disabled = false; button.textContent = 'Send news item'; });
  });
})();
