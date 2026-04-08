// CONFIGURATION GITHUB
const GITHUB_TOKEN = "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"; 
const GITHUB_USER = "Jmtamayocruz"; // Ex: jmtamayocruz
const GITHUB_REPO = "tirage-au-sort";
const GITHUB_BRANCH = "main"; // ou 'master' selon votre dépôt
const DATA_FILE = "data.json";

let participants = [];
let currentRotation = 0;
let isSpinning = false;
let isUpdating = false; // Évite les conflits d'écriture

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
    
    // Rafraichir automatiquement toutes les 5 secondes si on est sur la page Admin ou Tirage
    setInterval(() => {
        if(!isSpinning && !isUpdating) loadParticipants();
    }, 5000);
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

// --- LECTURE ÉCRITURE GITHUB API ---

async function loadParticipants() {
    if(isUpdating) return;
    try {
        // On ajoute un timestamp pour forcer GitHub à ne pas donner une version cachée
        const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}?t=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error("Erreur lecture");
        
        const data = await response.json();
        // Le contenu est en Base64, on le décode
        const content = atob(data.content);
        participants = JSON.parse(content);
        
        updateParticipantsTable();
        if(!isSpinning) drawWheel();
        
    } catch (error) {
        console.error("Erreur chargement:", error);
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    if(isUpdating) { alert("Mise à jour en cours, patientez..."); return; }
    
    const $btn = $('#registration-form button[type="submit"]');
    const originalText = $btn.text();
    $btn.text("Envoi...").prop('disabled', true);
    isUpdating = true;

    const newParticipant = {
        id: Date.now(), // ID unique basé sur l'heure
        prenom: $('#prenom').val().trim(),
        nom: $('#nom').val().trim(),
        email: $('#email').val().trim(),
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Récupérer le fichier actuel et son "sha" (nécessaire pour modifier)
        const urlGet = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
        const resGet = await fetch(urlGet, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const fileData = await resGet.json();
        
        // 2. Ajouter le nouveau participant
        participants.push(newParticipant);
        const newContent = JSON.stringify(participants);
        
        // 3. Envoyer la modification (PUT)
        const urlPut = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
        const resPut = await fetch(urlPut, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Nouveau participant: " + newParticipant.prenom,
                content: btoa(newContent), // Encoder en Base64
                sha: fileData.sha // Version actuelle pour éviter conflits
            })
        });

        if (!resPut.ok) throw new Error("Erreur écriture");

        $('#registration-form')[0].reset();
        $('#confirmation-message').removeClass('hidden');
        setTimeout(() => $('#confirmation-message').addClass('hidden'), 3000);
        loadParticipants();

    } catch (error) {
        console.error(error);
        alert("Erreur lors de l'inscription. Vérifiez la console (F12).");
    } finally {
        isUpdating = false;
        $btn.text(originalText).prop('disabled', false);
    }
}

async function resetAll() {
    if(!confirm('Supprimer TOUS les participants ?')) return;
    if(isUpdating) return;
    isUpdating = true;

    try {
        const urlGet = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
        const resGet = await fetch(urlGet, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
        const fileData = await resGet.json();

        const urlPut = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
        await fetch(urlPut, {
            method: 'PUT',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Reset complet",
                content: btoa("[]"), // Tableau vide
                sha: fileData.sha
            })
        });
        loadParticipants();
        $('#participants-table-container').addClass('hidden');
    } catch (e) {
        alert("Erreur reset");
    } finally {
        isUpdating = false;
    }
}

// --- LOGIQUE ROUE & AFFICHAGE (Inchangée) ---
function toggleParticipantsTable() { $('#participants-table-container').toggleClass('hidden'); if (!$('#participants-table-container').hasClass('hidden')) updateParticipantsTable(); }
function updateParticipantsTable() { $('#participants-body').empty(); $('#participant-count').text(participants.length); $.each(participants, function(i, p) { $('#participants-body').append(`<tr><td>${i+1}</td><td>${p.prenom}</td><td>${p.nom}</td><td>${p.email}</td></tr>`); }); }
function startDraw() { if (participants.length < 2) { alert('Il faut au moins 2 participants !'); return; } if (isSpinning) return; $('#start-spin-btn').addClass('hidden'); isSpinning = true; spinWheel(); }
function drawWheel() { const canvas = $('#wheel')[0]; if (!canvas) return; const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height; const r = Math.min(w, h)/2 - 10; ctx.clearRect(0,0,w,h); if(participants.length===0) { ctx.beginPath(); ctx.arc(w/2,h/2,r,0,Math.PI*2); ctx.fillStyle='#eee'; ctx.fill(); return; } const slice = (Math.PI*2)/participants.length; $.each(participants, function(i){ ctx.beginPath(); ctx.moveTo(w/2,h/2); ctx.arc(w/2,h/2,r,i*slice,(i+1)*slice); ctx.closePath(); ctx.fillStyle=wheelColors[i%wheelColors.length]; ctx.fill(); ctx.stroke(); }); }
function spinWheel() { const dur=15000, start=Date.now(), rotTotal=15, rotStart=currentRotation, rotTarget=rotStart+(rotTotal*Math.PI*2)+(Math.random()*Math.PI*2); function anim(){ const p=Math.min((Date.now()-start)/dur,1), ease=1-Math.pow(1-p,3); currentRotation=rotStart+(rotTarget-rotStart)*ease; drawWheelWithRotation(currentRotation); if(p<1) requestAnimationFrame(anim); else { isSpinning=false; showWinner(currentRotation); } } anim(); }
function drawWheelWithRotation(rot) { const c=$('#wheel')[0], x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height); x.save(); x.translate(c.width/2,c.height/2); x.rotate(rot); x.translate(-c.width/2,-c.height/2); drawWheel(); x.restore(); }
function showWinner(rot) { const slice=(Math.PI*2)/participants.length, norm=rot%(Math.PI*2), angle=(3*Math.PI/2 - norm + Math.PI*2)%(Math.PI*2), idx=Math.floor(angle/slice)%participants.length, w=participants[idx]; $('#winner-name').text(`${w.prenom} ${w.nom}`); $('#winner-overlay').removeClass('hidden'); createConfetti(); }
function closeWinnerOverlay() { $('#winner-overlay').addClass('hidden'); $('#start-spin-btn').removeClass('hidden'); currentRotation=0; drawWheel(); }
function createConfetti() { const cols=['#800020','#D4AF37','#FBF8F3']; for(let i=0;i<80;i++){ const d=$('<div></div>').css({position:'fixed',width:'10px',height:'10px',bg:cols[i%3],left:Math.random()*100+'vw',top:'-10px',zIndex:2000,borderRadius:Math.random()>0.5?'50%':'0'}); $('body').append(d); d.animate({top:'100vh'},2000+Math.random()*2000,function(){$(this).remove();}); } }
