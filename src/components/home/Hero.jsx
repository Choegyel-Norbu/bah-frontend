import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HERO_CULTURE_IMAGES = [
  {
    src: 'https://authenticbhutantours.com/wp-content/uploads/2016/11/itinerary-main-textile-tour.jpg',
    alt: 'Bhutanese artisan weaving traditional textile',
  },
  {
    src: 'https://www.longchenpatours.com/wp-content/uploads/2024/02/retouch_2024011722074268-Large.jpeg',
    alt: 'Bhutanese artisan shaping a clay sculpture',
  },
  {
    src: 'https://drukcdn.blob.core.windows.net/www/images/media/arts4.webp',
    alt: 'Bhutanese artisan carving wood artwork',
  },
  {
    src: 'https://amen-api.flamingoitstudio.net/media/attachments/clay-0-0.jpg',
    alt: 'Bhutanese potter crafting clay vessels',
  },
  {
    src: 'https://tripjive.com/wp-content/uploads/2024/11/unique-artisan-products-Thimphu-1024x585.jpg',
    alt: 'Thimphu artisan market with traditional crafts',
  },
];

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-[#FBF7F2]">
      <div className="absolute inset-0 opacity-50">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(122,68,35,0.06) 25%, transparent 25%), linear-gradient(225deg, rgba(122,68,35,0.06) 25%, transparent 25%), linear-gradient(45deg, rgba(122,68,35,0.06) 25%, transparent 25%), linear-gradient(315deg, rgba(122,68,35,0.06) 25%, #FBF7F2 25%)',
            backgroundPosition: '16px 0, 16px 0, 0 0, 0 0',
            backgroundSize: '32px 32px',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="relative grid min-h-[72vh] grid-cols-1 lg:min-h-[86vh] lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 flex flex-col justify-center px-4 py-14 sm:px-6 sm:py-20 lg:col-span-6 lg:px-12 xl:px-16"
        >
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-4 flex items-center gap-3 sm:mb-6"
            >
              <span className="h-px w-8 bg-[#7A4423]/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#7A4423] sm:text-xs">
                Inspired By Druk Yul
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
              className="font-display mb-6 text-4xl font-semibold leading-[1.08] text-[#2E1D14] sm:mb-8 sm:text-6xl sm:leading-[1.02] lg:text-7xl xl:text-[5rem]"
            >
              Contemporary Style, <br />
              <span className="italic text-[#7A4423]/85">Rooted in Bhutan.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mb-8 max-w-lg text-sm leading-relaxed text-[#4F3427]/80 sm:mb-10 sm:text-base"
            >
              Discover modern pieces influenced by Bhutanese craftsmanship, mountain calm, and the rich color stories of
              traditional weaves. Designed for everyday wear with heritage at heart.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <Link
                to="/products"
                className="group relative flex min-h-11 items-center justify-center overflow-hidden rounded-full border border-[#7A4423] bg-[#7A4423] px-7 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white transition-all duration-300 hover:bg-[#64361d] hover:border-[#64361d] hover:shadow-xl hover:shadow-[#7A4423]/20 sm:text-[13px]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Shop Bhutan Edit
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                to="/products?newArrivalsOnly=true"
                className="group flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#7A4423]/25 bg-white/70 px-7 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#472B1D] transition-colors hover:bg-white sm:text-[13px]"
              >
                <span>New Arrivals</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7 }}
              className="mt-7 grid max-w-lg grid-cols-1 gap-2 text-[11px] uppercase tracking-[0.16em] text-[#6B4B38] sm:mt-8 sm:grid-cols-3"
            >
              <span className="rounded-full border border-[#7A4423]/20 bg-white/70 px-3 py-2 text-center">Heritage Tones</span>
              <span className="rounded-full border border-[#7A4423]/20 bg-white/70 px-3 py-2 text-center">Craft Inspired</span>
              <span className="rounded-full border border-[#7A4423]/20 bg-white/70 px-3 py-2 text-center">Modern Fit</span>
            </motion.div>
          </div>
        </motion.div>

        <div className="relative h-[54vh] min-h-[320px] overflow-hidden bg-[#EDE2D7] p-4 sm:h-[62vh] sm:p-5 lg:col-span-6 lg:h-auto lg:min-h-0 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_45%)]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative h-full"
          >
            <div className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-hide lg:hidden">
              {HERO_CULTURE_IMAGES.map((image) => (
                <article
                  key={image.src}
                  className="group relative h-full min-w-[74%] snap-center overflow-hidden rounded-2xl border border-white/40 shadow-lg"
                >
                  <img src={image.src} alt={image.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                </article>
              ))}
            </div>

            <div className="hidden h-full grid-cols-6 grid-rows-6 gap-3 lg:grid">
              <article className="group relative col-span-4 row-span-3 overflow-hidden rounded-3xl border border-white/40 shadow-xl">
                <img
                  src={HERO_CULTURE_IMAGES[0].src}
                  alt={HERO_CULTURE_IMAGES[0].alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
              </article>

              <article className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-white/40 shadow-lg">
                <img
                  src={HERO_CULTURE_IMAGES[1].src}
                  alt={HERO_CULTURE_IMAGES[1].alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </article>

              <article className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-white/40 shadow-lg">
                <img
                  src={HERO_CULTURE_IMAGES[2].src}
                  alt={HERO_CULTURE_IMAGES[2].alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </article>

              <article className="group relative col-span-3 row-span-3 overflow-hidden rounded-2xl border border-white/40 shadow-lg">
                <img
                  src={HERO_CULTURE_IMAGES[3].src}
                  alt={HERO_CULTURE_IMAGES[3].alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </article>

              <article className="group relative col-span-3 row-span-3 overflow-hidden rounded-2xl border border-white/40 shadow-lg">
                <img
                  src={HERO_CULTURE_IMAGES[4].src}
                  alt={HERO_CULTURE_IMAGES[4].alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </article>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="absolute right-7 top-7 hidden rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md lg:block"
          >
            <div className="text-right text-white">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em]">Bhutan Artisan Stories</span>
              <span className="block font-brand text-base">Living Heritage</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
