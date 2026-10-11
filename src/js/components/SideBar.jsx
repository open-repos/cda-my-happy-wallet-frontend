import React, { useEffect, useRef, useState } from "react";
//All the svg files
import logo from "./../../assets/icons/logo.svg";
import Home from "./../../assets/icons/dashboard.svg";
import Calendar from "./../../assets/icons/calendar.svg";
import Projects from "./../../assets/icons/target.svg";
import List from "./../../assets/icons/list.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import PowerOff from "./../../assets/icons/power-off.svg";
import Profil from "./../../assets/icons/user.svg";
import styled from "styled-components";
import {
  NavLink,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import "../../css/Icon.css";
import { logout, reset } from "../slices/auth/authSlice";
import { useSelector, useDispatch } from "react-redux";



const Container = styled.div`
  position: fixed;
  z-index: var(--ds-z-index-navigation);
  font-size:1.2rem;
  .active {
    border-right: 4px solid var(--orange-light);
    ;
    color: var(--orange-light);
    ;

    img {
      filter: var(--filter-img-orange-light)
    }
    svg {
      color: var(--orange-light);
    }
  }
  .active-profile {
    color: var(--orange-light);
    ;
    &:hover {
      color: var(--orange-light);
    }
    text-decoration:none;

    img.profile {
      filter: var(--filter-img-orange-light)
    }
    }
    .default-profile{
      text-decoration:none;
    }
  }
`;

const Button = styled.button`
  background-color: var(--dark-secondary-color);
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  margin: 0.5rem 0 0 0.5rem;
  cursor: pointer;

  display: flex;
  justify-content: center;
  align-items: center;

  position: relative;

  /* Le bouton menu est posé sur la coque : anneau contrasté avec elle. */
  &:focus-visible {
    outline: var(--ds-border-width-focus) solid
      var(--ds-color-focus-ring-on-shell);
    outline-offset: 2px;
  }

  &::before,
  &::after {
    content: "";
    background-color: var(--white);
    height: 2px;
    width: 1rem;
    position: absolute;
    transition: all 0.3s ease;
  }

  &::before {
    top: ${(props) => (props.clicked ? "1.5" : "1rem")};
    transform: ${(props) => (props.clicked ? "rotate(135deg)" : "rotate(0)")};
  }

  &::after {
    top: ${(props) => (props.clicked ? "1.2" : "1.5rem")};
    transform: ${(props) => (props.clicked ? "rotate(-135deg)" : "rotate(0)")};
  }
`;

const SidebarContainer = styled.nav`
  background-color: var(--dark-secondary-color);
  width: 3.5rem;
  height: 90vh;
  margin-top: 1rem;
  border-radius: 0 30px 30px 0;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  position: relative;

  /* Mobile : tiroir ouvert par le bouton menu, le contenu garde sa largeur. */
  @media (max-width: 767px) {
    display: ${(props) => (props.$open ? "flex" : "none")};
    height: calc(100dvh - 4rem);
    margin-top: 0.5rem;
  }
`;

/** Fond du tiroir mobile : un clic referme la navigation. */
const Backdrop = styled.div`
  display: none;

  @media (max-width: 767px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: -1;
    background-color: var(--ds-color-background-canvas);
    /* Voile local au tiroir : aucun token d'opacité n'existe encore. */
    opacity: 0.7;
  }
`;

const Logo = styled.div`
  width: 2rem;

  img {
    width: 100%;
    height: auto;
  }
`;

const SlickBar = styled.ul`
  color: var(--white);
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--dark-secondary-color);

  padding: 2rem 0;

  position: absolute;
  top: 6rem;
  left: 0;

  width: ${(props) => (props.clicked ? "12rem" : "3.5rem")};
  transition: all 0.5s ease;
  border-radius: 0 30px 30px 0;
`;

const Item = styled(NavLink)`
  color: : var(--white);
  text-decoration: none;
  width: 100%;
  padding: 1.5rem 0;
  cursor: pointer;

  display: flex;
  padding-left: 1rem;

  &:hover {
    border-right: 4px solid var(--orange-light);
    color:var(--orange-light);
    img {
      filter: var(--filter-img-orange-light)
    }
    svg {
      color: var(--orange-light);
    }
  }

  /* Icône FontAwesome : même taille et même gris que les icônes images. */
  svg {
    width: 1.8rem;
    height: 1.8rem;
    color: var(--grey);
  }

  img {
    width: 1.8rem;
    padding-right:2px;
    height: auto;
    filter: invert(92%) sepia(4%) saturate(1033%) hue-rotate(169deg)
      brightness(78%) contrast(85%);
  }
`;

// fill:${(navData) => (navData.isActive ? "var(--orange)" : "var(--white)")}
const Text = styled.span`
  width: ${(props) => (props.clicked ? "100%" : "0")};
  overflow: hidden;
  margin-left: ${(props) => (props.clicked ? "1.5rem" : "0")};
  transition: all 0.3s ease;
`;

const Profile = styled.div`
  width: ${(props) => (props.clicked ? "14rem" : "3rem")};
  height: 3rem;

  padding: 0.5rem 1rem;
  /* border: 2px solid var(--white); */
  border-radius: 20px;

  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: ${(props) => (props.clicked ? "9rem" : "0")};

  background-color: var(--dark-secondary-color);
  color: var(--white);

  transition: all 0.3s ease;

  h4{
    color:var(--white);
  }

  a:hover{
    color:var(--orange-light);
  }

  img {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 70%;
    cursor: pointer;
    filter: ${(props) =>
      props.path.includes("/profil")
        ? "var(--filter-img-orange-light)"
        : "invert(92%) sepia(4%) saturate(1033%) hue-rotate(169deg) brightness(78%) contrast(85%)"};

    &:hover {
      border: 2px solid var(--white);
      padding: 2px;
      filter: var(--filter-img-orange-light);
    }
  }
`;

const Details = styled.div`
  display: ${(props) => (props.clicked ? "flex" : "none")};
  justify-content: space-between;
  align-items: center;
`;

const Name = styled.div`
  padding: 0 1.5rem;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  h4 {
    display: inline-block;
  }

  a {
    font-size: 0.8rem;
    text-decoration: none;
    color: var(--grey);

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Logout = styled.button`
  border: none;
  width: 2rem;
  height: 2rem;
  background-color: transparent;

  img {
    width: 100%;
    height: auto;
    filter: invert(15%) sepia(70%) saturate(6573%) hue-rotate(2deg)
      brightness(100%) contrast(126%);
    // transition: all 0.3s ease;
    &:hover {
      border: none;
      padding: 0;
      // opacity: 0.5;
    }
  }
`;

const divStyle = {
  marginRight: "20px"
};
// const IconC = ({ success, src }) => (
//   <img
//     style={success ? { fill: 'var(--orange) !important'} : { fill: 'var(--white)'}}
//    src={src}
//   />
// );
const Sidebar = () => {
  const [click, setClick] = useState(false);
  const handleClick = () => setClick(!click);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profileClick, setprofileClick] = useState(false);
  const handleProfileClick = () => setprofileClick(!profileClick);

  const location = useLocation();
  const menuButton = useRef(null);

  // Échap referme la navigation et rend le focus au bouton menu.
  useEffect(() => {
    if (!click) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setClick(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [click]);

  // Passer de mobile à tablette/desktop (ou l'inverse) referme la navigation :
  // le tiroir déplié ne doit ni recouvrir le contenu ni s'ouvrir seul.
  useEffect(() => {
    const mobile = window.matchMedia?.("(max-width: 767px)");
    if (!mobile) return undefined;
    const close = () => setClick(false);
    mobile.addEventListener?.("change", close);
    return () => mobile.removeEventListener?.("change", close);
  }, []);

  const closeFromBackdrop = () => {
    setClick(false);
    menuButton.current?.focus();
  };

  // const userStorage = getLocalStorageItem("user");
  const { user } = useSelector((state) => state.auth);
  
  const onLogout = ()=>{
    dispatch(logout())
    dispatch(reset())
    navigate('/login',{state:location})
  }

  return (
    <Container style={divStyle}>
      {click && (
        <Backdrop
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          onClick={closeFromBackdrop}
        />
      )}
      <Button
        ref={menuButton}
        type="button"
        clicked={click}
        aria-label={click ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={click}
        aria-controls="main-navigation"
        onClick={() => handleClick()}
      ></Button>
      <SidebarContainer
        id="main-navigation"
        aria-label="Navigation principale"
        $open={click}
        data-open={click}
      >
        <Logo>
          <img src={logo} alt="logo" />
        </Logo>
        <SlickBar clicked={click}>
          <Item
            onClick={() => setClick(false)}
            className={(navData) => (navData.isActive ? "active" : "")}
            to="/home"
          >
            {/* {(navData) => (navData.isActive ?  <img src={Home} alt="Home" style="color: orange"/> :  <img src={Home} alt="Home" style="color: white"/>)} */}
            {/* <Icon.Dashboard className={(navData) => (navData.isActive ? 'active' : '')}/> */}
            {/* <HomeIcon succes={(navData) => (navData.isActive)} /> */}
            <img src={Home} alt="Home" />
            <Text clicked={click}>Home</Text>
          </Item>

          <Item
            onClick={() => setClick(false)}
            className={(navData) => (navData.isActive ? "active" : "")}
            to="/calendrier"
          >
            <img src={Calendar} alt="Calender" />
            <Text clicked={click}>Calendrier</Text>
          </Item>
          <Item
            onClick={() => setClick(false)}
            className={(navData) => (navData.isActive ? "active" : "")}
            to="/objectifs-evenements"
          >
            <img src={Projects} alt="Objectifs-Evenements" />
            <Text clicked={click}>Objectifs-Évènements</Text>
          </Item>
          <Item
            onClick={() => setClick(false)}
            className={(navData) => (navData.isActive ? "active" : "")}
            to="/operations"
          >
            <img src={List} alt="Liste Operations" />
            <Text clicked={click}>Liste Opérations</Text>
          </Item>
          <Item
            onClick={() => setClick(false)}
            className={(navData) => (navData.isActive ? "active" : "")}
            to="/analyses"
          >
            <FontAwesomeIcon icon={faChartColumn} aria-hidden="true" />
            <Text clicked={click}>Analyses</Text>
          </Item>
        </SlickBar>
        <Profile clicked={profileClick} path={location.pathname} to="/profil" className={(navData) => (navData.isActive ? "active-profile" : "")}>
          <img
            onClick={() => handleProfileClick()}
            src={Profil} //"https://picsum.photos/200"
            alt="Profile"
          />
          <Details clicked={profileClick}>
            {/* <NavLink
              to="/profil"
              className={(navData) =>
                navData.isActive ? "active-profile" : "default-profile"
              }
            > */}
              <Name>
              <NavLink to="/profil" className={(navData) =>
                navData.isActive ? "active-profile" : "default-profile"
              } >
                <h4>
                  {/* {userStorage?.payload.user.firstname}&nbsp;
                  {userStorage?.payload.user.lastname} */}
                  {user?.payload.user.firstname}&nbsp;
                  {user?.payload.user.lastname}
                </h4>
                </NavLink>
                {/* <a href="/profil">voir&nbsp;profil</a> */}
                {/* <span>voir&nbsp;profil</span> */}
                <Link className="link-profil" to="/profil">voir&nbsp;profil</Link>
              </Name>
            {/* </NavLink> */}
            <Logout>
              <img
                // className="logout"
                // onClick={() => handleLogout()}
                onClick={onLogout}
                src={PowerOff}
                alt="logout"
              />
            </Logout>
          </Details>
        </Profile>
      </SidebarContainer>
    </Container>
  );
};

export default Sidebar;
