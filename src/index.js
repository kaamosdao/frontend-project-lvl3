import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const form = document.querySelector('form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  alert('It\'s alive!');
});
