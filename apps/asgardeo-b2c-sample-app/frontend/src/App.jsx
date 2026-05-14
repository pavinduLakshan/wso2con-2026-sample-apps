import { useEffect, useRef, useState } from "react";
import { useAsgardeo } from "@asgardeo/react";
import {
  ChevronDown,
  CircleUserRound,
  LogOut,
  MessageCircle,
  Plane,
  Send,
  ShieldCheck,
  X
} from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { getLocations } from "./api";
import {
  clearCDSCookies,
  createSignInConfigWithCDSTracker,
  ensureCDSProfile,
  initializeCDSFromCookie
} from "./cds-api";
import { BookingDetailsPageWithAuth } from "./pages/BookingDetailsPageWithAuth";
import { BookingsPageWithAuth } from "./pages/BookingsPageWithAuth";
import { BookingsUnavailable } from "./pages/BookingsUnavailable";
import { FlightDetailsPage } from "./pages/FlightDetailsPage";
import { HomePage, SignedInHomePage } from "./pages/HomePage";
import { PaymentPageWithAuth } from "./pages/PaymentPageWithAuth";
import { ResultsPage, ResultsPageWithAuth } from "./pages/ResultsPage";
import { buildResultsPath, readCriteria } from "./utils/routes";

const AGENT_CHAT_URL = import.meta.env.VITE_AGENT_CHAT_URL || "ws://localhost:8790/chat";
const ASGARDEO_BASE_URL = import.meta.env.VITE_ASGARDEO_BASE_URL || "";
const ASGARDEO_ORG_NAME = getAsgardeoOrgName();
const SIGN_UP_URL = ASGARDEO_ORG_NAME
  ? `https://accounts.asgardeo.io/t/${encodeURIComponent(ASGARDEO_ORG_NAME)}/accounts/register`
  : "https://accounts.asgardeo.io/accounts/register";

function getAsgardeoOrgName() {
  const configuredOrgName = import.meta.env.VITE_ASGARDEO_ORG_NAME?.trim();

  if (configuredOrgName) {
    return configuredOrgName;
  }

  if (!ASGARDEO_BASE_URL) {
    return "";
  }

  try {
    const pathParts = new URL(ASGARDEO_BASE_URL).pathname.split("/").filter(Boolean);
    const tenantIndex = pathParts.indexOf("t");

    return tenantIndex >= 0 ? pathParts[tenantIndex + 1] || "" : "";
  } catch {
    return "";
  }
}

function createChatMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content
  };
}

function hasAsgardeoCallbackParams(search) {
  const params = new URLSearchParams(search);

  return Boolean((params.get("code") && params.get("state")) || params.get("error"));
}

function AuthenticatedHeader({ authReady }) {
  if (!authReady) {
    return <SignedOutHeader disabled />;
  }

  return <LiveAuthHeader />;
}

function PrimaryNav({ authReady }) {
  if (!authReady) {
    return <PublicPrimaryNav />;
  }

  return <LivePrimaryNav />;
}

function PublicPrimaryNav() {
  return (
    <nav className="header-nav" aria-label="Primary navigation">
      <a href="/flights#search">Search</a>
      <a href="/flights#deals">Deals</a>
      <a href="/flights#faq">FAQ</a>
    </nav>
  );
}

function LivePrimaryNav() {
  const { isSignedIn } = useAsgardeo();

  if (isSignedIn) {
    return <span aria-hidden="true" />;
  }

  return <PublicPrimaryNav />;
}

