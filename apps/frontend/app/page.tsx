import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white min-h-screen">
      {/* Header and Navigation Structure */}
      <nav className="w-full px-8 py-8 lg:px-16">
        <div className="flex justify-between items-center">
          {/* Brand Name - Left Aligned */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-brand-primary tracking-tight">
              INQUIRE AI
            </h1>
          </div>
          
          {/* Navigation Menu - Right Aligned */}
          <div className="hidden md:flex items-center space-x-12">
            <Link href="#features" className="text-sm font-medium tracking-widest uppercase text-gray-700 hover:text-brand-primary transition-colors">
              FEATURES
            </Link>
            <Link href="#about" className="text-sm font-medium tracking-widest uppercase text-gray-700 hover:text-brand-primary transition-colors">
              ABOUT
            </Link>
            <Link href="#contact" className="text-sm font-medium tracking-widest uppercase text-gray-700 hover:text-brand-primary transition-colors">
              CONTACT
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section Layout and Typography Hierarchy */}
      <section className="px-8 py-12 lg:px-16">
        {/* Main Content - Aligned with header positioning */}
        <div className="space-y-6 lg:space-y-8 xl:space-y-10">
          {/* Massive Three-Line Headline - Responsive sizing */}
          <div className="space-y-1 lg:space-y-2">
            <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-8xl font-black tracking-tighter leading-none text-gray-900">
              We make
            </h2>
            <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-8xl font-black tracking-tighter leading-none text-brand-accent">
              websites
            </h2>
            <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-8xl font-black tracking-tighter leading-none text-gray-900">
              talk
            </h2>
          </div>
          
          {/* Descriptive Paragraph - Responsive sizing */}
          <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-gray-600 max-w-md lg:max-w-lg xl:max-w-xl">
            Advanced AI chatbot platform that understands context, provides intelligent responses, and 
            learns from every conversation to deliver exceptional user experiences.
          </p>
          
          {/* Action Buttons - Responsive spacing */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-2 lg:pt-4">
            <Link
              href="/login"
              className="bg-black text-white px-5 py-2.5 lg:px-6 lg:py-3 text-xs sm:text-sm font-medium tracking-widest uppercase hover:bg-gray-800 transition-all duration-200"
            >
              START CHATTING
            </Link>
            <Link
              href="#features"
              className="border border-black text-black px-5 py-2.5 lg:px-6 lg:py-3 text-xs sm:text-sm font-medium tracking-widest uppercase hover:bg-black hover:text-white transition-all duration-200"
            >
              EXPLORE FEATURES
            </Link>
          </div>
        </div>
      </section>

      {/* Color Block Transition Element */}
      <section className="w-full mt-16 lg:mt-24">
        <div className="grid grid-cols-4 h-24">
          <div className="bg-brand-primary"></div>
          <div className="bg-brand-accent"></div>
          <div className="bg-gray-900"></div>
          <div className="bg-gray-300"></div>
        </div>
      </section>

      {/* Features Section Structure */}
      <section id="features" className="px-8 py-24 lg:px-16 lg:py-32">
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <div className="text-center mb-20">
            <h3 className="text-5xl lg:text-6xl font-black text-gray-900 mb-8">
              Powerful features
            </h3>
          </div>
          
          {/* Features Showcase Grid */}
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
            {/* Feature 01 */}
            <div className="space-y-6">
              <div className="aspect-[4/3] bg-brand-primary flex items-center justify-center rounded-lg">
                <span className="text-8xl lg:text-9xl font-black text-white">01</span>
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Natural Language Processing
                </h4>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Advanced AI that understands context, intent, and nuance in 
                  conversations, providing human-like responses that feel 
                  natural and engaging for every interaction.
                </p>
              </div>
            </div>
            
            {/* Feature 02 */}
            <div className="space-y-6">
              <div className="aspect-[4/3] bg-brand-accent flex items-center justify-center rounded-lg">
                <span className="text-8xl lg:text-9xl font-black text-white">02</span>
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Multi-Modal Intelligence
                </h4>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Process text, images, documents, and voice inputs seamlessly. 
                  Our AI adapts to any communication style and provides 
                  comprehensive responses across all media types.
                </p>
              </div>
            </div>
            
            {/* Feature 03 */}
            <div className="space-y-6">
              <div className="aspect-[4/3] bg-gray-900 flex items-center justify-center rounded-lg">
                <span className="text-8xl lg:text-9xl font-black text-white">03</span>
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Real-Time Learning
                </h4>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Continuously improves from every conversation, adapting to 
                  your preferences and becoming more helpful over time while 
                  maintaining privacy and security standards.
                </p>
              </div>
            </div>
            
            {/* Feature 04 */}
            <div className="space-y-6">
              <div className="aspect-[4/3] bg-gray-400 flex items-center justify-center rounded-lg">
                <span className="text-8xl lg:text-9xl font-black text-white">04</span>
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Enterprise Integration
                </h4>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Seamlessly integrate with your existing tools and workflows. 
                  Deploy across multiple platforms with robust APIs and 
                  customizable interfaces for any business need.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section with Split Layout */}
      <section id="about" className="bg-gray-50 px-8 py-24 lg:px-16 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-12">
              {/* Multi-line Headline with Color Highlighting */}
              <div className="space-y-2">
                <h3 className="text-5xl lg:text-6xl font-black tracking-tighter leading-none text-gray-900">
                  We believe
                </h3>
                <h3 className="text-5xl lg:text-6xl font-black tracking-tighter leading-none text-brand-primary">
                  intelligent AI
                </h3>
                <h3 className="text-5xl lg:text-6xl font-black tracking-tighter leading-none text-gray-900">
                  transforms everything
                </h3>
              </div>
              
              {/* Body Text Paragraphs */}
              <div className="space-y-6">
                <p className="text-xl leading-relaxed text-gray-600">
                  Our philosophy centers on creating AI that truly understands and assists. 
                  We don't just build chatbots—we craft intelligent companions that 
                  solve complex problems and create meaningful connections between 
                  technology and human needs.
                </p>
                <p className="text-xl leading-relaxed text-gray-600">
                  Every conversation begins with deep understanding. Our AI learns from 
                  context, adapts to your communication style, and most importantly, 
                  provides responses that feel genuinely helpful and human-like.
                </p>
                <p className="text-xl leading-relaxed text-gray-600">
                  The result? AI conversations that feel natural, productive, and 
                  genuinely intelligent. Because when artificial intelligence meets 
                  human insight, ordinary interactions become extraordinary experiences.
                </p>
              </div>
            </div>
            
            {/* Right Column - 2x2 Color Block Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square bg-brand-primary rounded-lg"></div>
              <div className="aspect-square bg-brand-accent rounded-lg"></div>
              <div className="aspect-square bg-gray-900 rounded-lg"></div>
              <div className="aspect-square bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="px-8 py-24 lg:px-16 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-5xl lg:text-6xl font-black text-gray-900">
                Ready to experience
              </h3>
              <h3 className="text-5xl lg:text-6xl font-black text-brand-accent">
                intelligent AI?
              </h3>
            </div>
            
            <p className="text-xl lg:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Let's start a conversation and discover how our AI can transform 
              the way you communicate, learn, and solve problems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/login"
                className="bg-brand-primary text-white px-8 py-4 text-sm font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all duration-200"
              >
                START CHATTING
              </Link>
              <Link
                href="mailto:hello@inquireai.com"
                className="border-2 border-brand-primary text-brand-primary px-8 py-4 text-sm font-medium tracking-widest uppercase hover:bg-brand-primary hover:text-white transition-all duration-200"
              >
                CONTACT US
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-8 py-16 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <h4 className="text-3xl font-black text-white tracking-tight">
              INQUIRE AI
            </h4>
            <p className="text-gray-400 text-lg">
              Transforming conversations through intelligent AI technology
            </p>
            <div className="flex justify-center space-x-8">
              <Link href="#features" className="text-gray-400 hover:text-white text-sm tracking-widest uppercase transition-colors">
                FEATURES
              </Link>
              <Link href="#about" className="text-gray-400 hover:text-white text-sm tracking-widest uppercase transition-colors">
                ABOUT
              </Link>
              <Link href="#contact" className="text-gray-400 hover:text-white text-sm tracking-widest uppercase transition-colors">
                CONTACT
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
