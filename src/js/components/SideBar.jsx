import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWallet,
  faHome,
  faExchangeAlt,
  faRepeat,
  faCalendarAlt,
  faChartLine,
  faBullseye,
  faChartColumn,
  faTags,
  faBars,
  faTimes,
  faUserCircle,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { logout, reset } from "../slices/auth/authSlice";
import "../../css/AtelierNavigation.css";

const destinations = [
  ["/home", "Accueil", faHome],
  ["/operations", "Opérations", faExchangeAlt],
  ["/home/operations-fixes", "Charges et entrées fixes", faRepeat],
  ["/calendrier", "Calendrier", faCalendarAlt],
  ["/prochains-mois", "Prochains mois", faChartLine],
  ["/objectifs-evenements", "Objectifs et événements", faBullseye],
  ["/analyses", "Analyses", faChartColumn],
  ["/categories", "Catégories", faTags],
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menu = useRef(null);
  const navigation = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const close = (restore = false) => {
    setOpen(false);
    if (restore) menu.current?.focus();
  };
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const compact = window.matchMedia?.("(max-width: 1199px)");
    const changed = () => setOpen(false);
    compact?.addEventListener?.("change", changed);
    window.addEventListener("resize", changed);
    return () => {
      compact?.removeEventListener?.("change", changed);
      window.removeEventListener("resize", changed);
    };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Tab") {
        const elements = [
          menu.current,
          ...navigation.current.querySelectorAll("a, button"),
        ].filter(
          (el) => el && el.getClientRects().length && !el.closest("[hidden]")
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    // The toggle remains outside the drawer; focus can cycle through both.
    const content = document.getElementById("main-content");
    const wasInert = content?.hasAttribute("inert");
    content?.setAttribute("inert", "");
    document.addEventListener("keydown", onKey);
    return () => {
      if (!wasInert) content?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <>
      <div className="atelier-mobile-header">
        <button
          ref={menu}
          type="button"
          className="atelier-menu-toggle"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <FontAwesomeIcon icon={open ? faTimes : faBars} aria-hidden="true" />
        </button>
        <span>MyHappyWallet</span>
      </div>
      {open && (
        <button
          type="button"
          className="atelier-backdrop"
          data-testid="sidebar-backdrop"
          aria-label="Fermer la navigation"
          tabIndex={-1}
          onClick={() => close(true)}
        />
      )}
      <nav
        ref={navigation}
        id="main-navigation"
        className="atelier-navigation"
        aria-label="Navigation principale"
        data-open={open}
      >
        <div className="atelier-brand">
          <FontAwesomeIcon icon={faWallet} aria-hidden="true" />
          <span>MyHappyWallet</span>
        </div>
        <p className="atelier-navigation__caption">Mon budget</p>
        <ul className="atelier-navigation__links">
          {destinations.map(([to, label, icon]) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                onClick={() => close()}
                className={({ isActive }) =>
                  isActive
                    ? "atelier-navigation__link is-active"
                    : "atelier-navigation__link"
                }
              >
                <FontAwesomeIcon icon={icon} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="atelier-navigation__profile">
          <button
            type="button"
            aria-label={
              profileOpen ? "Masquer le profil" : "Afficher le profil"
            }
            aria-expanded={profileOpen}
            aria-controls="sidebar-profile-details"
            onClick={() => setProfileOpen((value) => !value)}
          >
            <FontAwesomeIcon icon={faUserCircle} aria-hidden="true" />
            <span>Mon profil</span>
          </button>
          <div id="sidebar-profile-details" hidden={!profileOpen}>
            <p>
              {user?.payload?.user?.firstname} {user?.payload?.user?.lastname}
            </p>
            <NavLink to="/profil" onClick={() => close()}>
              voir profil
            </NavLink>
            <button
              type="button"
              aria-label="Se déconnecter"
              onClick={() => {
                dispatch(logout());
                dispatch(reset());
                navigate("/login", { state: location });
              }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
