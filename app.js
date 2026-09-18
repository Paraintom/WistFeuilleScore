const appSpec = {
  data() {
    return {
      currentTour: 2,
      players: ["Papa", "Maman", "Mimi", "Toto", "Dada"],
      allNames: ["Papa", "Maman", "Mimi", "Toto", "Dada", "Autre"],
      scores: {},
      modalOpen: false,
      editingPlayerIndex: null,
    };
  },

  created() {
	this.editingPlayerIndex = 0;
    this.initScores();
  },

  computed: {
    tours() {
      const nPlayers = this.players.length;
      const max = Math.floor(52 / nPlayers);

      const up = [];
      for (let t = 2; t <= max; t += 2) up.push(t);

      const down = [];
      const startDown = max % 2 === 0 ? max - 1 : max;
      for (let t = startDown; t >= 1; t -= 2) down.push(t);

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
		
		// whole‑tour match ("la vache"), except on the last turn
		const lastTour = this.tours[this.tours.length - 1];
		if (contract === plis && contract === tour && tour !== lastTour) {
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
    },

    tourHasScore(tour) {
      return Object.values(this.scores[tour] || {}).some(
        (cell) => cell.score != null && cell.score !== ""
      );
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

    computeScore(tour, playerIndex) {
      const contract = this.scores[tour][playerIndex].contrat;
      const plis = this.scores[tour][playerIndex].nombrePlis;

      if (contract == null || plis == null) {
        this.scores[tour][playerIndex].score = null;
      } else {
        const previousScore = this.getPreviousScore(tour, playerIndex);
        const roundPoints =
          contract === plis ? 10 + 5 * plis : -5 * Math.abs(contract - plis);

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
    },

    initScores() {
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

      const allContractsSetBefore = Object.values(this.scores[tour]).every(
        (cell) => cell.contrat !== null && cell.contrat !== undefined && cell.contrat !== ""
      );
	  
      this.scores[tour][playerIndex].contrat = nextValue;
      this.computeScore(tour, playerIndex);

      const allContractsSet = Object.values(this.scores[tour]).every(
        (cell) => cell.contrat !== null && cell.contrat !== undefined && cell.contrat !== ""
      );

      //console.info("allContractsSetBefore..."+allContractsSetBefore+" allContractsSet "+allContractsSet);
      if (!allContractsSetBefore && allContractsSet) {
		console.info("Closing modal");
        this.closeContractModal();
      }
    },

    setNombrePlis(tour, playerIndex, value) {
      this.scores[tour][playerIndex].nombrePlis = value;
      this.computeScore(tour, playerIndex);

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

    onNombrePlisInput(player, tour , value) {		
	  console.info(player, tour, value);
	  let playerIndex = this.players.indexOf(player);      

      this.setNombrePlis(tour, playerIndex, value);
	  
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
  },
};

const app = Vue.createApp(appSpec);
app.component("ContractModal", ContractModal);
app.mount("#app");
