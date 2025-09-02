document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const nav = document.querySelector('nav');
    const heroSection = document.querySelector('.hero-section');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    const menuButton = document.getElementById('menuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const menuButtonProject = document.getElementById('menuButtonProject');
    const mobileMenuProject = document.getElementById('mobileMenuProject');
  
    // Immediately set the theme color for the hero section
    if (heroSection && themeColorMeta) {
        themeColorMeta.setAttribute('content', '#1a1a2e');
    }
  
    // Mobile menu toggle functionality - consolidated
    const setupMobileMenu = (button, menu) => {
        if (!button || !menu) return;
        
        const toggleMenu = () => {
            menu.classList.toggle('menu-open');
            menu.classList.toggle('menu-closed');
        };
        
        button.addEventListener('click', toggleMenu);
        
        // Close menu on link click
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('menu-open');
                menu.classList.add('menu-closed');
            });
        });
    };
    
    // Setup both menus
    setupMobileMenu(menuButton, mobileMenu);
    setupMobileMenu(menuButtonProject, mobileMenuProject);
  
    // Optimized navigation theme switching
    const updateNav = () => {
        if (heroSection) {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            const isScrolledPastHero = window.scrollY >= heroBottom - nav.offsetHeight;
            
            // Update theme color
            if (themeColorMeta) {
                const color = isScrolledPastHero ? '#ffffff' : '#1a1a2e';
                themeColorMeta.setAttribute('content', color);
                document.querySelectorAll('meta[name="theme-color"][media]').forEach(meta => {
                    meta.setAttribute('content', color);
                });
            }
    
            // Apply theme classes
            const theme = isScrolledPastHero ? 'light' : 'dark';
            nav.className = nav.className.replace(/nav-(light|dark)/g, '') + ` nav-${theme}`;
            
            if (menuButton) {
                menuButton.className = menuButton.className
                    .replace(/text-gray-(300|700)/g, '')
                    .replace(/hover:text-(white|gray-900)/g, '') +
                    ` text-gray-${theme === 'light' ? '700' : '300'} hover:text-${theme === 'light' ? 'gray-900' : 'white'}`;
            }
            
            if (mobileMenu) {
                mobileMenu.className = mobileMenu.className.replace(/mobile-menu-(light|dark)/g, '') + ` mobile-menu-${theme}`;
            }
        } else {
            // Project pages - always light theme
            nav.classList.add('nav-light');
            themeColorMeta?.setAttribute('content', '#ffffff');
            menuButtonProject?.classList.add('text-gray-700');
            mobileMenuProject?.classList.add('mobile-menu-light');
        }
    };
  
    // Throttled scroll listener for better performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
            updateNav();
            scrollTimeout = null;
        }, 16); // ~60fps
    });
    
    // Initial run
    updateNav();
    
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe sections for fade-in effect
    document.querySelectorAll('#about, #projects, #hobbies, #contact').forEach(section => {
        observer.observe(section);
    });
});