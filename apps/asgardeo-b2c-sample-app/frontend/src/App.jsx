import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Hotel,
  LogOut,
  MapPin,
  Minus,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
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
  const displayName =
    user?.givenname || user?.givenName || user?.userName || user?.username || user?.sub;

  if (isSignedIn) {
    return (
      <div className="auth-cluster">
        <a className="header-link" href="/bookings">
          My bookings
        </a>
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

function formatPrice(currency, amount) {
  return `${currency === "USD" ? "$" : `${currency} `}${amount}`;
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
        [itemId]: "idle"
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
        <section className="bookings-empty">
          <p className="eyebrow">My bookings</p>
          <h1>Sign in to view your booked flights.</h1>
          <button className="search-button standalone-button" type="button" onClick={() => signIn()}>
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="bookings-page">
      <section className="bookings-heading">
        <div>
          <p className="eyebrow">My bookings</p>
          <h1>Booked flights</h1>
          <p>{user?.username || user?.userName || user?.email || "Your confirmed flights"}</p>
        </div>
      </section>

      {error && (
        <div className="api-status api-status--error" role="status">
          {error}
        </div>
      )}

      <section className="results-section">
        {isLoading && <p className="empty-state">Loading booked flights...</p>}
        {!isLoading && bookings.length === 0 && (
          <p className="empty-state">You do not have any booked flights yet.</p>
        )}
        {!isLoading &&
          bookings.map((booking) => (
            <article className="result-card" key={booking.id}>
              <div>
                <p className="result-label">
                  {booking.status} · {booking.travelers} traveler
                  {booking.travelers === 1 ? "" : "s"}
                </p>
                <h2>
                  {booking.flight.from} to {booking.flight.to}
                </h2>
                <p>
                  {booking.flight.departureTime} - {booking.flight.arrivalTime} ·{" "}
                  {booking.flight.duration} · {booking.flight.dates}
                </p>
              </div>
              <div className="result-side">
                <strong>{formatPrice(booking.flight.currency, booking.flight.price)}</strong>
                <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
      </section>
    </main>
  );
}

function BookingsUnavailable() {
  return (
    <main className="bookings-page">
      <section className="bookings-empty">
        <p className="eyebrow">My bookings</p>
        <h1>Configure Asgardeo to view signed-in bookings.</h1>
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
      ) : isBookingsPage ? (
        authReady ? <BookingsPageWithAuth /> : <BookingsUnavailable />
      ) : (
        <main>
          <section className="hero" id="search">
            <div className="hero-copy">
              <p className="eyebrow">Flights, stays, and plans in one place</p>
              <h1>Book the trip that fits the way you actually travel.</h1>
              <p>
                Compare flexible fares, pair them with handpicked stays, and keep your
                bookings protected behind Asgardeo authentication.
              </p>
            </div>
            <SearchPanel locations={locations} onSearch={handleSearch} />
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
