import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Shield, Zap, Users, TrendingUp, Lock, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Real-time expense tracking with comprehensive visualizations and insights."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with encrypted data and role-based access control."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Optimized performance for instant data retrieval and seamless user experience."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Management",
      description: "Manage multiple users, roles, and permissions with ease."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Smart Reports",
      description: "Generate detailed reports and export data for financial analysis."
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Transaction History",
      description: "Complete audit trail with categorized transactions and notes."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(59_130_246/0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgb(20_184_166/0.3),transparent_50%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ExpenseFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-white text-blue-600 hover:bg-white/90">
                Get Started
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
              Professional Expense
              <br />
              <span className="bg-gradient-to-r from-blue-200 to-teal-200 bg-clip-text text-transparent">
                Management Platform
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
              Streamline your company's financial operations with advanced analytics, 
              real-time tracking, and comprehensive reporting.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90 text-lg px-8 h-12">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 h-12">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-blue-100">Everything you need to manage expenses efficiently</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass-effect rounded-xl p-6 space-y-4 hover:shadow-glow transition-all duration-300 hover:scale-105"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto glass-effect rounded-2xl p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold gradient-text">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of companies managing their expenses with ExpenseFlow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button size="lg" className="bg-gradient-primary text-white hover:opacity-90 shadow-lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <p className="text-center text-muted-foreground">
                    Welcome back, {user?.name}!
                  </p>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button size="lg" className="bg-gradient-primary text-white hover:opacity-90 shadow-lg">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="lg" variant="outline" className="border-2">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 border-t border-white/10">
          <div className="text-center text-blue-100">
            <p>&copy; 2024 ExpenseFlow. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
