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
            Prospete Clientes com{" "}
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
              <span>147 pessoas acessaram esta página nas últimas 2 horas</span>
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

// Problem vs Solution section
const ProblemSolutionSection = () => {
  const solutionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(solutionRef, { once: false, amount: 0.3 });

  const problems = [
    "Prospecção manual é lenta e cansativa",
    "Google Maps desorganizado, sem exportação",
    "Copiando contatos um por um",
  ];

  const solutions = [
    "Busque por nicho e cidade",
    "Receba lista de leads pronta para usar",
    "Clique e contate direto via WhatsApp",
  ];

  return (
    <section className="py-24 bg-landing relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Problem */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-2xl p-8 border border-red-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">O Problema</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((problem, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{problem}</span>
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
              className="absolute -inset-8 bg-[hsl(250_95%_70%/0.3)] blur-[80px] rounded-full"
            />
            
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="relative glass-card rounded-2xl p-8 border border-[hsl(250_95%_70%/0.3)] glow-purple"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[hsl(250_95%_70%/0.2)] flex items-center justify-center">
                  <Check className="w-5 h-5 text-landing-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white">A Solução</h3>
              </div>
              <ul className="space-y-4">
                {solutions.map((solution, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-landing-primary mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{solution}</span>
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
    },
    {
      icon: Database,
      title: "Geramos empresas reais",
      description: "Dados direto do Google Maps",
    },
    {
      icon: MessageCircle,
      title: "Clique e prospecte",
      description: "WhatsApp, telefone, tudo pronto",
    },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-landing-card relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Como Funciona
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
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
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-[hsl(250_95%_70%/0.5)] to-transparent" />
              )}

              <div className="glass-card rounded-2xl p-8 text-center hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[hsl(250_95%_70%/0.2)] to-[hsl(280_85%_65%/0.2)] flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-landing-primary" />
                </div>
                <div className="text-sm text-purple-light mb-2">
                  Passo {index + 1}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
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
    "Economize horas por semana",
    "Encontre clientes que você não conhecia",
    "Prospecção local com alta conversão",
    "Ideal para freelancers, agências e prestadores",
  ];

  return (
    <section className="py-24 bg-landing relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(250_95%_70%/0.05)] to-[hsl(280_85%_65%/0.05)]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Benefits list */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Por que usar ProspectAI?
            </h2>
            <ul className="space-y-6">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-6 h-6 rounded-full bg-[hsl(250_95%_70%/0.2)] flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-landing-primary" />
                  </div>
                  <span className="text-lg text-gray-300">{benefit}</span>
                </motion.li>
              ))}
            </ul>
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
            <div className="glass-card rounded-2xl p-6 glow-primary">
              {/* Fake app interface */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-[hsl(230_15%_20%/0.5)]">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="bg-landing rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Busca:</div>
                  <div className="text-white font-medium">
                    Dentistas em São Paulo
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-landing rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {["Clínica Sorriso Feliz", "Dr. João Odontologia", "DentCare SP"][i - 1]}
                      </div>
                      <div className="text-sm text-gray-400">
                        {["(11) 99999-1234", "(11) 98888-5678", "(11) 97777-9012"][i - 1]}
                      </div>
                    </div>
                    <Button size="sm" className="bg-landing-primary hover:opacity-90 text-white">
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
    { icon: Building, value: 10000, prefix: "+", suffix: "", label: "empresas encontradas" },
    { icon: Users, value: 500, prefix: "+", suffix: "", label: "usuários ativos" },
    { icon: Zap, value: 3, prefix: "", suffix: "s", label: "tempo médio de busca" },
    { icon: MessageCircle, value: 85, prefix: "", suffix: "%", label: "taxa de resposta" },
  ];

  return (
    <section className="py-24 bg-landing-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              className="glass-card rounded-2xl p-6 text-center hover:glow-purple transition-shadow duration-300"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[hsl(250_95%_70%/0.1)] flex items-center justify-center">
                <metric.icon className="w-6 h-6 text-landing-primary" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedCounter
                  value={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                />
              </div>
              <div className="text-sm text-gray-400">{metric.label}</div>
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
      { text: "3 buscas totais (≈ 60 leads)", included: true },
      { text: "1 campanha", included: true },
      { text: "Ver telefones e endereços", included: true },
      { text: "Export CSV", included: false },
      { text: "WhatsApp 1-click", included: false },
      { text: "Templates de mensagens", included: false },
    ],
  };

  const starterPlan = {
    name: "Starter",
    price: "R$ 49",
    period: "/mês",
    subtitle: "Prospecção profissional",
    popular: true,
    features: [
      { text: "100 buscas/mês (≈ 2.000 leads)", included: true },
      { text: "Export CSV", included: true },
      { text: "Templates de mensagens", included: true },
      { text: "Prospecção profissional", included: true },
      { text: "Sem marca d'água", included: true },
    ],
  };

  return (
    <section id="precos" className="py-24 bg-landing relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Escolha Seu Plano
          </h2>
          <p className="text-gray-400">
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
            className="glass-card rounded-2xl p-8 hover:-translate-y-2 transition-transform duration-300"
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              {freePlan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-white">{freePlan.price}</span>
            </div>
            <p className="text-gray-400 text-sm mb-8">{freePlan.subtitle}</p>

            <ul className="space-y-4 mb-8">
              {freePlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-landing-primary flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-400/60 flex-shrink-0" />
                  )}
                  <span className={feature.included ? "text-gray-300" : "text-gray-500"}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <Link to="/auth" className="block">
              <Button
                variant="ghost"
                className="w-full border border-[hsl(230_15%_20%)] text-white hover:bg-white/5"
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
            className="relative glass-card rounded-2xl p-8 border-2 border-[hsl(250_95%_70%/0.5)] glow-purple hover:-translate-y-2 transition-transform duration-300"
          >
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full gradient-purple text-white text-sm font-medium">
                Mais Popular
              </span>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2 mt-2">
              {starterPlan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-white">{starterPlan.price}</span>
              <span className="text-gray-400">{starterPlan.period}</span>
            </div>
            <p className="text-gray-400 text-sm mb-8">{starterPlan.subtitle}</p>

            <ul className="space-y-4 mb-8">
              {starterPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-landing-primary flex-shrink-0" />
                  <span className="text-gray-300">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* Payment methods */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-xs text-gray-400 px-3 py-1.5 rounded-full bg-[hsl(250_95%_70%/0.1)] border border-[hsl(250_95%_70%/0.2)]">PIX</span>
            </div>

            <Link to="/checkout?plan=starter" className="block">
              <Button className="w-full bg-landing-primary hover:opacity-90 text-white glow-purple">
                Assinar Agora
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
      question: "Posso cancelar quando quiser?",
      answer: "Sim, sem fidelidade. Cancele a qualquer momento diretamente pelo painel, sem burocracia.",
    },
    {
      question: "Como funciona o WhatsApp?",
      answer: "Geramos um link direto para abrir a conversa no WhatsApp Web ou aplicativo. Basta clicar e começar a prospectar.",
    },
    {
      question: "Tem suporte?",
      answer: "Sim, oferecemos suporte via email e chat. Resposta rápida garantida em até 24 horas.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-landing-card">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-gray-400">
              Tire suas dúvidas sobre a plataforma
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
                  className="glass-card rounded-xl border-none px-6"
                >
                  <AccordionTrigger className="text-left text-white hover:text-landing-primary hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 pb-4">
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
