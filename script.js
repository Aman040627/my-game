// ===== Константы элементов =====
const startBtn = document.getElementById('startBtn');
const intro = document.getElementById('intro');
const game = document.getElementById('game');
const playerNameInput = document.getElementById('playerName');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const playerInfo = document.getElementById('player-info');
const scoreEl = document.getElementById('score');
const productList = document.getElementById('productList');
const shelfSlots = document.getElementById('shelfSlots');
const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetLevel');

// ===== Игровые переменные =====
let playerName = localStorage.getItem('playerName') || '';
let score = Number(localStorage.getItem('score') || 0);

// ===== Звуки =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq = 440, duration = 0.12, type = 'sine') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    g.gain.value = 0.08;
    o.start();
    setTimeout(() => { o.stop(); }, duration * 1000);
}
function playSuccess() { playTone(660, 0.12, 'sine'); playTone(880, 0.08, 'sine'); }
function playError() { playTone(180, 0.18, 'sawtooth'); }

// ===== Данные миссии (только один уровень) =====
const MISSION = {
    title: 'Молочные продукты',
    desc: 'Разместите товары по FIFO и проверяйте срок годности.',
    products: [
        { id: 'm1', name: 'Молоко', arrival: '2025-06-10', expiry: '2025-08-01', img: 'images/milk_pack.png' },
        { id: 'm2', name: 'Йогурт', arrival: '2025-07-01', expiry: '2025-07-20', img: 'images/milk_gallon.png' },
        { id: 'm3', name: 'Сметана', arrival: '2025-06-20', expiry: '2025-07-25', img: 'images/plain_yogurt.png' },
        { id: 'm4', name: 'Кефир', arrival: '2025-07-05', expiry: '2025-08-05', img: 'images/milk_bottle.png' },
        { id: 'm5', name: 'Сыр', arrival: '2025-06-15', expiry: '2025-09-01', img: 'images/white_cheese_piece.png' }
    ]
};

// ===== Функции =====
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function nowDate() { return new Date('2025-08-01'); }

function openGame() {
    playerName = playerNameInput.value.trim() || playerName || 'Гость';
    localStorage.setItem('playerName', playerName);
    playerNameDisplay.textContent = playerName;
    playerInfo.textContent = playerName;
    scoreEl.textContent = score;
    intro.classList.add('hidden');
    game.classList.remove('hidden');
    loadMission();
}

function createProductElem(prod) {
    const el = document.createElement('div');
    el.className = 'product';
    el.dataset.id = prod.id;
    el.dataset.arrival = prod.arrival;
    el.dataset.expiry = prod.expiry;
    el.dataset.name = prod.name;
    el.innerHTML = `
        <img src="${prod.img}" alt="${prod.name}" class="product-icon">
        <div class="info">
            <div><strong>${prod.name}</strong></div>
            <div class="date">Поступил: ${formatDate(prod.arrival)} · Срок: ${formatDate(prod.expiry)}</div>
        </div>`;
    attachDragHandlers(el);
    return el;
}

function loadMission() {
    productList.innerHTML = '';
    shelfSlots.innerHTML = '';
    const src = MISSION.products.slice();
    for (let i = src.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [src[i], src[j]] = [src[j], src[i]];
    }
    src.forEach(p => productList.appendChild(createProductElem(p)));
    for (let i = 0; i < src.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'shelf-slot';
        slot.dataset.slot = i;
        slot.innerHTML = `<div class="meta">Слот ${i + 1}</div>`;
        shelfSlots.appendChild(slot);
    }
}

function attachDragHandlers(elem) {
    let pointerId = null, ox, oy, draggingClone = null, originalParent = null, originalNext = null;

    elem.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        elem.setPointerCapture(e.pointerId);
        pointerId = e.pointerId;
        const rect = elem.getBoundingClientRect();
        ox = e.clientX - rect.left;
        oy = e.clientY - rect.top;
        draggingClone = elem.cloneNode(true);
        draggingClone.style.position = 'fixed';
        draggingClone.style.left = (e.clientX - ox) + 'px';
        draggingClone.style.top = (e.clientY - oy) + 'px';
        draggingClone.style.zIndex = 9999;
        draggingClone.style.pointerEvents = 'none';
        draggingClone.classList.add('dragging');
        document.body.appendChild(draggingClone);
        originalParent = elem.parentElement;
        originalNext = elem.nextElementSibling;
        elem.style.opacity = '0.35';
    });

    window.addEventListener('pointermove', (e) => {
        if (pointerId !== null && draggingClone) {
            draggingClone.style.left = (e.clientX - ox) + 'px';
            draggingClone.style.top = (e.clientY - oy) + 'px';
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (pointerId === null) return;
        pointerId = null;
        if (draggingClone) draggingClone.remove();
        elem.style.opacity = '';
        const drop = document.elementFromPoint(e.clientX, e.clientY);
        const slot = drop && drop.closest && drop.closest('.shelf-slot');
        if (slot) {
            slot.innerHTML = '';
            slot.appendChild(elem);
            elem.classList.add('bounce');
            setTimeout(() => elem.classList.remove('bounce'), 450);
            playSuccess();
        } else {
            if (originalParent) {
                if (originalNext) originalParent.insertBefore(elem, originalNext);
                else originalParent.appendChild(elem);
            }
            playError();
        }
    });
}

function validateShelf() {
    const slots = Array.from(shelfSlots.querySelectorAll('.shelf-slot'));
    let valid = true;
    let prevArrival = null;
    const now = nowDate();

    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const prod = slot.querySelector('.product');
        if (!prod) {
            alert(`❗ Слот ${i + 1} пуст. Заполните все слоты.`);
            playError();
            return;
        }
        const arrival = new Date(prod.dataset.arrival);
        const expiry = new Date(prod.dataset.expiry);
        if (expiry < now) {
            alert(`❌ "${prod.dataset.name}" просрочен!`);
            prod.remove();
            score = Math.max(0, score - 5);
            updateScore();
            playError();
            valid = false;
            return;
        }
        if (prevArrival && arrival < prevArrival) {
            alert(`❌ Нарушен FIFO: "${prod.dataset.name}" в слоте ${i + 1} пришёл раньше, чем в предыдущем.`);
            score = Math.max(0, score - 5);
            updateScore();
            playError();
            valid = false;
            return;
        }
        prevArrival = arrival;
    }
    if (valid) {
        alert('✅ Отлично! Все товары размещены по FIFO и свежие.');
        score += 10;
        updateScore();
        playSuccess();
    }
}

function updateScore() {
    scoreEl.textContent = score;
    localStorage.setItem('score', score);
}

// ===== Слушатели =====
startBtn.addEventListener('click', openGame);
checkBtn.addEventListener('click', validateShelf);
resetBtn.addEventListener('click', loadMission);

// ===== Инициализация =====
(function init() {
    if (playerName) playerNameInput.value = playerName;
    playerInfo.textContent = playerName || 'Гость';
    scoreEl.textContent = score;
    loadMission();

})();

