/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumn("lineup_players", {
    starter: { type: "boolean", notNull: true, default: false },
  });
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropColumn("lineup_players", "starter");
};
