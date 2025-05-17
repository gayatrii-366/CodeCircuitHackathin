// Login logic - save username and redirect to tracker.html
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
   if(username && username.length >= 2 && username.length <= 20) {
    localStorage.setItem('moodTabletUsername', username);
    window.location.href = 'tracker.html';
} else {
    alert('Username must be 2-20 characters long!');
}
});