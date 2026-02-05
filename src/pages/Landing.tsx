import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Database,
  Check,
  X,
  Building,
  Users,
  Zap,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  DollarSign,
  Lock,
  BarChart3,
  Flame,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Animated counter component
const AnimatedCounter = ({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, (duration * 1000) / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
};

// Navbar component
const Navbar = () => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-landing/80 backdrop-blur-xl border-b border-landing"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-landing-primary" />
            <span className="text-xl font-bold text-white">ProspectAI</span>
          </Link>

          {/* Nav links - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("como-funciona")}
              className="text-sm text-gray-400 hover:text-white transition-colors relative group"
            >
              Como Funciona
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-landing-primary group-hover:w-full transition-all duration-300" />
            </button>
            <button
              onClick={() => scrollToSection("precos")}
              className="text-sm text-gray-400 hover:text-white transition-colors relative group"
            >
              Preços
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-landing-primary group-hover:w-full transition-all duration-300" />
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm text-gray-400 hover:text-white transition-colors relative group"
            >
              FAQ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-landing-primary group-hover:w-full transition-all duration-300" />
            </button>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-landing-primary hover:opacity-90 text-white">
                  Ir para o Painel
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    className="text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-landing-primary hover:opacity-90 text-white glow-primary">
                    Começar Grátis
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

// Hero section
const HeroSection = () => {
  const [visitorCount, setVisitorCount] = useState(147);

  useEffect(() => {
    const interval = setInterval(() => {
      const variation = Math.floor(Math.random() * 15) - 7;
      setVisitorCount(prev => {
        const newValue = prev + variation;
        return Math.max(120, Math.min(200, newValue));
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-landing pt-20">
      {/* Animated purple blur orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-[hsl(250_95%_70%/0.25)] blur-[120px] animate-blur-1" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(270_90%_65%/0.2)] blur-[100px] animate-blur-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(280_85%_60%/0.15)] blur-[150px] animate-blur-3" />
        <div className="absolute top-[10%] right-[20%] w-[400px] h-[400px] rounded-full bg-[hsl(260_90%_65%/0.18)] blur-[100px] animate-blur-2" style={{ animationDelay: "5s" }} />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
        <div className="absolute top-1/4 left-[10%] animate-float">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
            <MapPin className="w-8 h-8 text-landing-primary" />
          </div>
        </div>
        <div className="absolute top-1/3 right-[15%] animate-float-delayed">
          <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-purple-light" />
          </div>
        </div>
        <div className="absolute bottom-1/3 left-[15%] animate-float-slow">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center">
            <Phone className="w-6 h-6 text-landing-primary" />
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-purple-light" />
              Prospecção inteligente com Google Maps
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
          >
            Prospecte Clientes com{" "}
            <span className="text-gradient-hero">Inteligência</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Use IA para encontrar clientes por região e começar a vender em minutos.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-landing-primary hover:opacity-90 text-white text-lg px-8 py-6 glow-purple group"
              >
                Começar Grátis
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => scrollToSection("como-funciona")}
              className="text-gray-300 hover:text-white hover:bg-white/5 text-lg px-8 py-6"
            >
              Ver Como Funciona
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-4 pt-4"
          >
            {/* Main indicators row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-300">
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(250_95%_70%/0.1)] border border-[hsl(250_95%_70%/0.2)]">
                <Check className="w-4 h-4 text-green-400" />
                R$0 em anúncios
              </span>
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(250_95%_70%/0.1)] border border-[hsl(250_95%_70%/0.2)]">
                <Zap className="w-4 h-4 text-yellow-400" />
                Funciona em 3 minutos
              </span>
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(250_95%_70%/0.1)] border border-[hsl(250_95%_70%/0.2)]">
                <Phone className="w-4 h-4 text-green-400" />
                +2.847 freelancers usando
              </span>
            </div>
            
            {/* Urgency indicator */}
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="transition-all duration-500">
                {visitorCount} pessoas acessaram esta página nas últimas 2 horas
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="w-6 h-6 text-gray-500 animate-bounce" />
      </motion.div>
    </section>
  );
};

