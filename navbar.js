document.addEventListener('DOMContentLoaded', function() {
    const heroSection = document.querySelector('.hero-section');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    // Function to update Android navigation bar color
    const updateAndroidNavColor = () => {
        if (heroSection && themeColorMeta) {
            const heroRect = heroSection.getBoundingClientRect();
            // If hero section is still visible (not scrolled past it)
            if (heroRect.bottom > 0) {
                themeColorMeta.content = '#1a1a2e'; // Dark color for hero section
            } else {
                themeColorMeta.content = '#ffffff'; // White for rest of the page
            }
        }
    };

    // Add scroll event listener with throttling
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateAndroidNavColor();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initial run
    updateAndroidNavColor();
});