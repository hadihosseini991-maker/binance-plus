// ----------------------------
// Crypto Slider
// ----------------------------
let currentSlide = 0;
const slides = document.querySelectorAll('.crypto-slide');
const slideInterval = 5000;

function showSlide(index) {
    if (!slides.length) return;
    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');
}

function nextSlide() {
    if (!slides.length) return;
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

// Start the slider
if (slides.length) setInterval(nextSlide, slideInterval);

// ----------------------------
// Traders Ticker
// ----------------------------
const tradersTrack = document.getElementById('tradersTrack');
const tickerPrev = document.getElementById('tickerPrev');
const tickerNext = document.getElementById('tickerNext');
let tickerPosition = 0;

function updateTicker() {
    if (!tradersTrack) return;

    const trackWidth = tradersTrack.scrollWidth;
    const containerWidth = tradersTrack.parentElement.offsetWidth;

    // Prevent overscrolling
    if (tickerPosition > 0) tickerPosition = 0;
    if (Math.abs(tickerPosition) > trackWidth - containerWidth) {
        tickerPosition = -(trackWidth - containerWidth);
    }

    tradersTrack.style.transform = `translateX(${tickerPosition}px)`;
}

if (tickerNext) tickerNext.addEventListener('click', () => {
    tickerPosition -= 300;
    updateTicker();
});

if (tickerPrev) tickerPrev.addEventListener('click', () => {
    tickerPosition += 300;
    updateTicker();
});

// ----------------------------
// Copy Referral Link
// ----------------------------
const copyButtons = document.querySelectorAll('.copy-btn');

copyButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
        const parent = event.currentTarget.closest('.referral-link');
        if (!parent) return;

        const link = parent.querySelector('code');
        if (!link) return;

        const textArea = document.createElement('textarea');
        textArea.value = link.textContent.trim();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        // Show copied message
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
});

// ----------------------------
// Optional: Refresh Crypto Prices (if backend provides API endpoint)
// ----------------------------
// Example: Fetch new crypto prices every 30 seconds
// Make sure your backend API returns an array like:
// [{ symbol: 'BTC', price: 30000, change: 1.2 }, ...]
/*
async function refreshCryptoPrices() {
    try {
        const response = await fetch('/api/crypto-prices'); // Replace with your API endpoint
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const items = document.querySelectorAll('.crypto-item');

        data.forEach((crypto, index) => {
            const item = items[index];
            if (!item) return;

            const priceEl = item.querySelector('.crypto-price .price');
            const changeEl = item.querySelector('.crypto-price .change');
            if (!priceEl || !changeEl) return;

            priceEl.textContent = `$${crypto.price.toLocaleString()}`;
            changeEl.className = `change ${crypto.change >= 0 ? 'positive' : 'negative'}`;
            changeEl.innerHTML = `<i class="fas fa-${crypto.change >= 0 ? 'caret-up' : 'caret-down'}"></i> ${Math.abs(crypto.change)}%`;
        });
    } catch (err) {
        console.error('Failed to refresh crypto prices:', err);
    }
}

// Uncomment to refresh prices every 30 seconds
// setInterval(refreshCryptoPrices, 30000);
*/
