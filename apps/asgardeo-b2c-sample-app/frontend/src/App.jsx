import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Hotel,
  LogOut,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import { SignUpButton, useAsgardeo } from "@asgardeo/react";

const flightDeals = [
  {
    route: "Colombo to Singapore",
    dates: "Jun 12 - Jun 18",
    price: "$314",
    tag: "Best value",
    accent: "mint"
  },
  {
    route: "San Francisco to Tokyo",
    dates: "Jul 04 - Jul 16",
    price: "$782",
    tag: "Nonstop",
    accent: "coral"
  },
  {
    route: "London to Lisbon",
    dates: "Aug 21 - Aug 27",
    price: "$168",
    tag: "Weekend",
    accent: "gold"
  }
];

const stays = [
  {
    name: "Harborlight Suites",
    place: "Singapore Marina",
    price: "$142",
    rating: "9.1"
  },
  {
    name: "The Saffron Yard",
    place: "Lisbon Old Town",
    price: "$119",
    rating: "8.8"
  },
  {
    name: "North Pier Rooms",
    place: "Tokyo Bay",
    price: "$173",
    rating: "9.4"
  }
];

function AuthenticatedHeader({ authReady }) {
  if (!authReady) {
    return <SignedOutHeader disabled />;
  }

  return <LiveAuthHeader />;
}

function LiveAuthHeader() {
  const { isSignedIn, isLoading, signIn, signOut, user } = useAsgardeo();
  const displayName =
    user?.givenname || user?.givenName || user?.userName || user?.username || user?.sub;

  if (isSignedIn) {
    return (
      <div className="auth-cluster">
        <div className="user-chip" title={displayName || "Signed in"}>
          <CircleUserRound size={18} />
          <span>{displayName || "Traveler"}</span>
        </div>
        <button className="icon-text-button" type="button" onClick={() => signOut()}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <div className="auth-cluster">
      <button
        className="text-button"
        type="button"
        disabled={isLoading}
        onClick={() => signIn()}
      >
        Sign in
      </button>
      <SignUpButton className="primary-small">Sign up</SignUpButton>
    </div>
  );
}

function SignedOutHeader({ disabled }) {
  return (
    <div className="auth-cluster">
      <button className="text-button" type="button" disabled={disabled}>
        Sign in
      </button>
      <button className="primary-small" type="button" disabled={disabled}>
        Sign up
      </button>
    </div>
  );
}

function SearchPanel() {
  return (
    <section className="search-panel" aria-label="Search travel">
      <div className="tabs" aria-label="Booking type">
        <button className="tab tab--active" type="button">
          <Plane size={18} />
          Flights
        </button>
        <button className="tab" type="button">
          <Hotel size={18} />
          Hotels
        </button>
        <button className="tab" type="button">
          <Sparkles size={18} />
          Trips
        </button>
      </div>

      <div className="trip-type">
        <button className="pill pill--selected" type="button">
          Round trip
        </button>
        <button className="pill" type="button">
          One way
        </button>
        <button className="pill" type="button">
          Multi-city
        </button>
      </div>

      <form className="search-grid">
        <label className="field field--wide">
          <span>From</span>
          <div>
            <MapPin size={18} />
            <input defaultValue="Colombo" aria-label="From city" />
          </div>
        </label>
        <label className="field field--wide">
          <span>To</span>
          <div>
            <Plane size={18} />
            <input defaultValue="Singapore" aria-label="To city" />
          </div>
        </label>
        <label className="field">
          <span>Dates</span>
          <div>
            <CalendarDays size={18} />
            <input defaultValue="Jun 12 - Jun 18" aria-label="Travel dates" />
          </div>
        </label>
        <label className="field">
          <span>Travelers</span>
          <div>
            <UsersRound size={18} />
            <input defaultValue="2 adults" aria-label="Travelers" />
          </div>
        </label>
        <button className="search-button" type="submit">
          <Search size={20} />
          Search
        </button>
      </form>
    </section>
  );
}

function App({ authReady }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Wayfinder Travel home">
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          <span>Wayfinder</span>
        </a>
        <nav className="main-nav" aria-label="Primary">
          <a href="#flights">Flights</a>
          <a href="#hotels">Hotels</a>
          <a href="#trips">Trips</a>
        </nav>
        <AuthenticatedHeader authReady={authReady} />
      </header>

      {!authReady && (
        <div className="setup-banner" role="status">
          <ShieldCheck size={18} />
          Add `VITE_ASGARDEO_CLIENT_ID` and `VITE_ASGARDEO_BASE_URL` to enable live
          Asgardeo sign in, sign up, and sign out.
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Flights, stays, and plans in one place</p>
            <h1>Book the trip that fits the way you actually travel.</h1>
            <p>
              Compare flexible fares, pair them with handpicked stays, and keep your
              bookings protected behind Asgardeo authentication.
            </p>
          </div>
          <SearchPanel />
        </section>

        <section className="insight-strip" aria-label="Travel benefits">
          <div>
            <ShieldCheck size={22} />
            <span>Secure account access</span>
          </div>
          <div>
            <Sparkles size={22} />
            <span>Personalized recommendations</span>
          </div>
          <div>
            <CalendarDays size={22} />
            <span>Flexible date tracking</span>
          </div>
        </section>

        <section className="content-band" id="flights">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live-style deals</p>
              <h2>Flight ideas worth checking first</h2>
            </div>
            <button className="link-button" type="button">
              View all
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="deal-grid">
            {flightDeals.map((deal) => (
              <article className={`deal-card deal-card--${deal.accent}`} key={deal.route}>
                <div className="deal-icon">
                  <Plane size={22} />
                </div>
                <p>{deal.tag}</p>
                <h3>{deal.route}</h3>
                <span>{deal.dates}</span>
                <strong>{deal.price}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="content-band two-column" id="hotels">
          <div>
            <p className="eyebrow">Stay nearby</p>
            <h2>Hotels aligned with your flight search</h2>
            <p className="section-copy">
              Signed-in travelers can save favorites, compare rooms, and return to trip
              planning without losing search context.
            </p>
            <button className="secondary-button" type="button">
              <BedDouble size={18} />
              Explore stays
            </button>
          </div>
          <div className="stay-list">
            {stays.map((stay) => (
              <article className="stay-card" key={stay.name}>
                <div>
                  <h3>{stay.name}</h3>
                  <p>{stay.place}</p>
                </div>
                <div className="stay-meta">
                  <span>{stay.rating}</span>
                  <strong>{stay.price}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="planner-panel" id="trips">
          <div>
            <p className="eyebrow">Trip workspace</p>
            <h2>Keep plans tidy from search to checkout.</h2>
          </div>
          <div className="planner-actions">
            <button className="filter-button" type="button">
              Price alerts
              <ChevronDown size={18} />
            </button>
            <button className="filter-button" type="button">
              Saved routes
              <ChevronDown size={18} />
            </button>
            <button className="filter-button" type="button">
              Hotel shortlist
              <ChevronDown size={18} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
