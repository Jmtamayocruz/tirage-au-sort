$(document).ready(function() {

    // --- 1. DONNÉES ---
    let participantsDB = []; // Tableau caché contenant les objets Person
    let rowCount = 0;

    // --- 2. CLASSE PERSON ---
    function Person(id, prenom, nom, email) {
        this.id = id;
        this.prenom = prenom;
        this.nom = nom;
        this.email = email;
        
        this.getFullName = function() {
            return this.prenom + " " + this.nom;
        };
    }

    // --- 3. GESTION FORMULAIRE ---
    $('#registration-form').on('submit', function(e) {
        e.preventDefault();

        const prenom = $('#prenom').val().trim();
        const nom = $('#nom').val().trim();
        const email = $('#email').val().trim();

        if (prenom && nom) {
            rowCount++;
            // Création de l'objet
            const newPerson = new Person(rowCount, prenom, nom, email);
            
            // Ajout au tableau caché
            participantsDB.push(newPerson);

            // Feedback visuel
            $('#registration-form')[0].reset();
            $('#success-msg').removeClass('hidden').delay(2000).queue(function(next){
                $(this).addClass('hidden');
                next();
            });

            console.log("Inscrit : " + newPerson.getFullName() + " (Total: " + participantsDB.length + ")");
        }
    });

    // Navigation temporaire pour tester la roue (à supprimer lors de l'intégration finale)
    $('#debug-go-to-wheel').on('click', function() {
        $('#view-form').removeClass('active').addClass('hidden');
        $('#view-wheel').removeClass('hidden').addClass('active');
        // Redessiner la roue pour s'assurer qu'elle est à jour
        drawWheel(0);
    });

    // --- 4. ROUE ESTHÉTIQUE ---
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
    let isSpinning = false;

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

            // Dessin du "?"
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px Arial";
            // Ajuster la couleur du texte selon le fond
            const isLight = ['#FBF8F3', '#F5DEB3', '#FFD700', '#C0C0C0'].includes(colors[i % colors.length]);
            if (isLight) ctx.fillStyle = "#800020";
            
            ctx.fillText("?", radius - 20, 10);
            ctx.restore();
        }
        ctx.restore();
    }

    // Dessin initial
    drawWheel(0);

    // --- 5. LANCEMENT & TIRAGE ---
    $('#btn-spin').on('click', function() {
        if (participantsDB.length === 0) {
            alert("Aucun participant !");
            return;
        }
        if (isSpinning) return;

        isSpinning = true;
        $(this).hide(); // Cache le bouton

        const duration = 15000; // 15 secondes
        const startRotation = currentRotation;
        const totalRotation = startRotation + (15 * 2 * Math.PI) + (Math.random() * 2 * Math.PI);
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // Ralentissement

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

    function showWinner() {
        // Sélection aléatoire basée sur l'index du tableau
        const randomIndex = Math.floor(Math.random() * participantsDB.length);
        const winner = participantsDB[randomIndex];
        
        const fullNameUpper = winner.getFullName().toUpperCase();
        
        $('#winner-name-display').text(fullNameUpper);
        
        // Affichage de la popup (déjà centrée grâce au CSS)
        $('#winner-overlay').removeClass('hidden');
        
        launchConfetti();
    }

  // --- 6. EFFET FEU D'ARTIFICE (Départ unique : CENTRE) ---
    function launchConfetti() {
        const colorsConfetti = ['#800020', '#D4AF37', '#FBF8F3', '#fff', '#ff0000', '#FFD700', '#CD5C5C'];
        const container = $('#winner-overlay');
        
        // Durée totale aléatoire entre 5 et 10 secondes (5000 à 10000 ms)
        const totalDuration = Math.floor(Math.random() * 5000) + 5000; 
        const startTime = Date.now();
        
        // Point de départ unique : Centre (50%, 50%)
        const startX = 50; 
        const startY = 50;

        // Fonction pour créer une explosion depuis le centre
        function createExplosion() {
            const particleCount = 50; // Nombre de confettis par explosion
            
            for (let i = 0; i < particleCount; i++) {
                const conf = $('<div class="confetti"></div>');
                const bg = colorsConfetti[Math.floor(Math.random() * colorsConfetti.length)];
                const size = Math.random() * 8 + 6; // Taille entre 6 et 14px
                
                // Position de départ : Centre exact
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
                
                // Calcul de la trajectoire (explosion radiale depuis le centre)
                const angle = Math.random() * Math.PI * 2; // 0 à 360 degrés
                const velocity = Math.random() * 400 + 150; // Force d'explosion (150 à 550px)
                
                const destX = Math.cos(angle) * velocity;
                const destY = Math.sin(angle) * velocity;
                const rotate = Math.random() * 720 - 360;
                
                // Animation : part du centre vers l'extérieur
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

        // Boucle de lancement des explosions depuis le centre
        const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            // Arrêt si durée dépassée
            if (elapsed >= totalDuration) {
                clearInterval(intervalId);
                return;
            }

            // Créer une explosion depuis le centre
            createExplosion();
            
            // Parfois, doubler l'explosion pour plus d'intensité (70% de chance)
            if (Math.random() > 0.3) {
                setTimeout(createExplosion, 150);
            }

        }, 700); // Une nouvelle explosion toutes les 700ms
    }
});
