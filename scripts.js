document.addEventListener('DOMContentLoaded', function() {
    // Common elements
    const nav = document.querySelector('nav');
    const heroSection = document.querySelector('.hero-section');
  
    // Main page selectors
    const menuButton = document.getElementById('menuButton');
    const mobileMenu = document.getElementById('mobileMenu');
  
    // Project page selectors
    const menuButtonProject = document.getElementById('menuButtonProject');
    const mobileMenuProject = document.getElementById('mobileMenuProject');
  
    // Toggle mobile menu (main page)
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
  
      // 1) Close mobile menu on link click (main page)
      const mobileMenuLinks = mobileMenu.querySelectorAll('a');
      mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('menu-open');
          mobileMenu.classList.add('menu-closed');
        });
      });
    }
  
    // Toggle mobile menu (project page)
    if (menuButtonProject && mobileMenuProject) {
      menuButtonProject.addEventListener('click', () => {
        if (mobileMenuProject.classList.contains('menu-closed')) {
          mobileMenuProject.classList.remove('menu-closed');
          mobileMenuProject.classList.add('menu-open');
        } else {
          mobileMenuProject.classList.remove('menu-open');
          mobileMenuProject.classList.add('menu-closed');
        }
      });
  
      // 2) Close mobile menu on link click (project page)
      const mobileMenuProjectLinks = mobileMenuProject.querySelectorAll('a');
      mobileMenuProjectLinks.forEach(link => {
        link.addEventListener('click', () => {
          mobileMenuProject.classList.remove('menu-open');
          mobileMenuProject.classList.add('menu-closed');
        });
      });
    }
  
    // Dynamically change nav color (and mobile menu color) on scroll
    const updateNav = () => {
      // If there's a hero section, this is the main page
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  
        if (window.scrollY >= heroBottom - nav.offsetHeight) {
          // Switch to light nav
          nav.classList.remove('nav-dark');
          nav.classList.add('nav-light');
  
          // Change the hamburger to match light nav
          if (menuButton) {
            menuButton.classList.remove('text-gray-300', 'hover:text-white');
            menuButton.classList.add('text-gray-700', 'hover:text-gray-900');
          }
  
          if (mobileMenu) {
            mobileMenu.classList.remove('mobile-menu-dark');
            mobileMenu.classList.add('mobile-menu-light');
          }
  
        } else {
          // Switch to dark nav
          nav.classList.remove('nav-light');
          nav.classList.add('nav-dark');
  
          if (menuButton) {
            menuButton.classList.remove('text-gray-700', 'hover:text-gray-900');
            menuButton.classList.add('text-gray-300', 'hover:text-white');
          }
  
          if (mobileMenu) {
            mobileMenu.classList.remove('mobile-menu-light');
            mobileMenu.classList.add('mobile-menu-dark');
          }
        }
  
      } else {
        // For pages without hero (project pages)
        nav.classList.add('nav-light'); // Usually always light
  
        if (menuButtonProject) {
          menuButtonProject.classList.remove('text-gray-300');
          menuButtonProject.classList.add('text-gray-700');
        }
  
        if (mobileMenuProject) {
          mobileMenuProject.classList.remove('mobile-menu-dark');
          mobileMenuProject.classList.add('mobile-menu-light');
        }
      }
    };
  
    window.addEventListener('scroll', updateNav);
    updateNav(); // Initial run
  });
  