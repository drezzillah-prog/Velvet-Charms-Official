// Automatic currency conversion
document.querySelectorAll('.price').forEach(el => {
    const basePrice = parseFloat(el.dataset.base);
    const userRegion = navigator.language || 'en-US';

    let price = basePrice;
    if(userRegion.startsWith('de')) price = (basePrice * 0.92).toFixed(2); // EUR approx
    if(userRegion.startsWith('ro')) price = (basePrice * 4.4).toFixed(2); // RON approx

    el.textContent = `$${price}`;
});

// Snowflakes
const canvas = document.getElementById('snowfall');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');
let flakes = [];

for(let i=0; i<100; i++){
    flakes.push({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r: Math.random()*4+1,
        d: Math.random()*1
    });
}

function drawFlakes(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    for(let i=0;i<flakes.length;i++){
        let f = flakes[i];
        ctx.moveTo(f.x,f.y);
        ctx.arc(f.x,f.y,f.r,0,Math.PI*2,true);
    }
    ctx.fill();
    moveFlakes();
}

let angle = 0;
function moveFlakes(){
    angle += 0.01;
    for(let i=0;i<flakes.length;i++){
        let f = flakes[i];
        f.y += Math.cos(angle + f.d) + 1 + f.r/2;
        f.x += Math.sin(angle) * 2;

        if(f.y > canvas.height){
            flakes[i] = {x: Math.random()*canvas.width, y: 0, r:f.r, d:f.d};
        }
    }
    requestAnimationFrame(drawFlakes);
}

drawFlakes();
