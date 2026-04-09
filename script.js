$(document).ready(function() {

    // --- 1. CONFIGURATION ---
    // REMPLACEZ CECI PAR VOTRE URL GOOGLE APPS SCRIPT (doit finir par /exec)
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5-7SByCM6G-fz-oDt9YhCdMoPF0ZpJkawdjj9NRLaPD7GCQKYMHzqBU9BMpndfob24g/exec"; 
    
    let participantsDB = [];
    let isSpinning = false;

    // --- 2. CHARGEMENT DES DONNÉES (GOOGLE SHEETS) ---
    function loadParticipants() {
        fetch(SCRIPT_URL + "?action=read")
        .then(res => res.json())
        .then(response => {
            if (response && response.result === "success") {
                participantsDB = response.data;
                
                const count = participantsDB.length;
                $('#status-db').text(count + " participant" + (count > 1 ? "s" : "") + " inscrit" + (count > 1 ? "s" : "") + ".");
                
                // On redessine la roue si elle ne tourne pas (pour mettre à jour visuellement si besoin)
                if (!isSpinning) {
                    // Optionnel : on pourrait ajouter un effet visuel si le nombre change
                    console.log("Participants chargés :", count);
                }
            }
        })
        .catch(err => {
            console.error("Erreur lecture:", err);
            $('#status-db').text("Erreur de connexion à la base de données.");
        });
    }

    // Chargement initial
    loadParticipants();
    // Rafraîchissement automatique toutes les 5 secondes
    setInterval(loadParticipants, 5000);

    // --- 3. DESSIN DE LA ROUE ---
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 240;
    const segments = 20;
    const arcSize = (2 * Math.PI) / segments;
    
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
            
            const isLight = ['#FBF8F3', '#F5DEB3', '#FFD700', '#C0C0C0'].includes(colors[i % colors.length]);
            if (isLight) ctx.fillStyle = "#800020";
            
            ctx.fillText("?", radius - 20, 10);
            ctx.restore();
        }
        ctx.restore();
    }

    // Dessin initial
    drawWheel(0);

    // --- 4. LANCEMENT DU TIRAGE ---
    $('#btn-spin').on('click', function() {
        if (participantsDB.length === 0) {
            alert("Aucun participant inscrit dans la base de données !");
            return;
        }
        if (isSpinning) return;

        isSpinning = true;
        $(this).hide(); // Cacher le bouton

        const duration = 15000; // 15 secondes
        const startRotation = currentRotation;
        const totalRotation = startRotation + (15 * 2 * Math.PI) + (Math.random() * 2 * Math.PI);
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // Ralentissement fluide
            
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

    // --- 5. AFFICHAGE DU GAGNANT ---
    function showWinner() {
        // Sélection aléatoire dans le tableau
        const randomIndex = Math.floor(Math.random() * participantsDB.length);
        const winner = participantsDB[randomIndex];
        
        const fullNameUpper = (winner.prenom + " " + winner.nom).toUpperCase();
        
        $('#winner-name-display').text(fullNameUpper);
        $('#winner-overlay').removeClass('hidden');
        
        launchConfetti();
    }

    // --- 6. FEU D'ARTIFICE (CENTRE) ---
    function launchConfetti() {
        const colorsConfetti = ['#800020', '#D4AF37', '#FBF8F3', '#fff', '#ff0000', '#FFD700', '#CD5C5C'];
        const container = $('#winner-overlay');
        
        const totalDuration = Math.floor(Math.random() * 5000) + 5000; 
        const startTime = Date.now();
        
        const startX = 50; 
        const startY = 50; 

        function createExplosion() {
            for (let i = 0; i < 50; i++) {
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

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= totalDuration) {
                clearInterval(intervalId);
                return;
            }

            createExplosion();
            if (Math.random() > 0.3) {
                setTimeout(createExplosion, 150);
            }

        }, 700);
    }
});
