// COLLEZ VOTRE NOUVELLE URL GOOGLE SCRIPT ICI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2rzueLuVv-3DymTIX1w0H1XmFqLaYmDhe05b0_I5ExEYJHZvBT5F2Lj9icU_iTTSIug/exec"; 

let participants = [];
let currentRotation = 0;
let isSpinning = false;

const wheelColors = ['#800020', '#FBF8F3', '#D4AF37', '#A52A2A', '#F5DEB3', '#5a0016', '#C0C0C0', '#8B4513', '#FFD700', '#CD5C5C'];

$(document).ready(function() {
    loadParticipants();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') showPage('admin-page');
    else showPage('registration-page');
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
    if(pageId === 'admin-page' || pageId === 'draw-page') loadParticipants();
}

function loadParticipants() {
    // On utilise fetch simple
    fetch(SCRIPT_URL + "?action=read")
    .then(res => res.json())
    .then(data => {
        if(data.result === "success") {
            participants = data.data;
            updateParticipantsTable();
            if(!isSpinning) drawWheel();
        }
    })
    .catch(err => console.error("Erreur lecture:", err));
}

function handleRegistration(e) {
    e.preventDefault();
    const $btn = $('#registration-form button[type="submit"]');
    const originalText = $btn.text();
    $btn.text("Envoi...").prop('disabled', true);

    const data = {
        action: "add",
        prenom: $('#prenom').val().trim(),
        nom: $('#nom').val().trim(),
        email: $('#email').val().trim()
    };

    if(!data.prenom || !data.nom) {
        alert("Remplissez nom et prénom");
        $btn.text(originalText).prop('disabled', false);
        return;
    }

    // ASTUCE : no-cors permet de contourner le blocage GitHub -> Google
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(() => {
        $('#registration-form')[0].reset();
        $('#confirmation-message').removeClass('hidden');
        setTimeout(() => $('#confirmation-message').addClass('hidden'), 3000);
        setTimeout(loadParticipants, 2000); // Rafraichir après 2s
        $btn.text(originalText).prop('disabled', false);
    })
    .catch(err => {
        alert("Erreur connexion");
        $btn.text(originalText).prop('disabled', false);
    });
}

function resetAll() {
    if(!confirm('Tout effacer ?')) return;
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "reset" })
    }).then(() => {
        loadParticipants();
        $('#participants-table-container').addClass('hidden');
    });
}

// --- LOGIQUE ROUE (Inchangée) ---
function toggleParticipantsTable() { $('#participants-table-container').toggleClass('hidden'); if (!$('#participants-table-container').hasClass('hidden')) updateParticipantsTable(); }
function updateParticipantsTable() { $('#participants-body').empty(); $('#participant-count').text(participants.length); $.each(participants, function(i, p) { $('#participants-body').append(`<tr><td>${i+1}</td><td>${p.prenom}</td><td>${p.nom}</td><td>${p.email}</td></tr>`); }); }
function startDraw() { if (participants.length < 2) { alert('Il faut 2 participants min !'); return; } if (isSpinning) return; $('#start-spin-btn').addClass('hidden'); isSpinning = true; spinWheel(); }
function drawWheel() { const canvas = $('#wheel')[0]; if (!canvas) return; const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height; const r = Math.min(w, h)/2 - 10; ctx.clearRect(0,0,w,h); if(participants.length===0) { ctx.beginPath(); ctx.arc(w/2,h/2,r,0,Math.PI*2); ctx.fillStyle='#eee'; ctx.fill(); return; } const slice = (Math.PI*2)/participants.length; $.each(participants, function(i){ ctx.beginPath(); ctx.moveTo(w/2,h/2); ctx.arc(w/2,h/2,r,i*slice,(i+1)*slice); ctx.closePath(); ctx.fillStyle=wheelColors[i%wheelColors.length]; ctx.fill(); ctx.stroke(); }); }
function spinWheel() { const dur=15000, start=Date.now(), rotTotal=15, rotStart=currentRotation, rotTarget=rotStart+(rotTotal*Math.PI*2)+(Math.random()*Math.PI*2); function anim(){ const p=Math.min((Date.now()-start)/dur,1), ease=1-Math.pow(1-p,3); currentRotation=rotStart+(rotTarget-rotStart)*ease; drawWheelWithRotation(currentRotation); if(p<1) requestAnimationFrame(anim); else { isSpinning=false; showWinner(currentRotation); } } anim(); }
function drawWheelWithRotation(rot) { const c=$('#wheel')[0], x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height); x.save(); x.translate(c.width/2,c.height/2); x.rotate(rot); x.translate(-c.width/2,-c.height/2); drawWheel(); x.restore(); }
function showWinner(rot) { const slice=(Math.PI*2)/participants.length, norm=rot%(Math.PI*2), angle=(3*Math.PI/2 - norm + Math.PI*2)%(Math.PI*2), idx=Math.floor(angle/slice)%participants.length, w=participants[idx]; $('#winner-name').text(`${w.prenom} ${w.nom}`); $('#winner-overlay').removeClass('hidden'); createConfetti(); }
function closeWinnerOverlay() { $('#winner-overlay').addClass('hidden'); $('#start-spin-btn').removeClass('hidden'); currentRotation=0; drawWheel(); }
function createConfetti() { const cols=['#800020','#D4AF37','#FBF8F3']; for(let i=0;i<80;i++){ const d=$('<div></div>').css({position:'fixed',width:'10px',height:'10px',bg:cols[i%3],left:Math.random()*100+'vw',top:'-10px',zIndex:2000,borderRadius:Math.random()>0.5?'50%':'0'}); $('body').append(d); d.animate({top:'100vh'},2000+Math.random()*2000,function(){$(this).remove();}); } }
