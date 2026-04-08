// Variables globales
let participants = JSON.parse(localStorage.getItem('participants')) || [];
let currentRotation = 0;
let isSpinning = false;

// Couleurs pour la roue (Palette complémentaire Bordeaux/Crème/Or)
const wheelColors = [
    '#800020', '#FBF8F3', '#D4AF37', '#A52A2A', '#F5DEB3', 
    '#5a0016', '#C0C0C0', '#8B4513', '#FFD700', '#CD5C5C'
];

$(document).ready(function() {
    // Gestion de la navigation
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showPage('admin-page');
        updateParticipantsTable();
    } else {
        showPage('registration-page');
    }

    setupEventListeners();
});

function setupEventListeners() {
    $('#registration-form').on('submit', handleRegistration);
    $('#toggle-participants-btn').on('click', toggleParticipantsTable);
    $('#reset-btn').on('click', resetAll);
    $('#go-to-draw-btn').on('click', () => showPage('draw-page'));
    $('#back-to-admin-btn').on('click', () => showPage('admin-page'));
    $('#start-spin-btn').on('click', startDraw);
    $('#close-winner-btn').on('click', closeWinnerOverlay);
}

function showPage(pageId) {
    $('.page').removeClass('active').addClass('hidden');
    $('#' + pageId).removeClass('hidden').addClass('active');
    
    if(pageId === 'admin-page') updateParticipantsTable();
    if(pageId === 'draw-page') drawWheel(); // Redessiner la roue au cas où
}

// --- INSCRIPTION ---
function handleRegistration(e) {
    e.preventDefault();
    const prenom = $('#prenom').val().trim();
    const nom = $('#nom').val().trim();
    const email = $('#email').val().trim();
    
    participants.push({
        id: participants.length + 1,
        prenom, nom, email,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('participants', JSON.stringify(participants));
    
    $('#registration-form')[0].reset();
    $('#confirmation-message').removeClass('hidden');
    setTimeout(() => $('#confirmation-message').addClass('hidden'), 3000);
}

// --- ADMIN ---
function toggleParticipantsTable() {
    $('#participants-table-container').toggleClass('hidden');
    if (!$('#participants-table-container').hasClass('hidden')) {
        updateParticipantsTable();
    }
}

function updateParticipantsTable() {
    $('#participants-body').empty();
    $('#participant-count').text(participants.length);
    
    $.each(participants, function(i, p) {
        $('#participants-body').append(`
            <tr><td>${p.id}</td><td>${p.prenom}</td><td>${p.nom}</td><td>${p.email}</td></tr>
        `);
    });
}

function resetAll() {
    if(confirm('Supprimer TOUS les participants ?')) {
        participants = [];
        localStorage.removeItem('participants');
        updateParticipantsTable();
        $('#participants-table-container').addClass('hidden');
    }
}

// --- ROUE & TIRAGE ---
function startDraw() {
    if (participants.length < 2) {
        alert('Il faut au moins 2 participants pour lancer la roue !');
        return;
    }
    if (isSpinning) return;
    
    $('#start-spin-btn').addClass('hidden'); // Cacher le bouton pendant le spin
    isSpinning = true;
    spinWheel();
}

function drawWheel() {
    const canvas = $('#wheel')[0];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Si pas de participants, roue vide ou grise
    if (participants.length === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#eee';
        ctx.fill();
        return;
    }

    const sliceAngle = (2 * Math.PI) / participants.length;

    $.each(participants, function(index) {
        const startAngle = index * sliceAngle;
        const endAngle = (index + 1) * sliceAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = wheelColors[index % wheelColors.length];
        ctx.fill();
        ctx.stroke();
        // PAS DE TEXTE ici comme demandé
    });
}

function spinWheel() {
    const spinDuration = 15000; // 15 secondes
    const startTime = Date.now();
    const totalRotations = 15; // Plus de rotations pour l'effet
    const startRotation = currentRotation;
    // Aléatoire final
    const targetRotation = startRotation + (totalRotations * 2 * Math.PI) + (Math.random() * 2 * Math.PI);
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        currentRotation = startRotation + (targetRotation - startRotation) * easeOut;
        drawWheelWithRotation(currentRotation);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            showWinner(currentRotation);
        }
    }
    animate();
}

function drawWheelWithRotation(rotation) {
    const canvas = $('#wheel')[0];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    drawWheel();
    ctx.restore();
}

function showWinner(finalRotation) {
    const sliceAngle = (2 * Math.PI) / participants.length;
    const normalizedRotation = finalRotation % (2 * Math.PI);
    // Calcul de l'index gagnant basé sur la flèche en haut (3PI/2)
    const pointerAngle = (3 * Math.PI / 2 - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
    const winningIndex = Math.floor(pointerAngle / sliceAngle) % participants.length;
    
    const winner = participants[winningIndex];
    
    // Affichage Pop-up
    $('#winner-name').text(`${winner.prenom} ${winner.nom}`);
    $('#winner-overlay').removeClass('hidden');
    
    // Confettis (optionnel, gardé simple)
    createConfetti();
}

function closeWinnerOverlay() {
    $('#winner-overlay').addClass('hidden');
    $('#start-spin-btn').removeClass('hidden');
    currentRotation = 0; // Reset visuel si besoin
    drawWheel(); // Redessiner droit
}

function createConfetti() {
    const colors = ['#800020', '#D4AF37', '#FBF8F3', '#ff0000', '#gold'];
    for (let i = 0; i < 80; i++) {
        const conf = $('<div></div>').css({
            position: 'fixed', width: '10px', height: '10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            left: Math.random() * 100 + 'vw', top: '-10px', zIndex: '2000',
            borderRadius: Math.random() > 0.5 ? '50%' : '0'
        });
        $('body').append(conf);
        conf.animate({ top: '100vh', transform: `rotate(${Math.random()*720}deg)` }, {
            duration: 2000 + Math.random() * 2000,
            complete: function() { $(this).remove(); }
        });
    }
}
