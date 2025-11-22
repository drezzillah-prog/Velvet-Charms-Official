// Automatic currency conversion (USD default)
const priceElements = document.querySelectorAll('.price');

function updatePrices() {
  let userLang = navigator.language || 'en-US';
  let currency = 'USD';
  if(userLang.includes('ro')) currency = 'RON';
  if(userLang.includes('de')) currency = 'EUR';

  priceElements.forEach(el => {
    const usdPrice = parseFloat(el.dataset.usd);
    let displayPrice = usdPrice;

    if(currency === 'EUR') displayPrice = (usdPrice * 0.91).toFixed(2);
    if(currency === 'RON') displayPrice = (usdPrice * 4.65).toFixed(2);

    el.textContent = displayPrice;
  });
}

updatePrices();

// White falling snowflakes
const snowflakeCount = 40;
for(let i=0; i<snowflakeCount; i++){
  let snow = document.createElement('div');
  snow.className = 'snowflake';
  snow.textContent = '❄';
  snow.style.left = Math.random() * window.innerWidth + 'px';
  snow.style.animationDuration = (5 + Math.random() * 10) + 's';
  snow.style.fontSize = (10 + Math.random() * 20) + 'px';
  document.body.appendChild(snow);
}

// Smooth floating effect for snow
function animateSnow() {
  const snowflakes = document.querySelectorAll('.snowflake');
  snowflakes.forEach(s => {
    let top = parseFloat(s.style.top) || -10;
    top += 1 + Math.random()*2;
    if(top > window.innerHeight) top = -10;
    s.style.top = top + 'px';
  });
  requestAnimationFrame(animateSnow);
}
animateSnow();
