import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const stats = [
  { label: 'Active Turfs', value: '50+' },
  { label: 'Matches Played', value: '1,200+' },
  { label: 'Players', value: '8,000+' },
  { label: 'Cities', value: '1' },
];

const features = [
  {
    icon: '🏟️',
    title: 'Book Any Turf',
    desc: 'Browse verified turfs, check real-time availability and book your slot instantly.',
  },
  {
    icon: '⚽',
    title: 'Create a Match',
    desc: 'Book a turf, set your match details and open it for other players to join.',
  },
  {
    icon: '🤝',
    title: 'Find Players',
    desc: 'Discover open matches near you and join games that match your skill level.',
  },
  {
    icon: '💸',
    title: 'Split the Cost',
    desc: 'Share the turf cost among all players. Pay only your share, never the full amount.',
  },
];

const sports = [
  { name: 'Football', emoji: '⚽', color: 'bg-green-100 text-green-700' },
  { name: 'Cricket', emoji: '🏏', color: 'bg-blue-100 text-blue-700' },
  { name: 'Basketball', emoji: '🏀', color: 'bg-orange-100 text-orange-700' },
  { name: 'Badminton', emoji: '🏸', color: 'bg-purple-100 text-purple-700' },
  { name: 'Tennis', emoji: '🎾', color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Volleyball', emoji: '🏐', color: 'bg-red-100 text-red-700' },
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-700
        via-primary-600 to-primary-500 text-white overflow-hidden">

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white
            rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white
            rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
          py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20
              backdrop-blur-sm rounded-full px-4 py-1.5 text-sm
              font-medium mb-6">
              <span className="w-2 h-2 bg-green-300 rounded-full
                animate-pulse" />
              Community-Driven Sports Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold
              leading-tight mb-6">
              Book Turfs.
              <br />
              <span className="text-green-200">Create Matches.</span>
              <br />
              Find Players.
            </h1>

            <p className="text-lg sm:text-xl text-primary-100 mb-8
              max-w-xl leading-relaxed">
              The BlaBlaCar for sports. Book a turf, create a match,
              split the cost and play with players from your city.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/turfs"
                className="bg-white text-primary-700 hover:bg-primary-50
                  font-bold px-8 py-3.5 rounded-xl transition-all
                  duration-200 text-center shadow-lg hover:shadow-xl
                  active:scale-95">
                Browse Turfs →
              </Link>
              <Link to="/matches"
                className="bg-primary-800/50 backdrop-blur-sm border
                  border-white/30 hover:bg-primary-800/70 text-white
                  font-bold px-8 py-3.5 rounded-xl transition-all
                  duration-200 text-center">
                Find a Match
              </Link>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-10 sm:h-14"
            preserveAspectRatio="none">
            <path d="M0,60 C240,0 480,60 720,30 C960,0 1200,60 1440,30 L1440,60 Z"
              fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6
        relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-6 text-center">
              <p className="text-3xl font-extrabold text-primary-600 mb-1">
                {s.value}
              </p>
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sports ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="section-title mb-2">Browse by Sport</h2>
          <p className="text-gray-500">Find turfs for your favourite sport</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {sports.map((sport) => (
            <Link key={sport.name}
              to={`/turfs?sport_type=${sport.name.toLowerCase()}`}
              className="card p-4 text-center group hover:border-primary-200
                hover:shadow-md cursor-pointer transition-all">
              <div className={`w-12 h-12 ${sport.color} rounded-xl flex
                items-center justify-center text-2xl mx-auto mb-2
                group-hover:scale-110 transition-transform`}>
                {sport.emoji}
              </div>
              <p className="text-xs font-semibold text-gray-700">
                {sport.name}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-2">How TurfMate Works</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              From booking to playing in 4 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="card p-6 relative">
                <div className="absolute -top-3 -left-3 w-8 h-8
                  bg-primary-600 text-white rounded-full flex items-center
                  justify-center text-sm font-bold shadow">
                  {i + 1}
                </div>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="bg-primary-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Ready to play? 🏆
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Join thousands of players booking turfs and creating matches
            every day.
          </p>
          {user ? (
            <Link to="/turfs" className="bg-white text-primary-700
              font-bold px-10 py-3.5 rounded-xl hover:bg-primary-50
              transition-all duration-200 shadow-lg text-lg">
              Book a Turf Now →
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4
              justify-center">
              <Link to="/register" className="bg-white text-primary-700
                font-bold px-8 py-3.5 rounded-xl hover:bg-primary-50
                transition-all shadow-lg">
                Get Started Free
              </Link>
              <Link to="/login" className="border-2 border-white/40
                text-white font-bold px-8 py-3.5 rounded-xl
                hover:bg-primary-700 transition-all">
                Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between
            items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex
                items-center justify-center text-white font-bold text-xs">
                T
              </div>
              <span className="text-white font-bold">TurfMate</span>
            </div>
            <p className="text-sm">
              © 2026 TurfMate. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/turfs" className="hover:text-white transition-colors">
                Turfs
              </Link>
              <Link to="/matches"
                className="hover:text-white transition-colors">
                Matches
              </Link>
              <Link to="/register"
                className="hover:text-white transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Home;