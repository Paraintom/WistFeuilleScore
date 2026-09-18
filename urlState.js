const WistUrlState = (() => {
  const VERSION = 1;
  const NONE = 255;

  function bytesToB64url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlToBytes(text) {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function encodeUtf8(str) {
    return new TextEncoder().encode(str);
  }

  function decodeUtf8(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function packCell(value) {
    if (value == null || value === "") return NONE;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0 || n > 254) return NONE;
    return n;
  }

  function unpackCell(value) {
    return value === NONE ? null : value;
  }

  function encode(state) {
    const bytes = [];
    const push = (n) => bytes.push(n & 0xff);
    const pushStr = (str) => {
      const utf8 = encodeUtf8(str).slice(0, NONE);
      push(utf8.length);
      for (let i = 0; i < utf8.length; i++) bytes.push(utf8[i]);
    };

    push(VERSION);
    push(state.players.length);
    state.players.forEach(pushStr);
    push(Number(state.currentTour) || 0);
    push(state.dealerIndex == null ? NONE : state.dealerIndex);

    const filled = [];
    for (const tour of state.tours) {
      const row = state.scores[tour];
      if (!row) continue;
      for (let i = 0; i < state.players.length; i++) {
        const cell = row[i];
        if (!cell) continue;
        const contrat = packCell(cell.contrat);
        const plis = packCell(cell.nombrePlis);
        if (contrat === NONE && plis === NONE) continue;
        filled.push([tour, i, contrat, plis]);
      }
    }

    push(filled.length);
    filled.forEach(([tour, playerIndex, contrat, plis]) => {
      push(tour);
      push(playerIndex);
      push(contrat);
      push(plis);
    });

    let checksum = 0;
    for (let i = 0; i < bytes.length; i++) checksum ^= bytes[i];
    push(checksum);

    return bytesToB64url(Uint8Array.from(bytes));
  }

  function decode(token) {
    const bytes = b64urlToBytes(token);
    if (bytes.length < 5) return null;

    const checksum = bytes[bytes.length - 1];
    let acc = 0;
    for (let i = 0; i < bytes.length - 1; i++) acc ^= bytes[i];
    if (acc !== checksum) return null;

    let offset = 0;
    const read = () => {
      if (offset >= bytes.length - 1) throw new Error("short");
      return bytes[offset++];
    };
    const readStr = () => {
      const length = read();
      const slice = bytes.slice(offset, offset + length);
      offset += length;
      return decodeUtf8(slice);
    };

    if (read() !== VERSION) return null;
    const nPlayers = read();
    if (nPlayers < 2 || nPlayers > 12) return null;

    const players = [];
    for (let i = 0; i < nPlayers; i++) players.push(readStr() || "Joueur");

    const currentTour = read();
    const dealerRaw = read();
    const dealerIndex = dealerRaw === NONE ? null : dealerRaw;

    const nFilled = read();
    const cells = [];
    for (let i = 0; i < nFilled; i++) {
      cells.push({
        tour: read(),
        playerIndex: read(),
        contrat: unpackCell(read()),
        nombrePlis: unpackCell(read()),
      });
    }

    return { players, currentTour, dealerIndex, cells };
  }

  function readHash() {
    const match = location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function writeHash(token) {
    const next = token ? `#s=${token}` : "";
    if (location.hash === next || (location.hash === "" && next === "")) return;
    history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
  }

  return { encode, decode, readHash, writeHash };
})();
