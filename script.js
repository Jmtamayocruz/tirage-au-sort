// Variables globales (Noms conservés identiquement)
let participants = JSON.parse(localStorage.getItem('participants')) || [];
let currentRotation = 0;
let isSpinning = false;

// Cache DOM elements pour performance (équivalent des const précédents)
const $registrationPage = $('#registration-page');
const $adminPage = $('#admin-page');
const $registrationForm = $('#registration-form');
const $confirmationMessage = $('#confirmation-message');
const $participantsTable = $('#participants-table');
const $participantsBody = $('#participants-body');
const $participantCount = $('#participant-count');
const $wheelContainer = $('#wheel-container');
const $wheelCanvas = $('#wheel');
const $winnerDisplay = $('#winner-display');
const $winnerName = $('#winner-name');
const $closeWheelBtn = $('#close-wheel-btn');
const $showParticipantsBtn = $('#show-participants-btn');
const $startDrawBtn = $('#start-draw-btn');
const $resetBtn = $('#reset-btn');

$(document).ready(function() {
    // Vérification mode admin
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showAdminPage();
    }
    
    setupEventListeners();
});

function setupEventListeners() {
    $registrationForm.on('submit', handleRegistration);
    $showParticipantsBtn.on('click', toggleParticipantsTable);
    $startDrawBtn.on('click', startDraw);
    $resetBtn.on('click', resetAll);
    $closeWheelBtn.on('click', closeWheel);
}

function handleRegistration(e) {
    e.preventDefault();
    
    const prenom = $('#prenom').val().trim();
    const nom = $('#nom').val().trim();
    const email = $('#email').val().trim();
    
    const newParticipant = {
        id: participants.length + 1,
        prenom: prenom,
        nom: nom,
        email: email,
        timestamp: new Date().toISOString()
    };
    
    participants.push(newParticipant);
    localStorage.setItem('participants', JSON.stringify(participants));
    
    $registrationForm[0].reset(); // Reset natif du formulaire
    $confirmationMessage.removeClass('hidden');
    
    setTimeout(() => {
        $confirmationMessage.addClass('hidden');
    }, 3000);
}

function showAdminPage() {
    $registrationPage.removeClass('active').addClass('hidden');
    $adminPage.removeClass('hidden').addClass('active');
    updateParticipantsTable();
}

function toggleParticipantsTable() {
    $participantsTable.toggleClass('hidden');
    if (!$participantsTable.hasClass('hidden')) {
        updateParticipantsTable();
    }
}

function updateParticipantsTable() {
    $participantsBody.empty();
    $participantCount.text(participants.length);
    
    // Boucle jQuery plus concise
    $.each(participants, function(index, p) {
        $participantsBody.append(`
            <tr>
                <td>${p.id}</td>
                <td>${p.prenom}</td>
                <td>${p.nom}</td>
                <td>${p.email}</td>
            </tr>
        `);
    });
}

function startDraw() {
    if (participants.length === 0) {
        alert('Aucun participant inscrit !');
        return;
    }
    
    $participantsTable.addClass('hidden');
    $wheelContainer.removeClass('hidden');
    
    drawWheel();
    spinWheel();
}

function drawWheel() {
    const ctx = $wheelCanvas[0].getContext('2d');
    const centerX = $wheelCanvas.width() / 2;
    const centerY = $wheelCanvas.height() / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const sliceAngle = (2 * Math.PI) / participants.length;
    
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
    ];
    
    ctx.clearRect(0, 0, $wheelCanvas.width(), $wheelCanvas.height());

    $.each(participants, function(index, participant) {
        const startAngle = index * sliceAngle;
        const endAngle = (index + 1) * sliceAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.stroke();
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(participant.prenom, radius - 10, 4);
        ctx.restore();
    });
}

function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    
    const spinDuration = 15000; // 15 secondes
    const startTime = Date.now();
    const totalRotations = 10;
    const startRotation = currentRotation;
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
    const ctx = $wheelCanvas[0].getContext('2d');
    ctx.clearRect(0, 0, $wheelCanvas.width(), $wheelCanvas.height());
    
    ctx.save();
    ctx.translate($wheelCanvas.width() / 2, $wheelCanvas.height() / 2);
    ctx.rotate(rotation);
    ctx.translate(-$wheelCanvas.width() / 2, -$wheelCanvas.height() / 2);
    
    drawWheel();
    
    ctx.restore();
}

function showWinner(finalRotation) {
    const sliceAngle = (2 * Math.PI) / participants.length;
    const normalizedRotation = finalRotation % (2 * Math.PI);
    const pointerAngle = (3 * Math.PI / 2 - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
    const winningIndex = Math.floor(pointerAngle / sliceAngle) % participants.length;
    
    const winner = participants[winningIndex];
    
    $winnerName.text(`${winner.prenom} ${winner.nom}`);
    $winnerDisplay.removeClass('hidden');
    $closeWheelBtn.removeClass('hidden');
    
    createConfetti();
}

function closeWheel() {
    $wheelContainer.addClass('hidden');
    $winnerDisplay.addClass('hidden');
    $closeWheelBtn.addClass('hidden');
    $participantsTable.removeClass('hidden');
    currentRotation = 0;
}

function resetAll() {
    if (confirm('Êtes-vous sûr de vouloir supprimer tous les participants ?')) {
        participants = [];
        localStorage.removeItem('participants');
        updateParticipantsTable();
        $wheelContainer.addClass('hidden');
        $winnerDisplay.addClass('hidden');
    }
}

function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = $('<div></div>');
        confetti.css({
            position: 'fixed',
            width: '10px',
            height: '10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            left: Math.random() * 100 + 'vw',
            top: '-10px',
            zIndex: '1000',
            borderRadius: Math.random() > 0.5 ? '50%' : '0'
        });
        
        $('body').append(confetti);
        
        confetti.animate({
            top: '100vh',
            transform: `rotate(${Math.random() * 720}deg)`
        }, {
            duration: 2000 + Math.random() * 2000,
            easing: 'swing',
            complete: function() {
                $(this).remove();
            }
        });
    }
}