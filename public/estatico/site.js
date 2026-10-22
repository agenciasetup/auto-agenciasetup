// O site funciona sem JavaScript. Aqui entram só melhorias: páginas carregadas antes do toque.
if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
  const s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify({ prerender: [{ where: { href_matches: ['/recursos/*', '/novidades/*'] }, eagerness: 'moderate' }] });
  document.head.appendChild(s);
}
