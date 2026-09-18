const ContractModal = {
  name: "ContractModal",
  props: {
    playerIndex: [Number],
    player: String,
    tour: [Number],
    currentTourScores: [Object],
  },
  emits: ["update-contract", "update-plis", "previous", "next"],
  data() {
    return {
      isOpen: false,
      error: null,
    };
  },
  computed: {
    allContractsSelected() {
      return Object.values(this.currentTourScores).every(
        (cell) => cell.contrat !== null && cell.contrat !== ""
      );
    },
    contractInputs() {
      return this.currentTourScores[this.playerIndex].contrat;
    },
    nombrePlisInputs() {
      return this.currentTourScores[this.playerIndex].nombrePlis;
    },
    totalPlisEntered() {
      return Object.values(this.currentTourScores).reduce(
        (sum, cell) => sum + (Number(cell.nombrePlis) || 0),
        0
      );
    },
    remainingPlis() {
      return this.tour - this.totalPlisEntered;
    },
    myContractUnset() {
      return this.contractInputs == null || this.contractInputs === "";
    },
    otherContracts() {
      return Object.entries(this.currentTourScores).filter(
        ([index]) => Number(index) !== this.playerIndex
      );
    },
    othersWithContractCount() {
      return this.otherContracts.filter(
        ([, cell]) => cell.contrat !== null && cell.contrat !== ""
      ).length;
    },
    otherContractSum() {
      return this.otherContracts.reduce(
        (sum, [, cell]) => sum + (Number(cell.contrat) || 0),
        0
      );
    },
    remainingContractToTour() {
      return this.tour - this.otherContractSum;
    },
    isFirstToSetContract() {
      return this.othersWithContractCount === 0;
    },
    isLastToSetContract() {
      return this.othersWithContractCount === this.otherContracts.length;
    },
    contractHint() {
      if (this.allContractsSelected || !this.myContractUnset) return null;

      const remaining = this.remainingContractToTour;

      if (this.isLastToSetContract) {
        if (remaining < 0 || remaining > this.tour) return null;
        return `Contrat Interdit : ${remaining}`;
      }

      if (this.isFirstToSetContract || remaining < 0) return null;

      const plural = remaining > 1 ? "s" : "";
      return `il reste ${remaining} pli${plural} a prendre`;
    },
    showMeta() {
      const hasPlis =
        this.nombrePlisInputs != null && this.nombrePlisInputs !== "";
      return (
        !!this.contractHint ||
        (this.allContractsSelected && this.remainingPlis > 0) ||
        (this.allContractsSelected && hasPlis)
      );
    },
  },
  watch: {
    isOpen(open) {
      this.error = null;
      if (open) this.$nextTick(() => this.focusActiveInput());
    },
    playerIndex() {
      this.error = null;
      if (this.isOpen) this.$nextTick(() => this.focusActiveInput());
    },
  },
  methods: {
    close() {
      this.isOpen = false;
    },
    focusActiveInput() {
      const target = this.allContractsSelected
        ? this.$refs.nombrePlisInputsInput
        : this.$refs.contractInput;
      target?.focus?.();
      target?.select?.();
    },
    currentNumber(value) {
      if (value == null || value === "") return 0;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    },
    canNudge(value, delta) {
      const next = this.currentNumber(value) + delta;
      return next >= 0 && next <= this.tour;
    },
    nudgeContract(delta) {
      if (!this.canNudge(this.contractInputs, delta)) return;
      this.emitContract(
        this.player,
        this.tour,
        this.currentNumber(this.contractInputs) + delta
      );
    },
    nudgePlis(delta) {
      if (!this.canNudge(this.nombrePlisInputs, delta)) return;
      this.emitnombrePlisInputs(
        this.player,
        this.tour,
        this.currentNumber(this.nombrePlisInputs) + delta
      );
    },
    emitContract(player, tour, value) {
      this.error = null;
      if (value === "" || Number.isNaN(value)) {
        return;
      }
      value = Number(value);
      if (value < 0 || value > this.tour) {
        this.error = `Le contrat doit être entre 0 et ${tour}.`;
        return;
      }

      const otherSum = Object.entries(this.currentTourScores)
        .filter(([index]) => Number(index) !== this.playerIndex)
        .reduce((sum, [, cell]) => sum + (Number(cell.contrat) || 0), 0);

      const isLastToSet = Object.entries(this.currentTourScores).every(
        ([index, cell]) => Number(index) === this.playerIndex || cell.contrat != null
      );

      if (isLastToSet && otherSum + value === this.tour) {
        this.error = `La somme des contrats doit être différente de ${tour}.`;
        return;
      }
      this.$emit("update-contract", player, tour, value);
    },
    emitnombrePlisInputs(player, tour, value) {
      this.error = null;
      if (value === null || value === "") {
        this.$emit("update-plis", player, tour, null);
        return;
      }
      if (Number.isNaN(value)) {
        return;
      }
      value = Number(value);

      if (value < 0 || value > tour) {
        this.error = `Le nombre de plis doit être entre 0 et ${tour}.`;
        return;
      }

      const otherPlis = Object.entries(this.currentTourScores)
        .filter(([index]) => Number(index) !== this.playerIndex)
        .reduce((sum, [, cell]) => sum + (Number(cell.nombrePlis) || 0), 0);
      const total = otherPlis + value;

      if (total > tour) {
        this.error = `Le total des plis ne peut pas dépasser ${tour}.`;
        return;
      }

      const allPlisSet = Object.entries(this.currentTourScores).every(
        ([index, cell]) =>
          Number(index) === this.playerIndex ||
          (cell.nombrePlis !== null && cell.nombrePlis !== undefined && cell.nombrePlis !== "")
      );

      if (allPlisSet && total !== tour) {
        this.error = `La somme des plis doit être égale à ${tour}.`;
        return;
      }

      this.$emit("update-plis", player, tour, value);
    },
  },
  template: `
    <div
      v-if="isOpen"
      class="contract-modal"
      @click.self="close"
    >
      <div class="modal-shell">
        <button
          type="button"
          class="modal-nav"
          aria-label="Joueur précédent"
          @click="$emit('previous')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 5.5 8.5 12l7 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="score-pad">
          <button
            type="button"
            class="modal-close-btn"
            aria-label="Fermer"
            @click="close"
          >
            &times;
          </button>

          <header class="modal-header">
            <p class="modal-kicker">Tour {{ tour }}</p>
            <h2 class="modal-title">{{ player }}</h2>
          </header>

          <div class="modal-fields" :class="{ 'is-split': allContractsSelected }">
            <label class="modal-field">
              <span>Contrat</span>
              <div class="modal-stepper">
                <button
                  type="button"
                  class="stepper-btn"
                  aria-label="Augmenter le contrat"
                  :disabled="!canNudge(contractInputs, 1)"
                  @mousedown.prevent
                  @click="nudgeContract(1)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 14.5 12 8.5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <input
                  ref="contractInput"
                  class="input modal-number"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  :max="tour"
                  :value="contractInputs"
                  @blur="emitContract(player, tour, $event.target.value)"
                  @keydown.enter.prevent="$event.target.blur()"
                >
                <button
                  type="button"
                  class="stepper-btn"
                  aria-label="Diminuer le contrat"
                  :disabled="!canNudge(contractInputs, -1)"
                  @mousedown.prevent
                  @click="nudgeContract(-1)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9.5 12 15.5l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </label>

            <label v-if="allContractsSelected" class="modal-field">
              <span>Plis</span>
              <div class="modal-stepper">
                <button
                  type="button"
                  class="stepper-btn"
                  aria-label="Augmenter les plis"
                  :disabled="!canNudge(nombrePlisInputs, 1)"
                  @mousedown.prevent
                  @click="nudgePlis(1)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 14.5 12 8.5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <input
                  ref="nombrePlisInputsInput"
                  class="input modal-number"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  :max="tour"
                  :value="nombrePlisInputs"
                  @blur="emitnombrePlisInputs(player, tour, $event.target.value)"
                  @keydown.enter.prevent="$event.target.blur()"
                >
                <button
                  type="button"
                  class="stepper-btn"
                  aria-label="Diminuer les plis"
                  :disabled="!canNudge(nombrePlisInputs, -1)"
                  @mousedown.prevent
                  @click="nudgePlis(-1)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9.5 12 15.5l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </label>
          </div>

          <div v-if="showMeta" class="modal-meta">
            <p v-if="contractHint" class="modal-hint">
              {{ contractHint }}
            </p>
            <p
              v-else-if="remainingPlis > 0 && allContractsSelected"
              class="modal-hint"
            >
              {{ remainingPlis }} pli{{ remainingPlis > 1 ? 's' : '' }} restant{{ remainingPlis > 1 ? 's' : '' }}
            </p>
            <button
              v-if="allContractsSelected && nombrePlisInputs != null && nombrePlisInputs !== ''"
              class="modal-reset"
              type="button"
              @mousedown.prevent
              @click="emitnombrePlisInputs(player, tour, null)"
            >
              Effacer les plis
            </button>
          </div>

          <p v-if="error" class="modal-error">{{ error }}</p>
        </div>

        <button
          type="button"
          class="modal-nav"
          aria-label="Joueur suivant"
          @click="$emit('next')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.5 5.5 15.5 12l-7 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `,
};
