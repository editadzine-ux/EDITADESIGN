document.querySelectorAll('[data-edita-image]').forEach(group => {
  const input = group.querySelector('input');
  const preview = group.querySelector('img');
  const clear = group.querySelector('[data-clear]');
  group.querySelector('[data-select]').addEventListener('click', () => {
    const picker = wp.media({title: group.querySelector('legend').textContent, button: {text: 'בחירה'}, library: {type: 'image'}, multiple: false});
    picker.on('select', () => {
      const image = picker.state().get('selection').first().toJSON();
      input.value = image.id;
      preview.src = image.sizes?.thumbnail?.url || image.url;
      preview.hidden = clear.hidden = false;
    });
    picker.open();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    preview.removeAttribute('src');
    preview.hidden = clear.hidden = true;
  });
});
