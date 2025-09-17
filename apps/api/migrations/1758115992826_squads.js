/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("squads", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    coach_id: {
      type: "integer",
      notNull: true,
      references: '"users"(id)',
      // user removed -> squad is removed too
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // One squad per coach
  pgm.addConstraint("squads", "squads_coach_id_unique", {
    unique: "coach_id",
  });

  // Helpful index to look up a squad by its coach
  pgm.createIndex("squads", ["coach_id"]);
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("squads");
};
