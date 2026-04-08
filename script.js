// COLLEZ VOTRE URL ICI (entre guillemets)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDuChdhuhZBoFSAHIXfGx8S66gmk9aALW4WgoFVgXFw52Hox7NE8qYHTCe-rxuFAHnhQ/exec";

let participants = [];
let currentRotation = 0;
let isSpinning = false;

const wheelColors = [
    '#800020', '#FBF8F3', '#D4AF37', '#A52A2A', '#F5DEB3', 
    '#5a0016', '#C0C0C0', '#8B4513', '#FFD700', '#CD5C5C'
];

$(document).ready(function() {
    loadParticipants();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showPage('admin-page');
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
    
    if(pageId === 'admin-page' || pageId === 'draw-page') {
        loadParticipants();
    }
}

// --- FONCTION DE CHARGEMENT (GET) ---
function loadParticipants() {
    // On ajoute un timestamp pour éviter le cache du navigateur
    $.ajax({
        url: SCRIPT_URL + "?action=read&t=" + new Date().getTime(),
        method: "GET",
        dataType: "json",
        success: function(response) {
            if(response && response.result === "success") {
                participants = response.data;
                updateParticipantsTable();
                if(!isSpinning) drawWheel();
            }
        },
        error: function(err) {
            console.error("Erreur lecture:", err);
        }
    });
}

// --- FONCTION D'INSCRIPTION (POST) CORRIGÉE ---
function handleRegistration(e) {
    e.preventDefault();
    
    const $btn = $('#registration-form button[type="submit"]');
    const originalText = $btn.text();
    $btn.text("Envoi...").prop('disabled', true);

    const formData = {
        prenom: $('#prenom').val().trim(),
        nom: $('#nom').val().trim(),
        email: $('#email').val().trim()
    };

    // Validation simple
    if(!formData.prenom || !formData.nom) {
        alert("Veuillez remplir nom et prénom");
        $btn.text(originalText).prop('disabled', false);
        return;
    }

    // Envoi vers Google Script
    // On utilise 'text' comme dataType attendu pour éviter les erreurs CORS de parsing JSON
    $.ajax({
        url: SCRIPT_URL,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            action: "add",
            prenom: formData.prenom,
            nom: formData.nom,
            email: formData.email
        }),
        dataType: "text", // Important pour Google Apps Script
        success: function(response) {
            // Google renvoie parfois du texte HTML autour du JSON, on essaie de cleaner
            try {
                const jsonResponse = JSON.parse(response);
                if(jsonResponse.result === "success") {
                    $('#registration-form')[0].reset();
                    $('#confirmation-message').removeClass('hidden');
                    setTimeout(() => $('#confirmation-message').addClass('hidden'), 4000);
                    loadParticipants(); // Rafraichir la liste
                } else {
                    alert("Erreur: " + (jsonResponse.error || "Inconnue"));
                }
            } catch (e) {
                // Si le parsing échoue mais que ça a marché (cas fréquent avec GAS)
                $('#registration-form')[0].reset();
                $('#confirmation-message').removeClass('hidden');
                setTimeout(() => $('#confirmation-message').addClass('hidden'), 4000);
                loadParticipants();
            }
        },
        error: function(xhr, status, error) {
            console.error("Erreur envoi:", status, error);
            // Souvent une erreur 0 signifie juste un redirect Google, on tente de recharger
            setTimeout(loadParticipants, 2000);
            alert("Inscription envoyée (vérifiez la liste si le message d'erreur persiste).");
        },
        complete: function() {
            $btn.text(originalText).prop('disabled', false);
        }
    });
}

function resetAll() {
    if(confirm('ATTENTION: Supprimer TOUS les participants ?')) {
        $.ajax({
            url: SCRIPT_URL,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ action: "reset" }),
            dataType: "text",
            success: function() {
                loadParticipants();
                $('#participants-table-container').addClass('hidden');
            },
            error: function() { alert("Erreur lors de la réinitialisation."); }
        });
    }
}

// --- AFFICHAGE & ROUE ---
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

function startDraw() {
    if (participants.length < 2) {
        alert('Il faut au moins 2 participants !');
        return;
    }
    if (isSpinning) return;
    
    $('#start-spin-btn').addClass('hidden');
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
    
    ctx.clearRect(0, 0, width, height);

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
    });
}

function spinWheel() {
    const spinDuration = 15000;
    const startTime = Date.now();
    const totalRotations = 15;
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
    const pointerAngle = (3 * Math.PI / 2 - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
    const winningIndex = Math.floor(pointerAngle / sliceAngle) % participants.length;
    
    const winner = participants[winningIndex];
    
    $('#winner-name').text(`${winner.prenom} ${winner.nom}`);
    $('#winner-overlay').removeClass('hidden');
    
    createConfetti();
}

function closeWinnerOverlay() {
    $('#winner-overlay').addClass('hidden');
    $('#start-spin-btn').removeClass('hidden');
    currentRotation = 0;
    drawWheel();
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
