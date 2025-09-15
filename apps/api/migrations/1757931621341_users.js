/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */

/**
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("users", {
    id: "id",
    email: { type: "varchar(255)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    role: { type: "varchar(10)", notNull: true },
    createdAt: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });
};

/**
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("users");
};
