import { Link } from "react-router-dom";
import { Car } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
              <div className="w-7 h-7 rounded-md hero-gradient flex items-center justify-center">
                <Car className="w-4 h-4 text-primary-foreground" />
              </div>
              Spotsvault
            </Link>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              The marketplace for parking and storage spaces. Find or list — your space, your way.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/parking" className="hover:text-foreground transition-colors">Find Parking</Link></li>
              <li><Link to="/storage" className="hover:text-foreground transition-colors">Find Storage</Link></li>
              <li><Link to="/list" className="hover:text-foreground transition-colors">List a Space</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/help" className="hover:text-foreground transition-colors">Help & FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Spotsvault. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
