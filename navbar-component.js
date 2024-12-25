// navbar-component.js
class NavBar extends HTMLElement {
    constructor() {
      super();
      this.isDark = this.getAttribute('theme') === 'dark';
      this.basePath = this.getAttribute('base-path') || '.';
    }
  
    getPath(path) {
      if (path.startsWith('#')) return path;
      if (path === 'index.html') return this.basePath;
      return `${this.basePath}/${path}`;
    }
  
    connectedCallback() {
      this.render();
      this.setupEventListeners();
    }
  
    render() {
      this.innerHTML = `
        <nav class="fixed w-full z-50 transition-colors duration-300 ${this.isDark ? 'nav-dark' : 'nav-light'} h-16" id="mainNav">
          <div class="container mx-auto px-6 h-full">
            <div class="flex items-center justify-between h-full">
              <!-- Logo -->
              <a href="${this.basePath}" class="text-xl font-mono font-medium flex items-center logo-text">
                <span class="text-blue-600">{</span>
                Rodolfo Raimundo
                <span class="text-blue-600">}</span>
              </a>
  
              <!-- Desktop Nav -->
              <div class="hidden md:flex space-x-8" id="navMenu">
                <a href="${this.getPath('index.html')}#about">About</a>
                <a href="${this.getPath('index.html')}#projects">Projects</a>
                <a href="${this.getPath('index.html')}#hobbies">Beyond Tech</a>
                <a href="${this.getPath('index.html')}#contact">Contact</a>
              </div>
  
              <!-- Hamburger Button -->
              <button 
                class="md:hidden ${this.isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-600 p-2 rounded"
                id="menuButton">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
  
          <!-- Mobile Menu -->
          <div id="mobileMenu" 
               class="md:hidden menu-animation menu-closed absolute top-16 left-0 w-full bg-white z-50">
            <div class="container mx-auto px-6 py-4 flex flex-col space-y-4">
              <a href="${this.getPath('index.html')}#about">About</a>
              <a href="${this.getPath('index.html')}#projects">Projects</a>
              <a href="${this.getPath('index.html')}#hobbies">Beyond Tech</a>
              <a href="${this.getPath('index.html')}#contact">Contact</a>
            </div>
          </div>
        </nav>
      `;
    }
  
    setupEventListeners() {
      const menuButton = this.querySelector('#menuButton');
      const mobileMenu = this.querySelector('#mobileMenu');
  
      if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
          if (mobileMenu.classList.contains('menu-closed')) {
            mobileMenu.classList.remove('menu-closed');
            mobileMenu.classList.add('menu-open');
          } else {
            mobileMenu.classList.remove('menu-open');
            mobileMenu.classList.add('menu-closed');
          }
        });
  
        // Close mobile menu on link click
        const mobileMenuLinks = mobileMenu.querySelectorAll('a');
        mobileMenuLinks.forEach(link => {
          link.addEventListener('click', () => {
            mobileMenu.classList.remove('menu-open');
            mobileMenu.classList.add('menu-closed');
          });
        });
      }
    }
  }
  
  customElements.define('nav-bar', NavBar);