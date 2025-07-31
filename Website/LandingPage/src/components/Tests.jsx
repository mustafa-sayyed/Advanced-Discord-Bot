import React, { useState } from "react";
import images from "../constants";
import { motion } from "framer-motion";

const SliderCard = () => {
  const [index, setIndex] = useState(0);
  const visibleCount = 3;
  const cardWidth = 360;
  const gap = 20;

  const next = () => {
    if (index < images.length - visibleCount) {
      setIndex((prev) => prev + 1);
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="w-full min-h-[60vh] px-6 py-10 bg-zinc-900 relative flex flex-col items-center justify-center">
      <div className="text-center mb-6">
        <h2 className="text-white text-4xl font-bold mb-2">Feature Gallery</h2>
        <p className="text-zinc-400 text-base">Scroll through bot features</p>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        disabled={index === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full disabled:opacity-30"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={next}
        disabled={index >= images.length - visibleCount}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full disabled:opacity-30"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Slider */}
      <div className="w-[1100px] mt-4 relative">
        <motion.div
          className="flex gap-5"
          animate={{ x: -index * (cardWidth + gap) }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              className="w-[360px] h-[240px] bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_20px_#2ee6f7] flex-shrink-0"
            >
              <img
                src={img.src}
                alt={img.id}
                className="w-full h-[200px] object-contain bg-zinc-900"
              />
              <div className="text-center text-white text-sm font-medium py-1">
                {img.id}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default SliderCard;
