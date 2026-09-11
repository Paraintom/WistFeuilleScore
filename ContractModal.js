const ContractModal = {
  name: "ContractModal",
  props: {
    playerIndex: [Number],
    player: String,
    tour: [Number],
	currentTourScores: [Object]
  },
  emits: ["update-contract", "update-plis", "previous", "next"],
  data() {
    return {
      isOpen: false,
	  error: null
    };
  },
  computed: {
	allContractsSelected() {
	  return Object.values(this.currentTourScores).every(
        (cell) => cell.contrat !== null && cell.contrat !== ""
      );
    },
    contractInputs(){
		return this.currentTourScores[this.playerIndex].contrat;
	},
    nombrePlisInputs(){
		return this.currentTourScores[this.playerIndex].nombrePlis;
	},	
	totalPlisEntered() {
		return Object.values(this.currentTourScores)
			.reduce((sum, cell) => sum + (Number(cell.nombrePlis) || 0), 0);
	},
	remainingPlis() {
		const remaining = this.tour - this.totalPlisEntered;
		return remaining;
	}
  },
  methods: {
    emitContract(player, tour, value) {
		this.error = null;
		//********** contract validation **********	
		//need to be a number
		if (value === "" || Number.isNaN(value)) {
			return;
		}
		value = Number(value);
		//need to be between 0 and tour
		if (value < 0 || value > this.tour) {
			this.error = `Le contrat doit etre entre 0 et ${tour}.`;
			return;
		}
		
		const otherSum = Object.entries(this.currentTourScores)
			.filter(([index]) => Number(index) !== this.playerIndex)
			.reduce((sum, [, cell]) => sum + (Number(cell.contrat) || 0), 0);

		const isLastToSet = Object.entries(this.currentTourScores).every(
			([index, cell]) => Number(index) === this.playerIndex || cell.contrat != null
		);
		
		// The sum of all players contracts should not equal to tour
        if(isLastToSet && otherSum + value === this.tour){
			this.error = `La somme des contrats doit etre differente de ${tour}.`;
			return;
		}
		this.$emit("update-contract", player, tour, value);
    },
    emitnombrePlisInputs(player, tour, value) {
		this.error = null;
		//********** plis validation **********	
		//need to be a number
		if (value === "" || Number.isNaN(value)) {
			return;
		}
		value = Number(value);
		
		//need to be between 0 and tour
		if (value < 0 || value > tour) {
			this.error = `Nombre de plis must be between 0 and ${tour}.`;
			return;
		}
		
		//Cannot exceed tour
      const total =
        Object.values(this.currentTourScores).reduce((sum, cell) => sum + (Number(cell.nombrePlis) || 0), 0) + value;

      if (total > tour) {
        this.error = `Total nombre de plis cannot exceed ${tour}.`;
        return;
      }
	  
		//the final sum of plis should equals the tour
		const allPlisSet = Object.entries(this.currentTourScores).every(
			([index, cell]) =>
			  index === this.playerIndex ||
			  (cell.nombrePlis !== null && cell.nombrePlis !== undefined && cell.nombrePlis !== "")
		  );

		  if (allPlisSet && total !== tour) {
			this.modalError = `La somme des plis doit être égale à ${tour}.`;
			this.setNombrePlis(tour, this.playerIndex, null);
			return;
		  }
	  
      this.$emit("update-plis", player, tour, value);
    },
  },
  template: `
    <div v-if="isOpen" class="contract-modal">
      <div class="contract-modal-content modal-card">
        <button
          type="button"
          class="modal-close-btn"
          aria-label="Close"
          @click="isOpen=false"
        >
          &times;
        </button>

        <h2 class="modal-title">{{ player }} - Tour {{ tour }}</h2>
	    <p class="help" v-if="remainingPlis > 0 && allContractsSelected">
	 	 <strong>{{ remainingPlis }}</strong> plis remaining to distribute
	    </p>

        <label class="label">Contrat</label>
        <input
          ref="contractInput"
          class="input"
          type="number"
          min="0"
          :max="tour"
          :value="contractInputs"
          @blur="emitContract(player,tour,$event.target.value)"
        >

        <div v-if="allContractsSelected" class="field">
          <label class="label">Nombre de plis</label>
          <div class="control is-flex is-align-items-center" style="gap: 0.5rem;">
            <input
              ref="nombrePlisInputsInput"
              class="input"
              type="number"
              min="0"
              :max="tour"
              :value="nombrePlisInputs"
              @blur="emitnombrePlisInputs(player,tour,$event.target.value)"
            >
            <button class="button is-light" type="button" @click="emitnombrePlisInputs(player,tour, null)">
              Reset
            </button>
          </div>
        </div>

        <p v-if="error" class="help is-danger">{{ error }}</p>

        <div v-if="!error" class="modal-actions">
          <button class="button" @click="$emit('previous')">Previous</button>
          <button class="button is-light" @click="isOpen=false">Accept</button>
          <button class="button is-primary" @click="$emit('next')">Next</button>
        </div>
      </div>
    </div>
  `
};
