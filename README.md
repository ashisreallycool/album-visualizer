# Wrapped Album

Connect Spotify and get your listening year pressed as a physical-feeling album you can unbox in 3D: tear the shrink wrap, peel the hype sticker, lift the lid, flip through the photobook, pull five photocards (the first is holo), slide out the disc, use your add-in, and stick the badges you earned anywhere on the packaging. Then export a story / post / portrait card.

Everything runs in the browser. No server, no uploads.

## How the album maps to your listening

| Album component | Driven by |
| --- | --- |
| **Album version** (Scrapbook, Acid Y2K, Newsprint, Coquette, Concrete, Velvet) | Your dominant genre families vote for a packaging style |
| **Cover art** | Generated per version from your top-artist images, title bank, persona and stats |
| **Album title + persona** | Listening behaviour: night share, loyalty, discovery rate, popularity, release years, eclecticism, track length |
| **Hype sticker** | Your #1 track and #1 artist |
| **Tracklist (back cover)** | Side A: top tracks overall · Side B: top tracks of the last four weeks |
| **Photobook** | Top-five concept photos, top-ten tracks, hour-of-day chart, release decades, genre bento, liner notes, badge legend |
| **Photocards** | Top five artists with ranks across 4 weeks / 6 months / all time; #1 is holographic |
| **Disc** | Version colour; label quotes your catalogue number and minutes pace |
| **Add-in** | Digicam (≥30% plays after midnight), passport keychain (high discovery/eclecticism), otherwise a CD player that spins your #1 |
| **Sticker sheet** | Badges: Night Owl, Early Bird, Loyalist, Explorer, Deep Cut, Chart Runner, Time Traveler, Fresh Drop, Genre Nomad, Long Play, Parental Advisory, On Repeat, Early Crowd |
| **Listener card** | Pace (min/day), year-equivalent, peak hour, top genre, artists, average track, mainstream + eclecticism meters |

The Spotify Web API has no play counts, so minutes are an **estimate from the pace of your last 50 plays** and are labelled as such. Import the JSON files from Spotify's *Download your data* export (Stats panel → *Import streaming history*) to replace them with exact totals.

Audio previews, audio features and recommendations are no longer available to new Spotify apps (Nov 2024 changes), so the album uses top artists/tracks, genres, popularity, release dates, durations and recently-played timestamps.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # static site in dist/
```

Click **Try the demo** to explore all six album versions with fictional listeners — no Spotify account needed.

## Connect your Spotify account

Spotify requires each app to be registered, so you (or whoever deploys this) create a free developer app once:

1. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create an app. Tick **Web API**.
2. Add the redirect URI shown in the app's **Setup** dialog — it is the page URL itself, e.g. `http://127.0.0.1:5173/` locally or `https://your-domain/album-visualizer/` in production. Spotify only accepts HTTPS, or `http://127.0.0.1` for local development (not `localhost`).
3. While the app is in development mode, add your Spotify account under **User Management** (up to 25 users).
4. Paste the app's **Client ID** into Setup (stored in `localStorage`), or set `VITE_SPOTIFY_CLIENT_ID` in `.env` before building.

Scopes requested: `user-top-read`, `user-read-recently-played`, `user-read-private`, `user-library-read`, `user-follow-read`. Auth uses Authorization Code with PKCE; tokens live in your browser only.

## Deploying to a sub-path (GitHub Pages)

```bash
BASE_PATH=/album-visualizer/ npm run build
```

The redirect URI becomes `https://<user>.github.io/album-visualizer/`.

## Accessibility and motion

Every drag gesture has a button equivalent in the guide; everything printed on the album is available as text in the Inspect and Stats panels; `prefers-reduced-motion` snaps animations and disables the idle camera; all controls are ≥44px with visible focus rings; light and dark colour schemes are both supported.

## Stack

Vite · React 19 · TypeScript · three.js / @react-three/fiber / drei · zustand · canvas-painted textures · self-hosted fonts via Fontsource · lucide icons.
