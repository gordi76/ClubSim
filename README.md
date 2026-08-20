# ClubSim

ClubSim is a Tauri 2 desktop prototype with a React and TypeScript display inspired by a dual-player club setup. It starts with deterministic mock data and also provides an explicitly enabled, read-only Rekordbox live mode.

## Current prototype

- Two independent player displays with switchable mock master deck
- Phase and stacked-waveform views
- Three-band mock waveforms and cue overview
- Read-only provider boundary with Mock and Rekordbox implementations
- Optional live position, metadata, beatgrid, phase, master-deck and waveform data

## Local development

```sh
npm ci
npm run dev
```

Use `npm run build` for a production frontend build and `npm run tauri dev` for the desktop shell.

## Optional Rekordbox live mode

Live mode combines two local, read-only sources:

- `rkbx_link` sends live deck position, BPM, master and track metadata over OSC to `127.0.0.1:4460`.
- `pyrekordbox` resolves the matching track in `master.db` and reads its ANLZ beatgrid and waveform files.

Create the isolated Python environment once and install the pinned dependency:

```powershell
python -m venv .venv-tools
.\.venv-tools\Scripts\python.exe -m pip install pyrekordbox==0.4.4
```

Start the components in this order:

```powershell
npm run rekordbox:bridge
npm run tauri dev
```

Then start Rekordbox 7.2.2 and `rkbx_link`, or reload the two tracks if `rkbx_link` was already running. Click `LIVE` in ClubSim to connect to `http://127.0.0.1:4470/events`. ClubSim does not start or modify Rekordbox or `rkbx_link` automatically.

## Data-provider boundary

UI components consume a `DeckProvider` through `useDeckSnapshot`. `mockDeckProvider` and `liveRekordboxProvider` implement the same snapshot contract, keeping OSC, database and ANLZ details out of the display components. Mock mode remains the default.
