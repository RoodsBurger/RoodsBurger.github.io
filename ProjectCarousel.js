import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';


const ProjectCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const projects = [
    {
      title: "Tobias",
      description: "Computer vision system enabling robots to recognize and manipulate objects with high precision.",
      image: "/artifacts/tobias_render_1.png",
      link: "projects/tobias.html",
      category: "Reinforcement Learning",
      tags: ["Fusion", "PyTorch"]
    },
    {
      title: "Knolling Bot",
      description: "Real-time anomaly detection system using sensor fusion and deep learning.",
      image: "/artifacts/knolling_main.jpg",
      category: "Machine Learning",
      tags: ["YOLO", "Diffusion"]
    },
    {
      title: "Autonomous Navigation",
      description: "SLAM-based navigation system with reinforcement learning for adaptive path planning.",
      image: "/api/placeholder/400/300",
      category: "Robotics",
      tags: ["C++", "ROS"]
    },
    {
      title: "Computer Vision Pipeline",
      description: "Advanced vision processing pipeline for industrial automation applications.",
      image: "/api/placeholder/400/300",
      category: "Computer Vision",
      tags: ["OpenCV", "TensorFlow"]
    },
    {
      title: "Robot Learning System",
      description: "Innovative robot learning framework using imitation learning and reinforcement learning.",
      image: "/api/placeholder/400/300",
      category: "AI",
      tags: ["PyTorch", "ROS2"]
    }
  ];

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < projects.length - 3;

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

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
        >
          {projects.map((project, index) => (
            <div key={index} className="w-1/3 flex-shrink-0 px-4">
              <div className="project-card rounded-xl overflow-hidden">
                <div className="relative">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {project.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {project.description}
                  </p>
                  <div className="flex gap-2 text-sm">
                    {project.tags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex} 
                        className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={scrollLeft}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white p-2 rounded-full shadow-lg ${
          canScrollLeft ? 'opacity-100 hover:bg-gray-50' : 'opacity-0 cursor-default'
        }`}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="w-6 h-6 text-gray-600" />
      </button>

      <button
        onClick={scrollRight}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white p-2 rounded-full shadow-lg ${
          canScrollRight ? 'opacity-100 hover:bg-gray-50' : 'opacity-0 cursor-default'
        }`}
        disabled={!canScrollRight}
      >
        <ChevronRight className="w-6 h-6 text-gray-600" />
      </button>
    </div>
  );
};

export default ProjectCarousel;