// Termos, privacidade e reembolso do curso em inglês (o Stripe pede as três páginas no site de quem vende).
// Texto curto e claro, no mesmo visual escuro do checkout em inglês. Empresa: Agência Setup LTDA, Brasil.
import { esc } from '../nucleo/util.js';

const CONTATO = 'contato@agenciasetup.com.br';

const TEXTOS = {
  termos: ['Terms of use', `
<p>These terms cover the purchase and use of the online courses sold on this site by <b>Agência Setup LTDA</b>, a company registered in Brazil ("we"). By buying or using a course, you agree to them.</p>
<h2>What you get</h2>
<p>A personal, non-transferable license to watch the lessons and use the course kit (recipes, skills, templates and tools) for your own work and your own clients. Access lasts 1 year from the purchase, or for as long as the course exists if you bought lifetime access.</p>
<h2>What you can't do</h2>
<ul><li>Share your login or resell, publish or distribute the lessons or the kit.</li><li>Use the material to create a competing course or product.</li></ul>
<h2>Third-party tools</h2>
<p>The course teaches you to use tools from other companies, such as Claude (a paid plan is required), Google Chrome, Google AI Studio and Magnific. Their prices, terms and availability are set by them, not by us, and they may change.</p>
<h2>Results</h2>
<p>We teach a method that works for us and our students, but results depend on your niche, your audience and your effort. We don't promise a number of followers, sales or income.</p>
<h2>Payments and refunds</h2>
<p>Payments are processed by Stripe, in US dollars. You have a 7-day guarantee: see the <a href="/refunds">refund policy</a>.</p>
<h2>Changes and contact</h2>
<p>We may update the course and these terms. Questions: <a href="mailto:${CONTATO}">${CONTATO}</a>. These terms are governed by the laws of Brazil.</p>`],
  privacidade: ['Privacy policy', `
<p>This policy explains what <b>Agência Setup LTDA</b> ("we") collects when you buy or use a course on this site, and why.</p>
<h2>What we collect</h2>
<ul><li><b>Your name and email</b>, to create your access, send your login link and talk to you about your purchase. If you fill them in at checkout and don't finish, we may send up to two reminders to help you complete it; each one has a link to stop them.</li><li><b>Your progress in the course</b> (lessons watched, files downloaded), to show where you stopped and to improve the lessons.</li><li><b>Where you came from</b> (the link or ad that brought you), to know which content works.</li></ul>
<h2>Payments</h2>
<p>You pay on Stripe's secure page. Your card number never goes through our servers; Stripe processes it under its own privacy policy.</p>
<h2>Cookies and analytics</h2>
<p>We use a cookie to remember the link that brought you here, and we may use the Meta pixel and Google Analytics to measure our ads.</p>
<h2>Who we share it with</h2>
<p>Only the services that run the course: Stripe (payments), Supabase (database and login), Cloudflare (hosting), Bunny (videos) and Resend (emails). We don't sell your data.</p>
<h2>Your rights</h2>
<p>You can ask for a copy of your data, a correction or the deletion of your account at any time: <a href="mailto:${CONTATO}">${CONTATO}</a>.</p>`],
  reembolso: ['Refund policy', `
<p>Every course comes with a <b>7-day guarantee</b>. If you are not happy, ask for a refund within 7 days of your purchase and you get all your money back. No questions asked.</p>
<h2>How to ask</h2>
<ul><li>In the course app: <b>Profile &gt; Purchases &gt; Request a refund</b>.</li><li>Or by email: <a href="mailto:${CONTATO}">${CONTATO}</a>, with the email you used to buy.</li></ul>
<h2>What happens next</h2>
<p>Your access to the course ends when you ask. The refund goes back to the card you paid with, through Stripe, and usually shows up in 5 to 10 business days, depending on your bank. After a refund, the course material (lessons, files and templates) can no longer be used.</p>`],
};

export function paginaLegalEn(qual, marca) {
  const [titulo, corpo] = TEXTOS[qual];
  const nome = (marca && marca.nome) || 'Agência Setup';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · ${esc(nome)}</title><link rel="icon" href="/img/favicon.png" type="image/png"><meta name="theme-color" content="#09090a">
<style>body{margin:0;background:#09090a;color:#e4e4e7;font:16px/1.65 Inter,-apple-system,Segoe UI,Arial,sans-serif}main{max-width:720px;margin:0 auto;padding:32px 20px 64px}a{color:#ffad1f}h1{font-size:30px;line-height:1.15;margin:18px 0 8px;color:#fff}h2{font-size:18px;margin:28px 0 6px;color:#fff}p,li{color:#c9c9d1}.topo{display:flex;align-items:center;gap:10px;font-weight:700;color:#fff;text-decoration:none}.mudo{color:#71717a;font-size:14px}</style>
</head><body><main>
<a class="topo" href="/"><img src="/img/logo-setup-128.png" alt="" width="28" height="28">${esc(nome)}</a>
<h1>${esc(titulo)}</h1><p class="mudo">Last updated: October 30, 2026</p>
${corpo}
</main></body></html>`;
}