function LiveAuthHeader() {
  const { isSignedIn, isLoading, signIn, signOut, user } = useAsgardeo();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const firstName = user?.name?.givenName || "";
  const lastName = user?.name?.familyName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const email = user?.email || user?.mail || user?.username || user?.userName || "";
  const displayName = fullName || email || user?.sub || "";
  const isUserResolving = isSignedIn && (!user || !displayName);

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

  if (isUserResolving) {
    return (
      <div className="auth-cluster">
        <div className="user-chip user-chip--loading" role="status" aria-live="polite">
          <span className="user-chip-spinner" aria-hidden="true" />
          <span className="user-chip-name">Loading account...</span>
        </div>
      </div>
    );
  }

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
            <Link className="account-menu-item" to="/bookings" role="menuitem">
              <CircleUserRound size={18} />
              <span>My Bookings</span>
            </Link>
            <button
              className="account-menu-item"
              type="button"
              role="menuitem"
              onClick={() => {
                clearCDSCookies();
                signOut();
              }}
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
        onClick={async () => {
          const signInConfig = await createSignInConfigWithCDSTracker();
          signIn(signInConfig);
        }}
      >
        Sign in
      </button>
      <a className="primary-small" href={SIGN_UP_URL}>
        Sign up
      </a>
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

function FooterLinks({ authReady }) {
  if (!authReady) {
    return <PublicFooterLinks />;
  }

  return <LiveFooterLinks />;
}

function PublicFooterLinks() {
  return (
    <nav className="footer-links" aria-label="Footer navigation">
      <a href="/flights#search">Search</a>
      <a href="/flights#deals">Deals</a>
      <a href="/flights#faq">FAQ</a>
    </nav>
  );
}

function LiveFooterLinks() {
  const { isSignedIn } = useAsgardeo();

  if (isSignedIn) {
    return null;
  }

  return <PublicFooterLinks />;
}

function SiteFooter({ authReady }) {
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand footer-brand" to="/flights" aria-label="Wayfinder Travel home">
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          <span>Wayfinder</span>
        </Link>
        <p>Modern travel booking flows, secured with Asgardeo.</p>
      </div>
      <FooterLinks authReady={authReady} />
    </footer>
  );
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messages, setMessages] = useState([
    createChatMessage("assistant", "Hi, I can help with travel questions and booking details.")
  ]);
  const [dealAlertRequest, setDealAlertRequest] = useState(null);
  const [draft, setDraft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const socketRef = useRef(null);
  const queuedAgentMessageRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setConnectionStatus("disconnected");
      return undefined;
    }

    let isCurrent = true;
    let retryDelay = 700;

    function connect() {
      if (!isCurrent) {
        return;
      }

      setConnectionStatus("connecting");
      const socket = new WebSocket(AGENT_CHAT_URL);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (!isCurrent) {
          return;
        }

        retryDelay = 700;
        setConnectionStatus("connected");

        if (queuedAgentMessageRef.current) {
          const queuedMessage = queuedAgentMessageRef.current;
          queuedAgentMessageRef.current = null;
          socket.send(JSON.stringify({ message: queuedMessage }));
        }
      });

      socket.addEventListener("message", (event) => {
        if (!isCurrent) {
          return;
        }

        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = { type: "message", message: event.data };
        }

        if (payload.type === "message" || payload.type === "response") {
          setMessages((current) => [
            ...current,
            createChatMessage("assistant", payload.message || "")
          ]);
          setIsProcessing(false);
        } else if (payload.type === "error") {
          setMessages((current) => [
            ...current,
            createChatMessage("assistant", payload.message || "I could not process that request.")
          ]);
          setIsProcessing(false);
        }
      });

      socket.addEventListener("close", () => {
        if (!isCurrent) {
          return;
        }

        setConnectionStatus("disconnected");
        socketRef.current = null;
        reconnectTimerRef.current = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 1.6, 4000);
      });

      socket.addEventListener("error", () => {
        if (!isCurrent) {
          return;
        }

        setConnectionStatus("disconnected");
      });
    }

    connect();

    return () => {
      isCurrent = false;
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [isOpen, messages]);

  useEffect(() => {
    function handleDealAlertConsent(event) {
      const request = event.detail;

      if (!request?.bookingId || !request?.username || !request?.routeFrom || !request?.routeTo) {
        return;
      }

      setDealAlertRequest(request);
      setIsOpen(true);
      setMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          `Would you like offline alerts when I find a better deal for ${request.routeFrom} to ${request.routeTo}?`
        )
      ]);
    }

    window.addEventListener("wayfinder:deal-alert-consent", handleDealAlertConsent);

    return () => {
      window.removeEventListener("wayfinder:deal-alert-consent", handleDealAlertConsent);
    };
  }, []);

  function sendAgentMessage(message, displayContent = message) {
    setMessages((current) => [...current, createChatMessage("user", displayContent)]);
    setDraft("");
    setIsProcessing(true);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ message }));
      return;
    }

    queuedAgentMessageRef.current = message;
    setIsOpen(true);
  }

  function handleDealAlertChoice(enabled) {
    if (!dealAlertRequest || isProcessing) {
      return;
    }

    const request = dealAlertRequest;
    setDealAlertRequest(null);
    sendAgentMessage(
      [
        "Store offline better-deal alert consent for this flight booking.",
        `bookingId: ${request.bookingId}`,
        `username: ${request.username}`,
        `routeFrom: ${request.routeFrom}`,
        `routeTo: ${request.routeTo}`,
        `enabled: ${enabled}`,
      ].join("\n"),
      enabled ? "Yes, send me better-deal alerts." : "No, do not send better-deal alerts."
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || isProcessing) {
      return;
    }

    sendAgentMessage(message);
  }

  return (
    <div className="chat-widget">
      {isOpen && (
        <section className="chat-panel" aria-label="AI travel assistant">
          <header className="chat-header">
            <div>
              <span className="chat-kicker">AI assistant</span>
              <h2>Wayfinder concierge</h2>
            </div>
            <div className="chat-header-actions">
              <span className={`chat-status chat-status--${connectionStatus}`}>
                {connectionStatus}
              </span>
              <button
                className="chat-icon-button"
                type="button"
                aria-label="Close AI chat"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <div className={`chat-message chat-message--${message.role}`} key={message.id}>
                {message.content}
              </div>
            ))}
            {dealAlertRequest && (
              <div className="chat-choice-row" aria-label="Offline deal alert choices">
                <button type="button" onClick={() => handleDealAlertChoice(true)}>
                  Yes
                </button>
                <button type="button" onClick={() => handleDealAlertChoice(false)}>
                  No
                </button>
              </div>
            )}
            {isProcessing && (
              <div className="chat-message chat-message--assistant chat-message--typing">
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-composer" onSubmit={handleSubmit}>
            <label className="chat-input-label">
              <span>Ask the travel assistant</span>
              <input
                value={draft}
                placeholder="Ask about flights or bookings"
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <button
              className="chat-send-button"
              type="submit"
              disabled={!draft.trim() || isProcessing}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        className="chat-launcher"
        type="button"
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

function FlightDetailsRoute({ criteria }) {
  const { flightId = "" } = useParams();

  return <FlightDetailsPage criteria={criteria} flightId={flightId} />;
}

function PaymentRoute({ criteria }) {
  const { flightId = "" } = useParams();

  return <PaymentPageWithAuth criteria={criteria} flightId={flightId} />;
}

function BookingDetailsRoute() {
  const { bookingId = "" } = useParams();

  return <BookingDetailsPageWithAuth bookingId={bookingId} />;
}

function LandingRoute({ authReady, category, cdsProfileId, locations, onSearch }) {
  if (authReady) {
    return (
      <SignedInHomePage
        category={category}
        cdsProfileId={cdsProfileId}
        locations={locations}
        onSearch={onSearch}
      />
    );
  }

  return <HomePage category={category} locations={locations} onSearch={onSearch} />;
}

function LiveCDSProfileBootstrap({ cdsProfileId, onProfileCreated }) {
  const { isLoading, isSignedIn } = useAsgardeo();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/flights" || location.hash || cdsProfileId) {
      return;
    }

    if (isLoading || isSignedIn) {
      return;
    }

    let isCurrent = true;

    async function createCDSProfileOnMount() {
      try {
        const profile = await ensureCDSProfile({});
        const createdProfileId = profile?.profile_id || profile?.id;

        if (isCurrent && createdProfileId) {
          onProfileCreated(createdProfileId);
        }
      } catch (error) {
        console.warn("Failed to create CDS profile:", error.message);
      }
    }

    createCDSProfileOnMount();

    return () => {
      isCurrent = false;
    };
  }, [cdsProfileId, isLoading, isSignedIn, location.hash, location.pathname, onProfileCreated]);

  return null;
}