// Glow Card component with mouse-following effect
const GlowCard = ({ 
  card 
}: { 
  card: { 
    number: string; 
    title: string; 
    subtitle: string; 
    description: string; 
    icon: React.ComponentType<{ className?: string }>; 
  } 
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const IconComponent = card.icon;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      variants={fadeUp}
      className="relative bg-landing-card rounded-2xl p-6 border border-landing hover:border-primary/40 transition-all duration-300 group overflow-hidden"
    >
      {/* Mouse glow effect */}
      <div
        className="pointer-events-none absolute w-48 h-48 rounded-full transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
          left: mousePosition.x - 96,
          top: mousePosition.y - 96,
          opacity: isHovering ? 1 : 0,
          filter: 'blur(40px)',
        }}
      />

      {/* Large number background */}
      <span className="absolute top-4 right-6 text-6xl font-bold text-white/5 group-hover:text-primary/10 transition-colors duration-300">
        {card.number}
      </span>

      <div className="relative z-10">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <IconComponent className="w-6 h-6 text-primary" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-primary mb-1">
          {card.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-400 mb-3">
          {card.subtitle}
        </p>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed">
          {card.description}
        </p>
      </div>
    </motion.div>
  );
};

// Top Freelancers Secret Section with Parallax
const TopFreelancersSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.02, 0.06, 0.06, 0.02]);

  const cards = [
    {
      number: "01",
      title: "Leads 100% REAIS",
      subtitle: "nada de lista fria",
      description: "Empresas ATIVAS extraídas direto do Google Maps. Sem base velha, sem contato inválido, sem perder seu tempo.",
      icon: ShieldCheck,
    },
    {
      number: "02",
      title: "WhatsApp DIRETO",
      subtitle: "zero enrolação",
      description: "Telefone, WhatsApp, e-mail e site na sua mão. Comece a prospectar em SEGUNDOS, não em dias.",
      icon: DollarSign,
    },
    {
      number: "03",
      title: "VOCÊ escolhe",
      subtitle: "cidade + nicho exato",
      description: "Dentistas em SP? Advogados no RJ? Restaurantes em BH? Você define EXATAMENTE quem quer abordar.",
      icon: Lock,
    },
    {
      number: "04",
      title: "Resultado HOJE",
      subtitle: "não em semanas",
      description: "Enquanto outros perdem MESES planejando, você fecha seu primeiro cliente em até 7 dias.",
      icon: BarChart3,
    },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 bg-landing overflow-hidden">
      {/* Grid background pattern with parallax */}
      <motion.div 
        style={{ y: backgroundY, opacity }}
        className="absolute inset-0 -top-[20%] -bottom-[20%]"
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsl(250 95% 70% / 0.4) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(250 95% 70% / 0.4) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </motion.div>
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(230_15%_8%)] via-transparent to-[hsl(230_15%_8%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(230_15%_8%)] via-transparent to-[hsl(230_15%_8%)]" />
      
      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[150px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex mb-8">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/20 border border-primary/40 text-sm font-medium text-primary">
              <Flame className="w-4 h-4" />
              O SEGREDO DOS TOP FREELANCERS
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Existem <span className="text-gradient-hero">32 MILHÕES</span> de empresas no Google Maps
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-xl sm:text-2xl text-gray-300 mb-8 font-medium"
          >
            Quantas você já contatou hoje?
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-gray-400 max-w-3xl mx-auto text-lg"
          >
            Com o <span className="text-primary font-semibold">ProspectAI</span>, você transforma o Google Maps na sua máquina de prospecção pessoal. Não dependa de sorte. Busque clientes ativamente.
          </motion.p>
        </motion.div>

        {/* Cards grid - 4 columns on desktop */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {cards.map((card) => (
            <GlowCard key={card.number} card={card} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Problem vs Solution section
const ProblemSolutionSection = () => {
  const solutionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(solutionRef, { once: false, amount: 0.3 });

  const problems = [
    "Prospecção manual é lenta e cansativa",
    "Google Maps desorganizado, sem exportação",
    "Copiando contatos um por um",
    "Horas perdidas sem fechar nenhum cliente",
  ];

  const solutions = [
    "Busque por nicho e cidade em segundos",
    "Receba lista de leads pronta para usar",
    "Clique e contate direto via WhatsApp",
    "Feche seu primeiro cliente em até 7 dias",
  ];

  return (
    <section className="py-28 bg-landing relative overflow-hidden">
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Do Problema à Solução
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Veja como o ProspectAI transforma sua prospecção
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Problem */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-2xl p-8 border border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">O Problema</h3>
            </div>
            <ul className="space-y-5">
              {problems.map((problem, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-gray-300 text-lg">{problem}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Solution */}
          <div ref={solutionRef} className="relative">
            {/* Animated blur behind solution card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 0.6 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute -inset-8 bg-primary/30 blur-[80px] rounded-full"
            />
            
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="relative glass-card rounded-2xl p-8 border border-primary/40 glow-purple bg-gradient-to-br from-primary/10 to-transparent"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white">A Solução</h3>
              </div>
              <ul className="space-y-5">
                {solutions.map((solution, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-300 text-lg">{solution}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// How it works section
const HowItWorksSection = () => {
  const steps = [
    {
      icon: Search,
      title: "Digite o nicho e a cidade",
      description: "Exemplo: 'Dentistas em São Paulo'",
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      icon: Database,
      title: "Geramos empresas reais",
      description: "Dados direto do Google Maps",
      color: "from-primary/20 to-purple-500/20",
    },
    {
      icon: MessageCircle,
      title: "Clique e prospecte",
      description: "WhatsApp, telefone, tudo pronto",
      color: "from-green-500/20 to-emerald-500/20",
    },
  ];

  return (
    <section id="como-funciona" className="py-28 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[150px] rounded-full" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-6">
            <Zap className="w-4 h-4" />
            Simples e Rápido
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Como Funciona
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Três passos simples para encontrar seus próximos clientes
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className="relative group"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="glass-card rounded-2xl p-8 text-center hover:-translate-y-2 transition-all duration-300 border border-white/5 hover:border-primary/30">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                    {index + 1}
                  </span>
                </div>
                
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Benefits section
const BenefitsSection = () => {
  const benefits = [
    { text: "Economize horas por semana", icon: Zap },
    { text: "Encontre clientes que você não conhecia", icon: Search },
    { text: "Prospecção local com alta conversão", icon: MapPin },
    { text: "Ideal para freelancers, agências e prestadores", icon: Users },
    { text: "Leads 100% reais e atualizados", icon: ShieldCheck },
    { text: "WhatsApp direto com 1 clique", icon: MessageCircle },
  ];

  return (
    <section className="py-28 bg-landing relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Benefits list */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              Vantagens
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-10">
              Por que usar <span className="text-gradient-hero">ProspectAI</span>?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-gray-300">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Mockup */}
          <motion.div
            variants={slideInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
            
            <div className="relative glass-card rounded-2xl p-6 glow-primary border border-primary/30">
              {/* Fake app interface */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 ml-2">ProspectAI Dashboard</span>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-2">Busca:</div>
                  <div className="text-white font-medium flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Dentistas em São Paulo
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-4 flex items-center justify-between border border-white/5 hover:border-primary/30 transition-colors">
                    <div>
                      <div className="text-white font-medium">
                        {["Clínica Sorriso Feliz", "Dr. João Odontologia", "DentCare SP"][i - 1]}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                        <Phone className="w-3 h-3" />
                        {["(11) 99999-1234", "(11) 98888-5678", "(11) 97777-9012"][i - 1]}
                      </div>
                    </div>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Metrics section
const MetricsSection = () => {
  const metrics = [
    { icon: Building, value: 10000, prefix: "+", suffix: "", label: "empresas encontradas", color: "from-blue-500 to-cyan-500" },
    { icon: Users, value: 500, prefix: "+", suffix: "", label: "usuários ativos", color: "from-primary to-purple-500" },
    { icon: Zap, value: 3, prefix: "", suffix: "s", label: "tempo médio de busca", color: "from-yellow-500 to-orange-500" },
    { icon: MessageCircle, value: 85, prefix: "", suffix: "%", label: "taxa de resposta", color: "from-green-500 to-emerald-500" },
  ];

  return (
    <section className="py-24 bg-[#080808] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Números que Impressionam
          </h2>
          <p className="text-gray-400">
            Resultados reais de quem usa ProspectAI
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className="glass-card rounded-2xl p-8 text-center hover:glow-purple transition-all duration-300 group border border-white/5 hover:border-primary/30"
            >
              <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <metric.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter
                  value={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                />
              </div>
              <div className="text-gray-400">{metric.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Pricing section
const PricingSection = () => {
  const freePlan = {
    name: "Free",
    price: "R$ 0",
    subtitle: "Teste sem compromisso",
    features: [
      { text: "3 buscas vitalícias (≈60 leads)", included: true },
      { text: "1 campanha", included: true },
      { text: "Ver telefone e endereço", included: true },
      { text: "3 primeiros leads desbloqueados", included: true },
    ],
    blockedFeatures: [
      { text: "Dados completos em todos leads" },
      { text: "Export Excel (.xlsx)" },
      { text: "WhatsApp 1-click ilimitado" },
      { text: "Templates IA para mensagens" },
      { text: "CRM Kanban completo" },
    ],
  };

  const starterPlan = {
    name: "Starter",
    price: "R$ 27,90",
    period: " (vitalício)",
    subtitle: "Acesso permanente à prospecção profissional",
    popular: true,
    features: [
      { text: "100 buscas/mês para sempre", highlight: true },
      { text: "Campanhas ilimitadas", highlight: true },
      { text: "Leads 100% reais do Google Maps", included: true },
      { text: "Ver telefone, WhatsApp, e-mail, site", included: true },
      { text: "Export Excel completo", included: true },
      { text: "WhatsApp 1-click para todos leads", included: true },
      { text: "Templates de mensagem com IA", included: true },
      { text: "CRM Kanban completo", included: true },
      { text: "Escolha cidade + nicho exato", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  };

  return (
    <section id="precos" className="py-28 bg-landing relative overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Glow behind starter */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-6">
            <DollarSign className="w-4 h-4" />
            Preços Acessíveis
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Escolha Seu Plano
          </h2>
          <p className="text-gray-400 text-lg">
            Comece grátis. Faça upgrade quando quiser.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card rounded-2xl p-8 hover:-translate-y-2 transition-transform duration-300 border border-white/10"
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              {freePlan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-bold text-white">{freePlan.price}</span>
              <span className="text-gray-400">/sempre</span>
            </div>
            <p className="text-gray-400 mb-8">{freePlan.subtitle}</p>

            {/* Included features */}
            <div className="space-y-4 mb-6">
              {freePlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Blocked features */}
            <div className="space-y-4 mb-8 pt-6 border-t border-white/10">
              {freePlan.blockedFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 opacity-50">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-gray-500 line-through">{feature.text}</span>
                </div>
              ))}
            </div>

            <Link to="/auth" className="block">
              <Button
                variant="ghost"
                className="w-full border border-white/20 text-white hover:bg-white/5 h-12"
              >
                Começar Grátis
              </Button>
            </Link>
          </motion.div>

          {/* Starter Plan */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative glass-card rounded-2xl p-8 border-2 border-primary/50 glow-purple hover:-translate-y-2 transition-transform duration-300"
          >
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-5 py-1.5 rounded-full gradient-purple text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-4 h-4" />
                Mais Popular
              </span>
            </div>

            {/* Value badge */}
            <div className="absolute -top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                Menos de R$1/dia
              </span>
            </div>

            <h3 className="text-2xl font-bold text-primary mb-2 mt-2">
              {starterPlan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-bold text-white">{starterPlan.price}</span>
              <span className="text-gray-400">{starterPlan.period}</span>
            </div>
            <p className="text-gray-400 mb-8">{starterPlan.subtitle}</p>

            <div className="space-y-4 mb-8">
              {starterPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className={feature.highlight ? "text-primary font-medium" : "text-gray-300"}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment methods */}
            <div className="flex items-center justify-center gap-4 mb-6 py-4 border-t border-white/10">
              <span className="text-xs text-gray-400 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 font-medium">PIX Instantâneo</span>
              <span className="text-xs text-gray-500">Pagamento único 100% seguro</span>
            </div>

            <Link to="/checkout?plan=starter" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white glow-purple h-12 text-base font-semibold">
                Comprar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// FAQ section
const FAQSection = () => {
  const faqs = [
    {
      question: "O que são buscas?",
      answer: "Cada busca retorna aproximadamente 20 empresas do seu nicho na região buscada. Por exemplo, ao buscar 'Dentistas em São Paulo', você recebe até 20 clínicas com telefone, endereço e WhatsApp.",
    },
    {
      question: "O plano Free expira?",
      answer: "Não, as 3 buscas são vitalícias. Use quando quiser, sem prazo de validade.",
    },
    {
      question: "O plano Starter é vitalício mesmo?",
      answer: "Sim! Pague R$ 27,90 uma única vez e tenha acesso para sempre. Sem mensalidade, sem renovação automática.",
    },
    {
      question: "Como funciona o WhatsApp?",
      answer: "Geramos um link direto para abrir a conversa no WhatsApp Web ou aplicativo. Basta clicar e começar a prospectar.",
    },
    {
      question: "Quais os benefícios do Starter?",
      answer: "Com o Starter você tem 100 buscas/mês para sempre, campanhas ilimitadas, export Excel, WhatsApp 1-click para todos leads, templates de mensagem com IA, CRM Kanban completo, e suporte prioritário.",
    },
    {
      question: "Tem suporte?",
      answer: "Sim, oferecemos suporte via email e chat. Resposta rápida garantida em até 24 horas para todos os planos.",
    },
  ];

  return (
    <section id="faq" className="py-28 bg-[#0a0a0a] relative overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-24"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-6">
              <MessageCircle className="w-4 h-4" />
              Tire suas dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-gray-400 text-lg">
              Tudo que você precisa saber sobre a plataforma
            </p>
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="glass-card rounded-xl border border-white/5 px-6 hover:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left text-white hover:text-primary hover:no-underline py-5 font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Final CTA section
const FinalCTASection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section ref={ref} className="py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 gradient-purple opacity-90" />
      
      {/* Parallax overlay */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Pronto para Encontrar Seus Próximos Clientes?
          </h2>
          <p className="text-lg text-white/80">
            Comece grátis agora. Sem cartão de crédito.
          </p>
          <div className="pt-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-white text-[hsl(250_95%_70%)] hover:bg-white/90 text-lg px-10 py-6 shadow-lg group"
              >
                Começar Grátis Agora
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-white/60">
            Junte-se a centenas de profissionais que já usam a plataforma
          </p>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="py-12 bg-landing border-t border-[hsl(230_15%_20%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-landing-primary" />
            <span className="text-lg font-semibold text-white">ProspectAI</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Produto
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Empresa
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ProspectAI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Main Landing page component
export default function Landing() {
  return (
    <div className="min-h-screen bg-landing text-white">
      <Navbar />
      <main>
        <HeroSection />
        <TopFreelancersSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <BenefitsSection />
        <MetricsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
