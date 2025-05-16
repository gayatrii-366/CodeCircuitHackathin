// Utility functions for the Flashcard app

export function safeJSONParse(data, fallback) {
    try {
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

export function validateCard(card) {
    return (
        card &&
        typeof card === 'object' &&
        typeof card.question === 'string' &&
        card.question.trim().length > 0 &&
        typeof card.answer === 'string' &&
        card.answer.trim().length > 0 &&
        typeof card.id === 'number'
    );
}

export function validateAndRepairData(flashcards, categories) {
    // Ensure flashcards object exists
    if (!flashcards || typeof flashcards !== 'object') {
        flashcards = {};
    }

    // Ensure categories array exists
    if (!Array.isArray(categories)) {
        categories = [];
    }

    // Validate and repair each category
    categories = categories.filter(category => {
        return typeof category === 'string' && category.trim().length > 0;
    });

    // Validate flashcards structure
    Object.keys(flashcards).forEach(category => {
        if (!Array.isArray(flashcards[category])) {
            flashcards[category] = [];
        }

        // Validate each card
        flashcards[category] = flashcards[category]
            .filter(validateCard)
            .map(card => ({
                ...card,
                known: Boolean(card.known),
                lastReviewed: card.lastReviewed || null,
                createdAt: card.createdAt || new Date().toISOString()
            }));
    });

    // Clean up orphaned categories
    categories = categories.filter(category => 
        flashcards[category] && flashcards[category].length > 0
    );

    return { flashcards, categories };
}

export function getSubjectEmoji(category) {
    const categoryLower = category.toLowerCase();
    const emojiMap = {
        'math': '📐',
        'mathematics': '📐',
        'algebra': '🔢',
        'geometry': '📏',
        'science': '🔬',
        'biology': '🧬',
        'chemistry': '⚗️',
        'physics': '⚛️',
        'history': '📚',
        'literature': '📖',
        'english': '📝',
        'language': '💭',
        'languages': '💭',
        'geography': '🌍',
        'computer': '💻',
        'programming': '👨‍💻',
        'music': '🎵',
        'art': '🎨',
        'sports': '⚽',
    };

    // Try to find a matching emoji based on the category name
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (categoryLower.includes(key)) {
            return emoji;
        }
    }

    // Return a default emoji if no match is found
    return '📚';
}

export function generateCardStack(count) {
    return Array.from({ length: Math.min(count, 3) })
        .map((_, index) => `
            <div class="stack-card" 
                 style="transform: translate(${index * 2}px, ${index * 2}px)">
            </div>
        `).join('');
}

export function calculateStats(flashcards) {
    const stats = {
        totalCards: 0,
        masteredCards: 0,
        recentlyReviewed: 0,
        categoryStats: {}
    };

    Object.entries(flashcards).forEach(([category, cards]) => {
        const categoryStats = {
            total: cards.length,
            mastered: cards.filter(card => card.known).length,
            recentlyReviewed: cards.filter(card => {
                if (!card.lastReviewed) return false;
                const lastReview = new Date(card.lastReviewed);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return lastReview > yesterday;
            }).length
        };

        stats.categoryStats[category] = categoryStats;
        stats.totalCards += categoryStats.total;
        stats.masteredCards += categoryStats.mastered;
        stats.recentlyReviewed += categoryStats.recentlyReviewed;
    });

    return stats;
}