function GuestCDSProfileBootstrap({ cdsProfileId, onProfileCreated }) {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/flights" || location.hash || cdsProfileId) {
      return;
    }

    let isCurrent = true;

    async function createCDSProfileOnMount() {
      try {
        const profile = await ensureCDSProfile({});
        const createdProfileId = profile?.profile_id || profile?.id;

        if (isCurrent && createdProfileId) {
          onProfileCreated(createdProfileId);
        }
      } catch (error) {
        console.warn("Failed to create CDS profile:", error.message);
      }
    }

    createCDSProfileOnMount();

    return () => {
      isCurrent = false;
    };
  }, [cdsProfileId, location.hash, location.pathname, onProfileCreated]);

  return null;
}

function RootRoute({ authReady, cdsProfileId, locations, onSearch }) {
  const location = useLocation();

  if (!hasAsgardeoCallbackParams(location.search)) {
    return <Navigate to="/flights" replace />;
  }

  return (
    <LandingRoute
      authReady={authReady}
      category="flights"
      cdsProfileId={cdsProfileId}
      locations={locations}
      onSearch={onSearch}
    />
  );
}

function AppRoutes({ authReady, cdsProfileId, criteria, locations, onSearch }) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RootRoute
            authReady={authReady}
            cdsProfileId={cdsProfileId}
            locations={locations}
            onSearch={onSearch}
          />
        }
      />
      <Route
        path="/flights"
        element={
          <LandingRoute
            authReady={authReady}
            category="flights"
            cdsProfileId={cdsProfileId}
            locations={locations}
            onSearch={onSearch}
          />
        }
      />
      <Route
        path="/hotels"
        element={
          <LandingRoute
            authReady={authReady}
            category="hotels"
            cdsProfileId={cdsProfileId}
            locations={locations}
            onSearch={onSearch}
          />
        }
      />
      <Route
        path="/trips"
        element={
          <LandingRoute
            authReady={authReady}
            category="trips"
            cdsProfileId={cdsProfileId}
            locations={locations}
            onSearch={onSearch}
          />
        }
      />
      <Route
        path="/results"
        element={
          authReady ? (
            <ResultsPageWithAuth
              cdsProfileId={cdsProfileId}
              criteria={criteria}
              locations={locations}
              onSearch={onSearch}
            />
          ) : (
            <ResultsPage
              cdsProfileId={cdsProfileId}
              criteria={criteria}
              locations={locations}
              onSearch={onSearch}
            />
          )
        }
      />
      <Route path="/flights/:flightId" element={<FlightDetailsRoute criteria={criteria} />} />
      <Route
        path="/payment/flight/:flightId"
        element={authReady ? <PaymentRoute criteria={criteria} /> : <BookingsUnavailable />}
      />
      <Route
        path="/bookings/:bookingId"
        element={authReady ? <BookingDetailsRoute /> : <BookingsUnavailable />}
      />
      <Route
        path="/bookings"
        element={authReady ? <BookingsPageWithAuth /> : <BookingsUnavailable />}
      />
      <Route path="*" element={<Navigate to="/flights" replace />} />
    </Routes>
  );
}

