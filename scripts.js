// Navigation color change on scroll
document.addEventListener('DOMContentLoaded', function() {
    const nav = document.querySelector('nav');
    const heroSection = document.querySelector('.hero-section');
    
    const updateNav = () => {
        // If we're on a page with hero section
        if (heroSection) {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            if (window.scrollY >= heroBottom - nav.offsetHeight) {
                nav.classList.remove('nav-dark');
                nav.classList.add('nav-light');
            } else {
                nav.classList.remove('nav-light');
                nav.classList.add('nav-dark');
            }
        } else {
            // For pages without hero section (like project pages)
            nav.classList.add('nav-light');
        }
    };

    window.addEventListener('scroll', updateNav);
    updateNav();
});