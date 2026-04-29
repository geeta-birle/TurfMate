import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

// Free Unsplash images
const HERO_IMAGE = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80';
const TURF_IMAGES = [
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80',
];

const SPORTS = [
  { name: 'Football',   emoji: '⚽', color: 'from-green-400 to-emerald-600',  img: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&q=80' },
  { name: 'Cricket',    emoji: '🏏', color: 'from-blue-400 to-blue-600',      img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80' },
  { name: 'Basketball', emoji: '🏀', color: 'from-orange-400 to-orange-600',  img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80' },
  { name: 'Badminton',  emoji: '🏸', color: 'from-purple-400 to-purple-600',  img: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80' },
  { name: 'Tennis',     emoji: '🎾', color: 'from-yellow-400 to-yellow-600',  img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&q=80' },
  { name: 'Volleyball', emoji: '🏐', color: 'from-red-400 to-red-600',        img: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&q=80' },
];

const STEPS = [
  { step: '01', icon: '🔍', title: 'Find a Turf',     desc: 'Browse verified turfs near you. Filter by sport, price and availability.' },
  { step: '02', icon: '📅', title: 'Book a Slot',     desc: 'Pick your date and time. Instant confirmation with secure payment.' },
  { step: '03', icon: '⚽', title: 'Create a Match',  desc: 'Set up your match details, team size and cost per player.' },
  { step: '04', icon: '🤝', title: 'Invite Players',  desc: 'Share your invite link. Players join and split the turf cost.' },
];

const TESTIMONIALS = [
  { name: 'Arjun M.', role: 'Football Player', city: 'Pune', text: 'TurfMate completely changed how I organize weekend matches. Finding players is so easy now!', rating: 5, avatar: 'A' },
  { name: 'Sneha J.', role: 'Cricket Enthusiast', city: 'Pune', text: 'Booking turfs used to be a hassle. Now I can do it in 2 minutes. Love the cost-splitting feature!', rating: 5, avatar: 'S' },
  { name: 'Rahul S.', role: 'Turf Owner', city: 'Pune', text: 'As a turf owner, TurfMate helped me fill empty slots and reach more players. Bookings doubled!', rating: 5, avatar: 'R' },
];

// Animated counter hook
const useCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return { count, ref };
};

const StatCard = ({ end, suffix, label, icon }) => {
  const { count, ref } = useCounter(end);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold text-primary-600 mb-1">
        {count}{suffix}
      </div>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();

  // Scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.animate-on-scroll')
      .forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center
        overflow-hidden">

        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Football turf"
            className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r
            from-gray-950/95 via-gray-950/80 to-gray-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t
            from-gray-950/60 via-transparent to-transparent" />
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 right-[15%] animate-float
          hidden lg:block">
          <div className="glass rounded-2xl p-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex
                items-center justify-center text-xl">⚽</div>
              <div>
                <p className="font-bold text-sm">Match Starting!</p>
                <p className="text-xs text-gray-300">
                  Sunday Football — 3 spots left
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 right-[20%] animate-float
          hidden lg:block" style={{ animationDelay: '1s' }}>
          <div className="glass rounded-2xl p-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex
                items-center justify-center text-xl">✅</div>
              <div>
                <p className="font-bold text-sm">Booking Confirmed!</p>
                <p className="text-xs text-gray-300">
                  Green Arena · Today 6 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6
          lg:px-8 py-20 w-full">
          <div className="max-w-2xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-600/20
              backdrop-blur-sm border border-primary-500/30 rounded-full
              px-4 py-2 text-primary-300 text-sm font-medium mb-6
              animate-fade-up">
              <span className="w-2 h-2 bg-primary-400 rounded-full
                animate-pulse" />
              India's #1 Community Sports Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold
              text-white leading-[1.1] mb-6 animate-fade-up"
              style={{ animationDelay: '0.1s' }}>
              Play More.
              <br />
              <span className="text-gradient">Pay Less.</span>
              <br />
              Together.
            </h1>

            <p className="text-lg text-gray-300 mb-8 leading-relaxed
              max-w-lg animate-fade-up"
              style={{ animationDelay: '0.2s' }}>
              Book premium turfs, create matches, split costs with
              players — the BlaBlaCar for sports is here.
            </p>

            <div className="flex flex-col sm:flex-row gap-4
              animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/turfs"
                className="btn-primary bg-primary-600 hover:bg-primary-500
                  text-white px-8 py-4 text-base rounded-xl shadow-glow
                  hover:shadow-glow-lg">
                🏟️ Browse Turfs
              </Link>
              <Link to="/matches"
                className="glass text-white font-semibold px-8 py-4
                  text-base rounded-xl hover:bg-white/20 transition-all
                  duration-200 text-center">
                ⚽ Find a Match
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-10
              animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {[
                '✓ Free to join',
                '✓ Verified turfs',
                '✓ Secure payments',
                '✓ Real-time updates',
              ].map(badge => (
                <span key={badge}
                  className="text-gray-400 text-sm flex items-center gap-1">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2
          animate-bounce-slow">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full
            flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/60 rounded-full
              animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard end={50}   suffix="+"  label="Active Turfs"   icon="🏟️" />
            <StatCard end={1200} suffix="+"  label="Matches Played" icon="⚽" />
            <StatCard end={8000} suffix="+"  label="Happy Players"  icon="👥" />
            <StatCard end={98}   suffix="%"  label="Satisfaction"   icon="⭐" />
          </div>
        </div>
      </section>

      {/* ── SPORTS CATEGORIES ─────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-on-scroll">
            <h2 className="section-title mb-3">
              Every Sport, One Platform
            </h2>
            <p className="section-subtitle max-w-xl mx-auto">
              From football to badminton — find and book turfs for
              any sport in your city
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
            gap-4">
            {SPORTS.map((sport, i) => (
              <Link key={sport.name}
                to={`/turfs?sport_type=${sport.name.toLowerCase()}`}
                className="group relative overflow-hidden rounded-2xl
                  aspect-square shadow-card hover:shadow-card-hover
                  transition-all duration-300 hover:-translate-y-1
                  animate-on-scroll"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <img src={sport.img} alt={sport.name}
                  className="w-full h-full object-cover group-hover:scale-110
                    transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-t
                  ${sport.color} opacity-70 group-hover:opacity-80
                  transition-opacity`} />
                <div className="absolute inset-0 flex flex-col items-center
                  justify-center text-white">
                  <span className="text-3xl mb-1 group-hover:scale-125
                    transition-transform duration-300">
                    {sport.emoji}
                  </span>
                  <span className="font-bold text-sm">{sport.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-on-scroll">
            <span className="text-primary-600 font-semibold text-sm
              uppercase tracking-widest">Simple Process</span>
            <h2 className="section-title mt-2 mb-3">
              From Idea to Match in Minutes
            </h2>
            <p className="section-subtitle">
              No phone calls. No WhatsApp groups. Just book and play.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4
            gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-16 left-[12.5%]
              right-[12.5%] h-0.5 bg-gradient-to-r from-primary-200
              via-primary-400 to-primary-200 z-0" />

            {STEPS.map((step, i) => (
              <div key={step.step}
                className="relative z-10 text-center animate-on-scroll"
                style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-16 h-16 bg-primary-600 rounded-2xl
                  flex items-center justify-center text-2xl mx-auto mb-4
                  shadow-glow hover:shadow-glow-lg transition-shadow
                  hover:scale-110 duration-300">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-primary-400
                  mb-2 tracking-widest">
                  STEP {step.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED TURFS ────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10
            animate-on-scroll">
            <div>
              <span className="text-primary-600 font-semibold text-sm
                uppercase tracking-widest">Top Picks</span>
              <h2 className="section-title mt-1">Featured Turfs</h2>
            </div>
            <Link to="/turfs"
              className="text-primary-600 font-semibold hover:underline
                text-sm hidden sm:block">
              View all turfs →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Green Arena Turf',
                location: 'Baner, Pune',
                price: '₹1,200/hr',
                rating: 4.8,
                reviews: 124,
                sport: 'Football',
                img: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80',
                badge: '🔥 Most Booked',
              },
              {
                name: 'Champion Sports Complex',
                location: 'Aundh, Pune',
                price: '₹1,500/hr',
                rating: 4.6,
                reviews: 89,
                sport: 'Multi-Sport',
                img: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
                badge: '⭐ Top Rated',
              },
              {
                name: 'Smash Badminton Academy',
                location: 'Kothrud, Pune',
                price: '₹600/hr',
                rating: 4.9,
                reviews: 203,
                sport: 'Badminton',
                img: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80',
                badge: '✨ Premium',
              },
            ].map((turf, i) => (
              <Link to="/turfs" key={turf.name}
                className="card-hover group overflow-hidden
                  animate-on-scroll"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="relative h-48 overflow-hidden">
                  <img src={turf.img} alt={turf.name}
                    className="w-full h-full object-cover
                      group-hover:scale-110 transition-transform
                      duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t
                    from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm
                      text-gray-800 text-xs font-bold px-3 py-1
                      rounded-full shadow">
                      {turf.badge}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/90
                    backdrop-blur-sm rounded-lg px-2 py-1 flex items-center
                    gap-1">
                    <span className="text-yellow-500 text-xs">★</span>
                    <span className="text-xs font-bold text-gray-800">
                      {turf.rating}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({turf.reviews})
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600
                      transition-colors">{turf.name}</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 flex items-center gap-1">
                    <span>📍</span> {turf.location}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="badge bg-primary-100 text-primary-700">
                      {turf.sport}
                    </span>
                    <span className="font-bold text-primary-600">
                      {turf.price}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-on-scroll">
            <span className="text-primary-600 font-semibold text-sm
              uppercase tracking-widest">Community Love</span>
            <h2 className="section-title mt-2 mb-3">
              What Players Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name}
                className="card p-6 hover:shadow-card-hover
                  transition-shadow animate-on-scroll"
                style={{ animationDelay: `${i * 0.1}s` }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-5 italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 pt-4
                  border-t border-gray-100">
                  <div className="w-10 h-10 bg-primary-600 rounded-full
                    flex items-center justify-center text-white font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {t.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {t.role} · {t.city}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP FEATURES ──────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-primary-950
        via-primary-900 to-primary-800 relative overflow-hidden">

        <div className="absolute inset-0 bg-hero-pattern opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12
            items-center">
            <div className="animate-on-scroll">
              <span className="text-primary-300 font-semibold text-sm
                uppercase tracking-widest">Why TurfMate</span>
              <h2 className="text-4xl font-bold text-white mt-2 mb-6
                leading-tight">
                Built for the
                <span className="text-primary-300"> Community</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: '💸', title: 'Split Costs Fairly', desc: 'Organizer sets cost per player. Everyone pays their fair share automatically.' },
                  { icon: '🔒', title: 'Secure Payments', desc: 'Powered by Razorpay. Your money is always safe and refunds are hassle-free.' },
                  { icon: '⚡', title: 'Real-time Updates', desc: 'See live player counts, slot availability and match updates as they happen.' },
                  { icon: '🏆', title: 'Match System', desc: 'Create open or private matches. Share invite codes with your squad.' },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-4
                    p-4 rounded-xl bg-white/5 hover:bg-white/10
                    transition-colors border border-white/10">
                    <div className="text-2xl flex-shrink-0">{f.icon}</div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {f.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature preview */}
            <div className="animate-on-scroll relative hidden lg:block">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl
                p-6 border border-white/20 shadow-2xl">
                <div className="bg-primary-600 rounded-2xl p-5 mb-4">
                  <div className="flex items-center justify-between
                    text-white mb-3">
                    <span className="font-bold">Sunday Football</span>
                    <span className="badge bg-green-400 text-green-900">
                      Open
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-primary-100
                      text-sm">
                      <span>Players joined</span>
                      <span className="font-bold text-white">7 / 10</span>
                    </div>
                    <div className="h-2 bg-primary-700 rounded-full">
                      <div className="h-full bg-white rounded-full
                        transition-all" style={{ width: '70%' }} />
                    </div>
                    <p className="text-primary-200 text-xs">
                      3 spots remaining!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {['Arjun M.', 'Sneha J.', 'Vikram S.'].map((p, i) => (
                    <div key={p} className="flex items-center gap-3
                      bg-white/10 rounded-xl p-3">
                      <div className="w-8 h-8 bg-primary-500 rounded-full
                        flex items-center justify-center text-white
                        text-sm font-bold">
                        {p.charAt(0)}
                      </div>
                      <span className="text-white text-sm font-medium">
                        {p}
                      </span>
                      <span className="ml-auto text-green-400 text-xs
                        font-semibold">
                        ✓ Joined
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 bg-white/5
                    rounded-xl p-3 border-2 border-dashed border-white/20">
                    <div className="w-8 h-8 bg-white/10 rounded-full
                      flex items-center justify-center text-white
                      text-lg">+</div>
                    <span className="text-gray-400 text-sm">
                      Waiting for players...
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl
                p-3 shadow-xl border border-gray-100 animate-float">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      New player joined!
                    </p>
                    <p className="text-xs text-gray-400">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center
          animate-on-scroll">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to play your best game?
          </h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of players booking turfs and creating
            unforgettable matches every weekend.
          </p>
          {user ? (
            <Link to="/turfs"
              className="btn-primary px-10 py-4 text-lg shadow-glow
                hover:shadow-glow-lg">
              🏟️ Book a Turf Now
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register"
                className="btn-primary px-10 py-4 text-lg shadow-glow">
                Get Started Free 🚀
              </Link>
              <Link to="/login"
                className="btn-secondary px-10 py-4 text-lg">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex
                  items-center justify-center text-white font-bold">T</div>
                <span className="text-xl font-bold text-white">
                  TurfMate
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                Community-driven sports platform. Book turfs, create
                matches and find players in your city.
              </p>
            </div>
            {[
              {
                title: 'Platform',
                links: [
                  { label: 'Browse Turfs', to: '/turfs' },
                  { label: 'Find Matches', to: '/matches' },
                  { label: 'Register', to: '/register' },
                ],
              },
              {
                title: 'For Owners',
                links: [
                  { label: 'List Your Turf', to: '/register' },
                  { label: 'Owner Dashboard', to: '/dashboard' },
                  { label: 'Manage Slots', to: '/dashboard' },
                ],
              },
              {
                title: 'Sports',
                links: SPORTS.slice(0, 4).map(s => ({
                  label: `${s.emoji} ${s.name}`,
                  to: `/turfs?sport_type=${s.name.toLowerCase()}`,
                })),
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-3 text-sm
                  uppercase tracking-wider">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.to}
                        className="text-sm hover:text-primary-400
                          transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col
            sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © 2026 TurfMate. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>for sports lovers in Pune</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Home;