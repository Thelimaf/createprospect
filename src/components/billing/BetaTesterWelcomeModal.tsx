import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';

interface BetaTesterWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function BetaTesterWelcomeModal({ open, onClose }: BetaTesterWelcomeModalProps) {
  const handleInstagramClick = () => {
    window.open('https://www.instagram.com/thelimaf/', '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center py-4">
          {/* Animated crown icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
            className="relative mb-6"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30">
              <Crown className="w-10 h-10 text-primary-foreground" />
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            🎉 Parabéns! Você é um Beta Tester!
          </motion.h2>

          {/* Main message */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-primary font-semibold mb-4"
          >
            Você agora é um usuário PRO com acesso completo!
          </motion.p>

          {/* Thank you message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-secondary/50 rounded-lg p-4 mb-6 max-w-sm"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              Agradeço por ser um usuário tester! Espero que o sistema funcione como você imagina. 
              Qualquer dúvida ou bug, reporte a mim:{' '}
              <button
                onClick={handleInstagramClick}
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Instagram className="w-4 h-4" />
                @thelimaf
              </button>
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <Button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground font-semibold py-3 shadow-lg shadow-primary/30"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Começar a Prospectar
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
