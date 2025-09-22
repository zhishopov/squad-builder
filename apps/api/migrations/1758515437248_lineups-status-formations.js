/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumn("lineups", {
    status: { type: "varchar(12)", notNull: true, default: "DRAFT" },
    formation: { type: "varchar(20)", notNull: false },
  });

  pgm.addConstraint("lineups", "lineups_status_check", {
    check: "status in ('DRAFT','PUBLISHED')",
  });
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropConstraint("lineups", "lineups_status_check");
  pgm.dropColumns("lineups", ["status", "formation"]);
};
