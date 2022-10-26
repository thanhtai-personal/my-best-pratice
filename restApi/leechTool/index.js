const leechSummaryTTV = require("./leech_summary_ttv");
const leechNovals = require("./leech_noval")

module.exports = {
  initialSummaryData: async () => {
    await leechSummaryTTV();
  },
  updateSummaryData: async () => {
    await leechSummaryTTV(true);
  },
  initialNoval: async () => {
    await leechNovals();
  },
}