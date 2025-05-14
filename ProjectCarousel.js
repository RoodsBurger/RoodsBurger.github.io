const { useState, useRef } = React;

// SVG components remain the same
const ChevronLeft = () => React.createElement('svg', {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "w-8 h-8 text-gray-400 transition-colors duration-200 hover:text-blue-600"
}, React.createElement('polyline', { points: "15 18 9 12 15 6" }));

const ChevronRight = () => React.createElement('svg', {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "w-8 h-8 text-gray-400 transition-colors duration-200 hover:text-blue-600"
}, React.createElement('polyline', { points: "9 18 15 12 9 6" }));

const ProjectCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update isMobile state on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categoryColors = {
    'Natural Language Processing': 'bg-purple-600', 
    'Reinforcement Learning': 'bg-blue-600',
    'Deep Learning': 'bg-green-600',
    'Computational Neuroscience': 'bg-yellow-600',
    'Industrial Design': 'bg-red-600',
    'Robotics': 'bg-indico-600'
  };

  const projects = [
    {
      title: "Tobias",
      description: "4-legged robot project that integrates CAD Design, Physics Simulation, and Reinforcement Learning to achieve stable walking gaits and straight-line locomotion.",
      image: "/artifacts/tobias_render_2.png",
      link: "projects/tobias.html",
      category: "Reinforcement Learning",
      tags: ["PyTorch", "Fusion", "PyBullet"]
    },
    {
      title: "TidyNET",
      description: "End-to-end Computer Vision model that combines a diffusion model, YOLO object detection, and control module to transform cluttered object arrangements into organized setups.",
      image: "/artifacts/knolling_main.jpg",
      link: "projects/knolling.html",
      category: "Deep Learning",
      tags: ["YOLO", "Diffusion", "ControlNet"]
    },
    {
      title: "LLM-Based Assistant",
      description: "Custom vector database-powered chatbot that integrates LLMs with serverless functions to provide contextual information about my portfolio, projects, and experience.",
      image: "/artifacts/chat_diagram.png",
      link: "projects/chat-project.html",
      category: "Natural Language Processing",
      tags: ["Cohere", "Pinecone", "Netlify"]
    },
    {
      title: "Artificial Synaptic Pruning",
      description: "Novel neural network optimization approach that applies biological pruning principles to improve model performance while significantly reducing computational requirements.",
      image: "/artifacts/cnn_diagram.png",
      link: "projects/pruning.html",
      category: "Computational Neuroscience",
      tags: ["Keras", "TensorFlow"]
    },
    {
      title: "Magnetic Wallet",
      description: "Minimalist wallet design that uses magnets for smooth opening/closing and an innovative card presentation system.",
      image: "/artifacts/wallet_render.png",
      link: "projects/wallet.html",
      category: "Industrial Design",
      tags: ["Fusion", "3D Printing"]
    }
  ];

  // Items per page for desktop vs mobile
  const itemsPerPage = isMobile ? 1 : 3;
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < projects.length - itemsPerPage;

  // MOUSE events
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.pageX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dragDistance = e.pageX - dragStart;
    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.1;

    if (Math.abs(dragDistance) > threshold) {
      if (dragDistance > 0 && canScrollLeft) {
        scrollLeft();
      } else if (dragDistance < 0 && canScrollRight) {
        scrollRight();
      }
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // TOUCH events (mirroring mouse)
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const dragDistance = e.touches[0].clientX - dragStart;
    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.1;

    if (Math.abs(dragDistance) > threshold) {
      if (dragDistance > 0 && canScrollLeft) {
        scrollLeft();
      } else if (dragDistance < 0 && canScrollRight) {
        scrollRight();
      }
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Arrow click logic
  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Renders each project
  const renderProject = (project, index) => {
    return React.createElement('div', { 
      key: index, 
      className: `w-full md:w-1/3 flex-shrink-0 px-4 py-2` 
    }, 
      React.createElement('a', {
        href: project.link,
        className: "project-card rounded-xl overflow-hidden block h-full transform transition duration-200 hover:-translate-y-2 hover:shadow-lg flex flex-col"
      }, [
        React.createElement('div', { 
          key: 'image-container',
          className: 'relative'
        }, [
          React.createElement('img', {
            key: 'project-image',
            src: project.image,
            alt: project.title,
            className: 'w-full h-72 object-cover',
            draggable: false
          }),
          React.createElement('div', {
            key: 'category',
            className: `absolute top-4 right-4 ${categoryColors[project.category] || 'bg-blue-600'} text-white text-xs px-2 py-1 rounded-full`
          }, project.category)
        ]),
        React.createElement('div', {
          key: 'content',
          className: 'p-6 flex flex-col flex-grow'
        }, [
          React.createElement('h3', {
            key: 'title',
            className: 'text-lg font-semibold text-gray-900 mb-2'
          }, project.title),
          React.createElement('p', {
            key: 'description',
            className: 'text-gray-600 text-sm mb-4 line-clamp-3 flex-grow'
          }, project.description),
          React.createElement('div', {
            key: 'tags',
            className: 'flex gap-2 text-sm'
          }, project.tags.map((tag, tagIndex) => 
            React.createElement('span', {
              key: tagIndex,
              className: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full'
            }, tag)
          ))
        ])
      ])
    );
  };

  // Create progress indicators
  const progressDots = Array.from({ length: projects.length - (itemsPerPage - 1) }).map((_, i) => 
    React.createElement('div', {
      key: `dot-${i}`,
      className: `h-1 rounded-full transition-all duration-300 ${
        i === currentIndex ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200 hover:bg-blue-200'
      }`
    })
  );

  return React.createElement('div', {
    className: 'relative pb-16'
  }, [
    React.createElement('div', {
      key: 'carousel-container',
      className: 'relative'
    }, [
      React.createElement('div', {
        key: 'carousel-content',
        className: 'overflow-hidden select-none',
        ref: containerRef,
        // MOUSE events
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseLeave,
        // TOUCH events
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      }, 
        React.createElement('div', {
          className: `flex transition-transform duration-300 ease-in-out ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`,
          style: { transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }
        }, projects.map(renderProject))
      )
    ]),
    // Progress / arrows container
    React.createElement('div', {
      key: 'progress',
      // Minimal change to ensure everything is horizontally centered
      className: 'absolute bottom-3 inset-x-0 flex justify-center items-center gap-6'
    }, [
      React.createElement('button', {
        key: 'left-button-bottom',
        onClick: scrollLeft,
        className: `transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 cursor-default'
        }`,
        disabled: !canScrollLeft,
        'aria-label': 'Previous projects'
      }, React.createElement(ChevronLeft)),
      React.createElement('div', {
        key: 'dots',
        className: 'flex gap-2'
      }, progressDots),
      React.createElement('button', {
        key: 'right-button-bottom',
        onClick: scrollRight,
        className: `transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0 cursor-default'
        }`,
        disabled: !canScrollRight,
        'aria-label': 'Next projects'
      }, React.createElement(ChevronRight))
    ])
  ]);
};

export default ProjectCarousel;
