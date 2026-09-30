const appSpec = {
  data() {
    return {
      currentTour: 2,
      players: ["Papa", "Maman", "Mimi", "Toto", "Dada"],
      allNames: ["Papa", "Maman", "Mimi", "Toto", "Dada", "Ayana", "Laura", "Nicole", "Autre"],
      scores: {},
      modalOpen: false,
      editingPlayerIndex: null,
      dealerIndex: null,
      _persistReady: false,
      _restoring: false,
      _persistTimer: null,
      _ignoreHash: false,
    };
  },

  created() {
    this.editingPlayerIndex = 0;
    this.initScores();
    this._restoring = true;
    this.loadUrlState();
    this._restoring = false;
    this._persistReady = true;
    window.addEventListener("hashchange", this.onHashChange);
  },

  watch: {
    players: { handler: "schedulePersist", deep: true },
    scores: { handler: "schedulePersist", deep: true },
    currentTour: "schedulePersist",
    dealerIndex: "schedulePersist",
  },

  computed: {
    tours() {
      const nPlayers = this.players.length;
      const max = Math.min(15, Math.floor(52 / nPlayers));

      let step;
      if (nPlayers === 2) {
        step = 6;
      } else if (nPlayers === 3) {
        step = 4;
      } else {
        step = 2;
      }

      const up = [];
      for (let t = 2; t <= max; t += step) up.push(t);

      const down = [];
      const startDown = max % 2 === 0 ? max - 1 : max;
      for (let t = startDown; t >= 1; t -= step) down.push(t);

      return [...up, ...down];
    },

    allContractsSelected() {
      if (this.currentTour == null || !this.scores[this.currentTour]) return false;

      return Object.values(this.scores[this.currentTour]).every(
        (cell) => cell.contrat !== null && cell.contrat !== ""
      );
    },
  },

  methods: {
	renderPlisCell(tour, playerIndex) {
		const score = this.scores[tour][playerIndex];
		const contractNumber = Number(score.contrat);
		const contract = isNaN(contractNumber) ? -1 : contractNumber;
		const plisNumber    = Number(score.nombrePlis);
		const plis = isNaN(plisNumber) ? -1 : plisNumber;
				
		if(score.contrat === null || score.nombrePlis === null){
			return ``;
		}
		
		if (this.isVache(tour, contract, plis)) {
			return `<span class="has-text-warning" title="la vache">V</span>`;
		}
	
		// contract & plis match (but not whole tour)
		if (contract === plis) {
			return `<span class="has-text-success" title="Match">&check;</span>`;
		}
	
		// mismatch → show signed difference
		const diff = plis - contract;
		const sign = diff > 0 ? '+' : '';
		
		return `<span class="has-text-danger">${sign}${diff}</span>`;
	},
    selectCurrentTour(tourIndex) {
      this.currentTour = this.tours[tourIndex];
      this.schedulePersist();
    },

    tourHasScore(tour) {
      return Object.values(this.scores[tour] || {}).some(
        (cell) => cell.score != null && cell.score !== ""
      );
    },

    isDealerCell(tourIndex, playerIndex) {
      if (this.dealerIndex == null) return false;
      const n = this.players.length;
      const dealerThisTour = (this.dealerIndex + tourIndex) % n;
      return playerIndex === dealerThisTour;
    },

    getPreviousScore(tour, playerIndex) {
      const currentTourIndex = this.tours.indexOf(tour);

      for (let i = currentTourIndex - 1; i >= 0; i--) {
        const previousTour = this.tours[i];
        const previousScore = this.scores[previousTour]?.[playerIndex]?.score;
        if (previousScore != null && previousScore !== "") {
          return Number(previousScore);
        }
      }

      return 0;
    },

    isVache(tour, contract, plis) {
      const lastTour = this.tours[this.tours.length - 1];
      return contract === plis && contract === tour && tour !== lastTour;
    },

    computeScore(tour, playerIndex) {
      const contract = this.scores[tour][playerIndex].contrat;
      const plis = this.scores[tour][playerIndex].nombrePlis;

      if (contract == null || plis == null) {
        this.scores[tour][playerIndex].score = null;
      } else {
        const previousScore = this.getPreviousScore(tour, playerIndex);
        const roundPoints =
          contract === plis
            ? 10 + 5 * plis + (this.isVache(tour, contract, plis) ? 10 : 0)
            : -5 * Math.abs(contract - plis);

        this.scores[tour][playerIndex].score = previousScore + roundPoints;
      }

      const currentTourIndex = this.tours.indexOf(tour);
      const nextTourIndex = currentTourIndex + 1;

      if (nextTourIndex < this.tours.length) {
        this.computeScore(this.tours[nextTourIndex], playerIndex);
      }
    },

    rotatePlayerName(index) {
      const current = this.players[index];
      const used = this.players.filter((_, i) => i !== index);
      const available = this.allNames.filter((name) => !used.includes(name));
      const nextIndex = (available.indexOf(current) + 1) % available.length;

      this.players[index] = available[nextIndex];
      this.schedulePersist();
    },

    initScores(options = {}) {
      if (options.resetDealer !== false) this.dealerIndex = null;
      this.scores = Object.fromEntries(
        this.tours.map((tour) => [
          tour,
          Object.fromEntries(
            this.players.map((_, playerIndex) => [
              playerIndex,
              { contrat: null, nombrePlis: null, score: null },
            ])
          ),
        ])
      );
    },

    onContractInput(player, tour, value) {
	  let playerIndex = this.players.indexOf(player);
      const nextValue = Number(value);

      if (this.dealerIndex == null) {
        const n = this.players.length;
        const tourIndex = this.tours.indexOf(tour);
        this.dealerIndex = (playerIndex - 1 - tourIndex + n) % n;
      }
	  
      this.scores[tour][playerIndex].contrat = nextValue;
      this.computeScore(tour, playerIndex);
      this.schedulePersist();
    },

    setNombrePlis(tour, playerIndex, value) {
      this.scores[tour][playerIndex].nombrePlis = value;
      this.computeScore(tour, playerIndex);
      this.schedulePersist();

      const allScoresSet = Object.values(this.scores[tour]).every(
        (cell) => cell.contrat != null && cell.nombrePlis != null
      );

      if (allScoresSet && this.currentTour === tour) {
        const nextTourIndex = this.tours.indexOf(tour) + 1;
        if (nextTourIndex < this.tours.length) {
          this.currentTour = this.tours[nextTourIndex];
          this.closeContractModal();
        }
      }
    },

    onNombrePlisInput(player, tour, value) {
      const playerIndex = this.players.indexOf(player);
      const isClear = value === null || value === undefined || value === "";

      this.setNombrePlis(tour, playerIndex, isClear ? null : value);

      if (isClear) return;
	  
	  const row = this.scores[tour];
	  
	  const total = Object.values(row).reduce(
	    (sum, cell) => sum + (Number(cell.nombrePlis) || 0),
	    0
	  );

	  // If the total has been reached, we can assume the rest didn't had any plis.
      if (total === tour) {
        Object.entries(row).forEach(([remainingIndex, cell]) => {
          if (cell.nombrePlis === null || cell.nombrePlis === undefined || cell.nombrePlis === "") {
            this.setNombrePlis(tour, remainingIndex, 0);
          }
        });
        return;
      }
      
	  // If there is only one player to set the score, we can deduce it.
	  const missing = Object.entries(row).filter(
        ([, cell]) => cell.nombrePlis === null || cell.nombrePlis === undefined || cell.nombrePlis === ""
      );

      if (missing.length === 1) {
        const lastIndex = missing[0][0];
        this.setNombrePlis(tour, lastIndex, tour - total);
      }
    },
	
    previousContract() {
      this.editingPlayerIndex =
        (this.editingPlayerIndex - 1 + this.players.length) % this.players.length;

      this.$nextTick(() => this.$refs.contractInput?.focus?.());
    },

    nextContract() {
      this.editingPlayerIndex =
        (this.editingPlayerIndex + 1) % this.players.length;

      this.$nextTick(() => this.$refs.contractInput?.focus?.());
    },
	
    openContractModal(playerIndex) {
	  this.editingPlayerIndex = playerIndex;
	  this.$refs.contractModal.isOpen = true;
    },
    closeContractModal() {
		this.$refs.contractModal.isOpen = false;
    },

    canRemovePlayer() {
      const hasAnyScore = this.tours.some((tour) =>
        Object.values(this.scores[tour] || {}).some(
          (cell) => cell.contrat != null || cell.nombrePlis != null || cell.score != null
        )
      );

      return !hasAnyScore && this.players.length > 2;
    },

    removePlayer(index) {
      if (!this.canRemovePlayer()) return;

      this.players.splice(index, 1);
      this.initScores();
    },

    resetGame() {
      if (!confirm("Réinitialiser la partie ?")) return;

      this.closeContractModal();
      this.players = ["Papa", "Maman", "Mimi", "Toto", "Dada"];
      this.currentTour = 2;
      this.editingPlayerIndex = 0;
      this.initScores();
      this.writeUrlState();
    },

    onHashChange() {
      if (this._ignoreHash) return;
      this._restoring = true;
      this.loadUrlState();
      this._restoring = false;
    },

    schedulePersist() {
      if (this._restoring || !this._persistReady) return;
      clearTimeout(this._persistTimer);
      this._persistTimer = setTimeout(() => this.writeUrlState(), 40);
    },

    isDefaultState() {
      const defaultPlayers = ["Papa", "Maman", "Mimi", "Toto", "Dada"];
      if (this.players.length !== defaultPlayers.length) return false;
      if (this.players.some((name, i) => name !== defaultPlayers[i])) return false;
      if (this.dealerIndex != null) return false;
      return this.tours.every((tour) =>
        Object.values(this.scores[tour] || {}).every(
          (cell) => cell.contrat == null && cell.nombrePlis == null
        )
      );
    },

    writeUrlState() {
      if (this.isDefaultState()) {
        this._ignoreHash = true;
        WistUrlState.writeHash("");
        this._ignoreHash = false;
        return;
      }

      const token = WistUrlState.encode({
        players: this.players,
        currentTour: this.currentTour,
        dealerIndex: this.dealerIndex,
        tours: this.tours,
        scores: this.scores,
      });
      this._ignoreHash = true;
      WistUrlState.writeHash(token);
      this._ignoreHash = false;
    },

    loadUrlState() {
      const token = WistUrlState.readHash();
      if (!token) return;

      let decoded;
      try {
        decoded = WistUrlState.decode(token);
      } catch (e) {
        return;
      }
      if (!decoded) return;

      this.players = decoded.players;
      this.initScores({ resetDealer: false });
      this.dealerIndex = decoded.dealerIndex;

      decoded.cells.forEach((cell) => {
        const row = this.scores[cell.tour];
        if (!row || !row[cell.playerIndex]) return;
        row[cell.playerIndex].contrat = cell.contrat;
        row[cell.playerIndex].nombrePlis = cell.nombrePlis;
      });

      if (this.tours.includes(decoded.currentTour)) {
        this.currentTour = decoded.currentTour;
      } else {
        this.currentTour = this.tours[0];
      }

      this.players.forEach((_, playerIndex) => {
        if (this.tours.length) this.computeScore(this.tours[0], playerIndex);
      });
    },
  },
};

const app = Vue.createApp(appSpec);
app.component("ContractModal", ContractModal);
app.mount("#app");
