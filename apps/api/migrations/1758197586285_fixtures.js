/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("fixtures", {
    id: "id",
    squad_id: {
      type: "integer",
      notNull: true,
      references: '"squads"(id)',
      onDelete: "CASCADE",
    },
    opponent: { type: "varchar(100)", notNull: true },
    kickoff_at: { type: "timestamp", notNull: true },
    location: { type: "varchar(120)", notNull: false },
    notes: { type: "text", notNull: false },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("fixtures", ["squad_id", "kickoff_at"]);
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("fixtures");
};
