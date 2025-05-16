// Flashcard Application
import {
    safeJSONParse,
    validateAndRepairData,
    getSubjectEmoji,
    generateCardStack,
    calculateStats
} from './utils.js';

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FlashcardApp();
});

class FlashcardApp {
    constructor() {
        // Constants
        this.XP_PER_CARD = 10;
        this.XP_STREAK_BONUS = 5;

        // Initialize with error handling
        try {
            const storedFlashcards = localStorage.getItem('flashcards');
            const storedCategories = localStorage.getItem('categories');
            
            // Use utility functions for safe parsing and data validation
            const { flashcards, categories } = validateAndRepairData(
                safeJSONParse(storedFlashcards, {}),
                safeJSONParse(storedCategories, [])
            );

            this.flashcards = flashcards;
            this.categories = categories;
            this.isDarkMode = localStorage.getItem('darkMode') === 'true';
            this.currentCategory = '';
            this.currentCardIndex = 0;
            this.isFlipped = false;

            // Initialize DOM elements and UI
            this.setupElements();
            this.setupEventListeners();
            this.initializeUI();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.resetToDefaults();
            this.setupElements();
            this.setupEventListeners();
            this.initializeUI();
        }
    }

    safeJSONParse(data, fallback) {
        try {
            return data ? JSON.parse(data) : fallback;
        } catch {
            return fallback;
        }
    }

    validateAndRepairData() {
        // Ensure flashcards object exists
        if (!this.flashcards || typeof this.flashcards !== 'object') {
            this.flashcards = {};
        }

        // Ensure categories array exists
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }

        // Validate and repair each category
        this.categories = this.categories.filter(category => {
            return typeof category === 'string' && category.trim().length > 0;
        });

        // Validate flashcards structure
        Object.keys(this.flashcards).forEach(category => {
            if (!Array.isArray(this.flashcards[category])) {
                this.flashcards[category] = [];
            }

            // Validate each card
            this.flashcards[category] = this.flashcards[category].filter(card => {
                return card && 
                       typeof card === 'object' && 
                       typeof card.question === 'string' &&
                       typeof card.answer === 'string';
            });
        });

        // Clean up orphaned categories
        this.categories = this.categories.filter(category => 
            this.flashcards[category] && this.flashcards[category].length > 0
        );