function App({ authReady }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [cdsProfileId, setCdsProfileId] = useState(() => initializeCDSFromCookie() || null);
  const [locations, setLocations] = useState({
    flights: [],
    hotels: [],
    trips: []
  });

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

  function handleSearch(searchParams) {
    navigate(buildResultsPath(searchParams));
  }

  const criteria = readCriteria(location.search);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/flights" aria-label="Wayfinder Travel home">
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          <span>Wayfinder</span>
        </Link>
        <PrimaryNav authReady={authReady} />
        <AuthenticatedHeader authReady={authReady} />
      </header>

      {!authReady && (
        <div className="setup-banner" role="status">
          <ShieldCheck size={18} />
          Add `VITE_ASGARDEO_CLIENT_ID` and `VITE_ASGARDEO_BASE_URL` to enable live
          Asgardeo sign in, sign up, and sign out.
        </div>
      )}

      {authReady ? (
        <LiveCDSProfileBootstrap cdsProfileId={cdsProfileId} onProfileCreated={setCdsProfileId} />
      ) : (
        <GuestCDSProfileBootstrap cdsProfileId={cdsProfileId} onProfileCreated={setCdsProfileId} />
      )}

      <AppRoutes
        authReady={authReady}
        cdsProfileId={cdsProfileId}
        criteria={criteria}
        locations={locations}
        onSearch={handleSearch}
      />
      <ChatWidget />
      <SiteFooter authReady={authReady} />
    </div>
  );
}

export default App;
