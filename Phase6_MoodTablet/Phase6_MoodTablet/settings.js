// Theme picker logic
const colorPicker = document.getElementById('accentColorPicker');

// Load saved color or default
try {
    const savedColor = localStorage.getItem('moodTabletAccentColor') || '#FF4081';
    colorPicker.value = savedColor;
    document.documentElement.style.setProperty('--accent-color', savedColor);
} catch (error) {
    console.error('Error accessing theme settings:', error);
    colorPicker.value = '#FF4081'; // Fallback to default
}

colorPicker.addEventListener('input', function() {
    const selectedColor = colorPicker.value;
    localStorage.setItem('moodTabletAccentColor', selectedColor);
    document.documentElement.style.setProperty('--accent-color', selectedColor);
});