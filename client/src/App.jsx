import { Routes } from "./lib/router.jsx";
import Header from "./components/Header.jsx";
import SiteBackground from "./components/SiteBackground.jsx";
import Home from "./pages/Home.jsx";
import Rankings from "./pages/Rankings.jsx";
import MyBar from "./pages/MyBar.jsx";
import Drink from "./pages/Drink.jsx";
import Auth from "./pages/Auth.jsx";
import MyRatings from "./pages/MyRatings.jsx";
import NotFound from "./pages/NotFound.jsx";

const routes = [
  { path: "/", element: () => <Home /> },
  { path: "/rankings", element: () => <Rankings /> },
  { path: "/my-bar", element: () => <MyBar /> },
  { path: "/drinks/:slug", element: ({ slug }) => <Drink key={slug} slug={slug} /> },
  { path: "/login", element: () => <Auth mode="login" /> },
  { path: "/register", element: () => <Auth mode="register" /> },
  { path: "/me", element: () => <MyRatings /> },
];

export default function App() {
  return (
    <>
      <SiteBackground />
      <Header />
      <main>
        <Routes routes={routes} fallback={<NotFound />} />
      </main>
      <footer className="site-footer">
        <div className="container">
          <span>Cocktails on the House</span>
          <span className="muted">
            Please drink responsibly. Background photos by{" "}
            <a href="https://unsplash.com/photos/piled-wine-glass-set-hanging-DOBIZ_sqgXM">CHUTTERSNAP</a> and{" "}
            <a href="https://unsplash.com/photos/bottles-and-glasses-on-a-bar-shelf-with-warm-lighting-ZgISIpuyo18">ncp</a> on
            Unsplash.
          </span>
        </div>
      </footer>
    </>
  );
}
