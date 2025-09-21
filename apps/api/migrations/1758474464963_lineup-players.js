/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("lineup_players", {
    id: "id",
    lineup_id: {
      type: "integer",
      notNull: true,
      references: '"lineups"(id)',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    position: {
      type: "varchar(15)",
      notNull: true,
    },
    order_index: {
      type: "smallint",
      notNull: true,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint(
    "lineup_players",
    "lineup_players_unique_player_per_lineup",
    {
      unique: ["lineup_id", "user_id"],
    }
  );

  pgm.addConstraint(
    "lineup_players",
    "lineup_players_unique_order_per_lineup",
    {
      unique: ["lineup_id", "order_index"],
    }
  );
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("lineup_players");
};
