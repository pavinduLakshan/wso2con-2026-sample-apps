import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Hotel,
  LifeBuoy,
  LogOut,
  MapPin,
  Minus,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound
} from "lucide-react";
import { SignUpButton, useAsgardeo } from "@asgardeo/react";
import {
  createBooking,
  getBookedFlights,
  getFlights,
  getHotels,
  getLocations,
  getTrips
} from "./api";

function getCurrentLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search
  };
}

function AuthenticatedHeader({ authReady }) {
  if (!authReady) {
    return <SignedOutHeader disabled />;
  }

  return <LiveAuthHeader />;
}

function LiveAuthHeader() {
  const { isSignedIn, isLoading, signIn, signOut, user } = useAsgardeo();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const firstName = user?.given_name || user?.givenname || user?.givenName || user?.firstName || "";
  const lastName = user?.family_name || user?.familyname || user?.familyName || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const email = user?.email || user?.mail || user?.username || user?.userName || "";
  const displayName = fullName || email || user?.sub || "Traveler";

  useEffect(() => {
    function handlePointerDown(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  if (isSignedIn) {
    return (
      <div className="auth-cluster account-menu-wrap" ref={accountMenuRef}>
        <button
          className="user-chip"
          type="button"
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsAccountMenuOpen((current) => !current)}
        >
          <CircleUserRound className="user-chip-avatar" size={28} />
          <span className="user-chip-text">
            <span className="user-chip-name">{displayName}</span>
            {fullName && email && <span className="user-chip-email">{email}</span>}
          </span>
          <ChevronDown
            className={`user-chip-chevron ${isAccountMenuOpen ? "user-chip-chevron--open" : ""}`}
            size={18}
          />
        </button>
        {isAccountMenuOpen && (
          <div className="account-menu" role="menu">
            <a className="account-menu-item" href="/bookings" role="menuitem">
              <CircleUserRound size={18} />
              <span>My Bookings</span>
            </a>
            <button
              className="account-menu-item"
              type="button"
              role="menuitem"
              onClick={() => signOut()}
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
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

function LocationField({
  icon,
  label,
  name,
  defaultValue,
  locations,
  placeholder,
  isOpen,
  onOpen,
  onClose
}) {
  const [value, setValue] = useState(defaultValue || "");
  const normalizedValue = value.trim().toLowerCase();
  const filteredLocations = locations
    .filter((location) => location.name.toLowerCase().includes(normalizedValue))
    .slice(0, 8);

  useEffect(() => {
    setValue(defaultValue || "");
  }, [defaultValue]);

  function selectLocation(locationName) {
    setValue(locationName);
    onClose();
  }

  return (
    <label className="field field--wide location-field">
      <span>{label}</span>
      <div className="field-control">
        {icon}
        <input
          autoComplete="off"
          name={name}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => {
            setValue(event.target.value);
            onOpen();
          }}
          onClick={onOpen}
          onFocus={onOpen}
        />
      </div>
      {isOpen && filteredLocations.length > 0 && (
        <div className="location-menu" role="listbox">
          {filteredLocations.map((location) => (
            <button
              className="location-option"
              key={`${location.type}-${location.name}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(location.name)}
            >
              <MapPin size={16} />
              <span>{location.name}</span>
              <small>{location.type}</small>
              {location.name === value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

const monthFormatter = new Intl.DateTimeFormat("en", { month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return "Select dates";
  }

  return `${shortDateFormatter.format(startDate)} - ${shortDateFormatter.format(endDate)}`;
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let index = 0; index < leadingDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function DateField({ defaultValue, isOpen, onOpen, onClose }) {
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 4, 1));
  const [startDate, setStartDate] = useState(new Date(2026, 5, 12));
  const [endDate, setEndDate] = useState(new Date(2026, 5, 18));
  const displayValue = formatDateRange(startDate, endDate) || defaultValue;

  function selectDate(date) {
    if (!startDate || (startDate && endDate) || date < startDate) {
      setStartDate(date);
      setEndDate(null);
      return;
    }

    setEndDate(date);
  }

  function renderMonth(monthDate) {
    const days = buildCalendarDays(monthDate);

    return (
      <div className="calendar-month">
        <h3>{monthFormatter.format(monthDate)}</h3>
        <div className="calendar-weekdays">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((date, index) => {
            if (!date) {
              return <span className="calendar-empty" key={`empty-${index}`} />;
            }

            const isStart = startDate && dateKey(date) === dateKey(startDate);
            const isEnd = endDate && dateKey(date) === dateKey(endDate);
            const isInRange = startDate && endDate && date > startDate && date < endDate;

            return (
              <button
                className={`calendar-day ${isStart || isEnd ? "calendar-day--selected" : ""} ${
                  isInRange ? "calendar-day--range" : ""
                }`}
                key={dateKey(date)}
                type="button"
                onClick={() => selectDate(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <label className="field date-field">
      <span>Dates</span>
      <div className="field-control">
        <CalendarDays size={18} />
        <input
          name="dates"
          readOnly
          value={displayValue}
          aria-label="Travel dates"
          onFocus={onOpen}
          onClick={onOpen}
        />
      </div>
      {isOpen && (
        <div className="date-menu">
          <div className="calendar-wrap">
            <button
              className="calendar-nav"
              type="button"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={26} />
            </button>
            {renderMonth(visibleMonth)}
            {renderMonth(addMonths(visibleMonth, 1))}
            <button
              className="calendar-nav"
              type="button"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={26} />
            </button>
          </div>
          <div className="date-menu-footer">
            <button className="apply-button" type="button" onClick={onClose}>
              Apply
            </button>
          </div>
        </div>
      )}
    </label>
  );
}

function TravelersField({ defaultValue, isOpen, onOpen, onClose }) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const displayValue =
    `${adults} adult${adults === 1 ? "" : "s"}${children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}` ||
    defaultValue;

  function changeAdults(change) {
    setAdults((current) => Math.max(1, current + change));
  }

  function changeChildren(change) {
    setChildren((current) => Math.max(0, current + change));
  }

  return (
    <label className="field travelers-field">
      <span>Travelers</span>
      <div className="field-control">
        <UsersRound size={18} />
        <input
          name="travelers"
          readOnly
          value={displayValue}
          aria-label="Travelers"
          onFocus={onOpen}
          onClick={onOpen}
        />
      </div>
      {isOpen && (
        <div className="travelers-menu">
          <div className="traveler-row">
            <div>
              <strong>Adults</strong>
              <span>Aged 18+</span>
            </div>
            <div className="stepper">
              <button type="button" disabled={adults <= 1} onClick={() => changeAdults(-1)}>
                <Minus size={20} />
              </button>
              <strong>{adults}</strong>
              <button type="button" onClick={() => changeAdults(1)}>
                <Plus size={22} />
              </button>
            </div>
          </div>
          <div className="traveler-row">
            <div>
              <strong>Children</strong>
              <span>Aged 0 to 17</span>
            </div>
            <div className="stepper">
              <button type="button" disabled={children <= 0} onClick={() => changeChildren(-1)}>
                <Minus size={20} />
              </button>
              <strong>{children}</strong>
              <button type="button" onClick={() => changeChildren(1)}>
                <Plus size={22} />
              </button>
            </div>
          </div>
          <p>
            Your age at time of travel must be valid for the age category booked.
            Airlines have restrictions on under 18s travelling alone.
          </p>
          <p>
            Age limits and policies for travelling with children may vary so please check
            with the airline before booking.
          </p>
          <button className="apply-button apply-button--full" type="button" onClick={onClose}>
            Apply
          </button>
        </div>
      )}
    </label>
  );
}

function SearchPanel({ initialCriteria, locations, onSearch }) {
  const [category, setCategory] = useState(initialCriteria?.category || "flights");
  const [tripType, setTripType] = useState(initialCriteria?.tripType || "round-trip");
  const [openDropdown, setOpenDropdown] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    setCategory(initialCriteria?.category || "flights");
    setTripType(initialCriteria?.tripType || "round-trip");
  }, [initialCriteria?.category, initialCriteria?.tripType]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSearch({
      category,
      tripType,
      from: formData.get("from"),
      to: formData.get("to"),
      dates: formData.get("dates"),
      travelers: formData.get("travelers")
    });
  }

  const isHotelSearch = category === "hotels";
  const destinationPlaceholder = isHotelSearch ? "Choose area" : "Choose destination";

  return (
    <section className="search-panel" ref={panelRef} aria-label="Search travel">
      <div className="tabs" aria-label="Booking type">
        <button
          className={`tab ${category === "flights" ? "tab--active" : ""}`}
          type="button"
          onClick={() => setCategory("flights")}
        >
          <Plane size={18} />
          Flights
        </button>
        <button
          className={`tab ${category === "hotels" ? "tab--active" : ""}`}
          type="button"
          onClick={() => setCategory("hotels")}
        >
          <Hotel size={18} />
          Hotels
        </button>
        <button
          className={`tab ${category === "trips" ? "tab--active" : ""}`}
          type="button"
          onClick={() => setCategory("trips")}
        >
          <Sparkles size={18} />
          Trips
        </button>
      </div>

      <div className="trip-type">
        <button
          className={`pill ${tripType === "round-trip" ? "pill--selected" : ""}`}
          type="button"
          onClick={() => setTripType("round-trip")}
        >
          Round trip
        </button>
        <button
          className={`pill ${tripType === "one-way" ? "pill--selected" : ""}`}
          type="button"
          onClick={() => setTripType("one-way")}
        >
          One way
        </button>
        <button
          className={`pill ${tripType === "multi-city" ? "pill--selected" : ""}`}
          type="button"
          onClick={() => setTripType("multi-city")}
        >
          Multi-city
        </button>
      </div>

      <form className="search-grid" onSubmit={handleSubmit}>
        {!isHotelSearch && (
          <LocationField
            defaultValue={initialCriteria?.from || "Colombo"}
            icon={<MapPin size={18} />}
            isOpen={openDropdown === "from"}
            label="From"
            locations={locations[category] || []}
            name="from"
            onClose={() => setOpenDropdown(null)}
            onOpen={() => setOpenDropdown("from")}
            placeholder="Choose origin"
          />
        )}
        <LocationField
          defaultValue={initialCriteria?.to || "Singapore"}
          icon={isHotelSearch ? <MapPin size={18} /> : <Plane size={18} />}
          isOpen={openDropdown === "to"}
          label={isHotelSearch ? "Destination" : "To"}
          locations={locations[category] || []}
          name="to"
          onClose={() => setOpenDropdown(null)}
          onOpen={() => setOpenDropdown("to")}
          placeholder={destinationPlaceholder}
        />
        <DateField
          defaultValue={initialCriteria?.dates}
          isOpen={openDropdown === "dates"}
          onClose={() => setOpenDropdown(null)}
          onOpen={() => setOpenDropdown("dates")}
        />
        <TravelersField
          defaultValue={initialCriteria?.travelers}
          isOpen={openDropdown === "travelers"}
          onClose={() => setOpenDropdown(null)}
          onOpen={() => setOpenDropdown("travelers")}
        />
        <button className="search-button" type="submit">
          <Search size={20} />
          Search
        </button>
      </form>
    </section>
  );
}

function readCriteria(search) {
  const params = new URLSearchParams(search);

  return {
    category: params.get("category") || "flights",
    tripType: params.get("tripType") || "round-trip",
    from: params.get("from") || "",
    to: params.get("to") || "",
    dates: params.get("dates") || "",
    travelers: params.get("travelers") || ""
  };
}

function buildResultsPath(criteria) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(criteria)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/results?${params.toString()}`;
}

function HomePage({ locations, onSearch }) {
  const highlights = [
    {
      icon: <Sparkles size={22} />,
      title: "Flexible trip ideas",
      copy: "Explore flights, hotels, and curated city plans from one calm workspace."
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Protected bookings",
      copy: "Keep account actions and booked trips connected to secure Asgardeo sign-in."
    },
    {
      icon: <Clock3 size={22} />,
      title: "Fast comparisons",
      copy: "Filter practical options for routes, dates, travelers, and stay preferences."
    }
  ];

  const deals = [
    {
      className: "deal-card--mint",
      icon: <Plane size={22} />,
      route: "Colombo to Singapore",
      title: "Nonstop city break with smart baggage picks",
      price: "$420",
      meta: "Jun 12 - Jun 18"
    },
    {
      className: "deal-card--coral",
      icon: <Hotel size={22} />,
      route: "Tokyo Shibuya",
      title: "Walkable stays close to food, rail, and late-night plans",
      price: "$186",
      meta: "Average nightly rate"
    },
    {
      className: "deal-card--gold",
      icon: <Sparkles size={22} />,
      route: "Dubai highlights",
      title: "A polished three-day plan with room to wander",
      price: "$780",
      meta: "Estimated trip total"
    }
  ];

  const faqs = [
    {
      question: "Can I search without signing in?",
      answer: "Yes. You can explore flights, hotels, and trips first. Sign in when you want to save or book."
    },
    {
      question: "What does Asgardeo protect here?",
      answer: "Asgardeo handles the account experience for sign in, sign up, sign out, and authenticated booking actions."
    },
    {
      question: "Can I plan flights and hotels together?",
      answer: "Yes. The home search lets you switch between flights, hotels, and trip ideas before comparing results."
    },
    {
      question: "Is this connected to live inventory?",
      answer: "This sample can use the local API data, with graceful fallback options so the UI remains usable during setup."
    }
  ];

  return (
    <main>
      <section className="hero" id="search">
        <div className="hero-copy">
          <p className="eyebrow">Flights, stays, and plans in one place</p>
          <h1>Travel planning that feels bright, quick, and protected.</h1>
          <p>
            Compare flexible fares, pair them with memorable stays, and keep your
            bookings connected to a secure account experience.
          </p>
          <div className="hero-actions" aria-label="Popular planning links">
            <a className="secondary-button" href="#deals">
              <Sparkles size={18} />
              See ideas
            </a>
            <a className="link-button" href="#faq">
              FAQ
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
        <SearchPanel locations={locations} onSearch={onSearch} />
      </section>

      <section className="insight-strip" aria-label="Wayfinder highlights">
        {highlights.map((item) => (
          <div key={item.title}>
            {item.icon}
            <span>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </span>
          </div>
        ))}
      </section>

      <section className="content-band" id="deals">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fresh picks</p>
            <h2>Optimistic options for your next window of free time.</h2>
          </div>
          <a className="link-button" href="#search">
            Start searching
            <ArrowRight size={18} />
          </a>
        </div>
        <div className="deal-grid">
          {deals.map((deal) => (
            <article className={`deal-card ${deal.className}`} key={deal.title}>
              <div className="deal-icon">{deal.icon}</div>
              <p>{deal.route}</p>
              <h3>{deal.title}</h3>
              <span>{deal.meta}</span>
              <strong>{deal.price}</strong>
              <button className="card-action" type="button" onClick={() => window.location.hash = "search"}>
                Explore
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="two-column content-band">
        <div>
          <p className="eyebrow">Why Wayfinder</p>
          <h2>A cleaner path from curiosity to booking.</h2>
          <p className="section-copy">
            Keep the practical pieces close together: route ideas, stay options,
            traveler counts, and authenticated bookings. The experience is designed
            for quick scanning without losing the warmth of a good trip.
          </p>
          <a className="secondary-button" href="#search">
            <Search size={18} />
            Plan a route
          </a>
        </div>
        <div className="stay-list">
          <article className="stay-card">
            <div>
              <h3>Secure account journey</h3>
              <p>Sign in, sign up, and booking actions sit naturally in the flow.</p>
            </div>
            <div className="stay-meta">
              <span>
                <ShieldCheck size={18} />
              </span>
              <strong>Asgardeo</strong>
            </div>
          </article>
          <article className="stay-card">
            <div>
              <h3>Human-friendly choices</h3>
              <p>Flights, hotels, and trip ideas are grouped for repeat comparison.</p>
            </div>
            <div className="stay-meta">
              <span>
                <Star size={18} />
              </span>
              <strong>Curated</strong>
            </div>
          </article>
          <article className="stay-card">
            <div>
              <h3>Support-ready setup</h3>
              <p>Fallback sample data keeps the front end useful while APIs connect.</p>
            </div>
            <div className="stay-meta">
              <span>
                <LifeBuoy size={18} />
              </span>
              <strong>Resilient</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Answers before takeoff.</h2>
          </div>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function SignedInHomePage({ locations, onSearch }) {
  const { isSignedIn, user } = useAsgardeo();

  if (!isSignedIn) {
    return <HomePage locations={locations} onSearch={onSearch} />;
  }

  const firstName = user?.given_name || user?.givenname || user?.givenName || user?.firstName || "";
  const lastName = user?.family_name || user?.familyname || user?.familyName || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const email = user?.email || user?.mail || user?.username || user?.userName || "";
  const greetingName = firstName || fullName || email || "Traveler";

  return (
    <main className="dashboard-home">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Travel workspace</p>
          <h1>Welcome back, {greetingName}.</h1>
          <p>
            Manage your searches, bookings, and trip plans from one focused workspace.
          </p>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Travel management overview">
        <article className="dashboard-card dashboard-card--primary">
          <span>Next step</span>
          <h2>Start a new search</h2>
          <p>Compare flights, hotels, and trip ideas with your signed-in session ready.</p>
          <a className="dashboard-action" href="#dashboard-search">
            Search options
            <ArrowRight size={18} />
          </a>
        </article>
        <article className="dashboard-card">
          <span>Bookings</span>
          <h2>Review saved trips</h2>
          <p>Open your confirmed bookings and keep travel details close.</p>
          <a className="dashboard-action dashboard-action--secondary" href="/bookings">
            My Bookings
            <ArrowRight size={18} />
          </a>
        </article>
      </section>

      <section className="dashboard-search-section" id="dashboard-search">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plan from here</p>
            <h2>Search without leaving your workspace.</h2>
          </div>
        </div>
        <SearchPanel locations={locations} onSearch={onSearch} />
      </section>
    </main>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <a className="brand footer-brand" href="/" aria-label="Wayfinder Travel home">
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          <span>Wayfinder</span>
        </a>
        <p>Modern travel booking flows, secured with Asgardeo.</p>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <a href="#search">Search</a>
        <a href="#deals">Deals</a>
        <a href="#faq">FAQ</a>
      </nav>
    </footer>
  );
}

function formatPrice(currency, amount) {
  return `${currency === "USD" ? "$" : `${currency} `}${amount}`;
}

const walletCredentialOffer =
  "openid-credential-offer://?credential_offer_uri=https://stage.api.asgardeo.io/t/stageanu/oid4vci/credential-offer/72169f21-988b-4090-975e-44fa74a2fd7f";

function formatBookingReference(bookingId) {
  const source = String(bookingId || "").replace(/^booking-/i, "");
  const letters = source.replace(/[^a-z]/gi, "").toUpperCase().padEnd(4, "WXYZ");
  const numbers = source.replace(/\D/g, "").padEnd(6, "202600");

  return `${letters.slice(0, 4)}-${numbers.slice(0, 6)}`;
}

function isSameFlight(firstFlight, secondFlight) {
  return (
    firstFlight?.from === secondFlight?.from &&
    firstFlight?.to === secondFlight?.to &&
    firstFlight?.departureTime === secondFlight?.departureTime &&
    firstFlight?.arrivalTime === secondFlight?.arrivalTime &&
    firstFlight?.dates === secondFlight?.dates
  );
}

function ResultsPage({ criteria, getAccessToken, locations, onSearch }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingStates, setBookingStates] = useState({});

  useEffect(() => {
    let isCurrent = true;

    async function loadResults() {
      setIsLoading(true);
      setError("");
      setBookingStates({});

      try {
        let data;

        if (criteria.category === "hotels") {
          data = await getHotels({ location: criteria.to });
        } else if (criteria.category === "trips") {
          data = await getTrips({ destination: criteria.to });
        } else {
          data = await getFlights({
            from: criteria.from,
            to: criteria.to
          });
        }

        if (isCurrent) {
          setResults(data);

          if (criteria.category === "flights" && getAccessToken) {
            try {
              const accessToken = await getAccessToken();
              const bookedFlights = await getBookedFlights(accessToken);
              const nextBookingStates = {};

              for (const result of data) {
                if (bookedFlights.some((booking) => isSameFlight(result, booking.flight))) {
                  nextBookingStates[result.id] = "confirmed";
                }
              }

              if (isCurrent) {
                setBookingStates(nextBookingStates);
              }
            } catch {
              // Results should remain usable even if existing bookings cannot be checked.
            }
          }
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      isCurrent = false;
    };
  }, [criteria]);

  async function handleBooking(type, itemId) {
    setError("");
    setBookingStates((current) => ({
      ...current,
      [itemId]: "booking"
    }));

    try {
      const accessToken = getAccessToken ? await getAccessToken() : null;

      await createBooking({
        type,
        itemId,
        travelers: Number.parseInt(criteria.travelers, 10) || 1
      }, accessToken);

      setBookingStates((current) => ({
        ...current,
        [itemId]: "confirmed"
      }));
    } catch (requestError) {
      setBookingStates((current) => ({
        ...current,
        [itemId]: requestError.message.includes("already exists") ? "confirmed" : "idle"
      }));
      setError(requestError.message);
    }
  }

  const title =
    criteria.category === "hotels"
      ? `Hotels in ${criteria.to || "your destination"}`
      : criteria.category === "trips"
        ? `Trips to ${criteria.to || "your destination"}`
        : `${criteria.from || "Anywhere"} to ${criteria.to || "anywhere"}`;

  return (
    <main>
      <section className="results-hero">
        <div>
          <p className="eyebrow">Search results</p>
          <h1>{title}</h1>
          <p>
            {criteria.dates || "Flexible dates"} · {criteria.travelers || "Any travelers"}
          </p>
        </div>
        <SearchPanel
          initialCriteria={criteria}
          key={`${criteria.category}-${criteria.from}-${criteria.to}-${criteria.dates}-${criteria.travelers}`}
          locations={locations}
          onSearch={onSearch}
        />
      </section>

      {error && (
        <div className="api-status api-status--error" role="status">
          {error}
        </div>
      )}

      <section className="results-section" aria-label="Search results">
        {isLoading && <p className="empty-state">Loading results...</p>}
        {!isLoading && results.length === 0 && (
          <p className="empty-state">No results matched this search.</p>
        )}
        {!isLoading &&
          results.map((item) => (
            <ResultCard
              category={criteria.category}
              item={item}
              key={item.id}
              bookingState={bookingStates[item.id] || "idle"}
              onBook={handleBooking}
            />
          ))}
      </section>
    </main>
  );
}

function BookingButton({ bookingState, children, onClick }) {
  const isBooking = bookingState === "booking";
  const isConfirmed = bookingState === "confirmed";

  return (
    <button
      className={`card-action ${isConfirmed ? "card-action--confirmed" : ""}`}
      type="button"
      disabled={isBooking || isConfirmed}
      onClick={onClick}
    >
      {isBooking ? "Booking..." : isConfirmed ? "Booked" : children}
    </button>
  );
}

function ResultCard({ bookingState, category, item, onBook }) {
  if (category === "hotels") {
    return (
      <article className="result-card">
        <div>
          <p className="result-label">Hotel · Rating {item.rating}</p>
          <h2>{item.name}</h2>
          <p>{item.location}</p>
          <div className="result-tags">
            {item.amenities?.map((amenity) => (
              <span key={amenity}>{amenity}</span>
            ))}
          </div>
        </div>
        <div className="result-side">
          <strong>{formatPrice(item.currency, item.nightlyRate)}</strong>
          <span>per night</span>
          <BookingButton bookingState={bookingState} onClick={() => onBook("hotel", item.id)}>
            Reserve
          </BookingButton>
        </div>
      </article>
    );
  }

  if (category === "trips") {
    return (
      <article className="result-card">
        <div>
          <p className="result-label">Trip · {item.status}</p>
          <h2>{item.title}</h2>
          <p>{item.destination}</p>
        </div>
        <div className="result-side">
          <strong>{formatPrice(item.currency, item.totalEstimate)}</strong>
          <span>estimate</span>
          <BookingButton bookingState={bookingState} onClick={() => onBook("trip", item.id)}>
            Book trip
          </BookingButton>
        </div>
      </article>
    );
  }

  return (
    <article className="result-card">
      <div>
        <p className="result-label">
          {item.airline} · {item.stops === 0 ? "Nonstop" : `${item.stops} stop`}
        </p>
        <h2>{item.from} to {item.to}</h2>
        <p>
          {item.departureTime} - {item.arrivalTime} · {item.duration} · {item.dates}
        </p>
        <div className="result-tags">
          {item.tags?.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="result-side">
        <strong>{formatPrice(item.currency, item.price)}</strong>
        <span>{item.cabin}</span>
        <BookingButton bookingState={bookingState} onClick={() => onBook("flight", item.id)}>
          Book flight
        </BookingButton>
      </div>
    </article>
  );
}

function ResultsPageWithAuth(props) {
  const { getAccessToken } = useAsgardeo();

  return <ResultsPage {...props} getAccessToken={getAccessToken} />;
}

function BookingsPageWithAuth() {
  const { getAccessToken, isSignedIn, signIn, user } = useAsgardeo();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const userKey = user?.sub || user?.username || user?.userName || user?.email || "signed-in";
  const getAccessTokenRef = useRef(getAccessToken);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    let isCurrent = true;

    async function loadBookings() {
      if (!isSignedIn) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const accessToken = getAccessTokenRef.current ? await getAccessTokenRef.current() : null;
        const data = await getBookedFlights(accessToken);

        if (isCurrent) {
          setBookings(data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      isCurrent = false;
    };
  }, [isSignedIn, userKey]);

  if (!isSignedIn) {
    return (
      <main className="bookings-page">
        <section className="management-empty">
          <div>
            <p className="eyebrow">Bookings</p>
            <h1>Sign in to manage your bookings.</h1>
            <p>View confirmed trips, booking status, passenger count, and flight details.</p>
          </div>
          <button className="dashboard-action dashboard-action--secondary" type="button" onClick={() => signIn()}>
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="bookings-page">
      <section className="management-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Bookings</h1>
        </div>
      </section>

      {error && (
        <div className="api-status api-status--error" role="status">
          {error}
        </div>
      )}

      <section className="management-panel" aria-label="Booked flights">
        <div className="management-panel-header">
          <div>
            <h2>Flight bookings</h2>
            <p>Track confirmed reservations and traveler details.</p>
          </div>
        </div>

        {isLoading && <p className="empty-state management-message">Loading booked flights...</p>}
        {!isLoading && bookings.length === 0 && (
          <div className="management-empty-state">
            <h2>No bookings yet</h2>
            <p>Your confirmed flights will appear here after booking.</p>
            <a className="dashboard-action dashboard-action--secondary" href="/#dashboard-search">
              Start searching
            </a>
          </div>
        )}
        {!isLoading &&
          bookings.length > 0 && (
            <div className="booking-table-heading" aria-hidden="true">
              <span>Route</span>
              <span>Schedule</span>
              <span>Travelers</span>
              <span>Total</span>
            </div>
          )}
        {!isLoading &&
          bookings.length > 0 &&
          bookings.map((booking) => (
            <a className="booking-row" href={`/bookings/${booking.id}`} key={booking.id}>
              <div className="booking-route">
                <span className="booking-status">{booking.status}</span>
                <strong>{booking.flight.from} to {booking.flight.to}</strong>
                <small>Booked {new Date(booking.createdAt).toLocaleDateString()}</small>
              </div>
              <div className="booking-cell">
                <strong>{booking.flight.departureTime} - {booking.flight.arrivalTime}</strong>
                <span>{booking.flight.duration} · {booking.flight.dates}</span>
              </div>
              <div className="booking-cell">
                <strong>
                  {booking.travelers} traveler{booking.travelers === 1 ? "" : "s"}
                </strong>
                <span>{booking.flight.cabin}</span>
              </div>
              <div className="booking-price">
                <strong>{formatPrice(booking.flight.currency, booking.flight.price)}</strong>
              </div>
            </a>
          ))}
      </section>
    </main>
  );
}

function BookingDetailsPageWithAuth({ bookingId }) {
  const { getAccessToken, isSignedIn, signIn, user } = useAsgardeo();
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletQrOpen, setIsWalletQrOpen] = useState(false);
  const [error, setError] = useState("");
  const userKey = user?.sub || user?.username || user?.userName || user?.email || "signed-in";
  const getAccessTokenRef = useRef(getAccessToken);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    let isCurrent = true;

    async function loadBooking() {
      if (!isSignedIn) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const accessToken = getAccessTokenRef.current ? await getAccessTokenRef.current() : null;
        const bookings = await getBookedFlights(accessToken);
        const selectedBooking = bookings.find((item) => String(item.id) === String(bookingId));

        if (isCurrent) {
          setBooking(selectedBooking || null);
          setError(selectedBooking ? "" : "Booking not found.");
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      isCurrent = false;
    };
  }, [bookingId, isSignedIn, userKey]);

  if (!isSignedIn) {
    return (
      <main className="bookings-page">
        <section className="management-empty">
          <div>
            <p className="eyebrow">Booking details</p>
            <h1>Sign in to view this booking.</h1>
            <p>Booking details are available after authentication.</p>
          </div>
          <button className="dashboard-action dashboard-action--secondary" type="button" onClick={() => signIn()}>
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="bookings-page">
      <section className="management-header">
        <div>
          <a className="back-link" href="/bookings">
            <ChevronLeft size={18} />
            Back to bookings
          </a>
          <h1>{booking ? `${booking.flight.from} to ${booking.flight.to}` : "Booking"}</h1>
          <p>{booking ? `Reference ${formatBookingReference(booking.id)}` : "Loading booking information"}</p>
        </div>
      </section>

      {error && (
        <div className="api-status api-status--error" role="status">
          {error}
        </div>
      )}

      {isLoading && <p className="empty-state management-message">Loading booking details...</p>}

      {!isLoading && booking && (
        <section className="booking-detail-panel" aria-label="Booking information">
          <div className="booking-detail-main">
            <div className="booking-itinerary-card">
              <div className="booking-detail-topline">
                <span className="booking-status">{booking.status}</span>
                <strong>{booking.flight.airline}</strong>
              </div>
              <div className="itinerary-route">
                <div>
                  <span>{booking.flight.departureTime}</span>
                  <strong>{booking.flight.from}</strong>
                </div>
                <div className="itinerary-line">
                  <Plane size={20} />
                </div>
                <div>
                  <span>{booking.flight.arrivalTime}</span>
                  <strong>{booking.flight.to}</strong>
                </div>
              </div>
              <div className="itinerary-meta">
                <span>{booking.flight.duration}</span>
                <span>{booking.flight.stops === 0 ? "Nonstop" : `${booking.flight.stops} stop`}</span>
                <span>{booking.flight.cabin}</span>
              </div>
            </div>

            <aside className="booking-receipt-card" aria-label="Booking receipt">
              <span>Total paid</span>
              <strong>{formatPrice(booking.flight.currency, booking.flight.price)}</strong>
              <p>Reference {formatBookingReference(booking.id)}</p>
              <button
                className="wallet-button"
                type="button"
                onClick={() => setIsWalletQrOpen(true)}
              >
                Add to wallet
              </button>
            </aside>
          </div>

          <div className="booking-detail-sections">
            <section>
              <h2>Trip details</h2>
              <dl>
                <div>
                  <dt>Travel dates</dt>
                  <dd>{booking.flight.dates}</dd>
                </div>
                <div>
                  <dt>Travelers</dt>
                  <dd>
                    {booking.travelers} traveler{booking.travelers === 1 ? "" : "s"}
                  </dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>Booking details</h2>
              <dl>
                <div>
                  <dt>Booked on</dt>
                  <dd>{new Date(booking.createdAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{booking.status}</dd>
                </div>
              </dl>
            </section>
          </div>
          {isWalletQrOpen && (
            <div className="qr-overlay" role="presentation">
              <div
                className="qr-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wallet-qr-title"
              >
                <div className="qr-dialog-header">
                  <div>
                    <p className="eyebrow">Digital wallet</p>
                    <h2 id="wallet-qr-title">Add booking to wallet</h2>
                    <p>
                      Store this booking as a verifiable credential for a smoother airport journey.
                    </p>
                  </div>
                  <button
                    className="qr-close-button"
                    type="button"
                    aria-label="Close wallet QR code"
                    onClick={() => setIsWalletQrOpen(false)}
                  >
                    x
                  </button>
                </div>
                <div className="qr-code-frame">
                  <img
                    alt="QR code for adding this booking to a wallet"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(walletCredentialOffer)}`}
                  />
                </div>
                <div className="qr-benefits">
                  <div>
                    <strong>1</strong>
                    <span>Scan with a compatible wallet app.</span>
                  </div>
                  <div>
                    <strong>2</strong>
                    <span>Save the booking credential to your wallet.</span>
                  </div>
                  <div>
                    <strong>3</strong>
                    <span>Present it to a verifier at boarding control.</span>
                  </div>
                </div>
                <p className="qr-note">
                  Airport staff can verify the credential cryptographically, helping reduce manual
                  checks and supporting a seamless travel experience.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function BookingsUnavailable() {
  return (
    <main className="bookings-page">
      <section className="management-empty">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1>Configure Asgardeo to manage bookings.</h1>
          <p>Live booking management is available after the Asgardeo client settings are added.</p>
        </div>
      </section>
    </main>
  );
}

function App({ authReady }) {
  const [location, setLocation] = useState(getCurrentLocation);
  const [locations, setLocations] = useState({
    flights: [],
    hotels: [],
    trips: []
  });

  useEffect(() => {
    function handlePopState() {
      setLocation(getCurrentLocation());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadLocations() {
      try {
        const [flightLocations, hotelLocations, tripLocations] = await Promise.all([
          getLocations({ category: "flights" }),
          getLocations({ category: "hotels" }),
          getLocations({ category: "trips" })
        ]);

        if (isCurrent) {
          setLocations({
            flights: flightLocations,
            hotels: hotelLocations,
            trips: tripLocations
          });
        }
      } catch {
        if (isCurrent) {
          setLocations({
            flights: [
              { name: "Colombo", type: "city" },
              { name: "Singapore", type: "city" },
              { name: "Tokyo", type: "city" },
              { name: "London", type: "city" },
              { name: "Dubai", type: "city" }
            ],
            hotels: [
              { name: "Singapore Marina", type: "area" },
              { name: "Tokyo Shibuya", type: "area" },
              { name: "London Kings Cross", type: "area" }
            ],
            trips: [
              { name: "Singapore", type: "destination" },
              { name: "Tokyo", type: "destination" },
              { name: "Dubai", type: "destination" }
            ]
          });
        }
      }
    }

    loadLocations();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleSearch(searchParams) {
    const nextPath = buildResultsPath(searchParams);

    window.history.pushState({}, "", nextPath);
    setLocation(getCurrentLocation());
  }

  const isResultsPage = location.pathname === "/results";
  const isBookingsPage = location.pathname === "/bookings";
  const isBookingDetailsPage = location.pathname.startsWith("/bookings/");
  const bookingId = isBookingDetailsPage ? decodeURIComponent(location.pathname.split("/").pop() || "") : "";
  const criteria = readCriteria(location.search);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Wayfinder Travel home">
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          <span>Wayfinder</span>
        </a>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="/#search">Search</a>
          <a href="/#deals">Deals</a>
          <a href="/#faq">FAQ</a>
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

      {isResultsPage ? (
        authReady ? (
          <ResultsPageWithAuth criteria={criteria} locations={locations} onSearch={handleSearch} />
        ) : (
          <ResultsPage criteria={criteria} locations={locations} onSearch={handleSearch} />
        )
      ) : isBookingDetailsPage ? (
        authReady ? <BookingDetailsPageWithAuth bookingId={bookingId} /> : <BookingsUnavailable />
      ) : isBookingsPage ? (
        authReady ? <BookingsPageWithAuth /> : <BookingsUnavailable />
      ) : (
        authReady ? (
          <SignedInHomePage locations={locations} onSearch={handleSearch} />
        ) : (
          <HomePage locations={locations} onSearch={handleSearch} />
        )
      )}
      <SiteFooter />
    </div>
  );
}

export default App;
