(()=>{
const menu=document.querySelector('.hamburger'),nav=document.getElementById('navLinks');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');menu.focus();}});}
document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>{const open=q.getAttribute('aria-expanded')==='true';document.querySelectorAll('.faq-q').forEach(other=>{other.setAttribute('aria-expanded','false');const a=document.getElementById(other.getAttribute('aria-controls'));if(a)a.hidden=true;other.closest('.faq-item')?.classList.remove('open');});if(!open){q.setAttribute('aria-expanded','true');document.getElementById(q.getAttribute('aria-controls')).hidden=false;q.closest('.faq-item').classList.add('open');}}));
/* Responsive phone CTA labels. */
document.querySelectorAll('a[href^="tel:"]').forEach(link=>{
 if(!/call now/i.test(link.textContent))return;
 const phone=link.getAttribute('href').replace(/[^0-9]/g,'');
 if(phone!=='4093639868'&&phone!=='14093639868')return;
 const desktop=document.createElement('span');
 desktop.className='ftgu-phone-desktop';desktop.textContent='📞 (409) 363-9868';
 const mobile=document.createElement('span');
 mobile.className='ftgu-phone-mobile';mobile.textContent='📞 CALL NOW';
 link.replaceChildren(desktop,mobile);
});
})();