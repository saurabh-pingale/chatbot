export function createLoader() {
  const loader = document.createElement('div');
  loader.className = 'circular-loader';
  
  loader.innerHTML = `
    <svg class="circular-loader-svg" viewBox="25 25 50 50">
      <circle class="loader-path" cx="50" cy="50" r="20" fill="none" stroke-width="3" stroke-miterlimit="10"/>
    </svg>
  `;
  
  return loader;
}