        // Save validated data
        this.saveToLocalStorage();
    }

    resetToDefaults() {
        this.flashcards = {};
        this.categories = [];
        this.currentCategory = '';
        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.isDarkMode = false;
        this.saveToLocalStorage();
        this.showToast('App reset due to data corruption', 'warning');
    }

    initializeUI() {
        // Apply theme
        this.applyTheme();
        
        // Show appropriate screen
        if (!localStorage.getItem('instructionsShown')) {
            this.showInstructions();
        } else {
            this.showDashboard();
        }
        
        // Update UI elements
        this.loadCategories();
        this.updateDashboardStats();
        this.updateActivityChart();
    }

    showInstructions() {
        if (this.elements.instructionsPage) {
            this.elements.instructionsPage.style.display = 'block';
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.dashboard.style.display = 'none';
            this.elements.studyArea.style.display = 'none';
        }
    }

    showDashboard() {
        if (this.elements.dashboard) {
            this.elements.instructionsPage.style.display = 'none';
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.dashboard.style.display = 'block';
            this.elements.studyArea.style.display = 'none';
            
            // Refresh dashboard data
            this.loadCategories();
            this.updateDashboardStats();
            this.updateActivityChart();
        }
    }

    setupElements() {
        // Get DOM elements
        this.elements = {
            // Main sections
            welcomeScreen: document.getElementById('welcomeScreen'),
            dashboard: document.querySelector('.dashboard'),
            studyArea: document.getElementById('studyArea'),
            instructionsPage: document.getElementById('instructionsPage'),

            // Flashcard elements
            flashcard: document.getElementById('flashcard'),
            questionText: document.getElementById('questionText'),
            answerText: document.getElementById('answerText'),
            cardNumber: document.getElementById('cardNumber'),
            progressBar: document.getElementById('progress'),
            progressText: document.getElementById('progressText'),
            currentCategoryText: document.getElementById('currentCategory'),

            // Modals
            addCardModal: document.getElementById('addCardModal'),
            categoryModal: document.getElementById('categoryModal'),

            // Forms and inputs
            addCardForm: document.getElementById('addCardForm'),
            categorySelect: document.getElementById('category'),
            newCategoryInput: document.getElementById('newCategory'),
            categorySearch: document.getElementById('categorySearch'),
            categoryList: document.getElementById('categoryList'),

            // Stats
            totalCardsDisplay: document.getElementById('totalCards'),
            dayStreakDisplay: document.getElementById('dayStreak'),
            levelDisplay: document.getElementById('level'),
            xpDisplay: document.getElementById('xp'),

            // Buttons
            themeToggle: document.getElementById('toggle-mode')
        };
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark');
            this.elements.themeToggle.textContent = '🌚';
        } else {
            document.body.classList.remove('dark');
            this.elements.themeToggle.textContent = '🌞';
        }
    }

    setupEventListeners() {
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Modal triggers with improved event handling
        const addCardModalBtn = document.getElementById('openAddCardModal');
        const categoryModalBtn = document.getElementById('openCategoryModal');

        if (addCardModalBtn) {
            addCardModalBtn.addEventListener('click', () => {
                this.openModal('addCardModal');
                this.loadCategoriesIntoSelect();
            });
        }
        
        if (categoryModalBtn) {
            categoryModalBtn.addEventListener('click', () => {
                this.openModal('categoryModal');
            });
        }

        // Form submissions with error handling
        const categoryForm = document.querySelector('#categoryModal .cute-form');
        const categoryNameInput = document.getElementById('categoryName');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        
        if (categoryForm && categoryNameInput && addCategoryBtn) {
            // Allow Enter key to submit with validation
            categoryNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const categoryName = categoryNameInput.value.trim();
                    if (categoryName) {
                        this.addCategory(categoryName);
                    }
                }
            });

            // Button click handler with validation
            addCategoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const categoryName = categoryNameInput.value.trim();
                if (categoryName) {
                    this.addCategory(categoryName);
                }
            });
        }

        // Add card form submission
        if (this.elements.addCardForm) {
            this.elements.addCardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCard(e);
            });
        }

        // Category select change with improved UX
        if (this.elements.categorySelect) {
            this.elements.categorySelect.addEventListener('change', (e) => {
                this.handleCategorySelectChange(e);
            });
        }

        // Study area buttons with improved responsiveness
        const knowBtn = document.getElementById('knowBtn');
        const dontKnowBtn = document.getElementById('dontKnowBtn');
        
        if (knowBtn) {
            knowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                knowBtn.classList.add('clicked');
                this.handleCardResponse(true);
                setTimeout(() => knowBtn.classList.remove('clicked'), 200);
            });
        }
        
        if (dontKnowBtn) {
            dontKnowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                dontKnowBtn.classList.add('clicked');
                this.handleCardResponse(false);
                setTimeout(() => dontKnowBtn.classList.remove('clicked'), 200);
            });
        }

        // Back button with confirmation
        const backBtn = document.getElementById('backToDashboard');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.elements.studyArea.style.display = 'none';
                this.elements.dashboard.style.display = 'block';
                this.loadCategories(); // Refresh categories
            });
        }

        // Shuffle button with visual feedback
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                shuffleBtn.classList.add('clicked');
                this.shuffleCards();
                setTimeout(() => shuffleBtn.classList.remove('clicked'), 200);
            });
        }

        // Flashcard click for flipping with improved touch handling
        if (this.elements.flashcard) {
            this.elements.flashcard.addEventListener('click', (e) => {
                e.preventDefault();
                this.flipCard();
            });
            
            // Touch events for mobile with better handling
            this.elements.flashcard.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent double-firing
                // Only flip if it was a tap (not a scroll)
                if (!this.touchMoved) {
                    this.flipCard();
                }
                this.touchMoved = false;
            });
            
            this.elements.flashcard.addEventListener('touchmove', () => {
                this.touchMoved = true;
            });
            
            this.elements.flashcard.addEventListener('touchstart', () => {
                this.touchMoved = false;
            });
        }

        // Keyboard shortcuts with improved handling
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when study area is visible
            if (!this.elements.studyArea.style.display || this.elements.studyArea.style.display === 'none') return;
            
            // Prevent default only for our shortcuts
            switch(e.key) {
                case ' ': // Spacebar
                case 'Enter':
                    e.preventDefault();
                    this.flipCard();
                    break;
                case 'ArrowRight':
                case 'k':
                    e.preventDefault();
                    this.handleCardResponse(true);
                    break;
                case 'ArrowLeft':
                case 'd':
                    e.preventDefault();
                    this.handleCardResponse(false);
                    break;
            }
        });

        // Welcome screen interaction handlers
        document.addEventListener('DOMContentLoaded', () => {
            const getStartedBtn = document.querySelector('.get-started-btn');
            const demoBtn = document.querySelector('.demo-btn');
            const startBtn = document.querySelector('.start-btn');

            if (getStartedBtn) {
                getStartedBtn.addEventListener('click', () => {
                    localStorage.setItem('instructionsShown', 'true');
                    this.showDashboard();
                });
            }

            if (demoBtn) {
                demoBtn.addEventListener('click', () => {
                    document.querySelector('.how-to-section').scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                });
            }

            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    localStorage.setItem('instructionsShown', 'true');
                    this.showDashboard();
                });
            }

            // Add intersection observer for animation on scroll
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, { threshold: 0.1 });

            // Observe feature cards and step cards
            document.querySelectorAll('.feature-card, .step-card').forEach(card => {
                card.classList.add('fade-up');
                observer.observe(card);
            });
        });
    }

    initializeApp() {
        // Set initial theme
        if (this.isDarkMode) {
            document.body.classList.add('dark');
            this.elements.themeToggle.textContent = '🌚';
        }

        // Load initial data
        this.updateStats();
        this.loadCategories();
        this.checkDayStreak();

        // Show instructions for first-time users
        if (!localStorage.getItem('instructionsShown')) {
            this.showInstructions();
        } else {
            this.showDashboard();
        }
    }

    setupMobileSwipe() {
        let touchStartX = 0;
        this.elements.flashcard.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        this.elements.flashcard.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            
            if (Math.abs(diff) > 50) {
                this.handleCardResponse(diff > 0);
            }
        });
    }        toggleTheme() {
            this.isDarkMode = !this.isDarkMode;
            this.applyTheme();
            localStorage.setItem('darkMode', this.isDarkMode.toString());
        }

        openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            if (modalId === 'addCardModal') {
                this.loadCategoriesIntoSelect();
            }
            modal.style.display = 'flex';
            // Force reflow
            modal.offsetHeight;
            modal.classList.add('modal-open');
        }

        closeModal(modal) {
            if (!modal) return;
            
            modal.classList.remove('modal-open');
            setTimeout(() => {
                modal.style.display = 'none';
                // Reset forms
                if (modal.id === 'addCardModal') {
                    this.elements.addCardForm.reset();
                    this.elements.newCategoryInput.style.display = 'none';
                } else if (modal.id === 'categoryModal') {
                    document.getElementById('categoryName').value = '';
                }
            }, 300);
        }

        addCategory(categoryName) {
            if (!categoryName) return;
            
            if (this.categories.includes(categoryName)) {
                this.showToast('Category already exists!', 'error');
                return;
            }

            this.categories.push(categoryName);
            this.flashcards[categoryName] = [];
            this.saveToLocalStorage();
            this.loadCategories();
            
            // Close modal and scroll to the new category
            this.closeModal(document.getElementById('categoryModal'));
            setTimeout(() => {
                const categoryItems = this.elements.categoryList.querySelectorAll('.category-item');
                const lastCategory = categoryItems[categoryItems.length - 1];
                if (lastCategory) {
                    lastCategory.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            
            this.showToast('Category added successfully!');
        }

    handleAddCard(e) {
        e.preventDefault();
        
        const categorySelect = this.elements.categorySelect;
        const newCategoryInput = this.elements.newCategoryInput;
        const questionInput = document.getElementById('question');
        const answerInput = document.getElementById('answer');
        const tagsInput = document.getElementById('tags');
        
        // Get category
        let category = categorySelect.value === 'new' 
            ? newCategoryInput.value.trim()
            : categorySelect.value;

        // Validate inputs
        if (!category) {
            this.showToast('Please select or create a category', 'error');
            categorySelect.focus();
            return;
        }

        if (!questionInput.value.trim()) {
            this.showToast('Please enter a question', 'error');
            questionInput.focus();
            return;
        }

        if (!answerInput.value.trim()) {
            this.showToast('Please enter an answer', 'error');
            answerInput.focus();
            return;
        }

        // Create card object
        const card = {
            id: Date.now(),
            question: questionInput.value.trim(),
            answer: answerInput.value.trim(),
            tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
            known: false,
            lastReviewed: null,
            createdAt: new Date().toISOString()
        };

        // Handle new category
        if (categorySelect.value === 'new') {
            if (this.categories.includes(category)) {
                this.showToast('Category already exists! Please select it from the dropdown.', 'error');
                return;
            }
            this.categories.push(category);
        }

        // Add card to flashcards
        if (!this.flashcards[category]) {
            this.flashcards[category] = [];
        }
        this.flashcards[category].push(card);

        // Save and update UI
        this.saveToLocalStorage();
        this.loadCategories();
        this.loadCategoriesIntoSelect();
        
        // Reset form
        e.target.reset();
        if (categorySelect.value === 'new') {
            newCategoryInput.style.display = 'none';
        }

        // Show success message and confetti
        this.showToast('Card added successfully! 🎉');
        this.playConfetti();

        // Auto-close modal after delay
        setTimeout(() => {
            this.closeModal(this.elements.addCardModal);
        }, 1500);
    }

    handleCategorySelectChange(e) {
        const newCategoryInput = this.elements.newCategoryInput;
        const isNew = e.target.value === 'new';
        
        newCategoryInput.style.display = isNew ? 'block' : 'none';
        newCategoryInput.required = isNew;
        
        if (isNew) {
            setTimeout(() => newCategoryInput.focus(), 100);
        }
    }

    loadCategoriesIntoSelect() {
        const select = this.elements.categorySelect;
        if (!select) return;

        // Keep only the first two options (placeholder and "new" option)
        while (select.options.length > 2) {
            select.remove(2);
        }

        // Add categories in alphabetical order
        this.categories.sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `📚 ${category} (${this.flashcards[category].length} cards)`;
            select.appendChild(option);
        });
    }

        loadCategories() {
            if (!this.elements.categoryList) return;
            
            this.elements.categoryList.innerHTML = '';
            
            if (this.categories.length === 0) {
                this.elements.categoryList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <p>No categories yet! Click "Add Category" to get started.</p>
                    </div>
                `;
                return;
            }

            this.categories.forEach(category => {
                const cards = this.flashcards[category] || [];
                const masteredCount = cards.filter(card => card.known).length;
                const emoji = getSubjectEmoji(category);
                
                const categoryEl = document.createElement('div');
                categoryEl.className = 'subject-card';
                categoryEl.innerHTML = `
                    <div class="subject-emoji">${emoji}</div>
                    <div class="card-stack">
                        ${generateCardStack(cards.length)}
                    </div>
                    <div class="subject-info">
                        <div class="subject-name">
                            <span class="subject-title">${category}</span>
                        </div>
                        <div class="subject-stats">
                            <span class="stat-badge cards-count">
                                <i class="fas fa-layer-group"></i> ${cards.length}
                            </span>
                            <span class="stat-badge mastery-level">
                                <i class="fas fa-chart-line"></i> ${Math.round((masteredCount / cards.length) * 100) || 0}%
                            </span>
                        </div>
                    </div>
                `;
                categoryEl.addEventListener('click', () => this.selectCategory(category));
                this.elements.categoryList.appendChild(categoryEl);
            });

            this.updateDashboardStats();
            this.updateActivityChart();
        }

    generateCardStack(count) {
        const maxCards = Math.min(count, 3);
        let stack = '';
        for (let i = 0; i < maxCards; i++) {
            stack += `<div class="stack-card"></div>`;
        }
        return stack;
    }

    updateActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx || !window.Chart) return;

        // Clean up previous chart if it exists
        if (this.activityChart) {
            this.activityChart.destroy();
        }

        const dates = this.getLast7Days();
        const data = dates.map(date => {
            return {
                date: date,
                count: this.getActivityForDate(date)
            };
        });

        this.activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.date.toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: [{
                    label: 'Cards Reviewed',
                    data: data.map(d => d.count),
                    backgroundColor: 'rgba(67, 97, 238, 0.5)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    getLast7Days() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date);
        }
        return dates;
    }

    getActivityForDate(date) {
        const dateString = date.toDateString();
        let count = 0;
        Object.values(this.flashcards).forEach(cards => {
            cards.forEach(card => {
                if (card.lastReviewed && new Date(card.lastReviewed).toDateString() === dateString) {
                    count++;
                }
            });
        });
        return count;
    }

    calculateStreak() {
        const today = new Date().toDateString();
        let streak = 0;
        let currentDate = new Date();

        while (true) {
            const dateString = currentDate.toDateString();
            const hasActivity = this.getActivityForDate(currentDate) > 0;

            if (!hasActivity && dateString !== today) {
                break;
            }

            if (hasActivity || dateString === today) {
                streak++;
            }

            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    updateDashboardStats() {
        const stats = calculateStats(this.flashcards);
        
        if (this.elements.totalCardsDisplay) {
            this.elements.totalCardsDisplay.textContent = stats.totalCards;
        }
        
        if (this.elements.masteredCards) {
            this.elements.masteredCards.textContent = stats.masteredCards;
        }
        
        if (this.elements.dayStreak) {
            this.elements.dayStreak.textContent = this.calculateStreak();
        }
    }

        selectCategory(category) {
            if (!category || !this.flashcards[category]) {
                this.showToast('Category not found!', 'error');
                return;
            }

            this.currentCategory = category;
            this.currentCardIndex = 0;
            this.isFlipped = false;

            // Update UI
            this.elements.currentCategoryText.textContent = category;
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.dashboard.style.display = 'none';
            this.elements.studyArea.style.display = 'block';

            // Show first card
            this.showCurrentCard();
        }    showCurrentCard() {
        const cards = this.flashcards[this.currentCategory];
        if (!cards || cards.length === 0) {
            this.showEmptyState();
            return;
        }

        const card = cards[this.currentCardIndex];
        if (!card) {
            console.error('No card found at index:', this.currentCardIndex);
            return;
        }

        // Hide the card during content update
        this.elements.flashcard.style.opacity = '0';
        
        // Reset flip state when showing new card
        this.isFlipped = false;
        this.elements.flashcard.classList.remove('flipped');        // Update card content with a slight delay for animation
        setTimeout(() => {
            this.elements.questionText.textContent = card.question;
            this.elements.answerText.textContent = card.answer;
            this.elements.cardNumber.textContent = `Card ${this.currentCardIndex + 1}/${cards.length}`;
            
            // Show the card with a fade effect
            this.elements.flashcard.style.opacity = '1';
            
            // Update progress
            this.updateProgress();
        }, 300);

        // Add animation class
        this.elements.flashcard.classList.add('new');
        setTimeout(() => {
            this.elements.flashcard.classList.remove('new');
        }, 500);
    }

    showEmptyState() {
        this.elements.questionText.textContent = 'No cards in this category';
        this.elements.answerText.textContent = 'Add some cards to get started!';
        this.elements.cardNumber.textContent = '0/0';
        this.updateProgress();
    }

    calculateCategoryMastery(category) {
        const cards = this.flashcards[category];
        if (!cards || cards.length === 0) return 0;
        
        const knownCards = cards.filter(card => card.known).length;
        return Math.round((knownCards / cards.length) * 100);
    }

    updateProgress() {
        const cards = this.flashcards[this.currentCategory];
        if (!cards || cards.length === 0) {
            this.elements.progressBar.style.width = '0%';
            this.elements.progressText.textContent = '0%';
            return;
        }

        const total = cards.length;
        const known = cards.filter(card => card.known).length;
        const progress = (known / total) * 100;
        
        this.elements.progressBar.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${Math.round(progress)}%`;
    }

    saveToLocalStorage() {
        const { flashcards, categories } = validateAndRepairData(this.flashcards, this.categories);
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
        localStorage.setItem('categories', JSON.stringify(categories));
        this.updateDashboardStats();
    }

    updateStats() {
        // Update total cards
        const totalCards = Object.values(this.flashcards)
            .reduce((sum, cards) => sum + cards.length, 0);
        this.elements.totalCardsDisplay.textContent = totalCards;

        // Update mastery for each category
        const categoryItems = this.elements.categoryList.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            const categoryName = item.querySelector('.category-name').textContent;
            const mastery = this.calculateCategoryMastery(categoryName);
            item.querySelector('.mastery').textContent = `${mastery}% mastered`;
        });
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        });
    }

    handleCardResponse(isKnown) {
        const cards = this.flashcards[this.currentCategory];
        if (!cards || cards.length === 0) return;

        // Get current card and update its status
        const currentCard = cards[this.currentCardIndex];
        const wasKnownBefore = currentCard.known;
        currentCard.known = isKnown;
        currentCard.lastReviewed = new Date().toISOString();
        
        // Visual feedback messages with emojis
        const messages = isKnown ? 
            ['Great job! 🎉', 'You got this! ⭐', 'Amazing! 🌟', 'Keep it up! 💫'] :
            ['No worries! 📚', "You'll get it next time! 💪", 'Practice makes perfect! 🎯', 'Keep learning! 💡'];
        
        const message = messages[Math.floor(Math.random() * messages.length)];

        // Create and show feedback toast
        const toast = document.createElement('div');
        toast.className = `toast-message ${isKnown ? 'success' : 'info'}`;
        toast.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-emoji">${isKnown ? '🎉' : '💪'}</span>
                <span class="feedback-text">${message}</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Animate toast
        requestAnimationFrame(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        });

        // Award XP and handle achievements
        if (isKnown) {
            // Base XP for reviewing
            this.addXP(this.XP_PER_CARD);
            
            // Bonus XP for first-time correct
            if (!wasKnownBefore) {
                this.addXP(this.XP_PER_CARD * 2);
                this.playConfetti();
            }
            
            // Streak bonus
            if (this.dayStreak > 1) {
                const streakBonus = this.XP_STREAK_BONUS * Math.min(this.dayStreak, 7);
                this.addXP(streakBonus);
            }
        }

        // Save and update stats
        this.saveToLocalStorage();
        this.updateDayStreak();
        this.handleAchievements();

        // Smooth card transition animation
        const cardElement = this.elements.flashcard;
        cardElement.style.transition = 'all 0.5s ease';
        cardElement.style.transform = isKnown ? 
            'translateX(100%) rotate(10deg)' : 
            'translateX(-100%) rotate(-10deg)';
        cardElement.style.opacity = '0';
        
        // Show next card with animation
        setTimeout(() => {
            this.nextCard();
            cardElement.style.transition = 'none';
            cardElement.style.transform = isKnown ? 
                'translateX(-100%) rotate(-10deg)' : 
                'translateX(100%) rotate(10deg)';
            
            requestAnimationFrame(() => {
                cardElement.style.transition = 'all 0.5s ease';
                cardElement.style.transform = 'translateX(0) rotate(0)';
                cardElement.style.opacity = '1';
            });
        }, 500);

        // Add haptic feedback if supported
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    }

    nextCard() {
        const cards = this.flashcards[this.currentCategory];
        if (!cards || cards.length === 0) return;

        this.currentCardIndex = (this.currentCardIndex + 1) % cards.length;
        this.showCurrentCard();
    }

    flipCard() {
        if (!this.elements.flashcard) return;
        
        // Prevent multiple flips during animation
        if (this.isFlipping) return;
        this.isFlipping = true;
        
        // Toggle flip state
        this.isFlipped = !this.isFlipped;
        
        // Add flip animation class
        this.elements.flashcard.classList.toggle('flipped');
        
        // Add haptic feedback if supported
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        
        // Play flip sound with error handling
        const flipSound = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
        flipSound.volume = 0.2;
        flipSound.play().catch(() => {}); // Ignore audio play errors
        
        // Reset isFlipping after animation completes
        setTimeout(() => {
            this.isFlipping = false;
        }, 600); // Match this with CSS transition duration
        
        // Add a subtle scale effect during flip
        const card = this.elements.flashcard;
        card.style.transform += ' scale(1.02)';
        setTimeout(() => {
            card.style.transform = card.style.transform.replace(' scale(1.02)', '');
        }, 300);
    }

    handleCategorySelectChange(e) {
        const newCategoryInput = this.elements.newCategoryInput;
        const isNew = e.target.value === 'new';
        
        newCategoryInput.style.display = isNew ? 'block' : 'none';
        newCategoryInput.required = isNew;
        
        if (isNew) {
            setTimeout(() => newCategoryInput.focus(), 100);
        }
    }

    handleCategorySearch(searchTerm) {
        const categoryList = this.elements.categoryList;
        if (!categoryList) return;

        searchTerm = searchTerm.toLowerCase().trim();
        const categoryItems = categoryList.querySelectorAll('.category-item');

        categoryItems.forEach(item => {
            const categoryName = item.querySelector('.category-name').textContent.toLowerCase();
            const match = categoryName.includes(searchTerm);
            
            if (match) {
                item.style.display = 'block';
                // Highlight matching text if there's a search term
                if (searchTerm) {
                    const nameElement = item.querySelector('.category-name');
                    const highlightedText = nameElement.textContent.replace(
                        new RegExp(searchTerm, 'gi'),
                        match => `<span class="highlight">${match}</span>`
                    );
                    nameElement.innerHTML = highlightedText;
                }
            } else {
                item.style.display = 'none';
            }
        });

        // Show a message if no results found
        const noResultsMsg = categoryList.querySelector('.no-results');
        if (searchTerm && Array.from(categoryItems).every(item => item.style.display === 'none')) {
            if (!noResultsMsg) {
                const message = document.createElement('div');
                message.className = 'no-results';
                message.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <p>No categories found matching "${searchTerm}"</p>
                    </div>
                `;
                categoryList.appendChild(message);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    shuffleCards() {
        const cards = this.flashcards[this.currentCategory];
        if (!cards || cards.length <= 1) return;

        // Fisher-Yates shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        this.currentCardIndex = 0;
        this.showCurrentCard();
        this.showToast('Cards shuffled! 🔀');
    }

    startStudySession(category) {
        this.currentCategory = category;
        this.currentCardIndex = 0;
        
        const cards = this.flashcards[category];
        if (!cards || cards.length === 0) {
            this.showEmptyState();
            return;
        }

        // Update UI
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.dashboard.style.display = 'none';
        this.elements.studyArea.style.display = 'block';
        this.elements.currentCategoryText.textContent = category;

        // Setup mobile swipe
        this.setupMobileSwipe();
        
        // Show first card
        this.showCurrentCard();
    }

    playConfetti() {
        if (window.confetti) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    handleAchievements() {
        const cards = this.flashcards[this.currentCategory];
        if (!cards) return;

        const knownCount = cards.filter(card => card.known).length;
        const totalCards = cards.length;
        const masteryPercentage = Math.round((knownCount / totalCards) * 100);

        if (masteryPercentage === 100) {
            this.showToast('🎉 Category Mastered! Amazing job!', 'success');
            this.playConfetti();
        } else if (masteryPercentage >= 75) {
            this.showToast('🌟 Getting close to mastery!', 'success');
        }
    }
}

function initializePageTransitions() {
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Header scroll animation
    const header = document.getElementById('header');
    if (header) {
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Hide on scroll down, show on scroll up
            if (window.scrollY > lastScrollY) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScrollY = window.scrollY;
        });
    }

    // Section reveal on scroll
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        observer.observe(section);
    });
}

initializePageTransitions();
