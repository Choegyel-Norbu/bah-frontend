import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-quaternary">
      <div className="grid min-h-[70vh] grid-cols-1 lg:min-h-[85vh] lg:grid-cols-12">
        {/* Left Content Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col justify-center bg-white px-4 py-12 sm:px-6 sm:py-20 lg:col-span-5 lg:px-12 xl:px-16"
        >
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-4 flex items-center gap-3 sm:mb-6"
            >
              <span className="h-px w-8 bg-primary/30"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 sm:text-xs">
                Spring / Summer 2026
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="font-display mb-6 text-4xl font-semibold leading-[1.1] text-primary sm:mb-8 sm:text-6xl sm:leading-[1.05] lg:text-7xl xl:text-[5rem]"
            >
              Curated <br />
              <span className="italic text-secondary/70">Elegance.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mb-8 max-w-md text-sm leading-relaxed text-secondary/70 sm:mb-10 sm:text-base"
            >
              Discover our new collection of timeless essentials, meticulously crafted to elevate your everyday wardrobe with effortless sophistication.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center"
            >
              <Link
                to="/products"
                className="group relative flex min-h-11 items-center justify-center overflow-hidden rounded-full border border-[#F8E8DE] bg-[#F8E8DE] px-7 py-3 text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-primary transition-all duration-300 hover:bg-[#f4d7c5] hover:border-[#f4d7c5] hover:shadow-xl hover:shadow-primary/10"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Shop Now
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              
              <Link
                to="/products?newArrivalsOnly=true"
                className="group flex min-h-11 items-center justify-center gap-2 rounded-full px-7 py-3 text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-primary transition-colors hover:bg-gray-50"
              >
                <span>New Arrivals</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Image Panel - Editorial Style */}
        <div className="relative h-[50vh] min-h-[300px] bg-[#F5F5F5] sm:h-[60vh] lg:col-span-7 lg:h-auto lg:min-h-0 overflow-hidden">
          {/* Main Background Image */}
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
              alt="Editorial fashion shot"
              className="h-full w-full object-cover object-top opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent lg:bg-transparent" />
          </motion.div>

          {/* Secondary Overlapping Image (Desktop Only) */}
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="absolute -bottom-12 -left-12 hidden h-[65%] w-[45%] overflow-hidden bg-white shadow-2xl lg:block"
            style={{ borderRadius: '0 4rem 0 0' }}
          >
            <div className="relative h-full w-full overflow-hidden p-2 bg-white">
               <div className="h-full w-full overflow-hidden" style={{ borderRadius: '0 3.5rem 0 0' }}>
                <img 
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop" 
                  alt="Detail shot" 
                  className="h-full w-full object-cover"
                />
               </div>
            </div>
          </motion.div>

          {/* Decorative Circle/Graphic */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute right-12 top-12 hidden h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-md lg:flex"
          >
            <div className="text-center text-white">
              <span className="block text-xs font-bold uppercase tracking-widest">Est.</span>
              <span className="block font-brand text-xl">2026</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
