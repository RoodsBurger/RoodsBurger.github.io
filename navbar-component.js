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
      const navClasses = this.isDark ? 'nav-dark' : 'nav-light';
      const mobileMenuClasses = this.isDark ? 'mobile-menu-dark' : 'bg-white';
      const buttonClasses = this.isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900';
  
      this.innerHTML = `
        <nav class="fixed w-full z-50 transition-colors duration-300 ${navClasses} h-16" id="mainNav">
          <div class="container mx-auto px-6 h-full">
            <div class="flex items-center justify-between h-full">
              <!-- Logo -->
              <a href="${this.basePath}" class="text-xl font-mono font-medium flex items-center logo-text">
                <span class="text-blue-600">{</span>
                Rodolfo Raimundo
                <span class="text-blue-600">}</span>
              </a>
  
              <!-- Desktop Nav -->
              <div class="hidden md:flex space-x-8">
                <a href="${this.basePath}#about">About</a>
                <a href="${this.basePath}#projects">Projects</a>
                <a href="${this.basePath}#hobbies">Beyond Tech</a>
                <a href="${this.basePath}#contact">Contact</a>
              </div>
  
              <!-- Hamburger Button -->
              <button class="md:hidden ${buttonClasses} focus:outline-none focus:ring-2 focus:ring-blue-600 p-2 rounded">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
  
          <!-- Mobile Menu -->
          <div class="md:hidden menu-animation menu-closed absolute top-16 left-0 w-full ${mobileMenuClasses} z-50 shadow-lg">
            <div class="container mx-auto px-6 py-4 flex flex-col space-y-4 items-end">
              <a href="${this.basePath}#about">About</a>
              <a href="${this.basePath}#projects">Projects</a>
              <a href="${this.basePath}#hobbies">Beyond Tech</a>
              <a href="${this.basePath}#contact">Contact</a>
            </div>
          </div>
        </nav>
      `;
  
      if (this.isDark) {
        this.setupScrollListener();
      }
    }
  
    setupEventListeners() {
      const button = this.querySelector('button');
      const mobileMenu = this.querySelector('.menu-animation');
  
      button?.addEventListener('click', () => {
        mobileMenu.classList.toggle('menu-closed');
        mobileMenu.classList.toggle('menu-open');
      });
  
      mobileMenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.add('menu-closed');
          mobileMenu.classList.remove('menu-open');
        });
      });
    }
  
    setupScrollListener() {
      const heroSection = document.querySelector('.hero-section');
      const nav = this.querySelector('nav');
      const mobileMenu = this.querySelector('.menu-animation');
      const button = this.querySelector('button');
  
      const updateNav = () => {
        if (!heroSection || !nav) return;
        
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        const isScrolledPastHero = window.scrollY >= heroBottom - nav.offsetHeight;
  
        nav.className = `fixed w-full z-50 transition-colors duration-300 ${isScrolledPastHero ? 'nav-light' : 'nav-dark'} h-16`;
        
        if (isScrolledPastHero) {
          mobileMenu?.classList.remove('mobile-menu-dark');
          mobileMenu?.classList.add('bg-white');
          button?.classList.remove('text-gray-300', 'hover:text-white');
          button?.classList.add('text-gray-700', 'hover:text-gray-900');
        } else {
          mobileMenu?.classList.add('mobile-menu-dark');
          mobileMenu?.classList.remove('bg-white');
          button?.classList.add('text-gray-300', 'hover:text-white');
          button?.classList.remove('text-gray-700', 'hover:text-gray-900');
        }
      };
  
      window.addEventListener('scroll', updateNav);
      updateNav();
    }
  }
  
  customElements.define('nav-bar', NavBar);