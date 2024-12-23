document.addEventListener('DOMContentLoaded', function() {
    // Common elements
    const nav = document.querySelector('nav');
    const heroSection = document.querySelector('.hero-section');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  
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
    
        // Close mobile menu on link click
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
    
        // Close mobile menu on link click
        const mobileMenuProjectLinks = mobileMenuProject.querySelectorAll('a');
        mobileMenuProjectLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuProject.classList.remove('menu-open');
                mobileMenuProject.classList.add('menu-closed');
            });
        });
    }
  
    // Function to update navigation styles and Android nav bar color
    const updateNav = () => {
        // If there's a hero section, this is the main page
        if (heroSection) {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            const isScrolledPastHero = window.scrollY >= heroBottom - nav.offsetHeight;
    
            if (isScrolledPastHero) {
                // Switch to light nav
                nav.classList.remove('nav-dark');
                nav.classList.add('nav-light');
    
                // Update Android nav bar color to white
                if (themeColorMeta) {
                    themeColorMeta.setAttribute('content', '#ffffff');
                }
    
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
    
                // Update Android nav bar color to match hero background
                if (themeColorMeta) {
                    themeColorMeta.setAttribute('content', '#1a1a2e');
                }
    
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
            nav.classList.add('nav-light');
            
            // Set Android nav bar to white for project pages
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', '#ffffff');
            }
    
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
  
    // Add scroll event listener
    window.addEventListener('scroll', updateNav);
    // Initial run
    updateNav();
});