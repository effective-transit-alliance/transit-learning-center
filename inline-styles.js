// Inline computed styles for static rendering (librsvg compatibility)
(function() {
  const svg = document.querySelector('svg');
  const props = ['fill', 'stroke', 'background-color'];
  svg.querySelectorAll('*').forEach(el => {
    const computed = getComputedStyle(el);
    props.forEach(prop => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== '') {
        el.style.setProperty(prop, value);
      }
    });
  });
  // Also inline on svg itself
  const svgComputed = getComputedStyle(svg);
  svg.style.backgroundColor = svgComputed.backgroundColor;
})();
