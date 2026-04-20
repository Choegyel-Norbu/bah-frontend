import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

/**
 * Minimalist auth layout without images.
 * Focuses purely on typography and the form.
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-white px-6 py-6 sm:static sm:border-0 sm:px-8 lg:px-12">
        <Link 
          to="/" 
          className="group flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-secondary/80 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to store
        </Link>

        {/* Optional right-side actions could go here */}
        <div className="w-[100px] hidden sm:block" aria-hidden="true"></div> 
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h1 className="text-3xl font-brand text-primary mb-3">{title}</h1>
            {subtitle && (
              <p className="text-secondary text-base">{subtitle}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
      
      {/* Simple Footer */}
      <footer className="py-6 text-center text-xs text-tertiary">
        &copy; {new Date().getFullYear()} AttireHub. All rights reserved.
      </footer>
    </div>
  );
}
