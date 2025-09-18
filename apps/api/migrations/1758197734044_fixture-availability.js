/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("fixture_availability", {
    id: "id",
    fixture_id: {
      type: "integer",
      notNull: true,
      references: '"fixtures"(id)',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    availability: { type: "varchar(10)", notNull: true },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint(
    "fixture_availability",
    "fixture_availability_unique_user_per_fixture",
    {
      unique: ["fixture_id", "user_id"],
    }
  );

  pgm.createIndex("fixture_availability", ["fixture_id"]);
  pgm.createIndex("fixture_availability", ["user_id"]);
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("fixture_availability");
};
