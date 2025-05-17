// Greeting user and applying theme accent color
const username = localStorage.getItem('moodTabletUsername') || 'Guest';
document.getElementById('greeting').textContent = `Hello, ${username}! Ready to track your mood today?`;

// Apply saved theme accent color if available
const savedTheme = localStorage.getItem('moodTabletAccentColor');
if(savedTheme) {
    document.documentElement.style.setProperty('--accent-color', savedTheme);
}
// Clear data on logout
document.querySelectorAll('a[href="index.html"]').forEach(link => {
  link.addEventListener('click', () => {
    localStorage.removeItem('moodTabletUsername');
    localStorage.removeItem('moodTabletAccentColor');
  });
});
// Mood Entry System
let currentDate = new Date();
let selectedMood = null;

// Mood Selection
document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedMood = btn.dataset.mood;
        document.querySelectorAll('.mood-btn').forEach(b => b.style.borderColor = 'var(--accent-color)');
        btn.style.borderColor = '#000';
    });
});

// Save Mood Entry
document.getElementById('saveMood').addEventListener('click', () => {
    if (!selectedMood) return alert('Please select a mood!');
    
    const entry = {
        date: currentDate.toISOString().split('T')[0],
        mood: selectedMood,
        note: document.getElementById('moodNote').value
    };
    
    const entries = JSON.parse(localStorage.getItem('moodEntries') || '[]');
    entries.push(entry);
    localStorage.setItem('moodEntries', JSON.stringify(entries));
    
    updateCalendar();
    updateChart();
    alert('Entry saved!');
});

// Calendar Logic
function generateCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const calendarGrid = document.getElementById('calendarGrid');
    
    calendarGrid.innerHTML = '';
    
    // Add empty days for month start
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }
    
    // Add days
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Add mood indicators
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entries = JSON.parse(localStorage.getItem('moodEntries') || [];
        const dailyEntry = entries.find(e => e.date === dateStr);
        
        if (dailyEntry) {
            dayElement.innerHTML += `<br><span style="font-size: 1.5rem">${getMoodEmoji(dailyEntry.mood)}</span>`;
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function getMoodEmoji(mood) {
    const emojis = {
        happy: '😊',
        sad: '😢',
        angry: '😠',
        calm: '😌',
        excited: '🤩',
        tired: '😴'
    };
    return emojis[mood] || '';
}

// Chart Logic
let moodChart;
function updateChart() {
    const entries = JSON.parse(localStorage.getItem('moodEntries') || [];
    const moodCounts = {};
    
    entries.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    if (moodChart) moodChart.destroy();
    
    const ctx = document.getElementById('moodChart').getContext('2d');
    moodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(moodCounts),
            datasets: [{
                label: 'Mood Frequency',
                data: Object.values(moodCounts),
                backgroundColor: `color-mix(in srgb, var(--accent-color) 40%, white)`
            }]
        }
    });
}

// Initialize
document.getElementById('currentMonth').textContent = 
    currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
updateChart();