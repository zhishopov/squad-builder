/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("squad_members", {
    id: "id",
    squad_id: {
      type: "integer",
      notNull: true,
      references: '"squads"(id)',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    preferred_position: { type: "varchar(10)", notNull: false },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Prevent duplicate membership rows
  pgm.addConstraint("squad_members", "squad_members_unique_member_per_squad", {
    unique: ["squad_id", "user_id"],
  });

  // Helpful indexes
  pgm.createIndex("squad_members", ["squad_id"]);
  pgm.createIndex("squad_members", ["user_id"]);
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("squad_members");
};
