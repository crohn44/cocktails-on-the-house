// A faint, fixed photo behind every page. Drink pages get the bar shelf; everything else the hanging glasses.
// Both layers stay mounted so switching pages crossfades instead of flashing.
// Photos: CHUTTERSNAP and ncp on Unsplash (Unsplash License).
import { useLocation } from "../lib/router.jsx";

export default function SiteBackground() {
  const { pathname } = useLocation();
  const shelf = pathname.startsWith("/drinks/");
  return (
    <div className="site-bg" aria-hidden="true">
      <div className={`site-bg-photo glasses ${shelf ? "" : "on"}`} />
      <div className={`site-bg-photo shelf ${shelf ? "on" : ""}`} />
    </div>
  );
}
