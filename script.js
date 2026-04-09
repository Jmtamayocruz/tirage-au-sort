$(document).ready(function() {

    // --- 1. CONFIGURATION ---
    // REMPLACEZ CI-DESSOUS PAR VOTRE URL GOOGLE APPS SCRIPT (doit finir par /exec)
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5-7SByCM6G-fz-oDt9YhCdMoPF0ZpJkawdjj9NRLaPD7GCQKYMHzqBU9BMpndfob24g/exec"; 
    
    let participantsDB = [];
    let isSpinning = false;

    // --- 2. GESTION DES VUES (URL ?mode=wheel) ---
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('mode') === 'wheel') {
        // Si l'URL contient ?mode=wheel, on affiche la roue
        $('#view-form').removeClass('active').addClass('hidden');
        $('#view-wheel').removeClass('hidden').addClass('active');
        
        // On charge les données depuis Google Sheets
        loadParticipants();
        
        // Rafraîchissement automatique toutes les 5 secondes pour voir les nouvelles inscriptions
        setInterval(loadParticipants, 5000);
    } else {
        // Sinon, on affiche le formulaire d'inscription (par défaut)
        $('#view-wheel').removeClass('active').addClass('hidden');
        $('#view-form').removeClass('hidden').addClass('active');
    }

    // --- 3. FORMULAIRE : ENVOI VERS GOOGLE SHEETS ---
    $('#registration-form').on('submit', function(e) {
        e.preventDefault();
        
        const $btn = $(this).find('button');
        const originalText = $btn.text();
        $btn.text("Envoi en cours...").prop('disabled', true);

        const data = {
            action: "add",
            prenom: $('#prenom').val().trim(),
            nom: $('#nom').val().trim(),
            email: $('#email').val().trim()
        };

        // Validation simple
        if (!data.prenom || !data.nom) {
            alert("Veuillez remplir le prénom et le nom.");
            $btn.text(originalText).prop('disabled', false);
            return;
        }

        // Envoi vers Google Apps Script
        // Utilisation de 'no-cors' pour contourner les restrictions de sécurité navigateur
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            // Succès (même si on ne reçoit pas de réponse JSON lisible en no-cors)
            $('#registration-form')[0].reset();
            $('#success-msg').removeClass('hidden').delay(3000).queue(function(next){
                $(this).addClass('hidden');
                next();
            });
            $btn.text(originalText).prop('disabled', false);
        })
        .catch(err => {
            console.error("Erreur envoi:", err);
            alert("Erreur de connexion. Vérifiez votre internet.");
            $btn.text(originalText).prop('disabled', false);
        });
    });

    // --- 4. LECTURE DES DONNÉES (GOOGLE SHEETS) ---
    function loadParticipants() {
        // On ne charge que si on est sur la vue de la roue
        if ($('#view-wheel').hasClass('hidden')) return;

        fetch(SCRIPT_URL + "?action=read")
        .then(res => res.json())
        .then(response => {
            if (response && response.result === "success") {
                participantsDB = response.data;
                
                // Mise à jour du petit texte de statut
                const count = participantsDB.length;
                $('#status-db').text(count + " participant" + (count > 1 ? "s" : "") + " inscrit" + (count > 1 ? "s" : "") + ".");
                
                console.log("Participants chargés :", count);
            }
        })
        .catch(err => {
            console.error("Erreur lecture:", err);
            $('#status-db').text("Erreur de connexion à la base de données.");
        });
    }

    // --- 5. DESSIN DE LA ROUE (ESTHÉTIQUE) ---
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 240;
    const segments = 20;
    const arcSize = (2 * Math.PI) / segments;
    
    // Camaïeu de couleurs (Bordeaux, Crème, Or, etc.)
    const colors = [
        '#800020', '#FBF8F3', '#D4AF37', '#A52A2A', '#F5DEB3', 
        '#5a0016', '#C0C0C0', '#8B4513', '#FFD700', '#CD5C5C',
        '#800020', '#FBF8F3', '#D4AF37', '#A52A2A', '#F5DEB3', 
        '#5a0016', '#C0C0C0', '#8B4513', '#FFD700', '#CD5C5C'
    ];

    let currentRotation = 0;

    function drawWheel(rotationOffset) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationOffset);
        ctx.translate(-centerX, -centerY);

        for (let i = 0; i < segments; i++) {
            const angle = i * arcSize;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.stroke();

            // Dessin du "?" décoratif
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px Arial";
            
            // Ajuster la couleur du texte si le fond est clair
            const isLight = ['#FBF8F3', '#F5DEB3', '#FFD700', '#C0C0C0'].includes(colors[i % colors.length]);
            if (isLight) ctx.fillStyle = "#800020";
            
            ctx.fillText("?", radius - 20, 10);
            ctx.restore();
        }
        ctx.restore();
    }

    // Dessin initial
    drawWheel(0);

    // --- 6. LANCEMENT DU TIRAGE ---
    $('#btn-spin').on('click', function() {
        if (participantsDB.length === 0) {
            alert("Aucun participant inscrit dans la base de données !");
            return;
        }
        if (isSpinning) return;

        isSpinning = true;
        $(this).hide(); // Cacher le bouton pendant l'animation

        const duration = 15000; // 15 secondes
        const startRotation = currentRotation;
        // 15 tours complets + un angle aléatoire
        const totalRotation = startRotation + (15 * 2 * Math.PI) + (Math.random() * 2 * Math.PI);
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Effet de ralentissement (Easing Out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            currentRotation = startRotation + (totalRotation - startRotation) * easeOut;
            drawWheel(currentRotation);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isSpinning = false;
                showWinner();
            }
        }
        animate();
    });

    // --- 7. AFFICHAGE DU GAGNANT & POPUP ---
    function showWinner() {
        // Sélection aléatoire d'un index dans le tableau participantsDB
        const randomIndex = Math.floor(Math.random() * participantsDB.length);
        const winner = participantsDB[randomIndex];
        
        const fullNameUpper = (winner.prenom + " " + winner.nom).toUpperCase();
        
        $('#winner-name-display').text(fullNameUpper);
        
        // Affichage de la popup (centrée grâce au CSS)
        $('#winner-overlay').removeClass('hidden');
        
        // Lancement des confettis
        launchConfetti();
    }

    // --- 8. EFFET FEU D'ARTIFICE (Départ unique : CENTRE) ---
    function launchConfetti() {
        const colorsConfetti = ['#800020', '#D4AF37', '#FBF8F3', '#fff', '#ff0000', '#FFD700', '#CD5C5C'];
        const container = $('#winner-overlay');
        
        // Durée totale aléatoire entre 5 et 10 secondes
        const totalDuration = Math.floor(Math.random() * 5000) + 5000; 
        const startTime = Date.now();
        
        const startX = 50; // Centre horizontal (%)
        const startY = 50; // Centre vertical (%)

        function createExplosion() {
            const particleCount = 50; // Nombre de confettis par explosion
            
            for (let i = 0; i < particleCount; i++) {
                const conf = $('<div class="confetti"></div>');
                const bg = colorsConfetti[Math.floor(Math.random() * colorsConfetti.length)];
                const size = Math.random() * 8 + 6; 
                
                conf.css({
                    'background-color': bg,
                    'left': startX + '%',
                    'top': startY + '%',
                    'width': size + 'px',
                    'height': size + 'px',
                    'border-radius': Math.random() > 0.5 ? '50%' : '0',
                    'opacity': 1,
                    'z-index': 10000
                });
                
                container.append(conf);
                
                // Trajectoire radiale depuis le centre
                const angle = Math.random() * Math.PI * 2;
                const velocity = Math.random() * 400 + 150; 
                
                const destX = Math.cos(angle) * velocity;
                const destY = Math.sin(angle) * velocity;
                const rotate = Math.random() * 720 - 360;
                
                conf.animate({
                    left: '+=' + destX + 'px',
                    top: '+=' + destY + 'px',
                    opacity: 0,
                    transform: `rotate(${rotate}deg)`
                }, Math.random() * 1000 + 1000, function() {
                    $(this).remove();
                });
            }
        }

        // Boucle de lancement des explosions
        const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= totalDuration) {
                clearInterval(intervalId);
                return;
            }

            createExplosion();
            
            // Parfois, doubler l'explosion pour plus d'intensité
            if (Math.random() > 0.3) {
                setTimeout(createExplosion, 150);
            }

        }, 700); // Une explosion toutes les 700ms
    }
});
