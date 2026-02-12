import { motion } from "framer-motion";
import { Car, Warehouse, Shield, Clock, Star, CreditCard } from "lucide-react";

const features = [
  {
    icon: Car,
    title: "Parking Spots",
    description: "Find hourly, daily, or event parking near any destination. Filter by price, distance, and spot type.",
  },
  {
    icon: Warehouse,
    title: "Storage Units",
    description: "Secure long-term and short-term storage options. Compare sizes, pricing, and availability instantly.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Encrypted transactions with built-in protection. Cancel flexibly with clear, fair policies.",
  },
  {
    icon: Clock,
    title: "Real-time Booking",
    description: "Instant reservations with live availability updates. No double-bookings, no surprises.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    description: "Verified reviews from real users build trust. Find top-rated spaces with confidence.",
  },
  {
    icon: CreditCard,
    title: "Earn as Provider",
    description: "List your unused parking or storage space. Set your own prices and availability windows.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Everything you need to{" "}
            <span className="text-primary">park & store</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Whether you're looking for a spot or listing one, SpotVault makes it effortless.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-xl bg-card border border-border card-shadow hover:card-shadow-hover transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
